/**
 * API Error Handling Middleware for EquiSplit
 * Provides consistent error handling across all API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { 
  EquiSplitError, 
  createValidationError, 
  createSystemError, 
  getErrorResponse,
  isEquiSplitError,
  ErrorCode,
  ErrorCategory
} from './errors';
import { logger } from './logger';

export interface ApiContext {
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  endpoint: string;
  method: string;
  startTime: number;
}

export type ApiHandler = (
  request: NextRequest,
  context: ApiContext
) => Promise<NextResponse>;

export function withErrorHandling(handler: ApiHandler) {
  return async (request: NextRequest, params?: any): Promise<NextResponse> => {
    const startTime = performance.now();
    const context: ApiContext = {
      endpoint: request.nextUrl.pathname,
      method: request.method,
      startTime,
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || 'unknown'
    };

    // Generate correlation ID for request tracking
    const correlationId = crypto.randomUUID();
    
    try {
      // Extract user context if available (from auth middleware)
      context.userId = request.headers.get('x-user-id') || undefined;
      context.sessionId = request.headers.get('x-session-id') || undefined;

      // Log API request start
      await logger.debug(
        `API request started: ${context.method} ${context.endpoint}`,
        'api',
        { correlationId, ...context }
      );

      // Call the actual handler
      const response = await handler(request, context);
      
      // Log successful API response
      const duration = performance.now() - startTime;
      await logger.logApiRequest(
        context.method,
        context.endpoint,
        response.status,
        duration,
        context.userId
      );

      // Add correlation ID to response headers
      response.headers.set('X-Correlation-ID', correlationId);
      
      // Add legal disclaimer headers
      response.headers.set('X-Legal-Disclaimer', 'This software provides educational calculations only and does not constitute legal advice. Consult qualified legal professionals for specific legal guidance.');
      response.headers.set('X-Professional-Consultation', 'true');
      response.headers.set('X-No-Attorney-Client', 'true');

      return response;

    } catch (error) {
      return handleApiError(error, context, correlationId);
    }
  };
}

export async function handleApiError(
  error: unknown,
  context: ApiContext,
  correlationId: string
): Promise<NextResponse> {
  const duration = performance.now() - context.startTime;
  
  let equiSplitError: EquiSplitError;

  // Convert different error types to EquiSplitError
  if (isEquiSplitError(error)) {
    equiSplitError = error;
  } else if (error instanceof ZodError) {
    equiSplitError = createValidationError(
      'Invalid input data',
      {
        code: ErrorCode.INVALID_INPUT,
        technicalDetails: {
          validationErrors: error.errors,
          correlationId
        },
        context: {
          userId: context.userId,
          endpoint: context.endpoint,
          method: context.method
        }
      }
    );
  } else if (error instanceof Error) {
    // Handle specific known error types
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      equiSplitError = new EquiSplitError(
        'External service connection failed',
        {
          category: ErrorCategory.EXTERNAL_SERVICE,
          code: ErrorCode.CONNECTION_FAILED,
          userMessage: 'Service temporarily unavailable. Please try again later.',
          technicalDetails: { originalError: error.message, correlationId },
          retryable: true,
          context: { userId: context.userId }
        }
      );
    } else if (error.message.includes('timeout')) {
      equiSplitError = new EquiSplitError(
        'Request timeout',
        {
          category: ErrorCategory.SYSTEM,
          code: ErrorCode.TIMEOUT,
          userMessage: 'Request took too long to complete. Please try again.',
          technicalDetails: { originalError: error.message, correlationId },
          retryable: true,
          context: { userId: context.userId }
        }
      );
    } else {
      equiSplitError = createSystemError(
        error.message,
        {
          technicalDetails: { 
            stack: error.stack, 
            correlationId,
            endpoint: context.endpoint 
          },
          context: { userId: context.userId },
          cause: error
        }
      );
    }
  } else {
    equiSplitError = createSystemError(
      'Unknown error occurred',
      {
        technicalDetails: { 
          unknownError: String(error), 
          correlationId,
          endpoint: context.endpoint 
        },
        context: { userId: context.userId }
      }
    );
  }

  // Log the error
  await logger.logApiRequest(
    context.method,
    context.endpoint,
    getHttpStatusCode(equiSplitError),
    duration,
    context.userId,
    equiSplitError
  );

  // Get error response
  const errorResponse = getErrorResponse(equiSplitError);

  // Create HTTP response with appropriate status code
  const response = NextResponse.json(errorResponse, {
    status: getHttpStatusCode(equiSplitError)
  });

  // Add correlation ID and legal headers
  response.headers.set('X-Correlation-ID', correlationId);
  response.headers.set('X-Legal-Disclaimer', 'This software provides educational calculations only and does not constitute legal advice. Consult qualified legal professionals for specific legal guidance.');
  response.headers.set('X-Professional-Consultation', 'true');
  response.headers.set('X-No-Attorney-Client', 'true');

  return response;
}

function getHttpStatusCode(error: EquiSplitError): number {
  switch (error.code) {
    case ErrorCode.INVALID_INPUT:
    case ErrorCode.MISSING_REQUIRED_FIELD:
    case ErrorCode.INVALID_FORMAT:
    case ErrorCode.INCOMPATIBLE_ASSET_TYPE:
      return 400; // Bad Request

    case ErrorCode.UNAUTHORIZED:
    case ErrorCode.INVALID_CREDENTIALS:
    case ErrorCode.SESSION_EXPIRED:
      return 401; // Unauthorized

    case ErrorCode.MFA_REQUIRED:
      return 401; // Unauthorized (with MFA challenge)

    case ErrorCode.INSUFFICIENT_PERMISSIONS:
    case ErrorCode.SUBSCRIPTION_REQUIRED:
      return 403; // Forbidden

    case ErrorCode.RATE_LIMIT_EXCEEDED:
      return 429; // Too Many Requests

    case ErrorCode.CONNECTION_FAILED:
    case ErrorCode.EMAIL_SERVICE_ERROR:
      return 503; // Service Unavailable

    case ErrorCode.TIMEOUT:
      return 504; // Gateway Timeout

    case ErrorCode.FILE_TOO_LARGE:
      return 413; // Payload Too Large

    case ErrorCode.INVALID_FILE_TYPE:
      return 415; // Unsupported Media Type

    case ErrorCode.CALCULATION_ERROR:
    case ErrorCode.INVALID_STATE_SELECTION:
    case ErrorCode.FILE_PROCESSING_FAILED:
    case ErrorCode.OCR_FAILED:
      return 422; // Unprocessable Entity

    case ErrorCode.STRIPE_ERROR:
    case ErrorCode.DATABASE_ERROR:
    case ErrorCode.INTERNAL_SERVER_ERROR:
    case ErrorCode.SERVICE_UNAVAILABLE:
    case ErrorCode.NETWORK_ERROR:
    case ErrorCode.UPL_VIOLATION_RISK:
    case ErrorCode.COMPLIANCE_CHECK_FAILED:
    case ErrorCode.AUDIT_TRAIL_ERROR:
    default:
      return 500; // Internal Server Error
  }
}

function getClientIP(request: NextRequest): string {
  // Try to get real IP from various headers
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (cfConnectingIP) return cfConnectingIP;
  if (xRealIP) return xRealIP;
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  
  return 'unknown';
}

// Helper function for validation error responses
export function createValidationErrorResponse(
  message: string,
  validationErrors: any[],
  correlationId?: string
): NextResponse {
  const error = createValidationError(message, {
    technicalDetails: { validationErrors, correlationId }
  });

  const errorResponse = getErrorResponse(error);
  
  return NextResponse.json(errorResponse, { status: 400 });
}

// Helper function for authentication error responses
export function createAuthErrorResponse(
  message: string = 'Authentication required',
  correlationId?: string
): NextResponse {
  const error = new EquiSplitError(message, {
    category: ErrorCategory.AUTHENTICATION,
    code: ErrorCode.UNAUTHORIZED,
    userMessage: 'Please sign in to continue.',
    technicalDetails: { correlationId }
  });

  const errorResponse = getErrorResponse(error);
  
  return NextResponse.json(errorResponse, { status: 401 });
}

// Helper function for rate limit error responses
export function createRateLimitErrorResponse(
  retryAfter: number,
  correlationId?: string
): NextResponse {
  const error = new EquiSplitError('Rate limit exceeded', {
    category: ErrorCategory.AUTHORIZATION,
    code: ErrorCode.RATE_LIMIT_EXCEEDED,
    userMessage: 'Too many requests. Please wait before trying again.',
    technicalDetails: { retryAfter, correlationId },
    retryable: true
  });

  const errorResponse = getErrorResponse(error);
  
  const response = NextResponse.json(errorResponse, { status: 429 });
  response.headers.set('Retry-After', retryAfter.toString());
  
  return response;
}