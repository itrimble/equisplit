import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MainLayout } from '@/components/layout/main-layout';
import { 
  Scale, 
  Shield, 
  Clock, 
  FileText, 
  Users, 
  DollarSign,
  CheckCircle,
  ArrowRight,
  Star,
  Calculator,
  MapPin,
  Gavel
} from 'lucide-react';

export default function HomePage() {
  const features = [
    {
      icon: Scale,
      title: 'All 50 States Covered',
      description: 'Community property and equitable distribution calculations for every US jurisdiction.',
    },
    {
      icon: Calculator,
      title: 'Court-Accurate Calculations',
      description: 'State-specific algorithms that match legal standards and court expectations.',
    },
    {
      icon: FileText,
      title: 'Court-Ready Documents',
      description: 'Generate admissible marital settlement agreements and financial affidavits.',
    },
    {
      icon: Shield,
      title: 'Bank-Level Security',
      description: 'SOC 2 compliant with AES-256 encryption and comprehensive audit trails.',
    },
    {
      icon: Clock,
      title: 'Save Time & Money',
      description: 'Understand your position before expensive attorney consultations.',
    },
    {
      icon: Users,
      title: 'Professional Grade',
      description: 'Used by individuals and legal professionals nationwide.',
    },
  ];

  const stats = [
    { label: 'Property Divisions Calculated', value: '25,000+' },
    { label: 'Average Savings per User', value: '$3,500' },
    { label: 'States Covered', value: '50' },
    { label: 'User Satisfaction', value: '4.8/5' },
  ];

  const testimonials = [
    {
      name: 'Sarah M.',
      location: 'California',
      text: 'EquiSplit helped me understand exactly what I was entitled to before meeting with my lawyer. Saved me thousands in legal fees.',
      rating: 5,
    },
    {
      name: 'David Chen, Esq.',
      location: 'Family Law Attorney, Texas',
      text: 'I use EquiSplit with all my clients. The calculations are accurate and the documents save hours of prep time.',
      rating: 5,
    },
    {
      name: 'Maria Rodriguez',
      location: 'New York',
      text: 'The step-by-step process made a confusing situation much clearer. Highly recommend for anyone going through divorce.',
      rating: 5,
    },
  ];

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Understand Your
              <span className="text-blue-600 block">Property Division</span>
              Before Expensive Lawyer Consultations
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Get accurate community property calculations for all 50 states. 
              Generate court-ready documents and save thousands in legal fees 
              with professional-grade property division analysis.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button size="xl" variant="legal" asChild>
                <Link href="/calculator">
                  Start Free Calculation
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="xl" variant="outline" asChild>
                <Link href="/how-it-works">
                  See How It Works
                </Link>
              </Button>
            </div>

            {/* Legal Disclaimer */}
            <div className="flex items-center justify-center mb-12">
              <div className="flex items-center space-x-2 text-sm text-gray-500 bg-white/50 px-4 py-2 rounded-lg border border-gray-200">
                <Gavel className="h-4 w-4 text-blue-600" />
                <span>
                  Educational calculations only • Not legal advice • 
                  <Link href="/legal/disclaimer" className="text-blue-600 hover:underline ml-1">
                    Professional consultation required
                  </Link>
                </span>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>3 Free Calculations</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>No Credit Card Required</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Used by 10,000+ People</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* State Selector Preview */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Works in Your State
            </h2>
            <p className="text-lg text-gray-600">
              Select your state to see specific property division laws and get started
            </p>
          </div>
          
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Where are you located?</span>
              </CardTitle>
              <CardDescription>
                We'll show you the property division laws that apply in your state
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {['California', 'Texas', 'Florida', 'New York', 'Pennsylvania', 'Illinois'].map((state) => (
                  <Button key={state} variant="outline" className="justify-start" asChild>
                    <Link href={`/calculator?state=${state.toLowerCase()}`}>
                      {state}
                    </Link>
                  </Button>
                ))}
              </div>
              <div className="mt-4 text-center">
                <Button variant="link" asChild>
                  <Link href="/states">View All 50 States →</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose EquiSplit?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Professional-grade property division analysis that's accurate, 
              secure, and compliant with legal standards.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="text-center">
                  <CardHeader>
                    <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold mb-2">
                  {stat.value}
                </div>
                <div className="text-blue-100">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600">
              Get accurate property division calculations in three simple steps
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Enter Your Information',
                description: 'Add your assets, debts, and marriage details through our guided questionnaire.',
                icon: FileText,
              },
              {
                step: '2',
                title: 'Get Calculations',
                description: 'Our state-specific algorithms calculate your property division instantly.',
                icon: Calculator,
              },
              {
                step: '3',
                title: 'Download Documents',
                description: 'Generate court-ready documents for your attorney or court filing.',
                icon: Gavel,
              },
            ].map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="text-center">
                  <div className="mx-auto w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mb-6">
                    {step.step}
                  </div>
                  <Icon className="mx-auto h-8 w-8 text-blue-600 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-600">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              What Our Users Say
            </h2>
            <p className="text-lg text-gray-600">
              Thousands of people have used EquiSplit to understand their property division
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-4">"{testimonial.text}"</p>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-500">{testimonial.location}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Understand Your Property Division?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of people who have used EquiSplit to prepare for their divorce 
            and save money on legal fees.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="xl" variant="secondary" asChild>
              <Link href="/calculator">
                Start Your Free Calculation
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="xl" variant="outline" className="text-white border-white hover:bg-white hover:text-blue-600" asChild>
              <Link href="/pricing">
                View Pricing
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}