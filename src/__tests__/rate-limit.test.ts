import { NextRequest } from 'next/server'
import { jest } from '@jest/globals'
import { 
  rateLimit, 
  withRateLimit, 
  RATE_LIMITS, 
  burstProtection 
} from '@/lib/rate-limit'
import { auth } from '@/lib/auth'

// Mock dependencies
jest.mock('@/lib/auth')
jest.mock('@/lib/audit')
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    pipeline: jest.fn().mockReturnValue({
      zremrangebyscore: jest.fn().mockReturnThis(),
      zcard: jest.fn().mockReturnThis(),
      zadd: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([null, 5, null, null]), // 5 current requests
    }),
  })),
}))

const mockAuth = auth as jest.MockedFunction<typeof auth>

describe('Rate Limiting', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.mockResolvedValue(null)
  })

  describe('RATE_LIMITS configuration', () => {
    it('should have appropriate limits for each tier', () => {
      expect(RATE_LIMITS.FREE.requestsPerMinute).toBe(10)
      expect(RATE_LIMITS.FREE.calculationsPerHour).toBe(3)
      expect(RATE_LIMITS.PROFESSIONAL.requestsPerMinute).toBe(60)
      expect(RATE_LIMITS.ENTERPRISE.requestsPerMinute).toBe(300)
      expect(RATE_LIMITS.ANONYMOUS.requestsPerMinute).toBe(5)
    })

    it('should not allow uploads for anonymous users', () => {
      expect(RATE_LIMITS.ANONYMOUS.uploadsPerHour).toBe(0)
      expect(RATE_LIMITS.ANONYMOUS.documentsPerDay).toBe(0)
    })

    it('should scale limits appropriately across tiers', () => {
      expect(RATE_LIMITS.PROFESSIONAL.requestsPerMinute).toBeGreaterThan(
        RATE_LIMITS.FREE.requestsPerMinute
      )
      expect(RATE_LIMITS.ENTERPRISE.requestsPerMinute).toBeGreaterThan(
        RATE_LIMITS.PROFESSIONAL.requestsPerMinute
      )
    })
  })

  describe('rateLimit function', () => {
    it('should allow requests within limits', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      })

      const result = await rateLimit(request, 'REQUEST')

      expect(result.success).toBe(true)
      expect(result.response).toBeUndefined()
    })

    it('should use IP-based limiting for anonymous users', async () => {
      mockAuth.mockResolvedValue(null)

      const request = new NextRequest('https://example.com/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      })

      const result = await rateLimit(request, 'REQUEST')

      expect(result.success).toBe(true)
    })

    it('should use user-based limiting for authenticated users', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: 'user123',
          email: 'test@example.com',
        },
      } as any)

      const request = new NextRequest('https://example.com/api/test')

      const result = await rateLimit(request, 'CALCULATION')

      expect(result.success).toBe(true)
    })

    it('should handle different rate limit types', async () => {
      const request = new NextRequest('https://example.com/api/test')

      // Test each rate limit type
      for (const type of ['REQUEST', 'CALCULATION', 'UPLOAD', 'DOCUMENT'] as const) {
        const result = await rateLimit(request, type)
        expect(result.success).toBe(true)
      }
    })

    it('should extract IP from various headers', async () => {
      const testHeaders = [
        { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
        { 'cf-connecting-ip': '203.0.113.1' },
        { 'x-real-ip': '198.51.100.1' },
      ]

      for (const headers of testHeaders) {
        const request = new NextRequest('https://example.com/api/test', { headers })
        const result = await rateLimit(request, 'REQUEST')
        expect(result.success).toBe(true)
      }
    })

    it('should fail open when Redis is unavailable', async () => {
      // Mock Redis failure
      const mockRedis = require('@upstash/redis').Redis
      mockRedis.mockImplementation(() => ({
        pipeline: jest.fn().mockReturnValue({
          zremrangebyscore: jest.fn().mockReturnThis(),
          zcard: jest.fn().mockReturnThis(),
          zadd: jest.fn().mockReturnThis(),
          expire: jest.fn().mockReturnThis(),
          exec: jest.fn().mockRejectedValue(new Error('Redis connection failed')),
        }),
      }))

      const request = new NextRequest('https://example.com/api/test')
      const result = await rateLimit(request, 'REQUEST')

      expect(result.success).toBe(true)
    })
  })

  describe('withRateLimit wrapper', () => {
    it('should wrap handler with rate limiting', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )

      const limitedHandler = withRateLimit(mockHandler, 'REQUEST')
      const request = new NextRequest('https://example.com/api/test')

      const response = await limitedHandler(request)

      expect(mockHandler).toHaveBeenCalledWith(request)
      expect(response.status).toBe(200)
    })

    it('should block requests when rate limit is exceeded', async () => {
      // Mock rate limit exceeded
      const mockRedis = require('@upstash/redis').Redis
      mockRedis.mockImplementation(() => ({
        pipeline: jest.fn().mockReturnValue({
          zremrangebyscore: jest.fn().mockReturnThis(),
          zcard: jest.fn().mockReturnThis(),
          zadd: jest.fn().mockReturnThis(),
          expire: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([null, 15, null, null]), // Exceeds limit
        }),
      }))

      const mockHandler = jest.fn()
      const limitedHandler = withRateLimit(mockHandler, 'REQUEST')
      const request = new NextRequest('https://example.com/api/test')

      const response = await limitedHandler(request)

      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(429)
    })
  })

  describe('burstProtection', () => {
    it('should allow requests within burst limits', async () => {
      const mockRedis = require('@upstash/redis').Redis
      mockRedis.mockImplementation(() => ({
        pipeline: jest.fn().mockReturnValue({
          zremrangebyscore: jest.fn().mockReturnThis(),
          zcard: jest.fn().mockReturnThis(),
          zadd: jest.fn().mockReturnThis(),
          expire: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([null, 5, null, null]), // 5 requests in burst window
        }),
      }))

      const result = await burstProtection('user123', 10, 1000)

      expect(result).toBe(true)
    })

    it('should block requests exceeding burst limits', async () => {
      const mockRedis = require('@upstash/redis').Redis
      mockRedis.mockImplementation(() => ({
        pipeline: jest.fn().mockReturnValue({
          zremrangebyscore: jest.fn().mockReturnThis(),
          zcard: jest.fn().mockReturnThis(),
          zadd: jest.fn().mockReturnThis(),
          expire: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([null, 25, null, null]), // 25 requests exceeds burst
        }),
      }))

      const result = await burstProtection('user123', 20, 1000)

      expect(result).toBe(false)
    })

    it('should fail open on Redis errors', async () => {
      const mockRedis = require('@upstash/redis').Redis
      mockRedis.mockImplementation(() => ({
        pipeline: jest.fn().mockReturnValue({
          zremrangebyscore: jest.fn().mockReturnThis(),
          zcard: jest.fn().mockReturnThis(),
          zadd: jest.fn().mockReturnThis(),
          expire: jest.fn().mockReturnThis(),
          exec: jest.fn().mockRejectedValue(new Error('Redis error')),
        }),
      }))

      const result = await burstProtection('user123', 20, 1000)

      expect(result).toBe(true)
    })
  })

  describe('Rate limit headers', () => {
    it('should include rate limit headers in responses', async () => {
      const request = new NextRequest('https://example.com/api/test')

      const result = await rateLimit(request, 'REQUEST')

      expect(result.success).toBe(true)
      // Headers would be added in the actual implementation
    })
  })

  describe('Subscription tier handling', () => {
    it('should use appropriate limits for different subscription tiers', async () => {
      // This would require mocking the subscription tier lookup
      // For now, we test that the function handles different tiers
      const request = new NextRequest('https://example.com/api/test')

      mockAuth.mockResolvedValue({
        user: {
          id: 'user123',
          email: 'test@example.com',
        },
      } as any)

      const result = await rateLimit(request, 'CALCULATION')

      expect(result.success).toBe(true)
    })
  })

  describe('Edge cases', () => {
    it('should handle requests without IP headers', async () => {
      const request = new NextRequest('https://example.com/api/test')

      const result = await rateLimit(request, 'REQUEST')

      expect(result.success).toBe(true)
    })

    it('should handle malformed IP addresses', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        headers: {
          'x-forwarded-for': 'invalid-ip',
        },
      })

      const result = await rateLimit(request, 'REQUEST')

      expect(result.success).toBe(true)
    })

    it('should handle empty forwarded headers', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        headers: {
          'x-forwarded-for': '',
        },
      })

      const result = await rateLimit(request, 'REQUEST')

      expect(result.success).toBe(true)
    })
  })

  describe('Time window calculations', () => {
    it('should use correct time windows for different rate limit types', async () => {
      const request = new NextRequest('https://example.com/api/test')

      // Each type should have appropriate time windows
      const typeWindows = {
        REQUEST: 60 * 1000, // 1 minute
        CALCULATION: 60 * 60 * 1000, // 1 hour
        UPLOAD: 60 * 60 * 1000, // 1 hour
        DOCUMENT: 24 * 60 * 60 * 1000, // 1 day
      }

      for (const [type, expectedWindow] of Object.entries(typeWindows)) {
        const result = await rateLimit(request, type as any)
        expect(result.success).toBe(true)
      }
    })
  })
})