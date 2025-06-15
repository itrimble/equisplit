'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Scale, Menu, X, Shield, Lock, LogOut, UserCircle, Settings, ExternalLink } from 'lucide-react'; // Added new icons
import { useSession, signOut } from 'next-auth/react'; // Added next-auth hooks
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';

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
            {/* Auth Buttons / User Info */}
            <div className="flex items-center space-x-2">
              {isLoading ? (
                <div className="w-20 h-8 animate-pulse bg-gray-200 rounded-md"></div> // Placeholder for loading
              ) : session ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100">
                      <UserCircle className="h-5 w-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                        {session.user?.email || session.user?.name || "Account"}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {session.user?.name || "User"}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {session.user?.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {/* <DropdownMenuItem disabled>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Account Settings</span>
                    </DropdownMenuItem> */}
                    <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                    {/* <DropdownMenuSeparator />
                     <DropdownMenuItem asChild>
                        <Link href="/legal/terms-of-service" target="_blank" className="cursor-pointer">
                           <ExternalLink className="mr-2 h-4 w-4" /> Terms of Service
                        </Link>
                    </DropdownMenuItem> */}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Button variant="ghost" asChild>
                    <Link href="/login">Sign In</Link>
                  </Button>
                  <Button variant="default" asChild> {/* Changed "legal" to "default" or another standard variant */}
                    <Link href="/auth/signup">Sign Up</Link>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center"> {/* Added flex items-center */}
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
                  {isLoading ? (
                     <div className="w-full h-8 animate-pulse bg-gray-200 rounded-md my-2"></div> // Loading placeholder
                  ) : session ? (
                    <>
                      <div className="px-1 py-2"> {/* Adjusted padding */}
                        <p className="text-sm font-medium text-gray-800 truncate">{session.user?.name || "User"}</p>
                        <p className="text-xs text-gray-500 truncate">{session.user?.email}</p>
                      </div>
                      {/* <Button variant="ghost" className="w-full justify-start" onClick={() => { setIsMenuOpen(false); router.push('/account-settings'); }} > // Example for navigation
                        Account Settings
                      </Button> */}
                      <Button variant="ghost" className="w-full justify-start" onClick={() => { signOut(); setIsMenuOpen(false); }}>
                        <LogOut className="mr-2 h-4 w-4" /> Sign Out
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" className="w-full justify-start" asChild>
                        <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                          Sign In
                        </Link>
                      </Button>
                      <Button variant="default" className="w-full" asChild> {/* Changed "legal" to "default" */}
                        <Link href="/auth/signup" onClick={() => setIsMenuOpen(false)}>
                          Sign Up
                        </Link>
                      </Button>
                    </>
                  )}
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