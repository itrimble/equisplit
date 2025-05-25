import Link from 'next/link';
import { Scale, Shield, Lock, Heart } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerSections = {
    product: {
      title: 'Product',
      links: [
        { name: 'Calculator', href: '/calculator' },
        { name: 'How It Works', href: '/how-it-works' },
        { name: 'State Coverage', href: '/states' },
        { name: 'Pricing', href: '/pricing' },
        { name: 'API', href: '/api' },
      ]
    },
    legal: {
      title: 'Legal',
      links: [
        { name: 'Terms of Service', href: '/legal/terms' },
        { name: 'Privacy Policy', href: '/legal/privacy' },
        { name: 'Legal Disclaimer', href: '/legal/disclaimer' },
        { name: 'Cookie Policy', href: '/legal/cookies' },
        { name: 'Data Protection', href: '/legal/data-protection' },
      ]
    },
    support: {
      title: 'Support',
      links: [
        { name: 'Help Center', href: '/help' },
        { name: 'Q&A Forum', href: '/qa' },
        { name: 'Contact Us', href: '/contact' },
        { name: 'Attorney Network', href: '/attorneys' },
        { name: 'Status Page', href: '/status' },
      ]
    },
    company: {
      title: 'Company',
      links: [
        { name: 'About Us', href: '/about' },
        { name: 'Blog', href: '/blog' },
        { name: 'Careers', href: '/careers' },
        { name: 'Press', href: '/press' },
        { name: 'Security', href: '/security' },
      ]
    }
  };

  return (
    <footer className="bg-gray-900 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Brand Column */}
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <Scale className="h-8 w-8 text-blue-400" />
                <span className="text-xl font-bold">EquiSplit</span>
              </div>
              <p className="text-gray-300 mb-6 max-w-md">
                Professional community property division calculations for all 50 states. 
                Built for individuals and legal professionals who need accurate, 
                court-ready property division analysis.
              </p>
              
              {/* Security Badges */}
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <Shield className="h-4 w-4" />
                  <span>SOC 2 Type II</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <Lock className="h-4 w-4" />
                  <span>AES-256 Encryption</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <Scale className="h-4 w-4" />
                  <span>ABA Compliant</span>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 text-sm text-gray-400">
                <p>Security Issues: security@equisplit.com</p>
                <p>Legal Questions: legal@equisplit.com</p>
                <p>Support: support@equisplit.com</p>
              </div>
            </div>

            {/* Link Columns */}
            {Object.entries(footerSections).map(([key, section]) => (
              <div key={key}>
                <h3 className="text-sm font-semibold text-gray-200 tracking-wider uppercase mb-4">
                  {section.title}
                </h3>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-gray-400 hover:text-white text-sm transition-colors"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Important Legal Notices */}
        <div className="border-t border-gray-800 py-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-yellow-400 mb-3">
              ⚠️ Important Legal Notice
            </h4>
            <div className="space-y-2 text-sm text-gray-300">
              <p>
                <strong>Not Legal Advice:</strong> EquiSplit provides educational calculations only. 
                Results are estimates and should not be relied upon as legal advice.
              </p>
              <p>
                <strong>Professional Consultation Required:</strong> Always consult qualified legal 
                and financial professionals before making decisions about property division.
              </p>
              <p>
                <strong>No Attorney-Client Relationship:</strong> Use of this software does not 
                create an attorney-client relationship or any professional relationship.
              </p>
              <p>
                <strong>State Law Variations:</strong> Property division laws vary significantly 
                by state and individual circumstances. This tool provides general guidance only.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <p>&copy; {currentYear} EquiSplit, Inc. All rights reserved.</p>
              <span className="hidden md:inline">•</span>
              <p className="hidden md:inline">Licensed under Apache 2.0</p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Compliance Badges */}
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <span>PCI DSS Level 3</span>
                <span>•</span>
                <span>GDPR Compliant</span>
                <span>•</span>
                <span>CCPA Compliant</span>
              </div>
            </div>
          </div>
          
          {/* Built with love message */}
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500 flex items-center justify-center space-x-1">
              <span>Built with</span>
              <Heart className="h-4 w-4 text-red-500" />
              <span>and</span>
              <Scale className="h-4 w-4 text-blue-400" />
              <span>for the legal technology community</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}