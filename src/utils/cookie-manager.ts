/**
 * Cookie Management Utilities
 * 
 * Provides functions for managing cookies in compliance with GDPR/CCPA
 * requirements, including consent management and secure cookie handling.
 */

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

export interface CookieInfo {
  name: string;
  category: keyof CookiePreferences;
  purpose: string;
  duration: string;
  provider: string;
}

// Registry of all cookies used by the application
export const COOKIE_REGISTRY: CookieInfo[] = [
  // Essential Cookies
  {
    name: 'next-auth.session-token',
    category: 'essential',
    purpose: 'User authentication and session management',
    duration: '30 days',
    provider: 'NextAuth.js'
  },
  {
    name: 'next-auth.csrf-token',
    category: 'essential',
    purpose: 'Cross-site request forgery protection',
    duration: 'Session',
    provider: 'NextAuth.js'
  },
  {
    name: 'equisplit-cookie-consent',
    category: 'essential',
    purpose: 'Stores user cookie consent choices',
    duration: '1 year',
    provider: 'EquiSplit'
  },
  {
    name: 'equisplit-calculator-v1',
    category: 'essential',
    purpose: 'Saves calculation progress in local storage',
    duration: 'Until cleared',
    provider: 'EquiSplit'
  },
  
  // Preference Cookies
  {
    name: 'equisplit-cookie-preferences',
    category: 'preferences',
    purpose: 'Stores detailed cookie preferences',
    duration: '1 year',
    provider: 'EquiSplit'
  },
  {
    name: 'equisplit-theme-preference',
    category: 'preferences',
    purpose: 'Remembers dark/light mode preference',
    duration: '1 year',
    provider: 'EquiSplit'
  },
  
  // Analytics Cookies
  {
    name: '_ga',
    category: 'analytics',
    purpose: 'Google Analytics user identification',
    duration: '2 years',
    provider: 'Google Analytics'
  },
  {
    name: '_gid',
    category: 'analytics',
    purpose: 'Google Analytics session identification',
    duration: '24 hours',
    provider: 'Google Analytics'
  },
  {
    name: '_gat',
    category: 'analytics',
    purpose: 'Google Analytics throttling',
    duration: '1 minute',
    provider: 'Google Analytics'
  }
];

const COOKIE_CONSENT_KEY = 'equisplit-cookie-consent';
const COOKIE_PREFERENCES_KEY = 'equisplit-cookie-preferences';

/**
 * Get current cookie preferences from storage
 */
export function getCookiePreferences(): CookiePreferences {
  if (typeof window === 'undefined') {
    return {
      essential: true,
      analytics: false,
      marketing: false,
      preferences: false,
    };
  }

  try {
    const stored = localStorage.getItem(COOKIE_PREFERENCES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading cookie preferences:', error);
  }

  return {
    essential: true,
    analytics: false,
    marketing: false,
    preferences: false,
  };
}

/**
 * Check if user has given consent for cookies
 */
export function hasGivenConsent(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(COOKIE_CONSENT_KEY) === 'true';
}

/**
 * Set cookie with proper security attributes
 */
export function setSecureCookie(
  name: string,
  value: string,
  options: {
    maxAge?: number;
    expires?: Date;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    path?: string;
  } = {}
): void {
  if (typeof document === 'undefined') return;

  const {
    maxAge,
    expires,
    secure = process.env.NODE_ENV === 'production',
    sameSite = 'lax',
    path = '/',
  } = options;

  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  if (maxAge !== undefined) {
    cookieString += `; Max-Age=${maxAge}`;
  }

  if (expires) {
    cookieString += `; Expires=${expires.toUTCString()}`;
  }

  cookieString += `; Path=${path}`;

  if (secure) {
    cookieString += '; Secure';
  }

  cookieString += `; SameSite=${sameSite}`;

  document.cookie = cookieString;
}

/**
 * Get cookie value by name
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const nameEQ = encodeURIComponent(name) + '=';
  const ca = document.cookie.split(';');

  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  }
  return null;
}

/**
 * Delete a cookie
 */
export function deleteCookie(name: string, path: string = '/'): void {
  if (typeof document === 'undefined') return;
  
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
}

/**
 * Clear all non-essential cookies based on current consent
 */
export function clearNonEssentialCookies(): void {
  const preferences = getCookiePreferences();
  
  // Clear analytics cookies if not consented
  if (!preferences.analytics) {
    deleteCookie('_ga');
    deleteCookie('_gid');
    deleteCookie('_gat');
    
    // Clear Google Analytics from localStorage
    if (typeof window !== 'undefined') {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('_ga')) {
          localStorage.removeItem(key);
        }
      });
    }
  }

  // Clear marketing cookies if not consented
  if (!preferences.marketing) {
    // Add marketing cookie cleanup as needed
  }

  // Clear preference cookies if not consented
  if (!preferences.preferences) {
    deleteCookie('equisplit-theme-preference');
  }
}

/**
 * Initialize analytics based on consent
 */
export function initializeAnalytics(): void {
  const preferences = getCookiePreferences();
  
  if (!preferences.analytics || !hasGivenConsent()) {
    return;
  }

  // Initialize Google Analytics if consented
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'denied', // We don't use ads
    });
  }
}

/**
 * Get cookies by category for display purposes
 */
export function getCookiesByCategory(category: keyof CookiePreferences): CookieInfo[] {
  return COOKIE_REGISTRY.filter(cookie => cookie.category === category);
}

/**
 * Generate cookie policy content for legal pages
 */
export function generateCookiePolicyContent(): string {
  const categories = ['essential', 'analytics', 'preferences', 'marketing'] as const;
  
  let content = 'This website uses the following types of cookies:\n\n';
  
  categories.forEach(category => {
    const cookies = getCookiesByCategory(category);
    if (cookies.length === 0) return;
    
    content += `## ${category.charAt(0).toUpperCase() + category.slice(1)} Cookies\n\n`;
    
    cookies.forEach(cookie => {
      content += `**${cookie.name}**\n`;
      content += `- Purpose: ${cookie.purpose}\n`;
      content += `- Duration: ${cookie.duration}\n`;
      content += `- Provider: ${cookie.provider}\n\n`;
    });
  });
  
  return content;
}

/**
 * Check if current cookie usage complies with consent
 */
export function validateCookieCompliance(): {
  compliant: boolean;
  violations: string[];
} {
  if (typeof document === 'undefined') {
    return { compliant: true, violations: [] };
  }

  const preferences = getCookiePreferences();
  const hasConsent = hasGivenConsent();
  const violations: string[] = [];

  if (!hasConsent) {
    violations.push('User has not given cookie consent');
    return { compliant: false, violations };
  }

  // Check for unauthorized cookies
  const currentCookies = document.cookie.split(';').map(c => c.trim().split('=')[0]);
  
  COOKIE_REGISTRY.forEach(cookieInfo => {
    const hasThisCookie = currentCookies.some(name => name === cookieInfo.name);
    const isAllowed = preferences[cookieInfo.category];
    
    if (hasThisCookie && !isAllowed && cookieInfo.category !== 'essential') {
      violations.push(`Unauthorized ${cookieInfo.category} cookie found: ${cookieInfo.name}`);
    }
  });

  return {
    compliant: violations.length === 0,
    violations
  };
}