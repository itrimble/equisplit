import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/payments/route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

// Mock dependencies
jest.mock('@/lib/auth')
jest.mock('@/lib/prisma')
jest.mock('@/lib/audit')
jest.mock('stripe')

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
} as any

const mockStripe = {
  customers: {
    create: jest.fn(),
    retrieve: jest.fn(),
  },
  checkout: {
    sessions: {
      create: jest.fn(),
    },
  },
  subscriptions: {
    retrieve: jest.fn(),
    cancel: jest.fn(),
    list: jest.fn(),
  },
  paymentIntents: {
    list: jest.fn(),
  },
} as any

// Mock audit logger
jest.mock('@/lib/audit', () => ({
  auditLogger: {
    logUserAction: jest.fn(),
  },
  AuditAction: {
    PAYMENT: 'payment',
    READ: 'read',
  },
  ComplianceLevel: {
    FINANCIAL: 'financial',
  },
}))

describe('/api/payments', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(prisma as any) = mockPrisma
    ;(Stripe as any).mockImplementation(() => mockStripe)
  })

  describe('POST /api/payments', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      stripeCustomerId: null,
    }

    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123' },
      } as any)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    })

    it('creates subscription checkout session successfully', async () => {
      const mockCheckoutSession = {
        id: 'cs_123',
        url: 'https://checkout.stripe.com/pay/cs_123',
      }

      mockStripe.customers.create.mockResolvedValue({
        id: 'cus_123',
      })
      mockStripe.checkout.sessions.create.mockResolvedValue(mockCheckoutSession)
      mockPrisma.user.update.mockResolvedValue({})

      const request = new NextRequest('http://localhost:3000/api/payments?action=create-subscription', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_professional',
          successUrl: 'http://localhost:3000/success',
          cancelUrl: 'http://localhost:3000/cancel',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.sessionId).toBe('cs_123')
      expect(data.url).toBe('https://checkout.stripe.com/pay/cs_123')
    })

    it('creates one-time payment checkout session successfully', async () => {
      const mockCheckoutSession = {
        id: 'cs_456',
        url: 'https://checkout.stripe.com/pay/cs_456',
      }

      mockStripe.customers.create.mockResolvedValue({
        id: 'cus_123',
      })
      mockStripe.checkout.sessions.create.mockResolvedValue(mockCheckoutSession)
      mockPrisma.user.update.mockResolvedValue({})

      const request = new NextRequest('http://localhost:3000/api/payments?action=create-payment', {
        method: 'POST',
        body: JSON.stringify({
          amount: 4999, // $49.99
          currency: 'usd',
          description: 'Professional Document Package',
          successUrl: 'http://localhost:3000/success',
          cancelUrl: 'http://localhost:3000/cancel',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.sessionId).toBe('cs_456')
    })

    it('cancels subscription successfully', async () => {
      const mockSubscription = {
        id: 'sub_123',
        customer: 'cus_123',
        canceled_at: 1234567890,
      }

      const mockCustomer = {
        id: 'cus_123',
        metadata: { userId: 'user-123' },
      }

      mockStripe.subscriptions.retrieve.mockResolvedValue(mockSubscription)
      mockStripe.customers.retrieve.mockResolvedValue(mockCustomer)
      mockStripe.subscriptions.cancel.mockResolvedValue(mockSubscription)
      mockPrisma.user.update.mockResolvedValue({})

      const request = new NextRequest('http://localhost:3000/api/payments?action=cancel-subscription', {
        method: 'POST',
        body: JSON.stringify({
          subscriptionId: 'sub_123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('rejects unauthenticated requests', async () => {
      mockAuth.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/payments?action=create-subscription', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('validates request data', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments?action=create-subscription', {
        method: 'POST',
        body: JSON.stringify({
          // Missing required fields
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
    })
  })

  describe('GET /api/payments', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123' },
      } as any)
    })

    it('gets subscription status successfully', async () => {
      const mockUser = {
        subscriptionStatus: 'active',
        subscriptionTier: 'PROFESSIONAL',
        stripeCustomerId: 'cus_123',
      }

      const mockSubscription = {
        id: 'sub_123',
        status: 'active',
        current_period_end: 1234567890,
        cancel_at_period_end: false,
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockStripe.subscriptions.list.mockResolvedValue({
        data: [mockSubscription],
      })

      const request = new NextRequest('http://localhost:3000/api/payments?action=subscription-status')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.subscription.status).toBe('active')
      expect(data.subscription.tier).toBe('PROFESSIONAL')
    })

    it('gets payment history successfully', async () => {
      const mockUser = {
        stripeCustomerId: 'cus_123',
      }

      const mockPayments = {
        data: [
          {
            id: 'pi_123',
            amount: 4999,
            currency: 'usd',
            status: 'succeeded',
            description: 'Subscription payment',
            created: 1234567890,
          },
        ],
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockStripe.paymentIntents.list.mockResolvedValue(mockPayments)

      const request = new NextRequest('http://localhost:3000/api/payments?action=payment-history')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.payments).toHaveLength(1)
      expect(data.payments[0].id).toBe('pi_123')
    })
  })
})