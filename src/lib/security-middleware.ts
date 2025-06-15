import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, RateLimitType, burstProtection } from '@/lib/rate-limit'
import { 
  applySecurityHeaders, 
  generateNonce, 
  CSRFProtection, 
  RequestSanitizer, 
  SecurityMonitor 
} from '@/lib/security-headers'
import { auditLogger, AuditAction, ComplianceLevel } from '@/lib/audit'
import { auth } from '@/lib/auth'

/**
 * Security middleware configuration
 */
interface SecurityConfig {
  rateLimit?: {
    enabled: boolean
    type: RateLimitType
  }
  csrf?: {
    enabled: boolean
  }
  sanitization?: {
    enabled: boolean
  }
  monitoring?: {
    enabled: boolean
  }
  burstProtection?: {
    enabled: boolean
    maxBurst?: number
    windowMs?: number
  }
}

/**
 * Default security configuration
 */
const DEFAULT_CONFIG: SecurityConfig = {
  rateLimit: {
    enabled: true,
    type: 'REQUEST',
  },
  csrf: {
    enabled: true,
  },
  sanitization: {
    enabled: true,
  },
  monitoring: {
    enabled: true,
  },
  burstProtection: {
    enabled: true,
    maxBurst: 20,
    windowMs: 1000,
  },
}

/**
 * Security middleware result
 */
interface SecurityResult {
  success: boolean
  response?: NextResponse
  sanitizedBody?: any
  securityHeaders?: Record<string, string>
}

/**
 * Main security middleware function
 */
export async function securityMiddleware(
  request: NextRequest,
  config: Partial<SecurityConfig> = {}
): Promise<SecurityResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const session = await auth()
  const clientIP = request.headers.get('x-forwarded-for') || 'unknown'

  try {
    // 1. Security monitoring and threat detection
    if (finalConfig.monitoring?.enabled) {
      const scanResult = SecurityMonitor.scanRequest(request)
      
      if (scanResult.isSuspicious) {
        await SecurityMonitor.logSecurityEvent(
          'SUSPICIOUS_REQUEST_DETECTED',
          {
            patterns: scanResult.patterns,
            riskLevel: scanResult.riskLevel,
            url: request.url,
            method: request.method,
          },
          scanResult.riskLevel,
          request
        )

        // Block high-risk requests
        if (scanResult.riskLevel === 'HIGH') {
          await auditLogger.logUserAction(
            session?.user?.id || 'anonymous',
            AuditAction.SECURITY_VIOLATION,
            request.nextUrl.pathname,
            request,
            {
              reason: 'HIGH_RISK_PATTERNS_DETECTED',
              patterns: scanResult.patterns,
              clientIP,
            },
            ComplianceLevel.LEGAL
          )

          const response = NextResponse.json(
            { error: 'Request blocked by security policy' },
            { status: 403 }
          )
          
          return {
            success: false,
            response: applySecurityHeaders(response),
          }
        }
      }
    }

    // 2. Burst protection
    if (finalConfig.burstProtection?.enabled) {
      const identifier = session?.user?.id || `ip:${clientIP}`
      const burstAllowed = await burstProtection(
        identifier,
        finalConfig.burstProtection.maxBurst,
        finalConfig.burstProtection.windowMs
      )

      if (!burstAllowed) {
        await auditLogger.logUserAction(
          session?.user?.id || 'anonymous',
          AuditAction.RATE_LIMIT_EXCEEDED,
          request.nextUrl.pathname,
          request,
          {
            reason: 'BURST_PROTECTION_TRIGGERED',
            clientIP,
          },
          ComplianceLevel.STANDARD
        )

        const response = NextResponse.json(
          { error: 'Too many requests too quickly. Please slow down.' },
          { status: 429 }
        )
        
        return {
          success: false,
          response: applySecurityHeaders(response),
        }
      }
    }

    // 3. Rate limiting
    if (finalConfig.rateLimit?.enabled) {
      const rateLimitResult = await rateLimit(request, finalConfig.rateLimit.type)
      
      if (!rateLimitResult.success && rateLimitResult.response) {
        return {
          success: false,
          response: applySecurityHeaders(rateLimitResult.response),
        }
      }
    }

    // 4. CSRF protection
    if (finalConfig.csrf?.enabled) {
      const csrfResult = CSRFProtection.middleware(request)
      
      if (csrfResult && csrfResult.status === 403) {
        await auditLogger.logUserAction(
          session?.user?.id || 'anonymous',
          AuditAction.SECURITY_VIOLATION,
          request.nextUrl.pathname,
          request,
          {
            reason: 'CSRF_TOKEN_VALIDATION_FAILED',
            clientIP,
          },
          ComplianceLevel.STANDARD
        )

        return {
          success: false,
          response: applySecurityHeaders(csrfResult),
        }
      }
    }

    // 5. Request sanitization
    let sanitizedBody: any = undefined
    if (finalConfig.sanitization?.enabled && 
        ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      try {
        const body = await request.clone().json()
        sanitizedBody = RequestSanitizer.sanitizeObject(body)
      } catch (error) {
        // Body is not JSON or is empty, skip sanitization
      }
    }

    return {
      success: true,
      sanitizedBody,
    }

  } catch (error) {
    console.error('Security middleware error:', error)
    
    await auditLogger.logUserAction(
      session?.user?.id || 'anonymous',
      AuditAction.SECURITY_ERROR,
      request.nextUrl.pathname,
      request,
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        clientIP,
      },
      ComplianceLevel.STANDARD
    )

    // Fail open with basic security headers
    return {
      success: true,
    }
  }
}

/**
 * Higher-order function to wrap API routes with security middleware
 */
export function withSecurity<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  config: Partial<SecurityConfig> = {}
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const securityResult = await securityMiddleware(request, config)
    
    if (!securityResult.success && securityResult.response) {
      return securityResult.response
    }

    // Execute the original handler
    let response: NextResponse
    
    if (securityResult.sanitizedBody) {
      // Create a new request with sanitized body
      const sanitizedRequest = new NextRequest(request.url, {
        method: request.method,
        headers: request.headers,
        body: JSON.stringify(securityResult.sanitizedBody),
      })
      response = await handler(sanitizedRequest, ...args)
    } else {
      response = await handler(request, ...args)
    }

    // Apply security headers to response
    const nonce = generateNonce()
    return applySecurityHeaders(response, { nonce })
  }
}

/**
 * Specific security configurations for different endpoint types
 */
export const SECURITY_CONFIGS = {
  // Public endpoints (minimal security)
  PUBLIC: {
    rateLimit: { enabled: true, type: 'REQUEST' as RateLimitType },
    csrf: { enabled: false },
    sanitization: { enabled: true },
    monitoring: { enabled: true },
    burstProtection: { enabled: true },
  },

  // Authentication endpoints
  AUTH: {
    rateLimit: { enabled: true, type: 'REQUEST' as RateLimitType },
    csrf: { enabled: true },
    sanitization: { enabled: true },
    monitoring: { enabled: true },
    burstProtection: { enabled: true, maxBurst: 10, windowMs: 1000 },
  },

  // Calculation endpoints (stricter limits)
  CALCULATION: {
    rateLimit: { enabled: true, type: 'CALCULATION' as RateLimitType },
    csrf: { enabled: true },
    sanitization: { enabled: true },
    monitoring: { enabled: true },
    burstProtection: { enabled: true, maxBurst: 5, windowMs: 2000 },
  },

  // File upload endpoints (very strict)
  UPLOAD: {
    rateLimit: { enabled: true, type: 'UPLOAD' as RateLimitType },
    csrf: { enabled: true },
    sanitization: { enabled: true },
    monitoring: { enabled: true },
    burstProtection: { enabled: true, maxBurst: 3, windowMs: 5000 },
  },

  // Document generation endpoints
  DOCUMENT: {
    rateLimit: { enabled: true, type: 'DOCUMENT' as RateLimitType },
    csrf: { enabled: true },
    sanitization: { enabled: true },
    monitoring: { enabled: true },
    burstProtection: { enabled: true, maxBurst: 2, windowMs: 3000 },
  },

  // Payment endpoints (maximum security)
  PAYMENT: {
    rateLimit: { enabled: true, type: 'REQUEST' as RateLimitType },
    csrf: { enabled: true },
    sanitization: { enabled: true },
    monitoring: { enabled: true },
    burstProtection: { enabled: true, maxBurst: 5, windowMs: 10000 },
  },
} as const

export default {
  securityMiddleware,
  withSecurity,
  SECURITY_CONFIGS,
}