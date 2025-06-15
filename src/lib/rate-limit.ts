import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { auditLogger, AuditAction, ComplianceLevel } from '@/lib/audit'

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || 'redis://localhost:6379',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
})

// Rate limit configurations by subscription tier
export const RATE_LIMITS = {
  FREE: {
    requestsPerMinute: 10,
    calculationsPerHour: 3,
    uploadsPerHour: 5,
    documentsPerDay: 2,
  },
  PROFESSIONAL: {
    requestsPerMinute: 60,
    calculationsPerHour: 50,
    uploadsPerHour: 25,
    documentsPerDay: 20,
  },
  ENTERPRISE: {
    requestsPerMinute: 300,
    calculationsPerHour: 500,
    uploadsPerHour: 100,
    documentsPerDay: 100,
  },
  // IP-based limits for unauthenticated users
  ANONYMOUS: {
    requestsPerMinute: 5,
    calculationsPerHour: 1,
    uploadsPerHour: 0, // No uploads for anonymous users
    documentsPerDay: 0, // No document generation for anonymous users
  },
} as const

export type RateLimitType = 'REQUEST' | 'CALCULATION' | 'UPLOAD' | 'DOCUMENT'
export type SubscriptionTier = keyof typeof RATE_LIMITS

interface RateLimitConfig {
  identifier: string
  type: RateLimitType
  tier: SubscriptionTier
  windowMs: number
  maxRequests: number
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
  retryAfter?: number
}

/**
 * Get rate limit configuration based on type and tier
 */
function getRateLimitConfig(
  identifier: string,
  type: RateLimitType,
  tier: SubscriptionTier
): RateLimitConfig {
  const limits = RATE_LIMITS[tier]
  
  switch (type) {
    case 'REQUEST':
      return {
        identifier,
        type,
        tier,
        windowMs: 60 * 1000, // 1 minute
        maxRequests: limits.requestsPerMinute,
      }
    case 'CALCULATION':
      return {
        identifier,
        type,
        tier,
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: limits.calculationsPerHour,
      }
    case 'UPLOAD':
      return {
        identifier,
        type,
        tier,
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: limits.uploadsPerHour,
      }
    case 'DOCUMENT':
      return {
        identifier,
        type,
        tier,
        windowMs: 24 * 60 * 60 * 1000, // 1 day
        maxRequests: limits.documentsPerDay,
      }
    default:
      throw new Error(`Unknown rate limit type: ${type}`)
  }
}

/**
 * Check and update rate limit using Redis sliding window
 */
async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  const key = `rate_limit:${config.identifier}:${config.type}:${config.tier}`
  const now = Date.now()
  const window = config.windowMs
  const windowStart = now - window
  
  try {
    // Use Redis pipeline for atomic operations
    const pipeline = redis.pipeline()
    
    // Remove expired entries
    pipeline.zremrangebyscore(key, 0, windowStart)
    
    // Count current requests in window
    pipeline.zcard(key)
    
    // Add current request
    pipeline.zadd(key, { score: now, member: now })
    
    // Set expiry
    pipeline.expire(key, Math.ceil(window / 1000))
    
    const results = await pipeline.exec()
    const currentCount = (results[1] as number) || 0
    
    const remaining = Math.max(0, config.maxRequests - currentCount - 1)
    const resetTime = now + window
    
    if (currentCount >= config.maxRequests) {
      // Rate limit exceeded
      return {
        success: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime,
        retryAfter: Math.ceil(window / 1000),
      }
    }
    
    return {
      success: true,
      limit: config.maxRequests,
      remaining,
      resetTime,
    }
  } catch (error) {
    console.error('Redis rate limit error:', error)
    // Fail open - allow request if Redis is down
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetTime: now + window,
    }
  }
}

/**
 * Get user's subscription tier from database
 */
async function getUserSubscriptionTier(userId: string): Promise<SubscriptionTier> {
  try {
    // This would typically come from a user subscription check
    // For now, we'll default to FREE and add proper subscription checking later
    return 'FREE'
  } catch (error) {
    console.error('Error getting user subscription tier:', error)
    return 'FREE'
  }
}

/**
 * Get client IP address from request
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP
  }
  
  if (realIP) {
    return realIP
  }
  
  return 'unknown'
}

/**
 * Main rate limiting middleware
 */
export async function rateLimit(
  request: NextRequest,
  type: RateLimitType = 'REQUEST'
): Promise<{ success: boolean; response?: NextResponse }> {
  try {
    const session = await auth()
    const clientIP = getClientIP(request)
    
    let identifier: string
    let tier: SubscriptionTier
    
    if (session?.user?.id) {
      // Authenticated user - use user ID and their subscription tier
      identifier = `user:${session.user.id}`
      tier = await getUserSubscriptionTier(session.user.id)
    } else {
      // Anonymous user - use IP address
      identifier = `ip:${clientIP}`
      tier = 'ANONYMOUS'
    }
    
    const config = getRateLimitConfig(identifier, type, tier)
    const result = await checkRateLimit(config)
    
    if (!result.success) {
      // Log rate limit exceeded
      await auditLogger.logUserAction(
        session?.user?.id || 'anonymous',
        AuditAction.RATE_LIMIT_EXCEEDED,
        request.nextUrl.pathname,
        request,
        {
          type,
          tier,
          limit: result.limit,
          identifier: session?.user?.id ? 'user' : 'ip',
          clientIP,
        },
        ComplianceLevel.STANDARD
      )
      
      const response = NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many ${type.toLowerCase()} requests. Please try again later.`,
          retryAfter: result.retryAfter,
        },
        { status: 429 }
      )
      
      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', result.limit.toString())
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
      response.headers.set('X-RateLimit-Reset', result.resetTime.toString())
      response.headers.set('Retry-After', (result.retryAfter || 60).toString())
      
      return { success: false, response }
    }
    
    // Add rate limit headers to successful responses
    const headers = new Headers()
    headers.set('X-RateLimit-Limit', result.limit.toString())
    headers.set('X-RateLimit-Remaining', result.remaining.toString())
    headers.set('X-RateLimit-Reset', result.resetTime.toString())
    
    return { success: true }
  } catch (error) {
    console.error('Rate limiting error:', error)
    // Fail open - allow request if rate limiting fails
    return { success: true }
  }
}

/**
 * Rate limiting middleware for specific API endpoints
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  type: RateLimitType = 'REQUEST'
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const rateLimitResult = await rateLimit(request, type)
    
    if (!rateLimitResult.success && rateLimitResult.response) {
      return rateLimitResult.response
    }
    
    const response = await handler(request)
    
    // Add rate limit headers to response if available
    if (rateLimitResult.success) {
      const rateLimitHeaders = new Headers(response.headers)
      // Headers would be added here if we tracked them in the rate limit result
    }
    
    return response
  }
}

/**
 * Burst protection for high-frequency requests
 */
export async function burstProtection(
  identifier: string,
  maxBurst: number = 20,
  burstWindowMs: number = 1000
): Promise<boolean> {
  const key = `burst:${identifier}`
  const now = Date.now()
  const windowStart = now - burstWindowMs
  
  try {
    const pipeline = redis.pipeline()
    
    // Remove expired entries
    pipeline.zremrangebyscore(key, 0, windowStart)
    
    // Count current requests in burst window
    pipeline.zcard(key)
    
    // Add current request
    pipeline.zadd(key, { score: now, member: now })
    
    // Set short expiry
    pipeline.expire(key, Math.ceil(burstWindowMs / 1000))
    
    const results = await pipeline.exec()
    const currentCount = (results[1] as number) || 0
    
    return currentCount < maxBurst
  } catch (error) {
    console.error('Burst protection error:', error)
    return true // Fail open
  }
}

export default rateLimit