import { Metadata } from 'next';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'EquiSplit Terms of Service - Legal terms and conditions for using our community property calculator',
  openGraph: {
    title: 'Terms of Service | EquiSplit',
    description: 'Read the terms and conditions for using EquiSplit community property calculator service.',
  },
};

export default function TermsOfServicePage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Terms of Service</CardTitle>
            <p className="text-center text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none space-y-6">
            
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing or using EquiSplit ("Service," "we," "our," or "us"), you ("User," "you," or "your") 
                agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, 
                do not use our Service.
              </p>
              <p className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <strong>⚠️ IMPORTANT LEGAL DISCLAIMER:</strong> EquiSplit provides educational calculations and 
                information tools only. Our Service does not constitute legal advice, and we are not a law firm. 
                You must consult qualified legal professionals for specific legal guidance regarding your situation.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
              
              <h3 className="text-xl font-medium mb-3">2.1 Service Overview</h3>
              <p>EquiSplit is a web-based platform that provides:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Community property and equitable distribution calculations for all 50 US states</li>
                <li>Educational guidance on state-specific property division laws</li>
                <li>Document generation tools for legal forms and agreements</li>
                <li>Financial analysis and reporting features</li>
                <li>User account management and progress tracking</li>
              </ul>

              <h3 className="text-xl font-medium mb-3 mt-6">2.2 Educational Purpose</h3>
              <p>
                Our calculations and guidance are provided for educational and informational purposes only. 
                Results should be verified with legal counsel and may not reflect the actual outcome of 
                legal proceedings.
              </p>

              <h3 className="text-xl font-medium mb-3 mt-6">2.3 Service Limitations</h3>
              <p>We do not provide:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Legal advice or representation</li>
                <li>Tax advice or financial planning services</li>
                <li>Guarantee of legal outcomes or accuracy</li>
                <li>Attorney-client privileged communications</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. User Accounts and Registration</h2>
              
              <h3 className="text-xl font-medium mb-3">3.1 Account Creation</h3>
              <p>To access certain features, you must create an account by providing:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Valid email address</li>
                <li>Secure password meeting our requirements</li>
                <li>Accurate personal information</li>
              </ul>

              <h3 className="text-xl font-medium mb-3 mt-6">3.2 Account Security</h3>
              <p>You are responsible for:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Immediately notifying us of any unauthorized access</li>
                <li>Using strong passwords and enabling two-factor authentication when available</li>
              </ul>

              <h3 className="text-xl font-medium mb-3 mt-6">3.3 Account Termination</h3>
              <p>
                We may suspend or terminate your account if you violate these Terms, engage in fraudulent 
                activity, or for any other reason at our sole discretion. You may delete your account at 
                any time through your account settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use Policy</h2>
              
              <h3 className="text-xl font-medium mb-3">4.1 Permitted Uses</h3>
              <p>You may use our Service for:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Educational purposes related to property division</li>
                <li>Personal use in understanding your legal situation</li>
                <li>Professional use by licensed attorneys and legal professionals</li>
                <li>Academic research and educational purposes</li>
              </ul>

              <h3 className="text-xl font-medium mb-3 mt-6">4.2 Prohibited Uses</h3>
              <p>You may not use our Service to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide legal advice to third parties without proper licensing</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe upon intellectual property rights</li>
                <li>Transmit malicious code, viruses, or harmful content</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Use automated tools to scrape or download content</li>
                <li>Create false or misleading information</li>
                <li>Interfere with other users' access to the Service</li>
              </ul>

              <h3 className="text-xl font-medium mb-3 mt-6">4.3 Professional Use Standards</h3>
              <p>Legal professionals using our Service must:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Comply with applicable Bar Association rules and ethical guidelines</li>
                <li>Maintain client confidentiality and attorney-client privilege</li>
                <li>Verify all calculations and recommendations independently</li>
                <li>Use the Service as a tool, not a substitute for professional judgment</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Payment Terms and Subscription</h2>
              
              <h3 className="text-xl font-medium mb-3">5.1 Service Tiers</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Free Tier:</strong> Basic calculations with limited features</li>
                <li><strong>Professional Tier:</strong> Advanced features and document generation</li>
                <li><strong>Enterprise Tier:</strong> Multi-client usage and white-label options</li>
              </ul>

              <h3 className="text-xl font-medium mb-3 mt-6">5.2 Payment Processing</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Payments are processed securely through Stripe</li>
                <li>All prices are in US dollars unless otherwise specified</li>
                <li>Subscription fees are billed monthly or annually as selected</li>
                <li>One-time document generation fees may apply</li>
              </ul>

              <h3 className="text-xl font-medium mb-3 mt-6">5.3 Refund Policy</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Monthly subscriptions: Cancellation takes effect at the end of the billing period</li>
                <li>Annual subscriptions: Pro-rated refunds available within 30 days</li>
                <li>One-time purchases: Refunds available within 14 days if service is unused</li>
                <li>No refunds for accounts terminated for Terms violations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Intellectual Property Rights</h2>
              
              <h3 className="text-xl font-medium mb-3">6.1 Our Intellectual Property</h3>
              <p>The Service and its content are protected by copyright, trademark, and other laws. This includes:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Software code and algorithms</li>
                <li>User interface design and layout</li>
                <li>Legal content and state-specific guidance</li>
                <li>Trademarks, logos, and branding materials</li>
                <li>Educational content and resources</li>
              </ul>

              <h3 className="text-xl font-medium mb-3 mt-6">6.2 User Content</h3>
              <p>Regarding content you provide to the Service:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>You retain ownership of your personal and financial information</li>
                <li>You grant us a limited license to process your data to provide the Service</li>
                <li>We do not claim ownership of your uploaded documents or personal information</li>
                <li>You are responsible for ensuring you have rights to any uploaded content</li>
              </ul>

              <h3 className="text-xl font-medium mb-3 mt-6">6.3 License to Use</h3>
              <p>We grant you a limited, non-exclusive, non-transferable license to use the Service for its intended purposes, subject to these Terms.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Privacy and Data Protection</h2>
              <p>
                Your privacy is important to us. Our collection and use of personal information is governed by our 
                <a href="/legal/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>, 
                which is incorporated into these Terms by reference.
              </p>
              
              <h3 className="text-xl font-medium mb-3 mt-6">7.1 Data Security</h3>
              <p>We implement industry-standard security measures including:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>End-to-end encryption for sensitive data</li>
                <li>Secure data transmission using TLS 1.3</li>
                <li>Regular security audits and compliance certifications</li>
                <li>Access controls and audit logging</li>
              </ul>

              <h3 className="text-xl font-medium mb-3 mt-6">7.2 Data Retention</h3>
              <p>
                We retain your data as described in our Privacy Policy and as required by applicable laws. 
                Financial and legal data may be retained for up to 7 years for compliance purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Disclaimers and Limitations of Liability</h2>
              
              <h3 className="text-xl font-medium mb-3">8.1 Service Disclaimers</h3>
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <p><strong>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.</strong> We disclaim all warranties, express or implied, including but not limited to:</p>
                <ul className="list-disc pl-6 space-y-1 mt-2">
                  <li>Accuracy or reliability of calculations or legal guidance</li>
                  <li>Merchantability or fitness for a particular purpose</li>
                  <li>Uninterrupted or error-free operation</li>
                  <li>Compliance with specific legal requirements in your jurisdiction</li>
                </ul>
              </div>

              <h3 className="text-xl font-medium mb-3 mt-6">8.2 Limitation of Liability</h3>
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <p><strong>TO THE MAXIMUM EXTENT PERMITTED BY LAW:</strong></p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>Our total liability shall not exceed the amount paid by you for the Service in the 12 months preceding the claim</li>
                  <li>We shall not be liable for indirect, incidental, consequential, or punitive damages</li>
                  <li>We are not responsible for legal outcomes or decisions based on our calculations</li>
                  <li>You assume all risks associated with using the Service for legal purposes</li>
                </ul>
              </div>

              <h3 className="text-xl font-medium mb-3 mt-6">8.3 Professional Responsibility</h3>
              <p>
                Legal professionals using our Service remain fully responsible for their professional duties, 
                including verification of calculations, compliance with ethical rules, and independent legal judgment.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Indemnification</h2>
              <p>
                You agree to indemnify and hold harmless EquiSplit, its officers, directors, employees, and agents 
                from any claims, damages, or expenses arising from:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Your use of the Service</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any rights of another party</li>
                <li>Any legal advice or services you provide to third parties using our Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Governing Law and Dispute Resolution</h2>
              
              <h3 className="text-xl font-medium mb-3">10.1 Governing Law</h3>
              <p>
                These Terms are governed by the laws of the State of [State] and the United States, 
                without regard to conflict of law principles.
              </p>

              <h3 className="text-xl font-medium mb-3 mt-6">10.2 Dispute Resolution</h3>
              <p>For disputes arising under these Terms:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Informal Resolution:</strong> Contact us first to attempt informal resolution</li>
                <li><strong>Arbitration:</strong> Binding arbitration for claims over $10,000</li>
                <li><strong>Small Claims Court:</strong> Available for claims under $10,000</li>
                <li><strong>Class Action Waiver:</strong> No class actions or collective proceedings</li>
              </ul>

              <h3 className="text-xl font-medium mb-3 mt-6">10.3 Jurisdiction</h3>
              <p>
                Any legal proceedings shall be conducted in the state and federal courts located in [Jurisdiction], 
                and you consent to personal jurisdiction in such courts.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Changes to Terms</h2>
              <p>
                We may modify these Terms at any time by posting updated terms on our website. Material changes 
                will be communicated via email or prominent notice on the Service. Your continued use after 
                changes constitutes acceptance of the modified Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">12. Termination</h2>
              <p>
                Either party may terminate these Terms at any time. Upon termination:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Your access to the Service will cease</li>
                <li>All outstanding fees become immediately due</li>
                <li>We may retain data as described in our Privacy Policy</li>
                <li>Sections regarding intellectual property, disclaimers, and governing law survive termination</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">13. Contact Information</h2>
              <p>For questions about these Terms or our Service, please contact us:</p>
              
              <div className="bg-gray-50 p-4 rounded-lg mt-4">
                <p><strong>EquiSplit Legal Team</strong></p>
                <p>Email: legal@equisplit.com</p>
                <p>Address: [Company Address - To be added]</p>
                <p>Phone: [Support Phone - To be added]</p>
              </div>

              <p className="mt-4">
                For urgent legal or security matters, please include "URGENT" in your subject line.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">14. Entire Agreement</h2>
              <p>
                These Terms, together with our Privacy Policy and any additional terms for specific features, 
                constitute the entire agreement between you and EquiSplit regarding the Service and supersede 
                all prior agreements and understandings.
              </p>
            </section>

          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}