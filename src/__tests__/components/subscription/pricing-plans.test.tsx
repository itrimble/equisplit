import { render, screen, fireEvent } from '@testing-library/react'
import { PricingPlans } from '@/components/subscription/pricing-plans'
import { useAuth } from '@/hooks/useAuth'

// Mock dependencies
jest.mock('@/hooks/useAuth')
jest.mock('@/lib/stripe-config', () => ({
  PRICING_PLANS: [
    {
      id: 'free',
      name: 'Basic',
      tier: 'FREE',
      price: 0,
      billingPeriod: 'monthly',
      features: ['Basic calculator', 'PDF export'],
      limits: {
        calculations: 3,
        documents: 1,
        storage: '100MB',
        support: 'Email (5 business days)'
      }
    },
    {
      id: 'professional',
      name: 'Professional',
      tier: 'PROFESSIONAL',
      stripePriceId: 'price_professional',
      price: 49.99,
      billingPeriod: 'monthly',
      features: ['Advanced calculator', 'All states'],
      limits: {
        calculations: -1,
        documents: 25,
        storage: '5GB',
        support: 'Email + Live Chat'
      },
      popular: true
    }
  ],
  formatPrice: (price: number) => `$${price}`,
  getSavingsPercentage: () => 20,
  hasAccess: (userTier: string, requiredTier: string) => userTier === requiredTier
}))

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

describe('PricingPlans', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:3000', href: '' },
      writable: true
    })
  })

  it('renders pricing plans correctly', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      error: null,
    } as any)

    render(<PricingPlans />)

    expect(screen.getByText('Basic')).toBeInTheDocument()
    expect(screen.getByText('Professional')).toBeInTheDocument()
    expect(screen.getByText('Most Popular')).toBeInTheDocument()
  })

  it('shows correct pricing information', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      error: null,
    } as any)

    render(<PricingPlans />)

    expect(screen.getByText('Free')).toBeInTheDocument()
    expect(screen.getByText('$49.99')).toBeInTheDocument()
  })

  it('displays features and limits correctly', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      error: null,
    } as any)

    render(<PricingPlans />)

    expect(screen.getByText('Basic calculator')).toBeInTheDocument()
    expect(screen.getByText('Advanced calculator')).toBeInTheDocument()
    expect(screen.getByText('Calculations: 3')).toBeInTheDocument()
    expect(screen.getByText('Calculations: Unlimited')).toBeInTheDocument()
  })

  it('shows billing toggle when enabled', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      error: null,
    } as any)

    render(<PricingPlans showBillingToggle={true} />)

    expect(screen.getByText('Monthly')).toBeInTheDocument()
    expect(screen.getByText('Yearly')).toBeInTheDocument()
  })

  it('handles plan selection', async () => {
    const mockOnPlanSelect = jest.fn()
    
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', subscriptionTier: 'FREE' },
      loading: false,
      error: null,
    } as any)

    render(<PricingPlans onPlanSelect={mockOnPlanSelect} />)

    const upgradeButton = screen.getByText('Upgrade')
    fireEvent.click(upgradeButton)

    expect(mockOnPlanSelect).toHaveBeenCalledWith('professional')
  })

  it('creates checkout session when no onPlanSelect provided', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        url: 'https://checkout.stripe.com/pay/cs_123'
      })
    } as any)

    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', subscriptionTier: 'FREE' },
      loading: false,
      error: null,
    } as any)

    render(<PricingPlans />)

    const upgradeButton = screen.getByText('Upgrade')
    fireEvent.click(upgradeButton)

    expect(mockFetch).toHaveBeenCalledWith('/api/payments?action=create-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId: 'price_professional',
        successUrl: 'http://localhost:3000/dashboard?success=true',
        cancelUrl: 'http://localhost:3000/pricing?canceled=true'
      })
    })
  })

  it('shows correct button text based on user subscription', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', subscriptionTier: 'PROFESSIONAL' },
      loading: false,
      error: null,
    } as any)

    render(<PricingPlans currentPlan="professional" />)

    expect(screen.getByText('Current Plan')).toBeInTheDocument()
  })

  it('disables current plan button', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', subscriptionTier: 'PROFESSIONAL' },
      loading: false,
      error: null,
    } as any)

    render(<PricingPlans currentPlan="professional" />)

    const currentPlanButton = screen.getByText('Current Plan')
    expect(currentPlanButton).toBeDisabled()
  })

  it('shows sign up for unauthenticated users', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      error: null,
    } as any)

    render(<PricingPlans />)

    const signUpButtons = screen.getAllByText('Sign Up')
    expect(signUpButtons.length).toBeGreaterThan(0)
  })
})