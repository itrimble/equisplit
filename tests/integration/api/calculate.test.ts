/**
 * @jest-environment node
 */

import { createRequest, createResponse } from 'node-mocks-http'
import { POST } from '@/app/api/calculate/route'
import { CalculationInputs, USState } from '@/types'

// Mock next-auth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(() => Promise.resolve({
    user: { id: 'test-user-id', email: 'test@example.com' }
  }))
}))

describe('/api/calculate', () => {
  const validInputs: CalculationInputs = {
    personalInfo: {
      spouse1Name: 'John Doe',
      spouse2Name: 'Jane Doe',
      marriageDate: '2015-01-01',
      separationDate: '2024-01-01',
      filingState: 'PA' as USState,
      hasChildren: false,
    },
    assets: [
      {
        id: '1',
        name: 'Family Home',
        value: 500000,
        type: 'real_estate',
        isMarital: true,
      },
      {
        id: '2',
        name: 'Investment Account',
        value: 100000,
        type: 'investment',
        isMarital: true,
      },
    ],
    debts: [
      {
        id: '1',
        name: 'Mortgage',
        amount: 200000,
        type: 'mortgage',
        isMarital: true,
      },
    ],
    realEstate: [],
    personalProperty: [],
    financialAccounts: [],
    specialCircumstances: {
      marriageDuration: 9,
      ageSpouse1: 45,
      ageSpouse2: 42,
      healthSpouse1: 'good',
      healthSpouse2: 'good',
      incomeSpouse1: 75000,
      incomeSpouse2: 65000,
      earnCapacitySpouse1: 75000,
      earnCapacitySpouse2: 65000,
      contributionToMarriage: 'Equal contributions',
      custodyArrangement: undefined,
      domesticViolence: false,
      wastingOfAssets: false,
      taxConsequences: false,
    },
  }

  it('should calculate property division successfully', async () => {
    const request = new Request('http://localhost:3000/api/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: validInputs }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.result).toBeDefined()
    expect(data.result.spouse1Share).toBeGreaterThanOrEqual(0.3)
    expect(data.result.spouse1Share).toBeLessThanOrEqual(0.7)
    expect(data.result.totalMaritalAssets).toBe(600000)
    expect(data.result.totalMaritalDebts).toBe(200000)
    expect(data.result.confidenceLevel).toBeGreaterThan(0)
  })

  it('should handle community property states', async () => {
    const communityPropertyInputs = {
      ...validInputs,
      personalInfo: {
        ...validInputs.personalInfo,
        filingState: 'CA' as USState,
      },
    }

    const request = new Request('http://localhost:3000/api/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: communityPropertyInputs }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.result.spouse1Share).toBe(0.5)
    expect(data.result.spouse2Share).toBe(0.5)
  })

  it('should validate required fields', async () => {
    const invalidInputs = {
      ...validInputs,
      personalInfo: {
        ...validInputs.personalInfo,
        spouse1Name: '', // Missing required field
      },
    }

    const request = new Request('http://localhost:3000/api/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: invalidInputs }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('validation')
  })

  it('should handle malformed request body', async () => {
    const request = new Request('http://localhost:3000/api/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: 'invalid json',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Invalid request')
  })

  it('should require authentication', async () => {
    // Mock unauthenticated session
    const { getServerSession } = require('next-auth/next')
    getServerSession.mockResolvedValueOnce(null)

    const request = new Request('http://localhost:3000/api/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: validInputs }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Unauthorized')
  })

  it('should apply rate limiting', async () => {
    const request = new Request('http://localhost:3000/api/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '192.168.1.1',
      },
      body: JSON.stringify({ inputs: validInputs }),
    })

    // Make multiple rapid requests
    const promises = Array(10).fill(0).map(() => POST(request.clone()))
    const responses = await Promise.all(promises)

    // At least one should be rate limited
    const rateLimitedResponse = responses.find(res => res.status === 429)
    expect(rateLimitedResponse).toBeDefined()
  })

  it('should save calculation to database', async () => {
    const request = new Request('http://localhost:3000/api/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: validInputs }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.calculationId).toBeDefined()
    expect(typeof data.calculationId).toBe('string')
  })

  it('should handle edge cases', async () => {
    const edgeCaseInputs = {
      ...validInputs,
      assets: [], // No assets
      debts: [], // No debts
    }

    const request = new Request('http://localhost:3000/api/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: edgeCaseInputs }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.result.totalMaritalAssets).toBe(0)
    expect(data.result.totalMaritalDebts).toBe(0)
  })

  it('should handle very large asset values', async () => {
    const largeValueInputs = {
      ...validInputs,
      assets: [
        {
          id: '1',
          name: 'Large Asset',
          value: 10000000000, // 10 billion
          type: 'investment',
          isMarital: true,
        },
      ],
    }

    const request = new Request('http://localhost:3000/api/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: largeValueInputs }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.result.totalMaritalAssets).toBe(10000000000)
  })

  describe('Security Tests', () => {
    it('should sanitize input data', async () => {
      const maliciousInputs = {
        ...validInputs,
        personalInfo: {
          ...validInputs.personalInfo,
          spouse1Name: '<script>alert("xss")</script>',
        },
      }

      const request = new Request('http://localhost:3000/api/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: maliciousInputs }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // The script tag should be sanitized
      expect(data.result.spouse1Name).not.toContain('<script>')
    })

    it('should prevent SQL injection attempts', async () => {
      const sqlInjectionInputs = {
        ...validInputs,
        personalInfo: {
          ...validInputs.personalInfo,
          spouse1Name: "'; DROP TABLE users; --",
        },
      }

      const request = new Request('http://localhost:3000/api/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: sqlInjectionInputs }),
      })

      const response = await POST(request)
      
      // Should not crash and should handle safely
      expect(response.status).toBeLessThan(500)
    })

    it('should enforce content length limits', async () => {
      const largeInput = 'x'.repeat(1000000) // 1MB string

      const request = new Request('http://localhost:3000/api/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          inputs: {
            ...validInputs,
            personalInfo: {
              ...validInputs.personalInfo,
              spouse1Name: largeInput,
            },
          },
        }),
      })

      const response = await POST(request)
      
      expect(response.status).toBe(413) // Payload too large
    })
  })
})