import { NextRequest, NextResponse } from 'next/server'
import { jest } from '@jest/globals'
import {
  applySecurityHeaders,
  generateNonce,
  CSRFProtection,
  RequestSanitizer,
  SecurityMonitor,
} from '@/lib/security-headers'

describe('Security Headers', () => {
  describe('applySecurityHeaders', () => {
    it('should apply all standard security headers', () => {
      const response = new NextResponse('test')
      const secureResponse = applySecurityHeaders(response)

      expect(secureResponse.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(secureResponse.headers.get('X-XSS-Protection')).toBe('1; mode=block')
      expect(secureResponse.headers.get('X-Frame-Options')).toBe('DENY')
      expect(secureResponse.headers.get('Strict-Transport-Security')).toContain('max-age=31536000')
      expect(secureResponse.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
      expect(secureResponse.headers.get('Content-Security-Policy')).toBeDefined()
    })

    it('should allow framing when specified', () => {
      const response = new NextResponse('test')
      const secureResponse = applySecurityHeaders(response, { allowFraming: true })

      expect(secureResponse.headers.get('X-Frame-Options')).toBeNull()
    })

    it('should include nonce in CSP when provided', () => {
      const response = new NextResponse('test')
      const nonce = 'test-nonce-123'
      const secureResponse = applySecurityHeaders(response, { nonce })

      const csp = secureResponse.headers.get('Content-Security-Policy')
      expect(csp).toContain(`'nonce-${nonce}'`)
    })

    it('should use custom CSP when provided', () => {
      const response = new NextResponse('test')
      const customCSP = "default-src 'self'; script-src 'self' example.com"
      const secureResponse = applySecurityHeaders(response, { customCSP })

      expect(secureResponse.headers.get('Content-Security-Policy')).toBe(customCSP)
    })

    it('should set X-Powered-By header', () => {
      const response = new NextResponse('test')
      const secureResponse = applySecurityHeaders(response)

      expect(secureResponse.headers.get('X-Powered-By')).toBe('EquiSplit')
    })
  })

  describe('generateNonce', () => {
    it('should generate a base64 nonce', () => {
      const nonce = generateNonce()

      expect(typeof nonce).toBe('string')
      expect(nonce).toMatch(/^[A-Za-z0-9+/]+=*$/) // Base64 pattern
      expect(nonce.length).toBeGreaterThan(0)
    })

    it('should generate unique nonces', () => {
      const nonce1 = generateNonce()
      const nonce2 = generateNonce()

      expect(nonce1).not.toBe(nonce2)
    })
  })

  describe('CSRFProtection', () => {
    describe('generateToken', () => {
      it('should generate a hex token', () => {
        const token = CSRFProtection.generateToken()

        expect(typeof token).toBe('string')
        expect(token).toMatch(/^[a-f0-9]+$/) // Hex pattern
        expect(token.length).toBe(64) // 32 bytes * 2 for hex
      })

      it('should generate unique tokens', () => {
        const token1 = CSRFProtection.generateToken()
        const token2 = CSRFProtection.generateToken()

        expect(token1).not.toBe(token2)
      })
    })

    describe('validateToken', () => {
      it('should validate matching tokens', () => {
        const token = CSRFProtection.generateToken()
        const request = new NextRequest('https://example.com/api/test', {
          method: 'POST',
          headers: {
            'X-CSRF-Token': token,
          },
        })

        // Mock cookie
        jest.spyOn(request.cookies, 'get').mockReturnValue({ value: token } as any)

        const isValid = CSRFProtection.validateToken(request)
        expect(isValid).toBe(true)
      })

      it('should reject mismatched tokens', () => {
        const token1 = CSRFProtection.generateToken()
        const token2 = CSRFProtection.generateToken()
        const request = new NextRequest('https://example.com/api/test', {
          method: 'POST',
          headers: {
            'X-CSRF-Token': token1,
          },
        })

        jest.spyOn(request.cookies, 'get').mockReturnValue({ value: token2 } as any)

        const isValid = CSRFProtection.validateToken(request)
        expect(isValid).toBe(false)
      })

      it('should reject requests without tokens', () => {
        const request = new NextRequest('https://example.com/api/test', {
          method: 'POST',
        })

        jest.spyOn(request.cookies, 'get').mockReturnValue(undefined)

        const isValid = CSRFProtection.validateToken(request)
        expect(isValid).toBe(false)
      })

      it('should allow safe methods without tokens', () => {
        const safeMethods = ['GET', 'HEAD', 'OPTIONS']

        for (const method of safeMethods) {
          const request = new NextRequest('https://example.com/api/test', { method })
          const isValid = CSRFProtection.validateToken(request)
          expect(isValid).toBe(true)
        }
      })
    })

    describe('middleware', () => {
      it('should generate token for new sessions', () => {
        const request = new NextRequest('https://example.com/api/test')
        jest.spyOn(request.cookies, 'get').mockReturnValue(undefined)

        const response = CSRFProtection.middleware(request)

        expect(response).toBeInstanceOf(NextResponse)
        expect(response?.headers.get('Set-Cookie')).toContain('csrf-token=')
      })

      it('should validate existing tokens', () => {
        const token = CSRFProtection.generateToken()
        const request = new NextRequest('https://example.com/api/test', {
          method: 'POST',
          headers: {
            'X-CSRF-Token': 'invalid-token',
          },
        })

        jest.spyOn(request.cookies, 'get').mockReturnValue({ value: token } as any)

        const response = CSRFProtection.middleware(request)

        expect(response?.status).toBe(403)
      })
    })
  })

  describe('RequestSanitizer', () => {
    describe('sanitizeString', () => {
      it('should remove angle brackets', () => {
        const input = '<script>alert(1)</script>Hello'
        const output = RequestSanitizer.sanitizeString(input)
        expect(output).toBe('scriptalert(1)/scriptHello')
      })

      it('should remove javascript protocol', () => {
        const input = 'javascript:alert(1)'
        const output = RequestSanitizer.sanitizeString(input)
        expect(output).toBe('alert(1)')
      })

      it('should remove data protocol', () => {
        const input = 'data:text/html,<script>alert(1)</script>'
        const output = RequestSanitizer.sanitizeString(input)
        expect(output).toBe('text/html,scriptalert(1)/script')
      })

      it('should remove vbscript protocol', () => {
        const input = 'vbscript:msgbox(1)'
        const output = RequestSanitizer.sanitizeString(input)
        expect(output).toBe('msgbox(1)')
      })

      it('should trim whitespace', () => {
        const input = '  hello world  '
        const output = RequestSanitizer.sanitizeString(input)
        expect(output).toBe('hello world')
      })

      it('should handle empty strings', () => {
        const input = ''
        const output = RequestSanitizer.sanitizeString(input)
        expect(output).toBe('')
      })
    })

    describe('sanitizeUrl', () => {
      it('should allow valid HTTP URLs', () => {
        const input = 'http://example.com/path'
        const output = RequestSanitizer.sanitizeUrl(input)
        expect(output).toBe(input)
      })

      it('should allow valid HTTPS URLs', () => {
        const input = 'https://example.com/path'
        const output = RequestSanitizer.sanitizeUrl(input)
        expect(output).toBe(input)
      })

      it('should reject javascript URLs', () => {
        const input = 'javascript:alert(1)'
        const output = RequestSanitizer.sanitizeUrl(input)
        expect(output).toBeNull()
      })

      it('should reject data URLs', () => {
        const input = 'data:text/html,<script>alert(1)</script>'
        const output = RequestSanitizer.sanitizeUrl(input)
        expect(output).toBeNull()
      })

      it('should reject invalid URLs', () => {
        const input = 'not-a-url'
        const output = RequestSanitizer.sanitizeUrl(input)
        expect(output).toBeNull()
      })
    })

    describe('sanitizeObject', () => {
      it('should sanitize string properties', () => {
        const input = {
          name: '<script>alert(1)</script>John',
          email: 'test@example.com',
        }
        const output = RequestSanitizer.sanitizeObject(input)

        expect(output.name).toBe('scriptalert(1)/scriptJohn')
        expect(output.email).toBe('test@example.com')
      })

      it('should sanitize nested objects', () => {
        const input = {
          user: {
            name: '<script>alert(1)</script>John',
            profile: {
              bio: 'javascript:void(0)',
            },
          },
        }
        const output = RequestSanitizer.sanitizeObject(input)

        expect(output.user.name).toBe('scriptalert(1)/scriptJohn')
        expect(output.user.profile.bio).toBe('void(0)')
      })

      it('should sanitize arrays', () => {
        const input = ['<script>alert(1)</script>', 'normal text']
        const output = RequestSanitizer.sanitizeObject(input)

        expect(output[0]).toBe('scriptalert(1)/script')
        expect(output[1]).toBe('normal text')
      })

      it('should handle non-string values', () => {
        const input = {
          number: 123,
          boolean: true,
          null: null,
          undefined: undefined,
        }
        const output = RequestSanitizer.sanitizeObject(input)

        expect(output.number).toBe(123)
        expect(output.boolean).toBe(true)
        expect(output.null).toBeNull()
        expect(output.undefined).toBeUndefined()
      })

      it('should sanitize object keys', () => {
        const input = {
          '<script>alert': 'value',
          'normalKey': 'normalValue',
        }
        const output = RequestSanitizer.sanitizeObject(input)

        expect(output['scriptalert']).toBe('value')
        expect(output['normalKey']).toBe('normalValue')
      })
    })
  })

  describe('SecurityMonitor', () => {
    describe('scanRequest', () => {
      it('should detect suspicious patterns in URL', () => {
        const request = new NextRequest('https://example.com/api/test?param=<script>alert(1)</script>')

        const result = SecurityMonitor.scanRequest(request)

        expect(result.isSuspicious).toBe(true)
        expect(result.patterns.length).toBeGreaterThan(0)
        expect(result.riskLevel).toBe('MEDIUM')
      })

      it('should detect suspicious patterns in user agent', () => {
        const request = new NextRequest('https://example.com/api/test', {
          headers: {
            'user-agent': 'Mozilla/5.0 <script>alert(1)</script>',
          },
        })

        const result = SecurityMonitor.scanRequest(request)

        expect(result.isSuspicious).toBe(true)
        expect(result.riskLevel).toBe('MEDIUM')
      })

      it('should detect SQL injection patterns', () => {
        const request = new NextRequest('https://example.com/api/test?id=1 UNION SELECT * FROM users')

        const result = SecurityMonitor.scanRequest(request)

        expect(result.isSuspicious).toBe(true)
        expect(result.riskLevel).toBe('MEDIUM')
      })

      it('should detect path traversal attempts', () => {
        const request = new NextRequest('https://example.com/api/test?file=../../../etc/passwd')

        const result = SecurityMonitor.scanRequest(request)

        expect(result.isSuspicious).toBe(true)
      })

      it('should classify risk levels correctly', () => {
        // High risk - multiple patterns
        const highRiskRequest = new NextRequest(
          'https://example.com/api/test?param=<script>alert(1)</script>&sql=UNION SELECT&path=../../../'
        )
        const highRiskResult = SecurityMonitor.scanRequest(highRiskRequest)
        expect(highRiskResult.riskLevel).toBe('HIGH')

        // Medium risk - single pattern
        const mediumRiskRequest = new NextRequest('https://example.com/api/test?param=<script>alert(1)</script>')
        const mediumRiskResult = SecurityMonitor.scanRequest(mediumRiskRequest)
        expect(mediumRiskResult.riskLevel).toBe('MEDIUM')

        // Low risk - no patterns
        const lowRiskRequest = new NextRequest('https://example.com/api/test?param=normal-value')
        const lowRiskResult = SecurityMonitor.scanRequest(lowRiskRequest)
        expect(lowRiskResult.riskLevel).toBe('LOW')
        expect(lowRiskResult.isSuspicious).toBe(false)
      })

      it('should handle empty headers gracefully', () => {
        const request = new NextRequest('https://example.com/api/test')

        const result = SecurityMonitor.scanRequest(request)

        expect(result.isSuspicious).toBe(false)
        expect(result.riskLevel).toBe('LOW')
      })
    })

    describe('logSecurityEvent', () => {
      it('should log security events', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

        const request = new NextRequest('https://example.com/api/test')

        await SecurityMonitor.logSecurityEvent(
          'TEST_EVENT',
          { testData: 'value' },
          'MEDIUM',
          request
        )

        expect(consoleSpy).toHaveBeenCalledWith(
          'Security Event:',
          expect.stringContaining('TEST_EVENT')
        )

        consoleSpy.mockRestore()
        consoleErrorSpy.mockRestore()
      })

      it('should alert on high-risk events', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

        const request = new NextRequest('https://example.com/api/test')

        await SecurityMonitor.logSecurityEvent(
          'HIGH_RISK_EVENT',
          { testData: 'value' },
          'HIGH',
          request
        )

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'HIGH RISK SECURITY EVENT:',
          expect.any(Object)
        )

        consoleErrorSpy.mockRestore()
      })
    })
  })

  describe('Content Security Policy', () => {
    it('should include required directives', () => {
      const response = new NextResponse('test')
      const secureResponse = applySecurityHeaders(response)

      const csp = secureResponse.headers.get('Content-Security-Policy')!
      
      expect(csp).toContain("default-src 'self'")
      expect(csp).toContain("object-src 'none'")
      expect(csp).toContain("base-uri 'self'")
      expect(csp).toContain("frame-ancestors 'none'")
    })

    it('should allow Stripe domains for payments', () => {
      const response = new NextResponse('test')
      const secureResponse = applySecurityHeaders(response)

      const csp = secureResponse.headers.get('Content-Security-Policy')!
      
      expect(csp).toContain('https://js.stripe.com')
      expect(csp).toContain('https://api.stripe.com')
    })

    it('should include development settings in dev mode', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const response = new NextResponse('test')
      const secureResponse = applySecurityHeaders(response)

      const csp = secureResponse.headers.get('Content-Security-Policy')!
      expect(csp).toContain('ws://localhost:')

      process.env.NODE_ENV = originalEnv
    })
  })
})