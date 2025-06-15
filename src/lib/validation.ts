import { z } from "zod";
import DOMPurify from "isomorphic-dompurify";

/**
 * Security-focused data validation and sanitization utilities
 * For legal and financial data compliance
 */

// Common validation schemas
export const emailSchema = z.string().email().max(254);
export const phoneSchema = z.string().regex(/^\+?[\d\s\-\(\)]{10,}$/);
export const currencySchema = z.number().min(0).max(999999999.99);
export const percentageSchema = z.number().min(0).max(100);
export const dateSchema = z.date().max(new Date());
export const futureDateSchema = z.date().min(new Date());

// Financial data validation
export const assetValueSchema = z.object({
  currentValue: currencySchema,
  acquisitionValue: currencySchema.optional(),
  acquisitionDate: dateSchema.optional(),
  description: z.string().min(1).max(500),
  type: z.enum([
    "REAL_ESTATE",
    "VEHICLE", 
    "BANK_ACCOUNT",
    "INVESTMENT_ACCOUNT",
    "RETIREMENT_ACCOUNT",
    "BUSINESS_INTEREST",
    "PERSONAL_PROPERTY",
    "CRYPTOCURRENCY",
    "INSURANCE",
    "OTHER"
  ]),
  isSeparateProperty: z.boolean().default(false),
  notes: z.string().max(1000).optional(),
});

export const debtSchema = z.object({
  currentBalance: currencySchema,
  originalAmount: currencySchema.optional(),
  acquisitionDate: dateSchema.optional(),
  description: z.string().min(1).max(500),
  type: z.enum([
    "MORTGAGE",
    "VEHICLE_LOAN", 
    "CREDIT_CARD",
    "STUDENT_LOAN",
    "BUSINESS_DEBT",
    "PERSONAL_LOAN",
    "OTHER"
  ]),
  isSeparateProperty: z.boolean().default(false),
  notes: z.string().max(1000).optional(),
});

// Personal information validation
export const personalInfoSchema = z.object({
  name: z.string().min(1).max(100),
  marriageDate: dateSchema,
  separationDate: dateSchema.optional(),
  hasPrenup: z.boolean().default(false),
  jurisdiction: z.enum([
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"
  ]),
});

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}

/**
 * Sanitize and validate text input
 */
export function sanitizeText(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }
  
  // Remove any HTML
  let sanitized = sanitizeHtml(input);
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  // Remove null bytes and other control characters
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  return sanitized;
}

/**
 * Validate and sanitize currency values
 */
export function sanitizeCurrency(value: any): number {
  if (typeof value === 'string') {
    // Remove currency symbols and formatting
    const cleaned = value.replace(/[$,\s]/g, '');
    value = parseFloat(cleaned);
  }
  
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error('Invalid currency value');
  }
  
  // Round to 2 decimal places
  value = Math.round(value * 100) / 100;
  
  // Validate range
  if (value < 0 || value > 999999999.99) {
    throw new Error('Currency value out of range');
  }
  
  return value;
}

/**
 * Validate and sanitize date input
 */
export function sanitizeDate(input: any): Date {
  let date: Date;
  
  if (typeof input === 'string') {
    date = new Date(input);
  } else if (input instanceof Date) {
    date = input;
  } else {
    throw new Error('Invalid date input');
  }
  
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date format');
  }
  
  // Reasonable date range for legal purposes (1900-2100)
  const minYear = 1900;
  const maxYear = 2100;
  
  if (date.getFullYear() < minYear || date.getFullYear() > maxYear) {
    throw new Error(`Date must be between ${minYear} and ${maxYear}`);
  }
  
  return date;
}

/**
 * Validate file upload security
 */
export function validateFileUpload(file: File): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push('File size exceeds 10MB limit');
  }
  
  // Check file type
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    errors.push('File type not allowed');
  }
  
  // Check filename for security
  const filename = sanitizeText(file.name, 255);
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    errors.push('Invalid filename');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * SQL injection prevention for dynamic queries
 */
export function sanitizeForDatabase(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }
  
  // Basic SQL injection prevention
  const sqlChars = /['";\\]/g;
  return input.replace(sqlChars, '');
}

/**
 * Validate API request structure
 */
export function validateApiRequest<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return { success: false, errors };
    }
    return { success: false, errors: ['Validation failed'] };
  }
}

/**
 * Rate limit key generation for consistent hashing
 */
export function generateRateLimitKey(ip: string, endpoint: string): string {
  // Normalize IP address
  const normalizedIP = ip.replace(/[\[\]]/g, ''); // Remove IPv6 brackets
  
  // Create consistent key
  return `${normalizedIP}:${endpoint}`;
}

/**
 * Legal compliance validation
 */
export const legalComplianceChecks = {
  /**
   * Check if user can access legal features
   */
  canAccessLegalFeatures(userRole: string, subscriptionTier: string): boolean {
    return userRole !== 'USER' || subscriptionTier !== 'FREE';
  },
  
  /**
   * Validate jurisdiction for legal operations
   */
  validateJurisdiction(state: string): boolean {
    const validStates = [
      "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
      "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
      "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
      "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
      "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"
    ];
    return validStates.includes(state);
  },
  
  /**
   * Check if data requires encryption
   */
  requiresEncryption(dataType: string): boolean {
    const sensitiveTypes = [
      'financial_data',
      'personal_information',
      'legal_documents',
      'calculation_results'
    ];
    return sensitiveTypes.includes(dataType);
  }
};

// Export validation schemas for reuse
export const validationSchemas = {
  email: emailSchema,
  phone: phoneSchema,
  currency: currencySchema,
  percentage: percentageSchema,
  date: dateSchema,
  futureDate: futureDateSchema,
  asset: assetValueSchema,
  debt: debtSchema,
  personalInfo: personalInfoSchema,
};