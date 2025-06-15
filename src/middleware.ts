import { auth } from "@/lib/auth"
import { auditLogger, AuditAction, ComplianceLevel } from "@/lib/audit"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { RateLimiter } from "@/lib/rate-limiter"

// Initialize rate limiters for different endpoint types
const rateLimiters = {
  api: new RateLimiter({ windowMs: 60000, maxRequests: 100 }), // 100 req/min for API
  auth: new RateLimiter({ windowMs: 60000, maxRequests: 10 }), // 10 req/min for auth
  calculate: new RateLimiter({ windowMs: 60000, maxRequests: 3 }), // 3 req/min for calculations
  payment: new RateLimiter({ windowMs: 60000, maxRequests: 5 }), // 5 req/min for payments
}

export async function middleware(request: NextRequest) {
  const clientIP = getClientIP(request)
  const userAgent = request.headers.get("user-agent") || ""
  
  // Security checks
  if (isSecurityThreat(request, userAgent)) {
    await auditLogger.logSecurityEvent(
      "Blocked suspicious request",
      "high",
      request,
      { path: request.nextUrl.pathname, reason: "Security threat detected" }
    )
    return new NextResponse("Access Denied", { status: 403 })
  }

  // Rate limiting
  const rateLimitResult = await applyRateLimit(request, clientIP)
  if (rateLimitResult) {
    await auditLogger.logSecurityEvent(
      "Rate limit exceeded",
      "medium",
      request,
      { clientIP, path: request.nextUrl.pathname }
    )
    return rateLimitResult
  }

  const session = await auth()
  const isAuthPage = request.nextUrl.pathname.startsWith("/auth")
  const isProtectedPage = [
    "/dashboard",
    "/calculator",
    "/api/calculate",
    "/api/documents",
    "/api/payments",
  ].some(path => request.nextUrl.pathname.startsWith(path))
  
  // Enhanced audit logging for protected resources
  if (isProtectedPage) {
    const action = request.method === "GET" ? AuditAction.READ : 
                  request.method === "POST" ? AuditAction.CREATE :
                  request.method === "PUT" || request.method === "PATCH" ? AuditAction.UPDATE :
                  request.method === "DELETE" ? AuditAction.DELETE : AuditAction.READ

    const complianceLevel = request.nextUrl.pathname.includes("payment") ? ComplianceLevel.FINANCIAL :
                           request.nextUrl.pathname.includes("calculate") || request.nextUrl.pathname.includes("document") ? ComplianceLevel.LEGAL :
                           ComplianceLevel.STANDARD

    if (session?.user?.id) {
      await auditLogger.logUserAction(
        session.user.id,
        action,
        request.nextUrl.pathname,
        request,
        { method: request.method },
        complianceLevel
      )
    } else {
      await auditLogger.logAnonymousAction(
        action,
        request.nextUrl.pathname,
        request,
        { method: request.method },
        complianceLevel
      )
    }
  }
  
  // Redirect authenticated users away from auth pages
  if (session && isAuthPage && request.nextUrl.pathname !== "/auth/signout") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }
  
  // Redirect unauthenticated users to sign in for protected pages
  if (!session && isProtectedPage) {
    const signInUrl = new URL("/auth/signin", request.url)
    signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname)
    return NextResponse.redirect(signInUrl)
  }
  
  // Add comprehensive security headers
  const response = NextResponse.next()
  addSecurityHeaders(response, request)
  
  return response
}

// Helper function to get client IP
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  
  const realIP = request.headers.get("x-real-ip")
  if (realIP) {
    return realIP
  }
  
  const cfConnectingIP = request.headers.get("cf-connecting-ip")
  if (cfConnectingIP) {
    return cfConnectingIP
  }
  
  return "unknown"
}

// Security threat detection
function isSecurityThreat(request: NextRequest, userAgent: string): boolean {
  const suspiciousPatterns = [
    /sqlmap/i,
    /nikto/i,
    /nessus/i,
    /burpsuite/i,
    /masscan/i,
    /nmap/i,
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /data:text\/html/i,
    /\.\.\/\.\.\//,
    /union\s+select/i,
    /drop\s+table/i,
    /insert\s+into/i,
    /delete\s+from/i,
  ]
  
  const url = request.nextUrl.toString()
  const userAgentLower = userAgent.toLowerCase()
  
  // Check for SQL injection patterns in URL
  if (suspiciousPatterns.some(pattern => pattern.test(url))) {
    return true
  }
  
  // Check for suspicious user agents
  if (suspiciousPatterns.some(pattern => pattern.test(userAgentLower))) {
    return true
  }
  
  // Check for unusual request sizes
  const contentLength = request.headers.get("content-length")
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
    return true
  }
  
  return false
}

// Rate limiting application
async function applyRateLimit(request: NextRequest, clientIP: string): Promise<NextResponse | null> {
  const path = request.nextUrl.pathname
  
  if (path.startsWith("/api/auth")) {
    if (!rateLimiters.auth.checkLimit(clientIP)) {
      return new NextResponse("Rate limit exceeded", { 
        status: 429,
        headers: {
          "Retry-After": "60",
          "X-RateLimit-Reset": new Date(Date.now() + 60000).toISOString()
        }
      })
    }
  } else if (path.startsWith("/api/calculate")) {
    if (!rateLimiters.calculate.checkLimit(clientIP)) {
      return new NextResponse("Rate limit exceeded", { 
        status: 429,
        headers: {
          "Retry-After": "60",
          "X-RateLimit-Reset": new Date(Date.now() + 60000).toISOString()
        }
      })
    }
  } else if (path.startsWith("/api/payments")) {
    if (!rateLimiters.payment.checkLimit(clientIP)) {
      return new NextResponse("Rate limit exceeded", { 
        status: 429,
        headers: {
          "Retry-After": "60",
          "X-RateLimit-Reset": new Date(Date.now() + 60000).toISOString()
        }
      })
    }
  } else if (path.startsWith("/api")) {
    if (!rateLimiters.api.checkLimit(clientIP)) {
      return new NextResponse("Rate limit exceeded", { 
        status: 429,
        headers: {
          "Retry-After": "60",
          "X-RateLimit-Reset": new Date(Date.now() + 60000).toISOString()
        }
      })
    }
  }
  
  return null
}

// Add comprehensive security headers
function addSecurityHeaders(response: NextResponse, request: NextRequest) {
  // Basic security headers
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  
  // HSTS (only in production with HTTPS)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    )
  }
  
  // Content Security Policy
  const nonce = generateNonce()
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' https://js.stripe.com https://vercel.live`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.stripe.com https://vitals.vercel-insights.com https://vercel.live",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join("; ")
  
  response.headers.set("Content-Security-Policy", csp)
  
  // Permissions Policy (formerly Feature Policy)
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(self)"
  )
  
  // Cross-Origin policies
  response.headers.set("Cross-Origin-Embedder-Policy", "require-corp")
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin")
  response.headers.set("Cross-Origin-Resource-Policy", "same-site")
  
  // Cache control for sensitive pages
  if (request.nextUrl.pathname.includes("/calculator") || 
      request.nextUrl.pathname.includes("/dashboard") ||
      request.nextUrl.pathname.includes("/api/")) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")
  }
  
  // Add security response headers for compliance
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none")
  response.headers.set("X-Download-Options", "noopen")
}

// Generate a random nonce for CSP
function generateNonce(): string {
  return Buffer.from(Math.random().toString()).toString('base64').slice(0, 16)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}