'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Scale, Menu, X, Shield, Lock } from 'lucide-react';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigation = [
    { name: 'Calculator', href: '/calculator' },
    { name: 'How It Works', href: '/how-it-works' },
    { name: 'States', href: '/states' },
    { name: 'Q&A', href: '/qa' },
    { name: 'Pricing', href: '/pricing' },
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Scale className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">EquiSplit</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:block">
            <div className="flex items-center space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-gray-600 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </nav>

          {/* Security Badges & Auth */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <Shield className="h-4 w-4" />
              <span>SOC 2</span>
              <Lock className="h-4 w-4" />
              <span>Encrypted</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" asChild>
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button variant="legal" asChild>
                <Link href="/auth/signup">Get Started</Link>
              </Button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="text-gray-600 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-gray-600 hover:text-blue-600 block px-3 py-2 text-base font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className="border-t border-gray-200 pt-4 pb-3">
                <div className="flex items-center px-3 mb-3">
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <Shield className="h-4 w-4" />
                    <span>SOC 2 Compliant</span>
                    <Lock className="h-4 w-4" />
                    <span>Bank-Level Security</span>
                  </div>
                </div>
                <div className="space-y-2 px-3">
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href="/auth/signin" onClick={() => setIsMenuOpen(false)}>
                      Sign In
                    </Link>
                  </Button>
                  <Button variant="legal" className="w-full" asChild>
                    <Link href="/auth/signup" onClick={() => setIsMenuOpen(false)}>
                      Get Started Free
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legal Disclaimer Bar */}
      <div className="bg-blue-50 border-b border-blue-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-2 text-center text-xs text-blue-700">
            <span className="font-medium">Legal Notice:</span> This tool provides educational calculations only and does not constitute legal advice. 
            <Link href="/legal/disclaimer" className="underline hover:text-blue-800 ml-1">
              Read full disclaimer
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}