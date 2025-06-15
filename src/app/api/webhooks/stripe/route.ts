import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { auditLogger, AuditAction, ComplianceLevel } from '@/lib/audit'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      console.error('Missing Stripe signature')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      )
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    const customer = await stripe.customers.retrieve(subscription.customer as string)
    
    if (typeof customer === 'string' || !customer.metadata?.userId) {
      console.error('Customer not found or missing userId metadata')
      return
    }

    const userId = customer.metadata.userId
    const tier = getSubscriptionTier(subscription)

    // Update user subscription status
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: 'active',
        subscriptionTier: tier,
        subscriptionId: subscription.id,
      },
    })

    // Log subscription creation
    await auditLogger.logUserAction(
      userId,
      AuditAction.PAYMENT,
      'webhook/stripe/subscription.created',
      null as any, // No request object in webhook
      {
        subscriptionId: subscription.id,
        tier,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
      },
      ComplianceLevel.FINANCIAL
    )

    console.log(`Subscription created for user ${userId}: ${subscription.id}`)

  } catch (error) {
    console.error('Error handling subscription created:', error)
    throw error
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const customer = await stripe.customers.retrieve(subscription.customer as string)
    
    if (typeof customer === 'string' || !customer.metadata?.userId) {
      console.error('Customer not found or missing userId metadata')
      return
    }

    const userId = customer.metadata.userId
    const tier = getSubscriptionTier(subscription)
    const status = getSubscriptionStatus(subscription.status)

    // Update user subscription status
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: status,
        subscriptionTier: tier,
        subscriptionId: subscription.id,
      },
    })

    // Log subscription update
    await auditLogger.logUserAction(
      userId,
      AuditAction.PAYMENT,
      'webhook/stripe/subscription.updated',
      null as any,
      {
        subscriptionId: subscription.id,
        tier,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      ComplianceLevel.FINANCIAL
    )

    console.log(`Subscription updated for user ${userId}: ${subscription.id}`)

  } catch (error) {
    console.error('Error handling subscription updated:', error)
    throw error
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const customer = await stripe.customers.retrieve(subscription.customer as string)
    
    if (typeof customer === 'string' || !customer.metadata?.userId) {
      console.error('Customer not found or missing userId metadata')
      return
    }

    const userId = customer.metadata.userId

    // Update user subscription status
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: 'cancelled',
        subscriptionTier: 'FREE',
        subscriptionId: null,
      },
    })

    // Log subscription deletion
    await auditLogger.logUserAction(
      userId,
      AuditAction.PAYMENT,
      'webhook/stripe/subscription.deleted',
      null as any,
      {
        subscriptionId: subscription.id,
        canceledAt: subscription.canceled_at,
      },
      ComplianceLevel.FINANCIAL
    )

    console.log(`Subscription cancelled for user ${userId}: ${subscription.id}`)

  } catch (error) {
    console.error('Error handling subscription deleted:', error)
    throw error
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    if (!invoice.subscription) {
      // Handle one-time payment
      await handleOneTimePaymentSucceeded(invoice)
      return
    }

    const customer = await stripe.customers.retrieve(invoice.customer as string)
    
    if (typeof customer === 'string' || !customer.metadata?.userId) {
      console.error('Customer not found or missing userId metadata')
      return
    }

    const userId = customer.metadata.userId

    // Log successful payment
    await auditLogger.logUserAction(
      userId,
      AuditAction.PAYMENT,
      'webhook/stripe/payment.succeeded',
      null as any,
      {
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription,
        amount: invoice.amount_paid,
        currency: invoice.currency,
      },
      ComplianceLevel.FINANCIAL
    )

    console.log(`Payment succeeded for user ${userId}: ${invoice.id}`)

  } catch (error) {
    console.error('Error handling payment succeeded:', error)
    throw error
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  try {
    const customer = await stripe.customers.retrieve(invoice.customer as string)
    
    if (typeof customer === 'string' || !customer.metadata?.userId) {
      console.error('Customer not found or missing userId metadata')
      return
    }

    const userId = customer.metadata.userId

    // Log failed payment
    await auditLogger.logUserAction(
      userId,
      AuditAction.PAYMENT,
      'webhook/stripe/payment.failed',
      null as any,
      {
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription,
        amount: invoice.amount_due,
        currency: invoice.currency,
        nextPaymentAttempt: invoice.next_payment_attempt,
      },
      ComplianceLevel.FINANCIAL
    )

    // Update subscription status to past_due if applicable
    if (invoice.subscription) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: 'past_due',
        },
      })
    }

    console.log(`Payment failed for user ${userId}: ${invoice.id}`)

  } catch (error) {
    console.error('Error handling payment failed:', error)
    throw error
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  try {
    if (!session.metadata?.userId) {
      console.error('Checkout session missing userId metadata')
      return
    }

    const userId = session.metadata.userId

    // Log checkout completion
    await auditLogger.logUserAction(
      userId,
      AuditAction.PAYMENT,
      'webhook/stripe/checkout.completed',
      null as any,
      {
        sessionId: session.id,
        mode: session.mode,
        amount: session.amount_total,
        currency: session.currency,
      },
      ComplianceLevel.FINANCIAL
    )

    console.log(`Checkout completed for user ${userId}: ${session.id}`)

  } catch (error) {
    console.error('Error handling checkout completed:', error)
    throw error
  }
}

async function handleOneTimePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    const customer = await stripe.customers.retrieve(invoice.customer as string)
    
    if (typeof customer === 'string' || !customer.metadata?.userId) {
      console.error('Customer not found or missing userId metadata')
      return
    }

    const userId = customer.metadata.userId

    // Log one-time payment
    await auditLogger.logUserAction(
      userId,
      AuditAction.PAYMENT,
      'webhook/stripe/one-time-payment.succeeded',
      null as any,
      {
        invoiceId: invoice.id,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        description: invoice.description,
      },
      ComplianceLevel.FINANCIAL
    )

    console.log(`One-time payment succeeded for user ${userId}: ${invoice.id}`)

  } catch (error) {
    console.error('Error handling one-time payment succeeded:', error)
    throw error
  }
}

function getSubscriptionTier(subscription: Stripe.Subscription): 'FREE' | 'PROFESSIONAL' | 'ENTERPRISE' {
  const priceId = subscription.items.data[0]?.price.id
  
  // Map Stripe price IDs to subscription tiers
  // These would be set up in your Stripe dashboard
  if (priceId?.includes('professional') || priceId?.includes('pro')) {
    return 'PROFESSIONAL'
  } else if (priceId?.includes('enterprise') || priceId?.includes('ent')) {
    return 'ENTERPRISE'
  }
  
  return 'FREE'
}

function getSubscriptionStatus(stripeStatus: string): 'active' | 'past_due' | 'cancelled' | 'inactive' {
  switch (stripeStatus) {
    case 'active':
      return 'active'
    case 'past_due':
      return 'past_due'
    case 'canceled':
    case 'cancelled':
      return 'cancelled'
    default:
      return 'inactive'
  }
}