'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { formatPrice, getPlanByTier } from '@/lib/stripe-config'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Calendar, CreditCard, Download, AlertCircle, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'

interface SubscriptionData {
  status: string
  tier: string
  stripeSubscription: {
    id: string
    status: string
    currentPeriodEnd: number
    cancelAtPeriodEnd: boolean
  } | null
}

interface PaymentData {
  id: string
  amount: number
  currency: string
  status: string
  description: string
  created: number
}

export function SubscriptionManager() {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [payments, setPayments] = useState<PaymentData[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchSubscriptionData()
    fetchPaymentHistory()
  }, [])

  const fetchSubscriptionData = async () => {
    try {
      const response = await fetch('/api/payments?action=subscription-status')
      const data = await response.json()
      if (data.success) {
        setSubscription(data.subscription)
      }
    } catch (error) {
      console.error('Error fetching subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPaymentHistory = async () => {
    try {
      const response = await fetch('/api/payments?action=payment-history')
      const data = await response.json()
      if (data.success) {
        setPayments(data.payments)
      }
    } catch (error) {
      console.error('Error fetching payment history:', error)
    }
  }

  const handleCancelSubscription = async () => {
    if (!subscription?.stripeSubscription?.id) return

    setActionLoading('cancel')
    try {
      const response = await fetch('/api/payments?action=cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: subscription.stripeSubscription.id
        })
      })

      const data = await response.json()
      if (data.success) {
        await fetchSubscriptionData()
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      past_due: "destructive",
      cancelled: "secondary",
      inactive: "outline"
    }
    
    return (
      <Badge variant={variants[status] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </Badge>
    )
  }

  const currentPlan = getPlanByTier(user?.subscriptionTier as any)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Subscription Management</h2>
        <p className="text-muted-foreground">
          Manage your EquiSplit subscription and billing information.
        </p>
      </div>

      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Current Plan
              </CardTitle>
              <CardDescription>
                Your active subscription details
              </CardDescription>
            </div>
            {subscription && getStatusBadge(subscription.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentPlan ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Plan</div>
                  <div className="text-lg font-semibold">{currentPlan.name}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Price</div>
                  <div className="text-lg font-semibold">
                    {currentPlan.price === 0 ? 'Free' : `${formatPrice(currentPlan.price)}/${currentPlan.billingPeriod}`}
                  </div>
                </div>
                {subscription?.stripeSubscription && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Next Billing</div>
                    <div className="text-lg font-semibold">
                      {format(new Date(subscription.stripeSubscription.currentPeriodEnd * 1000), 'MMM d, yyyy')}
                    </div>
                  </div>
                )}
              </div>

              {subscription?.stripeSubscription?.cancelAtPeriodEnd && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your subscription will be cancelled at the end of the current billing period on{' '}
                    {format(new Date(subscription.stripeSubscription.currentPeriodEnd * 1000), 'MMM d, yyyy')}.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                {currentPlan.tier !== 'FREE' && subscription?.stripeSubscription && !subscription.stripeSubscription.cancelAtPeriodEnd && (
                  <Button
                    variant="outline"
                    onClick={handleCancelSubscription}
                    disabled={actionLoading === 'cancel'}
                  >
                    {actionLoading === 'cancel' ? 'Cancelling...' : 'Cancel Subscription'}
                  </Button>
                )}
                <Button variant="outline" asChild>
                  <a href="/pricing">Change Plan</a>
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">No active subscription found.</p>
              <Button asChild>
                <a href="/pricing">View Plans</a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage & Limits */}
      {currentPlan && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Usage & Limits
            </CardTitle>
            <CardDescription>
              Current usage against your plan limits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Calculations</div>
                <div className="text-2xl font-bold">
                  {currentPlan.limits.calculations === -1 ? '∞' : `0/${currentPlan.limits.calculations}`}
                </div>
                <div className="text-xs text-muted-foreground">
                  {currentPlan.limits.calculations === -1 ? 'Unlimited' : 'This month'}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Documents</div>
                <div className="text-2xl font-bold">
                  {currentPlan.limits.documents === -1 ? '∞' : `0/${currentPlan.limits.documents}`}
                </div>
                <div className="text-xs text-muted-foreground">
                  {currentPlan.limits.documents === -1 ? 'Unlimited' : 'This month'}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Storage</div>
                <div className="text-2xl font-bold">0B</div>
                <div className="text-xs text-muted-foreground">
                  of {currentPlan.limits.storage}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Support</div>
                <div className="text-sm">{currentPlan.limits.support}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Payment History
          </CardTitle>
          <CardDescription>
            Your recent payments and invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length > 0 ? (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="font-medium">{payment.description || 'Subscription Payment'}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(payment.created * 1000), 'MMM d, yyyy')}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="font-medium">
                      {formatPrice(payment.amount / 100)}
                    </div>
                    {getStatusBadge(payment.status)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No payment history found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}