import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * Security headers configuration
 */
const SECURITY_HEADERS = {
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Enable XSS protection
  'X-XSS-Protection': '1; mode=block',
  
  // Prevent page from being embedded in frames (clickjacking protection)
  'X-Frame-Options': 'DENY',
  
  // HSTS - Force HTTPS for 1 year
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions policy (formerly Feature Policy)
  'Permissions-Policy': [
    'accelerometer=()',
    'camera=()',
    'geolocation=()',
    'gyroscope=()',
    'magnetometer=()',
    'microphone=()',
    'payment=()',
    'usb=()',
  ].join(', '),
  
  // Cross-Origin policies
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
} as const

/**
 * Content Security Policy configuration
 */
function generateCSP(nonce?: string): string {
  const cspDirectives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-eval'", // Next.js requires this for development
      "'unsafe-inline'", // Required for inline scripts in production
      'https://js.stripe.com',
      'https://challenges.cloudflare.com',
      ...(nonce ? [`'nonce-${nonce}'`] : []),
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for CSS-in-JS
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https:',
    ],
    'font-src': [
      "'self'",
      'data:',
    ],
    'connect-src': [
      "'self'",
      'https://api.stripe.com',
      'https://uploads.stripe.com',
      process.env.NODE_ENV === 'development' ? 'ws://localhost:*' : '',
      process.env.NEXT_PUBLIC_API_URL || '',
    ].filter(Boolean),
    'frame-src': [
      'https://js.stripe.com',
      'https://hooks.stripe.com',
    ],
    'worker-src': [
      "'self'",
      'blob:',
    ],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'block-all-mixed-content': [],
    'upgrade-insecure-requests': [],
  }

  return Object.entries(cspDirectives)
    .map(([directive, sources]) => {
      if (sources.length === 0) {
        return directive
      }
      return `${directive} ${sources.join(' ')}`
    })
    .join('; ')
}

/**
 * Generate a cryptographically secure nonce
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64')
}

/**
 * Apply security headers to a response
 */
export function applySecurityHeaders(
  response: NextResponse,
  options: {
    nonce?: string
    allowFraming?: boolean
    customCSP?: string
  } = {}
): NextResponse {
  const { nonce, allowFraming = false, customCSP } = options

  // Apply standard security headers
  Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
    // Skip X-Frame-Options if framing is allowed
    if (header === 'X-Frame-Options' && allowFraming) {
      return
    }
    response.headers.set(header, value)
  })

  // Apply Content Security Policy
  const csp = customCSP || generateCSP(nonce)
  response.headers.set('Content-Security-Policy', csp)

  // Set additional security headers
  response.headers.set('X-Powered-By', 'EquiSplit') // Hide server information
  
  return response
}

/**
 * CSRF token generation and validation
 */
export class CSRFProtection {
  private static readonly TOKEN_LENGTH = 32
  private static readonly TOKEN_HEADER = 'X-CSRF-Token'
  private static readonly COOKIE_NAME = 'csrf-token'

  /**
   * Generate a CSRF token
   */
  static generateToken(): string {
    return crypto.randomBytes(this.TOKEN_LENGTH).toString('hex')
  }

  /**
   * Validate CSRF token from request
   */
  static validateToken(request: NextRequest): boolean {
    // Skip CSRF for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return true
    }

    const headerToken = request.headers.get(this.TOKEN_HEADER)
    const cookieToken = request.cookies.get(this.COOKIE_NAME)?.value

    if (!headerToken || !cookieToken) {
      return false
    }

    // Use constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(headerToken, 'hex'),
      Buffer.from(cookieToken, 'hex')
    )
  }

  /**
   * Set CSRF token in response cookie
   */
  static setTokenCookie(response: NextResponse, token: string): void {
    response.cookies.set(this.COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    })
  }

  /**
   * Middleware to handle CSRF protection
   */
  static middleware(request: NextRequest): NextResponse | null {
    // Generate token for new sessions
    const existingToken = request.cookies.get(this.COOKIE_NAME)?.value
    
    if (!existingToken) {
      const response = NextResponse.next()
      const newToken = this.generateToken()
      this.setTokenCookie(response, newToken)
      return response
    }

    // Validate token for state-changing requests
    if (!this.validateToken(request)) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      )
    }

    return null // Continue with request
  }
}

/**
 * Request sanitization utilities
 */
export class RequestSanitizer {
  /**
   * Sanitize string input to prevent XSS
   */
  static sanitizeString(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/data:/gi, '') // Remove data: protocol
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .trim()
  }

  /**
   * Validate and sanitize URL
   */
  static sanitizeUrl(url: string): string | null {
    try {
      const parsedUrl = new URL(url)
      
      // Only allow HTTP/HTTPS protocols
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return null
      }
      
      return parsedUrl.toString()
    } catch {
      return null
    }
  }

  /**
   * Sanitize object recursively
   */
  static sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj)
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item))
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeString(key)
        sanitized[sanitizedKey] = this.sanitizeObject(value)
      }
      return sanitized
    }
    
    return obj
  }
}

/**
 * Security monitoring and alerting
 */
export class SecurityMonitor {
  private static readonly SUSPICIOUS_PATTERNS = [
    /\b(script|javascript|vbscript|onload|onerror)\b/gi,
    /<[^>]*>/g, // HTML tags
    /union.*select/gi, // SQL injection attempts
    /\.\./g, // Path traversal
    /(exec|eval|system|cmd)/gi, // Code execution attempts
  ]

  /**
   * Check for suspicious patterns in request
   */
  static scanRequest(request: NextRequest): {
    isSuspicious: boolean
    patterns: string[]
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  } {
    const url = request.url
    const userAgent = request.headers.get('user-agent') || ''
    const referer = request.headers.get('referer') || ''
    
    const testStrings = [url, userAgent, referer]
    const foundPatterns: string[] = []
    
    for (const testString of testStrings) {
      for (const pattern of this.SUSPICIOUS_PATTERNS) {
        if (pattern.test(testString)) {
          foundPatterns.push(pattern.toString())
        }
      }
    }
    
    const isSuspicious = foundPatterns.length > 0
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'
    
    if (foundPatterns.length >= 3) {
      riskLevel = 'HIGH'
    } else if (foundPatterns.length >= 1) {
      riskLevel = 'MEDIUM'
    }
    
    return {
      isSuspicious,
      patterns: foundPatterns,
      riskLevel,
    }
  }

  /**
   * Log security event
   */
  static async logSecurityEvent(
    event: string,
    details: any,
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH',
    request: NextRequest
  ): Promise<void> {
    const securityLog = {
      timestamp: new Date().toISOString(),
      event,
      riskLevel,
      details,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      url: request.url,
    }
    
    console.log('Security Event:', JSON.stringify(securityLog, null, 2))
    
    // In production, this would send to security monitoring service
    if (riskLevel === 'HIGH') {
      // Alert security team
      console.error('HIGH RISK SECURITY EVENT:', securityLog)
    }
  }
}

export default {
  applySecurityHeaders,
  generateNonce,
  CSRFProtection,
  RequestSanitizer,
  SecurityMonitor,
}