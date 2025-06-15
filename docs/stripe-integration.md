# Stripe Payment Integration

## Overview

The EquiSplit application includes a comprehensive Stripe integration for handling subscription billing and one-time payments. This document outlines the implementation, configuration, and usage of the payment system.

## Features Implemented

### ✅ Core Payment Infrastructure
- **API Routes**: Complete payment API with subscription and one-time payment support
- **Webhook Handling**: Secure Stripe webhook processing for real-time updates
- **Customer Management**: Automatic Stripe customer creation and management
- **Subscription Management**: Full subscription lifecycle management

### ✅ Subscription Billing
- **Multiple Tiers**: Free, Professional, and Enterprise plans
- **Flexible Billing**: Monthly and yearly billing options
- **Usage Limits**: Tier-based feature restrictions and usage tracking
- **Cancellation**: Self-service subscription cancellation

### ✅ One-Time Payments
- **Document Packages**: Professional document generation services
- **Legal Reviews**: Attorney consultation services
- **Flexible Pricing**: Dynamic pricing for various services

### ✅ User Interface
- **Pricing Page**: Professional pricing display with feature comparison
- **Subscription Manager**: Complete subscription management dashboard
- **Usage Tracking**: Real-time usage monitoring and limits display
- **Payment History**: Complete payment and invoice history

### ✅ Security & Compliance
- **Webhook Verification**: Secure webhook signature validation
- **Audit Logging**: Comprehensive financial transaction logging
- **Data Encryption**: Secure handling of payment data
- **PCI Compliance**: Stripe-powered PCI DSS compliance

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── payments/
│   │   │   └── route.ts                 # Main payment API
│   │   └── webhooks/
│   │       └── stripe/
│   │           └── route.ts             # Webhook handler
│   └── pricing/
│       └── page.tsx                     # Pricing page
├── components/
│   └── subscription/
│       ├── pricing-plans.tsx            # Pricing display
│       └── subscription-manager.tsx     # Subscription management
├── lib/
│   └── stripe-config.ts                 # Pricing configuration
└── __tests__/
    ├── api/
    │   └── payments.test.ts             # API tests
    └── components/
        └── subscription/
            └── pricing-plans.test.tsx   # Component tests
```

## Configuration

### Environment Variables

```bash
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Optional: Specific Price IDs
STRIPE_PROFESSIONAL_PRICE_ID="price_professional_monthly"
STRIPE_PROFESSIONAL_YEARLY_PRICE_ID="price_professional_yearly"
STRIPE_ENTERPRISE_PRICE_ID="price_enterprise_monthly"
```

### Stripe Dashboard Setup

1. **Products & Prices**: Create products for each subscription tier
2. **Webhooks**: Configure webhook endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. **Events**: Enable these webhook events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `checkout.session.completed`

## API Endpoints

### POST /api/payments

#### Create Subscription
```typescript
POST /api/payments?action=create-subscription
{
  "priceId": "price_professional_monthly",
  "successUrl": "https://yourdomain.com/success",
  "cancelUrl": "https://yourdomain.com/cancel"
}
```

#### Create One-Time Payment
```typescript
POST /api/payments?action=create-payment
{
  "amount": 4999,
  "currency": "usd",
  "description": "Professional Document Package",
  "successUrl": "https://yourdomain.com/success",
  "cancelUrl": "https://yourdomain.com/cancel"
}
```

#### Cancel Subscription
```typescript
POST /api/payments?action=cancel-subscription
{
  "subscriptionId": "sub_1234567890"
}
```

### GET /api/payments

#### Get Subscription Status
```typescript
GET /api/payments?action=subscription-status
```

#### Get Payment History
```typescript
GET /api/payments?action=payment-history
```

## Subscription Tiers

### Free Tier
- **Price**: $0/month
- **Features**: Basic calculator, PDF export
- **Limits**: 3 calculations, 1 document, 100MB storage

### Professional Tier
- **Price**: $49.99/month or $499.99/year
- **Features**: All calculators, unlimited calculations, premium documents
- **Limits**: Unlimited calculations, 25 documents, 5GB storage

### Enterprise Tier
- **Price**: $199.99/month
- **Features**: White-label, API access, custom integrations
- **Limits**: Unlimited everything, dedicated support

## Usage Examples

### Frontend Integration

```typescript
// Create subscription
const createSubscription = async (priceId: string) => {
  const response = await fetch('/api/payments?action=create-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      priceId,
      successUrl: `${window.location.origin}/dashboard?success=true`,
      cancelUrl: `${window.location.origin}/pricing?canceled=true`
    })
  })
  
  const data = await response.json()
  if (data.success) {
    window.location.href = data.url
  }
}
```

### Check User Access
```typescript
import { hasAccess } from '@/lib/stripe-config'

// Check if user can access professional features
const canAccessProfessional = hasAccess(user.subscriptionTier, 'PROFESSIONAL')
```

### Usage Limiting
```typescript
import { checkUsageLimit } from '@/lib/stripe-config'

// Check calculation limit
const calculationLimit = checkUsageLimit(
  user.subscriptionTier,
  'calculations',
  currentCalculations
)

if (!calculationLimit.allowed) {
  // Show upgrade prompt
}
```

## Testing

### Running Tests
```bash
# Run all payment tests
npm test -- --testPathPatterns=payments

# Run with coverage
npm run test:coverage
```

### Test Coverage
- ✅ API route handlers
- ✅ Webhook processing
- ✅ Subscription management
- ✅ Payment creation
- ✅ Error handling
- ✅ Authentication
- ✅ UI components

## Security Considerations

### Webhook Security
- All webhooks verify Stripe signatures
- Webhook endpoints are rate-limited
- Sensitive operations require authentication

### Data Protection
- No payment data stored locally
- All transactions logged for audit compliance
- PCI DSS compliance through Stripe

### Access Control
- Tier-based feature access
- Usage limit enforcement
- Subscription status validation

## Monitoring & Logging

### Audit Trail
All payment-related actions are logged with:
- User ID and session information
- Action type and resource details
- Timestamp and IP address
- Compliance level (FINANCIAL)

### Error Handling
- Comprehensive error logging
- User-friendly error messages
- Fallback behavior for failed payments
- Automatic retry logic where appropriate

## Future Enhancements

### Phase 1 (Current)
- ✅ Basic subscription billing
- ✅ One-time payments
- ✅ Subscription management
- ✅ Usage tracking

### Phase 2 (Planned)
- [ ] Proration handling for plan changes
- [ ] Usage-based billing
- [ ] Multi-seat enterprise accounts
- [ ] Advanced analytics and reporting

### Phase 3 (Future)
- [ ] White-label payment processing
- [ ] Custom pricing for enterprise
- [ ] Advanced subscription features
- [ ] International payment methods

## Support & Troubleshooting

### Common Issues
1. **Webhook Failures**: Check endpoint URL and signature verification
2. **Payment Failures**: Verify Stripe keys and customer setup
3. **Subscription Issues**: Check subscription status in Stripe dashboard

### Debug Mode
Set `LOG_LEVEL=debug` to enable detailed payment logging.

### Contact
For payment-related issues, check:
1. Application logs
2. Stripe dashboard
3. Webhook delivery status
4. Customer payment methods

---

**Last Updated**: June 15, 2025  
**Version**: 1.0.0  
**Status**: ✅ Production Ready