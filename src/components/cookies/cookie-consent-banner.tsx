'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Cookie, Settings, Check, Shield } from 'lucide-react';

interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

interface CookieConsentBannerProps {
  className?: string;
}

const COOKIE_CONSENT_KEY = 'equisplit-cookie-consent';
const COOKIE_PREFERENCES_KEY = 'equisplit-cookie-preferences';

export function CookieConsentBanner({ className = '' }: CookieConsentBannerProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true, // Always required
    analytics: false,
    marketing: false,
    preferences: false,
  });

  useEffect(() => {
    // Check if user has already made a choice
    const hasConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    const savedPreferences = localStorage.getItem(COOKIE_PREFERENCES_KEY);
    
    if (!hasConsent) {
      // Show banner after a short delay to ensure page is loaded
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
    
    // Load saved preferences
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        setPreferences(parsed);
        applyAnalytics(parsed.analytics);
      } catch (error) {
        console.error('Error parsing cookie preferences:', error);
      }
    }
  }, []);

  const applyAnalytics = (enabled: boolean) => {
    // Apply analytics consent
    if (typeof window !== 'undefined') {
      // Google Analytics consent mode (if using GA)
      if (window.gtag) {
        window.gtag('consent', 'update', {
          analytics_storage: enabled ? 'granted' : 'denied',
          ad_storage: enabled ? 'granted' : 'denied',
        });
      }
      
      // Custom analytics tracking
      if (!enabled) {
        // Disable any existing analytics
        document.cookie = '_ga=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = '_gid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      }
    }
  };

  const saveConsent = (acceptedPreferences: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(acceptedPreferences));
    localStorage.setItem('equisplit-consent-date', new Date().toISOString());
    
    setPreferences(acceptedPreferences);
    applyAnalytics(acceptedPreferences.analytics);
    
    setShowBanner(false);
    setShowSettings(false);
  };

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      essential: true,
      analytics: true,
      marketing: true,
      preferences: true,
    };
    saveConsent(allAccepted);
  };

  const handleAcceptEssential = () => {
    const essentialOnly: CookiePreferences = {
      essential: true,
      analytics: false,
      marketing: false,
      preferences: false,
    };
    saveConsent(essentialOnly);
  };

  const handleSaveCustom = () => {
    saveConsent(preferences);
  };

  const updatePreference = (key: keyof CookiePreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: key === 'essential' ? true : value, // Essential always true
    }));
  };

  if (!showBanner) return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 p-4 ${className}`}>
      <Card className="max-w-4xl mx-auto shadow-lg border-2">
        <CardContent className="p-6">
          {!showSettings ? (
            // Main banner
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Cookie className="h-6 w-6 text-amber-600 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">
                    Cookie Consent & Privacy
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    We use cookies to provide essential functionality, improve your experience, and analyze usage. 
                    As a legal technology platform handling sensitive information, your privacy is our top priority.
                  </p>
                  <p className="text-xs text-gray-500">
                    By continuing to use EquiSplit, you agree to our use of essential cookies. You can customize 
                    other cookie preferences below or review our{' '}
                    <Link href="/legal/privacy" className="text-blue-600 hover:underline">
                      Privacy Policy
                    </Link>{' '}
                    for detailed information.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBanner(false)}
                  className="p-1 h-auto"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  onClick={handleAcceptAll}
                  className="flex-1 sm:flex-none"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Accept All
                </Button>
                <Button
                  onClick={handleAcceptEssential}
                  variant="outline"
                  className="flex-1 sm:flex-none"
                >
                  Essential Only
                </Button>
                <Button
                  onClick={() => setShowSettings(true)}
                  variant="outline"
                  className="flex-1 sm:flex-none"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Customize
                </Button>
              </div>
            </div>
          ) : (
            // Settings panel
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-semibold">Cookie Preferences</h3>
              </div>

              <div className="space-y-4">
                {/* Essential Cookies */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Essential Cookies</h4>
                    <div className="text-sm text-green-600 font-medium">Always Active</div>
                  </div>
                  <p className="text-sm text-gray-600">
                    Required for basic site functionality, security, and legal compliance. 
                    Includes authentication, session management, and CSRF protection.
                  </p>
                </div>

                {/* Analytics Cookies */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Analytics Cookies</h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.analytics}
                        onChange={(e) => updatePreference('analytics', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className="text-sm text-gray-600">
                    Help us understand how users interact with our service to improve functionality 
                    and user experience. Data is anonymized and aggregated.
                  </p>
                </div>

                {/* Preference Cookies */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Preference Cookies</h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.preferences}
                        onChange={(e) => updatePreference('preferences', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className="text-sm text-gray-600">
                    Remember your settings, language preferences, and display options 
                    to provide a personalized experience.
                  </p>
                </div>

                {/* Marketing Cookies */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Marketing Cookies</h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.marketing}
                        onChange={(e) => updatePreference('marketing', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className="text-sm text-gray-600">
                    Used to show relevant content and advertisements. We do not share personal 
                    information with advertisers. Currently not in use.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <Button onClick={handleSaveCustom} className="flex-1 sm:flex-none">
                  Save Preferences
                </Button>
                <Button 
                  onClick={() => setShowSettings(false)} 
                  variant="outline"
                  className="flex-1 sm:flex-none"
                >
                  Back
                </Button>
                <Link 
                  href="/legal/privacy"
                  className="text-sm text-blue-600 hover:underline self-center"
                >
                  Privacy Policy
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Export hook for managing cookie consent in other components
export function useCookieConsent() {
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    marketing: false,
    preferences: false,
  });

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    const prefs = localStorage.getItem(COOKIE_PREFERENCES_KEY);
    
    setHasConsent(consent === 'true');
    
    if (prefs) {
      try {
        setPreferences(JSON.parse(prefs));
      } catch (error) {
        console.error('Error parsing cookie preferences:', error);
      }
    }
  }, []);

  const updateConsent = (newPreferences: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(newPreferences));
    setHasConsent(true);
    setPreferences(newPreferences);
  };

  const revokeConsent = () => {
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    localStorage.removeItem(COOKIE_PREFERENCES_KEY);
    setHasConsent(false);
    setPreferences({
      essential: true,
      analytics: false,
      marketing: false,
      preferences: false,
    });
  };

  return {
    hasConsent,
    preferences,
    updateConsent,
    revokeConsent,
  };
}

// Global type declaration for gtag
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}