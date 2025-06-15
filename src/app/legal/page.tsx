import { Metadata } from 'next';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Shield, Scale, AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Legal Information',
  description: 'Legal information, policies, and terms for EquiSplit community property calculator',
  openGraph: {
    title: 'Legal Information | EquiSplit',
    description: 'Access privacy policy, terms of service, and other legal information for EquiSplit.',
  },
};

export default function LegalPage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Legal Information</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Important legal information, policies, and terms governing your use of EquiSplit
          </p>
        </div>

        {/* Legal Disclaimer */}
        <Card className="mb-8 border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Important Legal Disclaimer
            </CardTitle>
          </CardHeader>
          <CardContent className="text-amber-800">
            <p className="font-medium mb-2">
              EquiSplit provides educational calculations and information tools only.
            </p>
            <p className="text-sm">
              Our service does not constitute legal advice, and we are not a law firm. All calculations 
              and guidance are provided for educational purposes only. You must consult qualified legal 
              professionals for specific legal guidance regarding your situation. Results should be 
              verified with legal counsel and may not reflect the actual outcome of legal proceedings.
            </p>
          </CardContent>
        </Card>

        {/* Legal Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          
          {/* Privacy Policy */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Privacy Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Learn how we collect, use, and protect your personal information. Includes details 
                about data security, GDPR/CCPA compliance, and your privacy rights.
              </p>
              <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                <div>• Data collection and usage</div>
                <div>• Security measures and encryption</div>
                <div>• Your rights and choices</div>
                <div>• International data transfers</div>
              </div>
              <Button asChild className="w-full">
                <Link href="/legal/privacy">
                  Read Privacy Policy
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Terms of Service */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                Terms of Service
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Legal terms and conditions governing your use of EquiSplit. Includes user 
                responsibilities, service limitations, and dispute resolution procedures.
              </p>
              <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                <div>• Acceptable use policy</div>
                <div>• Payment terms and refunds</div>
                <div>• Intellectual property rights</div>
                <div>• Disclaimers and limitations</div>
              </div>
              <Button asChild className="w-full">
                <Link href="/legal/terms">
                  Read Terms of Service
                </Link>
              </Button>
            </CardContent>
          </Card>

        </div>

        {/* Compliance Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-purple-600" />
              Compliance & Certifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              EquiSplit maintains strict compliance with legal and industry standards to protect 
              your data and ensure service reliability.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium">Security Compliance</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• SOC 2 Type II certified infrastructure</li>
                  <li>• PCI DSS Level 3 payment processing</li>
                  <li>• AES-256 encryption at rest</li>
                  <li>• TLS 1.3 encryption in transit</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">Legal Compliance</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• GDPR (European Union) compliant</li>
                  <li>• CCPA (California) compliant</li>
                  <li>• ABA Model Rule 1.1 adherent</li>
                  <li>• State Bar ethical guidelines</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Professional Use Notice */}
        <Card className="mb-8 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">
              Notice for Legal Professionals
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 space-y-3">
            <p className="text-sm">
              <strong>Licensed attorneys and legal professionals</strong> using EquiSplit must:
            </p>
            <ul className="text-xs space-y-1 pl-4">
              <li>• Comply with applicable Bar Association rules and ethical guidelines</li>
              <li>• Maintain client confidentiality and attorney-client privilege</li>
              <li>• Verify all calculations and recommendations independently</li>
              <li>• Use the service as a tool, not a substitute for professional judgment</li>
              <li>• Ensure compliance with ABA Model Rule 1.1 (Technology Competence)</li>
            </ul>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Legal Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              For legal questions, compliance inquiries, or to report violations, please contact our legal team:
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="text-sm">
                <strong>EquiSplit Legal Team</strong>
              </div>
              <div className="text-sm space-y-1">
                <div>Email: legal@equisplit.com</div>
                <div>Privacy Inquiries: privacy@equisplit.com</div>
                <div>Security Issues: security@equisplit.com</div>
              </div>
              <div className="text-xs text-muted-foreground mt-3">
                <div>• For GDPR requests, include "GDPR Request" in subject line</div>
                <div>• For CCPA requests, include "CCPA Request" in subject line</div>
                <div>• For urgent security matters, include "URGENT" in subject line</div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Response time: We aim to respond to all legal inquiries within 2-3 business days. 
              Urgent security matters are addressed within 24 hours.
            </p>
          </CardContent>
        </Card>

      </div>
    </MainLayout>
  );
}