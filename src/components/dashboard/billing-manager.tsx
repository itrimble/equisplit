import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCardIcon, 
  DocumentTextIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowUpIcon 
} from '@heroicons/react/24/outline';

interface BillingManagerProps {
  userId: string;
}

// Mock data - replace with actual Stripe API calls
async function getBillingData(userId: string) {
  return {
    subscription: {
      tier: 'FREE', // FREE, PROFESSIONAL, ENTERPRISE
      status: 'active',
      currentPeriodEnd: new Date('2024-07-15'),
      cancelAtPeriodEnd: false,
      priceId: null,
      amount: 0,
    },
    paymentMethod: null, // Mock: no payment method for free tier
    invoices: [
      {
        id: 'inv_123',
        amount: 4999, // cents
        status: 'paid',
        created: new Date('2024-05-15'),
        invoiceUrl: 'https://stripe.com/invoice/123',
      },
    ],
    usage: {
      calculations: { used: 2, limit: 3 },
      documents: { used: 1, limit: 1 },
      storage: { used: 25, limit: 100 }, // MB
    },
  };
}

const pricingPlans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'forever',
    features: [
      '3 calculations per month',
      '1 document generation',
      '100MB storage',
      'Basic support',
    ],
    limitations: [
      'Limited calculations',
      'Basic document templates',
      'Email support only',
    ],
    current: true,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 4999, // cents
    interval: 'month',
    features: [
      'Unlimited calculations',
      '25 document generations',
      '5GB storage',
      'Advanced templates',
      'Priority support',
      'Audit trail',
    ],
    limitations: [],
    current: false,
    recommended: true,
  },
  {
    id: 'professional_yearly',
    name: 'Professional (Yearly)',
    price: 49999, // cents
    interval: 'year',
    savings: '2 months free',
    features: [
      'Everything in Professional',
      '2 months free',
      'Annual billing discount',
    ],
    limitations: [],
    current: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 19999, // cents
    interval: 'month',
    features: [
      'Everything in Professional',
      'Unlimited documents',
      'Unlimited storage',
      'White-label options',
      'Custom integrations',
      'Dedicated support',
    ],
    limitations: [],
    current: false,
  },
];

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200">Active</Badge>;
    case 'past_due':
      return <Badge variant="outline" className="text-red-700 bg-red-50 border-red-200">Past Due</Badge>;
    case 'canceled':
      return <Badge variant="outline" className="text-gray-700 bg-gray-50 border-gray-200">Canceled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export async function BillingManager({ userId }: BillingManagerProps) {
  const billingData = await getBillingData(userId);

  return (
    <div className="space-y-6">
      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCardIcon className="h-5 w-5" />
            Current Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {billingData.subscription.tier === 'FREE' ? 'Free Plan' : billingData.subscription.tier}
              </h3>
              <p className="text-gray-600">
                {billingData.subscription.tier === 'FREE' 
                  ? 'No payment required'
                  : `${formatPrice(billingData.subscription.amount)} per ${billingData.subscription.tier === 'PROFESSIONAL' ? 'month' : 'year'}`
                }
              </p>
            </div>
            
            <div className="text-right">
              {getStatusBadge(billingData.subscription.status)}
              {billingData.subscription.currentPeriodEnd && billingData.subscription.tier !== 'FREE' && (
                <p className="text-sm text-gray-500 mt-1">
                  {billingData.subscription.cancelAtPeriodEnd ? 'Cancels' : 'Renews'} on{' '}
                  {billingData.subscription.currentPeriodEnd.toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Usage Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {billingData.usage.calculations.used} / {billingData.usage.calculations.limit}
              </div>
              <p className="text-sm text-gray-500">Calculations</p>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {billingData.usage.documents.used} / {billingData.usage.documents.limit}
              </div>
              <p className="text-sm text-gray-500">Documents</p>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {billingData.usage.storage.used} MB
              </div>
              <p className="text-sm text-gray-500">Storage Used</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {billingData.subscription.tier === 'FREE' ? (
              <Button className="flex items-center gap-2">
                <ArrowUpIcon className="h-4 w-4" />
                Upgrade Plan
              </Button>
            ) : (
              <>
                <Button variant="outline">
                  Change Plan
                </Button>
                <Button variant="outline" className="text-red-600 hover:text-red-700">
                  Cancel Subscription
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      {billingData.subscription.tier === 'FREE' && (
        <Card>
          <CardHeader>
            <CardTitle>Upgrade Your Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
              {pricingPlans.filter(plan => plan.id !== 'free').map((plan) => (
                <div
                  key={plan.id}
                  className={`relative border rounded-lg p-6 ${
                    plan.recommended ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  {plan.recommended && (
                    <Badge className="absolute -top-3 left-6 bg-blue-600">
                      Recommended
                    </Badge>
                  )}
                  
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {plan.name}
                    </h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-gray-900">
                        {formatPrice(plan.price)}
                      </span>
                      <span className="text-gray-500">
                        /{plan.interval}
                      </span>
                    </div>
                    {plan.savings && (
                      <p className="text-sm text-green-600 mt-1">
                        {plan.savings}
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className="w-full"
                    variant={plan.recommended ? "default" : "outline"}
                  >
                    Upgrade to {plan.name}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCardIcon className="h-5 w-5" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          {billingData.paymentMethod ? (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <CreditCardIcon className="h-8 w-8 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">
                    •••• •••• •••• {billingData.paymentMethod.last4}
                  </p>
                  <p className="text-sm text-gray-500">
                    Expires {billingData.paymentMethod.exp_month}/{billingData.paymentMethod.exp_year}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Update
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCardIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No payment method
              </h3>
              <p className="text-gray-500 mb-4">
                Add a payment method to upgrade your plan
              </p>
              <Button variant="outline">
                Add Payment Method
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5" />
            Billing History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {billingData.invoices.length > 0 ? (
            <div className="space-y-4">
              {billingData.invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">
                      {formatPrice(invoice.amount)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {invoice.created.toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant="outline" 
                      className={invoice.status === 'paid' 
                        ? 'text-green-700 bg-green-50 border-green-200'
                        : 'text-red-700 bg-red-50 border-red-200'
                      }
                    >
                      {invoice.status}
                    </Badge>
                    <Button variant="outline" size="sm">
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No billing history available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}