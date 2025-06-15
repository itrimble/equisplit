/**
 * Centralized Error Handling System for EquiSplit
 * Provides type-safe error handling with legal compliance and audit trail integration
 */

import { v4 as uuidv4 } from 'uuid';
import { auditLogger } from './audit';

export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_SERVICE = 'external_service',
  SYSTEM = 'system',
  NETWORK = 'network',
  CALCULATION = 'calculation',
  PAYMENT = 'payment',
  FILE_PROCESSING = 'file_processing',
  LEGAL_COMPLIANCE = 'legal_compliance'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCode {
  // Validation Errors
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',

  // Authentication Errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  MFA_REQUIRED = 'MFA_REQUIRED',

  // Authorization Errors
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  SUBSCRIPTION_REQUIRED = 'SUBSCRIPTION_REQUIRED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Business Logic Errors
  CALCULATION_ERROR = 'CALCULATION_ERROR',
  INVALID_STATE_SELECTION = 'INVALID_STATE_SELECTION',
  INCOMPATIBLE_ASSET_TYPE = 'INCOMPATIBLE_ASSET_TYPE',

  // External Service Errors
  STRIPE_ERROR = 'STRIPE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EMAIL_SERVICE_ERROR = 'EMAIL_SERVICE_ERROR',

  // System Errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',

  // Network Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONNECTION_FAILED = 'CONNECTION_FAILED',

  // File Processing Errors
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_PROCESSING_FAILED = 'FILE_PROCESSING_FAILED',
  OCR_FAILED = 'OCR_FAILED',

  // Legal Compliance Errors
  UPL_VIOLATION_RISK = 'UPL_VIOLATION_RISK',
  COMPLIANCE_CHECK_FAILED = 'COMPLIANCE_CHECK_FAILED',
  AUDIT_TRAIL_ERROR = 'AUDIT_TRAIL_ERROR'
}

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  userAgent?: string;
  ipAddress?: string;
  endpoint?: string;
  method?: string;
  timestamp: Date;
  breadcrumbs: ErrorBreadcrumb[];
  additionalData?: Record<string, any>;
}

export interface ErrorBreadcrumb {
  timestamp: Date;
  message: string;
  category: string;
  level: 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}

export class EquiSplitError extends Error {
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly code: ErrorCode;
  public readonly userMessage: string;
  public readonly technicalDetails: Record<string, any>;
  public readonly correlationId: string;
  public readonly context: ErrorContext;
  public readonly recoverable: boolean;
  public readonly retryable: boolean;

  constructor(
    message: string,
    {
      category,
      severity = ErrorSeverity.MEDIUM,
      code,
      userMessage,
      technicalDetails = {},
      context,
      recoverable = false,
      retryable = false,
      cause
    }: {
      category: ErrorCategory;
      severity?: ErrorSeverity;
      code: ErrorCode;
      userMessage?: string;
      technicalDetails?: Record<string, any>;
      context?: Partial<ErrorContext>;
      recoverable?: boolean;
      retryable?: boolean;
      cause?: Error;
    }
  ) {
    super(message, { cause });
    this.name = 'EquiSplitError';
    
    this.category = category;
    this.severity = severity;
    this.code = code;
    this.userMessage = userMessage || this.getDefaultUserMessage();
    this.technicalDetails = technicalDetails;
    this.correlationId = uuidv4();
    this.recoverable = recoverable;
    this.retryable = retryable;

    this.context = {
      timestamp: new Date(),
      breadcrumbs: [],
      ...context
    };

    // Log error to audit system
    this.logError();
  }

  private getDefaultUserMessage(): string {
    switch (this.category) {
      case ErrorCategory.VALIDATION:
        return 'Please check your input and try again.';
      case ErrorCategory.AUTHENTICATION:
        return 'Please sign in to continue.';
      case ErrorCategory.AUTHORIZATION:
        return 'You do not have permission to perform this action.';
      case ErrorCategory.CALCULATION:
        return 'Unable to complete the calculation. Please verify your input data.';
      case ErrorCategory.PAYMENT:
        return 'Payment processing failed. Please try again or contact support.';
      case ErrorCategory.FILE_PROCESSING:
        return 'File processing failed. Please check the file format and try again.';
      case ErrorCategory.LEGAL_COMPLIANCE:
        return 'This action cannot be completed due to legal compliance requirements.';
      case ErrorCategory.NETWORK:
        return 'Network connection failed. Please check your internet connection.';
      case ErrorCategory.EXTERNAL_SERVICE:
        return 'External service temporarily unavailable. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again or contact support.';
    }
  }

  private async logError(): Promise<void> {
    try {
      const complianceLevel = this.getComplianceLevel();
      
      await auditLogger.logSystemAction(
        'error_occurred',
        this.context.endpoint || 'unknown',
        {
          errorId: this.correlationId,
          category: this.category,
          severity: this.severity,
          code: this.code,
          message: this.message,
          userMessage: this.userMessage,
          technicalDetails: this.technicalDetails,
          recoverable: this.recoverable,
          retryable: this.retryable,
          breadcrumbs: this.context.breadcrumbs,
          timestamp: this.context.timestamp,
          cause: this.cause?.message
        },
        complianceLevel as any
      );
    } catch (loggingError) {
      // Fallback logging to console if audit system fails
      console.error('Failed to log error to audit system:', loggingError);
      console.error('Original error:', this);
    }
  }

  private getComplianceLevel(): 'STANDARD' | 'FINANCIAL' | 'LEGAL' {
    switch (this.category) {
      case ErrorCategory.CALCULATION:
      case ErrorCategory.LEGAL_COMPLIANCE:
        return 'LEGAL';
      case ErrorCategory.PAYMENT:
        return 'FINANCIAL';
      default:
        return 'STANDARD';
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      severity: this.severity,
      code: this.code,
      userMessage: this.userMessage,
      technicalDetails: this.technicalDetails,
      correlationId: this.correlationId,
      recoverable: this.recoverable,
      retryable: this.retryable,
      timestamp: this.context.timestamp,
      stack: this.stack
    };
  }
}

// Error Factory Functions
export const createValidationError = (
  message: string,
  options?: Partial<ConstructorParameters<typeof EquiSplitError>[1]>
) => new EquiSplitError(message, {
  category: ErrorCategory.VALIDATION,
  code: ErrorCode.INVALID_INPUT,
  severity: ErrorSeverity.LOW,
  recoverable: true,
  ...options
});

export const createAuthenticationError = (
  message: string,
  options?: Partial<ConstructorParameters<typeof EquiSplitError>[1]>
) => new EquiSplitError(message, {
  category: ErrorCategory.AUTHENTICATION,
  code: ErrorCode.UNAUTHORIZED,
  severity: ErrorSeverity.MEDIUM,
  userMessage: 'Please sign in to continue.',
  ...options
});

export const createCalculationError = (
  message: string,
  options?: Partial<ConstructorParameters<typeof EquiSplitError>[1]>
) => new EquiSplitError(message, {
  category: ErrorCategory.CALCULATION,
  code: ErrorCode.CALCULATION_ERROR,
  severity: ErrorSeverity.HIGH,
  userMessage: 'Unable to complete the property division calculation. Please verify your input data and try again.',
  recoverable: true,
  ...options
});

export const createPaymentError = (
  message: string,
  options?: Partial<ConstructorParameters<typeof EquiSplitError>[1]>
) => new EquiSplitError(message, {
  category: ErrorCategory.PAYMENT,
  code: ErrorCode.STRIPE_ERROR,
  severity: ErrorSeverity.HIGH,
  userMessage: 'Payment processing failed. Please verify your payment information and try again.',
  retryable: true,
  ...options
});

export const createSystemError = (
  message: string,
  options?: Partial<ConstructorParameters<typeof EquiSplitError>[1]>
) => new EquiSplitError(message, {
  category: ErrorCategory.SYSTEM,
  code: ErrorCode.INTERNAL_SERVER_ERROR,
  severity: ErrorSeverity.CRITICAL,
  userMessage: 'A system error occurred. Our team has been notified. Please try again later.',
  retryable: true,
  ...options
});

// Error Utilities
export const isEquiSplitError = (error: any): error is EquiSplitError => {
  return error instanceof EquiSplitError;
};

export const getErrorResponse = (error: EquiSplitError | Error) => {
  if (isEquiSplitError(error)) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.userMessage,
        correlationId: error.correlationId,
        recoverable: error.recoverable,
        retryable: error.retryable
      }
    };
  }

  // Fallback for non-EquiSplitError instances
  return {
    success: false,
    error: {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred. Please try again later.',
      correlationId: uuidv4(),
      recoverable: false,
      retryable: true
    }
  };
};

// Breadcrumb Management
export class ErrorBreadcrumbTracker {
  private breadcrumbs: ErrorBreadcrumb[] = [];
  private maxBreadcrumbs = 20;

  addBreadcrumb(breadcrumb: Omit<ErrorBreadcrumb, 'timestamp'>) {
    this.breadcrumbs.push({
      ...breadcrumb,
      timestamp: new Date()
    });

    // Keep only the most recent breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }
  }

  getBreadcrumbs(): ErrorBreadcrumb[] {
    return [...this.breadcrumbs];
  }

  clear() {
    this.breadcrumbs = [];
  }
}

// Global breadcrumb tracker
export const globalBreadcrumbs = new ErrorBreadcrumbTracker();