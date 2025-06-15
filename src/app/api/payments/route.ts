import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { auditLogger, AuditAction, ComplianceLevel } from '@/lib/audit'
import { validateApiRequest } from '@/lib/validation'
import { prisma } from '@/lib/prisma'
import { withSecurity, SECURITY_CONFIGS } from '@/lib/security-middleware'
import Stripe from 'stripe'
import { z } from 'zod'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

// Request schemas
const createSubscriptionSchema = z.object({
  priceId: z.string(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
})

const cancelSubscriptionSchema = z.object({
  subscriptionId: z.string(),
})

const createPaymentSchema = z.object({
  amount: z.number().min(100), // $1.00 minimum
  currency: z.string().default('usd'),
  description: z.string(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
})

async function handlePOST(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const body = await request.json()

    switch (action) {
      case 'create-subscription':
        return await handleCreateSubscription(request, session.user.id, body)
      case 'cancel-subscription':
        return await handleCancelSubscription(request, session.user.id, body)
      case 'create-payment':
        return await handleCreatePayment(request, session.user.id, body)
      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Payment API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleCreateSubscription(request: NextRequest, userId: string, body: any) {
  const validation = validateApiRequest(body, createSubscriptionSchema)
  
  if (!validation.success) {
    await auditLogger.logUserAction(
      userId,
      AuditAction.PAYMENT,
      '/api/payments?action=create-subscription',
      request,
      { errors: validation.errors },
      ComplianceLevel.FINANCIAL
    )
    
    return NextResponse.json(
      { error: 'Invalid request data', details: validation.errors },
      { status: 400 }
    )
  }

  const { priceId, successUrl, cancelUrl } = validation.data

  try {
    // Get or create Stripe customer
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    let customerId = user.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          userId: userId,
        },
      })
      
      customerId = customer.id
      
      // Update user with Stripe customer ID
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      })
    }

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId,
      },
    })

    // Log payment attempt
    await auditLogger.logUserAction(
      userId,
      AuditAction.PAYMENT,
      '/api/payments?action=create-subscription',
      request,
      {
        priceId,
        sessionId: checkoutSession.id,
        amount: 'subscription',
      },
      ComplianceLevel.FINANCIAL
    )

    const response = NextResponse.json({
      success: true,
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    })

    // Add legal disclaimer headers
    response.headers.set('X-Legal-Disclaimer', 'Educational platform only. Not legal advice.')
    response.headers.set('X-Professional-Consultation', 'Consult qualified legal professionals.')

    return response

  } catch (error) {
    console.error('Stripe subscription error:', error)
    
    await auditLogger.logUserAction(
      userId,
      AuditAction.PAYMENT,
      '/api/payments?action=create-subscription',
      request,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      ComplianceLevel.FINANCIAL
    )

    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    )
  }
}

async function handleCancelSubscription(request: NextRequest, userId: string, body: any) {
  const validation = validateApiRequest(body, cancelSubscriptionSchema)
  
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request data', details: validation.errors },
      { status: 400 }
    )
  }

  const { subscriptionId } = validation.data

  try {
    // Verify subscription belongs to user
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const customer = await stripe.customers.retrieve(subscription.customer as string)
    
    if (typeof customer === 'string' || customer.metadata?.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Cancel subscription
    const canceledSubscription = await stripe.subscriptions.cancel(subscriptionId)

    // Update user subscription status
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: 'cancelled',
        subscriptionTier: 'FREE',
      },
    })

    // Log cancellation
    await auditLogger.logUserAction(
      userId,
      AuditAction.PAYMENT,
      '/api/payments?action=cancel-subscription',
      request,
      {
        subscriptionId,
        canceledAt: canceledSubscription.canceled_at,
      },
      ComplianceLevel.FINANCIAL
    )

    const response = NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
    })

    // Add legal disclaimer headers
    response.headers.set('X-Legal-Disclaimer', 'Educational platform only. Not legal advice.')
    response.headers.set('X-Professional-Consultation', 'Consult qualified legal professionals.')

    return response

  } catch (error) {
    console.error('Stripe cancellation error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}

async function handleCreatePayment(request: NextRequest, userId: string, body: any) {
  const validation = validateApiRequest(body, createPaymentSchema)
  
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request data', details: validation.errors },
      { status: 400 }
    )
  }

  const { amount, currency, description, successUrl, cancelUrl } = validation.data

  try {
    // Get or create Stripe customer
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    let customerId = user.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          userId: userId,
        },
      })
      
      customerId = customer.id
      
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      })
    }

    // Create Stripe Checkout Session for one-time payment
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: description,
            },
            unit_amount: amount, // Amount in cents
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId,
        description: description,
      },
    })

    // Log payment attempt
    await auditLogger.logUserAction(
      userId,
      AuditAction.PAYMENT,
      '/api/payments?action=create-payment',
      request,
      {
        amount,
        currency,
        description,
        sessionId: checkoutSession.id,
      },
      ComplianceLevel.FINANCIAL
    )

    const response = NextResponse.json({
      success: true,
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    })

    // Add legal disclaimer headers
    response.headers.set('X-Legal-Disclaimer', 'Educational platform only. Not legal advice.')
    response.headers.set('X-Professional-Consultation', 'Consult qualified legal professionals.')

    return response

  } catch (error) {
    console.error('Stripe payment error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    )
  }
}

async function handleGET(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'subscription-status':
        return await getSubscriptionStatus(request, session.user.id)
      case 'payment-history':
        return await getPaymentHistory(request, session.user.id)
      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Payment GET API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getSubscriptionStatus(request: NextRequest, userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionStatus: true,
        subscriptionTier: true,
        stripeCustomerId: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    let stripeSubscription = null
    
    if (user.stripeCustomerId) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          status: 'active',
          limit: 1,
        })
        
        stripeSubscription = subscriptions.data[0] || null
      } catch (error) {
        console.error('Error fetching Stripe subscription:', error)
      }
    }

    // Log access
    await auditLogger.logUserAction(
      userId,
      AuditAction.READ,
      '/api/payments?action=subscription-status',
      request,
      { hasActiveSubscription: !!stripeSubscription },
      ComplianceLevel.FINANCIAL
    )

    const response = NextResponse.json({
      success: true,
      subscription: {
        status: user.subscriptionStatus,
        tier: user.subscriptionTier,
        stripeSubscription: stripeSubscription ? {
          id: stripeSubscription.id,
          status: stripeSubscription.status,
          currentPeriodEnd: stripeSubscription.current_period_end,
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        } : null,
      },
    })

    // Add legal disclaimer headers
    response.headers.set('X-Legal-Disclaimer', 'Educational platform only. Not legal advice.')
    response.headers.set('X-Professional-Consultation', 'Consult qualified legal professionals.')

    return response

  } catch (error) {
    console.error('Get subscription status error:', error)
    return NextResponse.json(
      { error: 'Failed to get subscription status' },
      { status: 500 }
    )
  }
}

async function getPaymentHistory(request: NextRequest, userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    })

    if (!user?.stripeCustomerId) {
      const response = NextResponse.json({
        success: true,
        payments: [],
      })

      // Add legal disclaimer headers
      response.headers.set('X-Legal-Disclaimer', 'Educational platform only. Not legal advice.')
      response.headers.set('X-Professional-Consultation', 'Consult qualified legal professionals.')

      return response
    }

    // Get payment history from Stripe
    const paymentIntents = await stripe.paymentIntents.list({
      customer: user.stripeCustomerId,
      limit: 20,
    })

    const payments = paymentIntents.data.map(payment => ({
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      description: payment.description,
      created: payment.created,
    }))

    // Log access
    await auditLogger.logUserAction(
      userId,
      AuditAction.READ,
      '/api/payments?action=payment-history',
      request,
      { paymentCount: payments.length },
      ComplianceLevel.FINANCIAL
    )

    const response = NextResponse.json({
      success: true,
      payments,
    })

    // Add legal disclaimer headers
    response.headers.set('X-Legal-Disclaimer', 'Educational platform only. Not legal advice.')
    response.headers.set('X-Professional-Consultation', 'Consult qualified legal professionals.')

    return response

  } catch (error) {
    console.error('Get payment history error:', error)
    return NextResponse.json(
      { error: 'Failed to get payment history' },
      { status: 500 }
    )
  }
}

// Export handlers with security middleware
export const POST = withSecurity(handlePOST, SECURITY_CONFIGS.PAYMENT)
export const GET = withSecurity(handleGET, SECURITY_CONFIGS.PAYMENT)