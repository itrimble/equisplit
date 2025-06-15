/**
 * Error Handling System Tests
 * Tests for EquiSplit's comprehensive error handling and logging system
 */

import { 
  EquiSplitError, 
  ErrorCategory, 
  ErrorSeverity, 
  ErrorCode,
  createValidationError,
  createCalculationError,
  createPaymentError,
  createSystemError,
  getErrorResponse,
  isEquiSplitError,
  globalBreadcrumbs
} from '@/lib/errors';
import { logger, LogLevel, LogCategory } from '@/lib/logger';
import { 
  withErrorHandling, 
  handleApiError, 
  createValidationErrorResponse,
  createAuthErrorResponse,
  createRateLimitErrorResponse 
} from '@/lib/api-error-handler';
import { NextRequest, NextResponse } from 'next/server';

// Mock dependencies
jest.mock('@/lib/audit', () => ({
  auditLog: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123')
}));

describe('EquiSplitError Class', () => {
  beforeEach(() => {
    globalBreadcrumbs.clear();
  });

  it('should create error with all required properties', () => {
    const error = new EquiSplitError('Test error message', {
      category: ErrorCategory.VALIDATION,
      code: ErrorCode.INVALID_INPUT,
      severity: ErrorSeverity.HIGH,
      userMessage: 'Custom user message',
      technicalDetails: { field: 'testField' },
      recoverable: true,
      retryable: false
    });

    expect(error.message).toBe('Test error message');
    expect(error.category).toBe(ErrorCategory.VALIDATION);
    expect(error.code).toBe(ErrorCode.INVALID_INPUT);
    expect(error.severity).toBe(ErrorSeverity.HIGH);
    expect(error.userMessage).toBe('Custom user message');
    expect(error.technicalDetails).toEqual({ field: 'testField' });
    expect(error.recoverable).toBe(true);
    expect(error.retryable).toBe(false);
    expect(error.correlationId).toBe('test-uuid-123');
    expect(error.context.timestamp).toBeInstanceOf(Date);
  });

  it('should generate default user message based on category', () => {
    const validationError = new EquiSplitError('Technical validation error', {
      category: ErrorCategory.VALIDATION,
      code: ErrorCode.INVALID_INPUT
    });

    const authError = new EquiSplitError('Technical auth error', {
      category: ErrorCategory.AUTHENTICATION,
      code: ErrorCode.UNAUTHORIZED
    });

    const calculationError = new EquiSplitError('Technical calc error', {
      category: ErrorCategory.CALCULATION,
      code: ErrorCode.CALCULATION_ERROR
    });

    expect(validationError.userMessage).toBe('Please check your input and try again.');
    expect(authError.userMessage).toBe('Please sign in to continue.');
    expect(calculationError.userMessage).toBe('Unable to complete the calculation. Please verify your input data.');
  });

  it('should serialize to JSON correctly', () => {
    const error = new EquiSplitError('Test error', {
      category: ErrorCategory.PAYMENT,
      code: ErrorCode.STRIPE_ERROR,
      technicalDetails: { paymentId: 'pay_123' }
    });

    const json = error.toJSON();

    expect(json.name).toBe('EquiSplitError');
    expect(json.message).toBe('Test error');
    expect(json.category).toBe(ErrorCategory.PAYMENT);
    expect(json.code).toBe(ErrorCode.STRIPE_ERROR);
    expect(json.technicalDetails).toEqual({ paymentId: 'pay_123' });
    expect(json.correlationId).toBe('test-uuid-123');
  });
});

describe('Error Factory Functions', () => {
  it('should create validation error with correct defaults', () => {
    const error = createValidationError('Invalid email format');

    expect(error.category).toBe(ErrorCategory.VALIDATION);
    expect(error.code).toBe(ErrorCode.INVALID_INPUT);
    expect(error.severity).toBe(ErrorSeverity.LOW);
    expect(error.recoverable).toBe(true);
    expect(error.retryable).toBe(false);
  });

  it('should create calculation error with correct defaults', () => {
    const error = createCalculationError('Property division failed');

    expect(error.category).toBe(ErrorCategory.CALCULATION);
    expect(error.code).toBe(ErrorCode.CALCULATION_ERROR);
    expect(error.severity).toBe(ErrorSeverity.HIGH);
    expect(error.recoverable).toBe(true);
    expect(error.userMessage).toContain('property division calculation');
  });

  it('should create payment error with correct defaults', () => {
    const error = createPaymentError('Payment processing failed');

    expect(error.category).toBe(ErrorCategory.PAYMENT);
    expect(error.code).toBe(ErrorCode.STRIPE_ERROR);
    expect(error.severity).toBe(ErrorSeverity.HIGH);
    expect(error.retryable).toBe(true);
    expect(error.userMessage).toContain('Payment processing failed');
  });

  it('should create system error with correct defaults', () => {
    const error = createSystemError('Database connection failed');

    expect(error.category).toBe(ErrorCategory.SYSTEM);
    expect(error.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
    expect(error.severity).toBe(ErrorSeverity.CRITICAL);
    expect(error.retryable).toBe(true);
  });
});

describe('Error Utilities', () => {
  it('should identify EquiSplitError instances correctly', () => {
    const equiSplitError = createValidationError('Test error');
    const regularError = new Error('Regular error');

    expect(isEquiSplitError(equiSplitError)).toBe(true);
    expect(isEquiSplitError(regularError)).toBe(false);
    expect(isEquiSplitError(null)).toBe(false);
    expect(isEquiSplitError(undefined)).toBe(false);
  });

  it('should generate correct error response for EquiSplitError', () => {
    const error = createValidationError('Invalid input', {
      code: ErrorCode.MISSING_REQUIRED_FIELD
    });

    const response = getErrorResponse(error);

    expect(response.success).toBe(false);
    expect(response.error.code).toBe(ErrorCode.MISSING_REQUIRED_FIELD);
    expect(response.error.message).toBe('Please check your input and try again.');
    expect(response.error.correlationId).toBe('test-uuid-123');
    expect(response.error.recoverable).toBe(true);
    expect(response.error.retryable).toBe(false);
  });

  it('should generate fallback error response for regular Error', () => {
    const error = new Error('Regular error');
    const response = getErrorResponse(error);

    expect(response.success).toBe(false);
    expect(response.error.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
    expect(response.error.message).toBe('An unexpected error occurred. Please try again later.');
    expect(response.error.retryable).toBe(true);
  });
});

describe('Breadcrumb System', () => {
  beforeEach(() => {
    globalBreadcrumbs.clear();
  });

  it('should add and retrieve breadcrumbs', () => {
    globalBreadcrumbs.addBreadcrumb({
      message: 'User started calculation',
      category: 'user_action',
      level: 'info',
      data: { step: 1 }
    });

    globalBreadcrumbs.addBreadcrumb({
      message: 'Validation failed',
      category: 'validation',
      level: 'warning'
    });

    const breadcrumbs = globalBreadcrumbs.getBreadcrumbs();

    expect(breadcrumbs).toHaveLength(2);
    expect(breadcrumbs[0].message).toBe('User started calculation');
    expect(breadcrumbs[0].level).toBe('info');
    expect(breadcrumbs[1].message).toBe('Validation failed');
    expect(breadcrumbs[1].level).toBe('warning');
  });

  it('should limit breadcrumbs to maximum count', () => {
    // Add more than the maximum (20) breadcrumbs
    for (let i = 0; i < 25; i++) {
      globalBreadcrumbs.addBreadcrumb({
        message: `Breadcrumb ${i}`,
        category: 'test',
        level: 'info'
      });
    }

    const breadcrumbs = globalBreadcrumbs.getBreadcrumbs();
    expect(breadcrumbs).toHaveLength(20);
    
    // Should keep the most recent ones
    expect(breadcrumbs[0].message).toBe('Breadcrumb 5');
    expect(breadcrumbs[19].message).toBe('Breadcrumb 24');
  });

  it('should clear breadcrumbs', () => {
    globalBreadcrumbs.addBreadcrumb({
      message: 'Test breadcrumb',
      category: 'test',
      level: 'info'
    });

    expect(globalBreadcrumbs.getBreadcrumbs()).toHaveLength(1);
    
    globalBreadcrumbs.clear();
    expect(globalBreadcrumbs.getBreadcrumbs()).toHaveLength(0);
  });
});

describe('Logger System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log different levels correctly', async () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();
    
    await logger.debug('Debug message', LogCategory.SYSTEM, { test: true });
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should start and end performance timers', async () => {
    const timerId = logger.startPerformanceTimer('test-operation');
    
    expect(timerId).toBeTruthy();
    
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 10));
    
    await logger.endPerformanceTimer(timerId, true, { additional: 'data' });
    
    // Should complete without errors
  });

  it('should log user actions', async () => {
    await logger.logUserAction('login', 'user-123', { ip: '127.0.0.1' });
    
    // Should complete without errors
  });

  it('should log calculations for legal compliance', async () => {
    const result = {
      totalAssets: 100000,
      totalDebts: 50000,
      distributionType: 'equitable'
    };

    await logger.logCalculation(
      'property_division',
      'CA',
      'user-123',
      result
    );
    
    // Should complete without errors
  });

  it('should log payments for financial compliance', async () => {
    await logger.logPayment(
      'subscription_created',
      2999, // $29.99
      'USD',
      'user-123',
      'pay_123'
    );
    
    // Should complete without errors
  });
});

describe('API Error Handler', () => {
  const createMockRequest = (url = 'http://localhost:3000/api/test') => {
    return new NextRequest(url, {
      method: 'POST',
      headers: {
        'user-agent': 'test-agent',
        'x-forwarded-for': '127.0.0.1'
      }
    });
  };

  it('should create validation error response', () => {
    const errors = [
      { field: 'email', message: 'Invalid email format' },
      { field: 'password', message: 'Password too short' }
    ];

    const response = createValidationErrorResponse(
      'Validation failed',
      errors,
      'test-correlation-id'
    );

    expect(response.status).toBe(400);
  });

  it('should create auth error response', () => {
    const response = createAuthErrorResponse(
      'Invalid credentials',
      'test-correlation-id'
    );

    expect(response.status).toBe(401);
  });

  it('should create rate limit error response', () => {
    const response = createRateLimitErrorResponse(60, 'test-correlation-id');

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
  });

  it('should handle API errors correctly', async () => {
    const context = {
      userId: 'user-123',
      endpoint: '/api/test',
      method: 'POST',
      startTime: performance.now(),
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent'
    };

    const validationError = createValidationError('Invalid input');
    const response = await handleApiError(validationError, context, 'correlation-123');

    expect(response.status).toBe(400);
    expect(response.headers.get('X-Correlation-ID')).toBe('correlation-123');
    expect(response.headers.get('X-Legal-Disclaimer')).toBeTruthy();
  });

  it('should wrap handlers with error handling', async () => {
    const mockHandler = jest.fn().mockImplementation(async () => {
      throw createValidationError('Test validation error');
    });

    const wrappedHandler = withErrorHandling(mockHandler);
    const request = createMockRequest();

    const response = await wrappedHandler(request);

    expect(response.status).toBe(400);
    expect(response.headers.get('X-Correlation-ID')).toBeTruthy();
    expect(mockHandler).toHaveBeenCalled();
  });

  it('should handle successful API responses', async () => {
    const mockHandler = jest.fn().mockImplementation(async () => {
      return NextResponse.json({ success: true });
    });

    const wrappedHandler = withErrorHandling(mockHandler);
    const request = createMockRequest();

    const response = await wrappedHandler(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Correlation-ID')).toBeTruthy();
    expect(response.headers.get('X-Legal-Disclaimer')).toBeTruthy();
  });
});

describe('Integration Tests', () => {
  it('should handle error flow from creation to API response', async () => {
    // 1. Create an error
    const originalError = createCalculationError('Division by zero in calculation', {
      technicalDetails: {
        operation: 'divide',
        dividend: 100000,
        divisor: 0
      },
      context: {
        userId: 'user-123'
      }
    });

    // 2. Verify error properties
    expect(originalError.category).toBe(ErrorCategory.CALCULATION);
    expect(originalError.severity).toBe(ErrorSeverity.HIGH);
    expect(originalError.recoverable).toBe(true);

    // 3. Convert to API response
    const apiResponse = getErrorResponse(originalError);
    expect(apiResponse.success).toBe(false);
    expect(apiResponse.error.code).toBe(ErrorCode.CALCULATION_ERROR);

    // 4. Verify user-friendly message
    expect(apiResponse.error.message).toContain('calculation');
    expect(apiResponse.error.message).not.toContain('Division by zero');
  });

  it('should maintain error context through the system', async () => {
    // Add breadcrumbs to simulate user journey
    globalBreadcrumbs.addBreadcrumb({
      message: 'User accessed calculator',
      category: 'navigation',
      level: 'info'
    });

    globalBreadcrumbs.addBreadcrumb({
      message: 'Form validation started',
      category: 'validation',
      level: 'info'
    });

    // Create error with context
    const error = createValidationError('Missing required field: jurisdiction', {
      context: {
        userId: 'user-123',
        endpoint: '/api/calculate',
        breadcrumbs: globalBreadcrumbs.getBreadcrumbs()
      }
    });

    // Verify breadcrumbs are preserved
    expect(error.context.breadcrumbs).toHaveLength(2);
    expect(error.context.breadcrumbs[0].message).toBe('User accessed calculator');
    expect(error.context.breadcrumbs[1].message).toBe('Form validation started');
  });
});