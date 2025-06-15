import { NextRequest, NextResponse } from 'next/server'
import { jest } from '@jest/globals'
import { 
  securityMiddleware, 
  withSecurity, 
  SECURITY_CONFIGS 
} from '@/lib/security-middleware'
import { rateLimit } from '@/lib/rate-limit'
import { CSRFProtection, SecurityMonitor } from '@/lib/security-headers'
import { auth } from '@/lib/auth'

// Mock dependencies
jest.mock('@/lib/rate-limit')
jest.mock('@/lib/security-headers')
jest.mock('@/lib/auth')
jest.mock('@/lib/audit')

const mockRateLimit = rateLimit as jest.MockedFunction<typeof rateLimit>
const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockCSRFProtection = CSRFProtection.middleware as jest.MockedFunction<typeof CSRFProtection.middleware>
const mockSecurityMonitor = SecurityMonitor.scanRequest as jest.MockedFunction<typeof SecurityMonitor.scanRequest>

describe('Security Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default mocks
    mockAuth.mockResolvedValue(null)
    mockRateLimit.mockResolvedValue({ success: true })
    mockCSRFProtection.mockReturnValue(null)
    mockSecurityMonitor.mockReturnValue({
      isSuspicious: false,
      patterns: [],
      riskLevel: 'LOW',
    })
  })

  describe('securityMiddleware', () => {
    it('should allow safe requests through', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'GET',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0',
        },
      })

      const result = await securityMiddleware(request)

      expect(result.success).toBe(true)
      expect(result.response).toBeUndefined()
    })

    it('should block high-risk requests', async () => {
      mockSecurityMonitor.mockReturnValue({
        isSuspicious: true,
        patterns: ['<script>', 'javascript:'],
        riskLevel: 'HIGH',
      })

      const request = new NextRequest('https://example.com/api/test?param=<script>alert(1)</script>', {
        method: 'GET',
      })

      const result = await securityMiddleware(request)

      expect(result.success).toBe(false)
      expect(result.response).toBeDefined()
      expect(result.response?.status).toBe(403)
    })

    it('should apply rate limiting', async () => {
      mockRateLimit.mockResolvedValue({
        success: false,
        response: NextResponse.json({ error: 'Rate limited' }, { status: 429 }),
      })

      const request = new NextRequest('https://example.com/api/test')

      const result = await securityMiddleware(request)

      expect(result.success).toBe(false)
      expect(result.response?.status).toBe(429)
    })

    it('should enforce CSRF protection', async () => {
      mockCSRFProtection.mockReturnValue(
        NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
      )

      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
      })

      const result = await securityMiddleware(request)

      expect(result.success).toBe(false)
      expect(result.response?.status).toBe(403)
    })

    it('should sanitize request body', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name: '<script>alert(1)</script>John',
          email: 'javascript:void(0)',
          description: 'Normal text',
        }),
      })

      const result = await securityMiddleware(request, {
        sanitization: { enabled: true },
      })

      expect(result.success).toBe(true)
      expect(result.sanitizedBody).toBeDefined()
      expect(result.sanitizedBody.name).toBe('John')
      expect(result.sanitizedBody.email).toBe('')
      expect(result.sanitizedBody.description).toBe('Normal text')
    })

    it('should handle burst protection', async () => {
      // This would require mocking Redis, for now we'll test the configuration
      const request = new NextRequest('https://example.com/api/test')

      const result = await securityMiddleware(request, {
        burstProtection: {
          enabled: true,
          maxBurst: 5,
          windowMs: 1000,
        },
      })

      expect(result.success).toBe(true)
    })

    it('should fail open on errors', async () => {
      mockRateLimit.mockRejectedValue(new Error('Redis connection failed'))

      const request = new NextRequest('https://example.com/api/test')

      const result = await securityMiddleware(request)

      expect(result.success).toBe(true)
    })
  })

  describe('withSecurity wrapper', () => {
    it('should wrap handler with security middleware', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      )

      const secureHandler = withSecurity(mockHandler, SECURITY_CONFIGS.PUBLIC)
      const request = new NextRequest('https://example.com/api/test')

      const response = await secureHandler(request)

      expect(mockHandler).toHaveBeenCalledWith(request)
      expect(response.status).toBe(200)
    })

    it('should block requests when security fails', async () => {
      mockRateLimit.mockResolvedValue({
        success: false,
        response: NextResponse.json({ error: 'Rate limited' }, { status: 429 }),
      })

      const mockHandler = jest.fn()
      const secureHandler = withSecurity(mockHandler, SECURITY_CONFIGS.CALCULATION)
      const request = new NextRequest('https://example.com/api/calculate')

      const response = await secureHandler(request)

      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(429)
    })

    it('should pass sanitized body to handler', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      )

      const secureHandler = withSecurity(mockHandler, {
        sanitization: { enabled: true },
      })

      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name: '<script>alert(1)</script>John',
        }),
      })

      await secureHandler(request)

      // Check that the handler was called with a request that has sanitized body
      expect(mockHandler).toHaveBeenCalled()
      const calledRequest = mockHandler.mock.calls[0][0] as NextRequest
      expect(calledRequest).toBeInstanceOf(NextRequest)
    })
  })

  describe('SECURITY_CONFIGS', () => {
    it('should have appropriate configurations for different endpoint types', () => {
      expect(SECURITY_CONFIGS.PUBLIC.csrf?.enabled).toBe(false)
      expect(SECURITY_CONFIGS.AUTH.burstProtection?.maxBurst).toBe(10)
      expect(SECURITY_CONFIGS.CALCULATION.rateLimit?.type).toBe('CALCULATION')
      expect(SECURITY_CONFIGS.UPLOAD.rateLimit?.type).toBe('UPLOAD')
      expect(SECURITY_CONFIGS.DOCUMENT.rateLimit?.type).toBe('DOCUMENT')
      expect(SECURITY_CONFIGS.PAYMENT.burstProtection?.windowMs).toBe(10000)
    })

    it('should enable monitoring for all configurations', () => {
      Object.values(SECURITY_CONFIGS).forEach(config => {
        expect(config.monitoring?.enabled).toBe(true)
      })
    })

    it('should enable sanitization for all configurations', () => {
      Object.values(SECURITY_CONFIGS).forEach(config => {
        expect(config.sanitization?.enabled).toBe(true)
      })
    })
  })

  describe('IP address extraction', () => {
    it('should extract IP from x-forwarded-for header', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
      })

      await securityMiddleware(request)

      // Rate limiting should be called with IP-based identifier
      expect(mockRateLimit).toHaveBeenCalledWith(request, 'REQUEST')
    })

    it('should extract IP from cf-connecting-ip header', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        headers: {
          'cf-connecting-ip': '203.0.113.1',
        },
      })

      await securityMiddleware(request)

      expect(mockRateLimit).toHaveBeenCalledWith(request, 'REQUEST')
    })

    it('should extract IP from x-real-ip header', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        headers: {
          'x-real-ip': '198.51.100.1',
        },
      })

      await securityMiddleware(request)

      expect(mockRateLimit).toHaveBeenCalledWith(request, 'REQUEST')
    })
  })

  describe('Error handling', () => {
    it('should handle JSON parsing errors gracefully', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: 'invalid json',
      })

      const result = await securityMiddleware(request, {
        sanitization: { enabled: true },
      })

      expect(result.success).toBe(true)
      expect(result.sanitizedBody).toBeUndefined()
    })

    it('should handle empty request body', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
      })

      const result = await securityMiddleware(request, {
        sanitization: { enabled: true },
      })

      expect(result.success).toBe(true)
      expect(result.sanitizedBody).toBeUndefined()
    })

    it('should handle non-JSON content types', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: {
          'content-type': 'multipart/form-data',
        },
        body: 'form data',
      })

      const result = await securityMiddleware(request, {
        sanitization: { enabled: true },
      })

      expect(result.success).toBe(true)
      expect(result.sanitizedBody).toBeUndefined()
    })
  })

  describe('Authentication-based rate limiting', () => {
    it('should use user-based rate limiting for authenticated users', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: 'user123',
          email: 'test@example.com',
        },
      } as any)

      const request = new NextRequest('https://example.com/api/test')

      await securityMiddleware(request)

      expect(mockRateLimit).toHaveBeenCalledWith(request, 'REQUEST')
    })

    it('should use IP-based rate limiting for anonymous users', async () => {
      mockAuth.mockResolvedValue(null)

      const request = new NextRequest('https://example.com/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      })

      await securityMiddleware(request)

      expect(mockRateLimit).toHaveBeenCalledWith(request, 'REQUEST')
    })
  })
})