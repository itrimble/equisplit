import { Metadata } from 'next'
import { PricingPlans } from '@/components/subscription/pricing-plans'
import { ONE_TIME_SERVICES } from '@/lib/stripe-config'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, HelpCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Pricing Plans | EquiSplit',
  description: 'Choose the perfect plan for your property division needs. From basic calculations to professional legal document generation.',
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Choose the plan that fits your needs. All plans include secure data encryption,
            legal compliance, and accurate calculations for property division.
          </p>
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>No hidden fees</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>All 50 states supported</span>
            </div>
          </div>
        </div>

        {/* Pricing Plans */}
        <PricingPlans />

        {/* One-Time Services */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              One-Time Services
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Need specific services without a subscription? Our one-time offerings
              provide professional support when you need it most.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {ONE_TIME_SERVICES.map((service) => (
              <Card key={service.id} className="relative">
                <CardHeader>
                  <CardTitle className="text-xl">{service.name}</CardTitle>
                  <CardDescription>{service.description}</CardDescription>
                  <div className="text-2xl font-bold text-primary">
                    ${service.price}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {service.features.map((feature, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" variant="outline">
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-600">
              Common questions about our pricing and services
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            {[
              {
                question: "Can I change my plan at any time?",
                answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any billing differences."
              },
              {
                question: "What payment methods do you accept?",
                answer: "We accept all major credit cards (Visa, MasterCard, American Express) and ACH bank transfers for annual plans."
              },
              {
                question: "Is there a free trial?",
                answer: "Our Basic plan is completely free and includes 3 calculations per month. You can upgrade to a paid plan anytime for unlimited access."
              },
              {
                question: "Do you offer refunds?",
                answer: "We offer a 30-day money-back guarantee for all paid plans. If you're not satisfied, contact us for a full refund."
              },
              {
                question: "Are the calculations legally binding?",
                answer: "Our calculations are for informational purposes only and do not constitute legal advice. Always consult with a qualified attorney for legal guidance."
              },
              {
                question: "How secure is my data?",
                answer: "We use enterprise-grade encryption and comply with SOC 2 Type II standards. Your data is encrypted both in transit and at rest."
              }
            ].map((faq, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <HelpCircle className="h-5 w-5 text-primary" />
                    <span>{faq.question}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <div className="bg-primary rounded-2xl p-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of users who trust EquiSplit for accurate property division calculations
              and professional document generation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary">
                Start Free Trial
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-primary">
                Contact Sales
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}