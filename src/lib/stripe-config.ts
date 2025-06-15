// Stripe Configuration and Pricing Plans for EquiSplit

export interface PricingPlan {
  id: string
  name: string
  tier: 'FREE' | 'PROFESSIONAL' | 'ENTERPRISE'
  stripePriceId?: string
  price: number
  billingPeriod: 'monthly' | 'yearly'
  features: string[]
  limits: {
    calculations: number
    documents: number
    storage: string
    support: string
  }
  popular?: boolean
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Basic',
    tier: 'FREE',
    price: 0,
    billingPeriod: 'monthly',
    features: [
      'Basic property division calculator',
      'Community property state support',
      'PDF export of basic results',
      'Educational resources',
      'Email support'
    ],
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
    stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
    price: 49.99,
    billingPeriod: 'monthly',
    features: [
      'Advanced property division calculator',
      'All 50 states + DC support',
      'Equitable distribution factors',
      'Professional document templates',
      'Marital Settlement Agreement generation',
      'Financial Affidavit templates',
      'Unlimited calculations',
      'Priority email support',
      'Live chat support'
    ],
    limits: {
      calculations: -1, // Unlimited
      documents: 25,
      storage: '5GB',
      support: 'Email + Live Chat (24 hours)'
    },
    popular: true
  },
  {
    id: 'professional-yearly',
    name: 'Professional (Annual)',
    tier: 'PROFESSIONAL',
    stripePriceId: process.env.STRIPE_PROFESSIONAL_YEARLY_PRICE_ID,
    price: 499.99,
    billingPeriod: 'yearly',
    features: [
      'All Professional features',
      '2 months free (annual billing)',
      'Priority support',
      'Early access to new features'
    ],
    limits: {
      calculations: -1, // Unlimited
      documents: 300,
      storage: '10GB',
      support: 'Email + Live Chat (12 hours)'
    }
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tier: 'ENTERPRISE',
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    price: 199.99,
    billingPeriod: 'monthly',
    features: [
      'All Professional features',
      'White-label branding',
      'Multi-client management',
      'API access',
      'Custom document templates',
      'Advanced reporting & analytics',
      'Dedicated account manager',
      'Phone support',
      'SLA guarantee',
      'Custom integrations'
    ],
    limits: {
      calculations: -1, // Unlimited
      documents: -1, // Unlimited
      storage: 'Unlimited',
      support: 'Phone + Email + Live Chat (4 hours)'
    }
  }
]

export const ONE_TIME_SERVICES = [
  {
    id: 'document-generation',
    name: 'Professional Document Package',
    description: 'One-time generation of complete divorce document package',
    price: 99.99,
    features: [
      'Marital Settlement Agreement',
      'Financial Affidavit',
      'Property Declaration',
      'State-specific forms',
      '30-day access to documents'
    ]
  },
  {
    id: 'legal-review',
    name: 'Legal Professional Review',
    description: 'Review of your property division by licensed attorney',
    price: 199.99,
    features: [
      'Attorney review of calculation',
      'Written assessment report',
      'Recommendations for optimization',
      '30-minute consultation call'
    ]
  }
]

export function getPlanByTier(tier: 'FREE' | 'PROFESSIONAL' | 'ENTERPRISE'): PricingPlan | undefined {
  return PRICING_PLANS.find(plan => plan.tier === tier && plan.billingPeriod === 'monthly')
}

export function getPlanById(id: string): PricingPlan | undefined {
  return PRICING_PLANS.find(plan => plan.id === id)
}

export function getStripePriceIds(): string[] {
  return PRICING_PLANS
    .filter(plan => plan.stripePriceId)
    .map(plan => plan.stripePriceId!)
}

export function getTierFromPriceId(priceId: string): 'FREE' | 'PROFESSIONAL' | 'ENTERPRISE' {
  const plan = PRICING_PLANS.find(p => p.stripePriceId === priceId)
  return plan?.tier || 'FREE'
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: price % 1 === 0 ? 0 : 2
  }).format(price)
}

export function calculateAnnualSavings(monthlyPrice: number, yearlyPrice: number): number {
  return (monthlyPrice * 12) - yearlyPrice
}

export function getSavingsPercentage(monthlyPrice: number, yearlyPrice: number): number {
  const savings = calculateAnnualSavings(monthlyPrice, yearlyPrice)
  return Math.round((savings / (monthlyPrice * 12)) * 100)
}

// Validate user's subscription tier against required tier for features
export function hasAccess(userTier: string, requiredTier: 'FREE' | 'PROFESSIONAL' | 'ENTERPRISE'): boolean {
  const tierHierarchy = {
    'FREE': 0,
    'PROFESSIONAL': 1,
    'ENTERPRISE': 2
  }
  
  const userLevel = tierHierarchy[userTier as keyof typeof tierHierarchy] ?? 0
  const requiredLevel = tierHierarchy[requiredTier]
  
  return userLevel >= requiredLevel
}

// Check if user has reached their usage limits
export function checkUsageLimit(
  userTier: string,
  usageType: 'calculations' | 'documents',
  currentUsage: number
): { allowed: boolean; limit: number; remaining: number } {
  const plan = getPlanByTier(userTier as any)
  if (!plan) {
    return { allowed: false, limit: 0, remaining: 0 }
  }
  
  const limit = plan.limits[usageType] as number
  
  if (limit === -1) {
    // Unlimited
    return { allowed: true, limit: -1, remaining: -1 }
  }
  
  const remaining = Math.max(0, limit - currentUsage)
  return {
    allowed: currentUsage < limit,
    limit,
    remaining
  }
}