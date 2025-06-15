'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { PRICING_PLANS, formatPrice, getSavingsPercentage, hasAccess } from '@/lib/stripe-config'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Check, Zap, Star, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PricingPlansProps {
  onPlanSelect?: (planId: string) => void
  currentPlan?: string
  showBillingToggle?: boolean
}

export function PricingPlans({ onPlanSelect, currentPlan, showBillingToggle = true }: PricingPlansProps) {
  const { user } = useAuth()
  const [isYearly, setIsYearly] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  const filteredPlans = PRICING_PLANS.filter(plan => {
    if (plan.tier === 'FREE') return true
    if (isYearly) return plan.billingPeriod === 'yearly' || plan.id.includes('yearly')
    return plan.billingPeriod === 'monthly' && !plan.id.includes('yearly')
  })

  const handleSelectPlan = async (planId: string) => {
    if (loading) return
    
    setLoading(planId)
    try {
      if (onPlanSelect) {
        await onPlanSelect(planId)
      } else {
        // Default behavior: redirect to checkout
        await createCheckoutSession(planId)
      }
    } catch (error) {
      console.error('Error selecting plan:', error)
    } finally {
      setLoading(null)
    }
  }

  const createCheckoutSession = async (planId: string) => {
    const plan = PRICING_PLANS.find(p => p.id === planId)
    if (!plan?.stripePriceId) return

    const response = await fetch('/api/payments?action=create-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId: plan.stripePriceId,
        successUrl: `${window.location.origin}/dashboard?success=true`,
        cancelUrl: `${window.location.origin}/pricing?canceled=true`
      })
    })

    const data = await response.json()
    if (data.success && data.url) {
      window.location.href = data.url
    }
  }

  const getPlanIcon = (tier: string) => {
    switch (tier) {
      case 'FREE':
        return <Zap className="h-6 w-6" />
      case 'PROFESSIONAL':
        return <Star className="h-6 w-6" />
      case 'ENTERPRISE':
        return <Shield className="h-6 w-6" />
      default:
        return <Zap className="h-6 w-6" />
    }
  }

  const getPlanButtonText = (plan: any) => {
    if (!user) return 'Sign Up'
    if (plan.tier === 'FREE') return 'Current Plan'
    if (currentPlan === plan.id) return 'Current Plan'
    if (hasAccess(user.subscriptionTier || 'FREE', plan.tier)) return 'Downgrade'
    return 'Upgrade'
  }

  const isPlanDisabled = (plan: any) => {
    if (!user) return false
    if (plan.tier === 'FREE') return user.subscriptionTier === 'FREE'
    return currentPlan === plan.id
  }

  const yearlyPlan = PRICING_PLANS.find(p => p.tier === 'PROFESSIONAL' && p.billingPeriod === 'yearly')
  const monthlyPlan = PRICING_PLANS.find(p => p.tier === 'PROFESSIONAL' && p.billingPeriod === 'monthly')
  const savingsPercentage = yearlyPlan && monthlyPlan ? getSavingsPercentage(monthlyPlan.price, yearlyPlan.price) : 0

  return (
    <div className="space-y-8">
      {showBillingToggle && (
        <div className="flex items-center justify-center space-x-4">
          <Label htmlFor="billing-toggle" className={cn(!isYearly && "text-primary")}>
            Monthly
          </Label>
          <Switch
            id="billing-toggle"
            checked={isYearly}
            onCheckedChange={setIsYearly}
          />
          <Label htmlFor="billing-toggle" className={cn(isYearly && "text-primary")}>
            Yearly
          </Label>
          {savingsPercentage > 0 && isYearly && (
            <Badge variant="secondary" className="ml-2">
              Save {savingsPercentage}%
            </Badge>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {filteredPlans.map((plan) => (
          <Card 
            key={plan.id} 
            className={cn(
              "relative",
              plan.popular && "border-primary shadow-lg scale-105"
            )}
          >
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                Most Popular
              </Badge>
            )}
            
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                {getPlanIcon(plan.tier)}
              </div>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>
                <div className="text-3xl font-bold">
                  {plan.price === 0 ? 'Free' : formatPrice(plan.price)}
                </div>
                {plan.price > 0 && (
                  <div className="text-sm text-muted-foreground">
                    per {plan.billingPeriod}
                  </div>
                )}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 pt-6 border-t">
                <h4 className="font-semibold mb-2">Usage Limits</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div>Calculations: {plan.limits.calculations === -1 ? 'Unlimited' : plan.limits.calculations}</div>
                  <div>Documents: {plan.limits.documents === -1 ? 'Unlimited' : plan.limits.documents}</div>
                  <div>Storage: {plan.limits.storage}</div>
                  <div>Support: {plan.limits.support}</div>
                </div>
              </div>
            </CardContent>

            <CardFooter>
              <Button
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                onClick={() => handleSelectPlan(plan.id)}
                disabled={isPlanDisabled(plan) || loading === plan.id}
              >
                {loading === plan.id ? 'Processing...' : getPlanButtonText(plan)}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="text-center text-sm text-muted-foreground max-w-2xl mx-auto">
        <p>
          All plans include secure data encryption, audit trails, and compliance with legal industry standards.
          You can cancel or change your subscription at any time.
        </p>
      </div>
    </div>
  )
}