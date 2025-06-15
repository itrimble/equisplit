import { Metadata } from 'next';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'EquiSplit Privacy Policy - How we collect, use, and protect your personal information',
  openGraph: {
    title: 'Privacy Policy | EquiSplit',
    description: 'Learn about how EquiSplit protects your privacy and handles your personal information.',
  },
};

export default function PrivacyPolicyPage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Privacy Policy</CardTitle>
            <p className="text-center text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none space-y-6">
            
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
              <p>
                EquiSplit ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, 
                use, disclose, and safeguard your information when you use our community property calculator service ("Service"). 
                This policy applies to our website, mobile applications, and all related services.
              </p>
              <p>
                <strong>Legal Disclaimer:</strong> EquiSplit provides educational calculations only and does not constitute legal advice. 
                Users must consult qualified legal professionals for specific legal guidance.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-medium mb-3">2.1 Personal Information</h3>
              <p>We may collect the following types of personal information:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Account Information:</strong> Name, email address, phone number (optional)</li>
                <li><strong>Authentication Data:</strong> Login credentials, OAuth tokens, two-factor authentication codes</li>
                <li><strong>Profile Information:</strong> User preferences, subscription status, communication preferences</li>
                <li><strong>Financial Information:</strong> Payment details (processed securely through Stripe), billing history</li>
              </ul>

              <h3 className="text-xl font-medium mb-3 mt-6">2.2 Calculation Data</h3>
              <p>To provide our calculation services, we collect:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Property Information:</strong> Asset descriptions, values, debt information</li>
                <li><strong>Personal Details:</strong> Marriage dates, separation dates, jurisdiction information</li>
                <li><strong>Special Circumstances:</strong> Factors affecting property division (anonymized for calculations)</li>
                <li><strong>Document Uploads:</strong> Financial documents, property records (encrypted and time-limited)</li>
              </ul>

              <h3 className="text-xl font-medium mb-3 mt-6">2.3 Technical Information</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Usage Data:</strong> Pages visited, features used, time spent on service</li>
                <li><strong>Device Information:</strong> Browser type, operating system, IP address</li>
                <li><strong>Cookies and Tracking:</strong> Session cookies, preference cookies, analytics data</li>
                <li><strong>Security Logs:</strong> Login attempts, security events, audit trails</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
              
              <h3 className="text-xl font-medium mb-3">3.1 Service Provision</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Calculate property division based on applicable state laws</li>
                <li>Generate legal documents (MSAs, financial affidavits)</li>
                <li>Provide state-specific legal guidance and resources</li>
                <li>Save and restore calculation progress</li>
              </ul>

              <h3 className="text-xl font-medium mb-3 mt-6">3.2 Account Management</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Create and maintain user accounts</li>
                <li>Process payments and manage subscriptions</li>
                <li>Provide customer support and technical assistance</li>
                <li>Send service updates and important notifications</li>
              </ul>

              <h3 className="text-xl font-medium mb-3 mt-6">3.3 Legal and Compliance</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Comply with legal obligations and court orders</li>
                <li>Maintain audit trails for financial and legal compliance</li>
                <li>Detect and prevent fraud, abuse, and security threats</li>
                <li>Protect the rights and safety of our users and third parties</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Data Protection and Security</h2>
              
              <h3 className="text-xl font-medium mb-3">4.1 Security Measures</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Encryption:</strong> AES-256 encryption at rest, TLS 1.3 encryption in transit</li>
                <li><strong>Access Controls:</strong> Role-based access, multi-factor authentication</li>
                <li><strong>Infrastructure:</strong> SOC 2 Type II compliant hosting with AWS/Vercel</li>
                <li><strong>Monitoring:</strong> 24/7 security monitoring and intrusion detection</li>
              </ul>

              <h3 className="text-xl font-medium mb-3 mt-6">4.2 Data Retention</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Calculation Data:</strong> Retained for 7 years for legal compliance</li>
                <li><strong>Financial Records:</strong> Retained for 7 years for tax and audit purposes</li>
                <li><strong>Account Information:</strong> Retained until account deletion + 30 days</li>
                <li><strong>Security Logs:</strong> Retained for 1 year for security analysis</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Information Sharing and Disclosure</h2>
              
              <h3 className="text-xl font-medium mb-3">5.1 We Do Not Sell Personal Information</h3>
              <p>We do not sell, rent, or trade your personal information to third parties for marketing purposes.</p>

              <h3 className="text-xl font-medium mb-3 mt-6">5.2 Service Providers</h3>
              <p>We may share information with trusted service providers who assist us in operating our service:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Payment Processing:</strong> Stripe (PCI DSS Level 1 compliant)</li>
                <li><strong>Cloud Infrastructure:</strong> AWS, Vercel (SOC 2 compliant)</li>
                <li><strong>Analytics:</strong> Anonymized usage data for service improvement</li>
                <li><strong>Customer Support:</strong> Secure communication platforms</li>
              </ul>

              <h3 className="text-xl font-medium mb-3 mt-6">5.3 Legal Requirements</h3>
              <p>We may disclose information when required by law or to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Comply with court orders, subpoenas, or legal processes</li>
                <li>Protect against fraud, abuse, or security threats</li>
                <li>Protect the rights, property, or safety of EquiSplit or others</li>
                <li>Enforce our Terms of Service or other agreements</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Your Rights and Choices</h2>
              
              <h3 className="text-xl font-medium mb-3">6.1 Access and Control</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Account Access:</strong> View and update your account information</li>
                <li><strong>Data Export:</strong> Request a copy of your personal data</li>
                <li><strong>Data Deletion:</strong> Request deletion of your account and data</li>
                <li><strong>Communication Preferences:</strong> Opt-out of non-essential communications</li>
              </ul>

              <h3 className="text-xl font-medium mb-3 mt-6">6.2 Cookie Management</h3>
              <p>You can control cookies through your browser settings:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Essential Cookies:</strong> Required for service functionality</li>
                <li><strong>Analytics Cookies:</strong> Can be disabled (may affect service improvement)</li>
                <li><strong>Preference Cookies:</strong> Store your settings and preferences</li>
              </ul>

              <h3 className="text-xl font-medium mb-3 mt-6">6.3 California Privacy Rights (CCPA)</h3>
              <p>California residents have additional rights:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Right to know what personal information is collected</li>
                <li>Right to delete personal information</li>
                <li>Right to opt-out of sale of personal information (not applicable - we don't sell data)</li>
                <li>Right to non-discrimination for exercising privacy rights</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. International Data Transfers</h2>
              <p>
                Our services are primarily hosted in the United States. If you access our service from outside the US, 
                your information may be transferred to, stored, and processed in the United States. We ensure appropriate 
                safeguards are in place for international transfers, including standard contractual clauses and 
                compliance with applicable data protection laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Children's Privacy</h2>
              <p>
                Our service is not intended for individuals under 18 years of age. We do not knowingly collect personal 
                information from children under 18. If we become aware that we have collected information from a child 
                under 18, we will take steps to delete such information promptly.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our practices or applicable laws. 
                We will notify you of any material changes by posting the updated policy on our website and, where 
                appropriate, by sending you an email notification. Your continued use of our service after such changes 
                constitutes your acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Contact Information</h2>
              <p>If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:</p>
              
              <div className="bg-gray-50 p-4 rounded-lg mt-4">
                <p><strong>EquiSplit Privacy Team</strong></p>
                <p>Email: privacy@equisplit.com</p>
                <p>Address: [Company Address - To be added]</p>
                <p>Phone: [Support Phone - To be added]</p>
              </div>

              <p className="mt-4">
                For data protection inquiries from EU residents, please include "GDPR Request" in your subject line. 
                For California privacy rights requests, please include "CCPA Request" in your subject line.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Compliance Certifications</h2>
              <p>EquiSplit maintains the following compliance standards:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>SOC 2 Type II:</strong> Security, availability, and confidentiality controls</li>
                <li><strong>PCI DSS Level 3:</strong> Payment card data security (via Stripe)</li>
                <li><strong>GDPR Compliance:</strong> European data protection requirements</li>
                <li><strong>CCPA Compliance:</strong> California Consumer Privacy Act requirements</li>
                <li><strong>ABA Model Rule 1.1:</strong> Technology competence for legal software</li>
              </ul>
            </section>

          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}