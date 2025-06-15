# Error Handling & Logging System

## Overview

EquiSplit implements a comprehensive error handling and logging system designed for legal technology compliance, with specific focus on UPL (Unauthorized Practice of Law) requirements, financial regulations, and production-grade reliability.

## Architecture

### Core Components

1. **EquiSplitError Class** - Centralized error type with legal compliance features
2. **Logger System** - Multi-level logging with audit trail integration  
3. **Error Boundaries** - React error boundaries with graceful degradation
4. **API Error Handler** - Consistent API error responses with correlation tracking
5. **Client-Side Components** - User-friendly error display and recovery

### Error Categories

```typescript
enum ErrorCategory {
  VALIDATION = 'validation',           // Input validation errors
  AUTHENTICATION = 'authentication',   // Auth/session errors
  AUTHORIZATION = 'authorization',     // Permission/access errors
  BUSINESS_LOGIC = 'business_logic',   // Business rule violations
  EXTERNAL_SERVICE = 'external_service', // Third-party service errors
  SYSTEM = 'system',                   // Internal system errors
  NETWORK = 'network',                 // Network/connectivity errors
  CALCULATION = 'calculation',         // Property division calculation errors
  PAYMENT = 'payment',                 // Stripe/payment processing errors
  FILE_PROCESSING = 'file_processing', // File upload/parsing errors
  LEGAL_COMPLIANCE = 'legal_compliance' // UPL/compliance violations
}
```

### Error Severity Levels

```typescript
enum ErrorSeverity {
  LOW = 'low',        // Information/warnings that don't block functionality
  MEDIUM = 'medium',  // Errors that affect user experience but allow continuation
  HIGH = 'high',      // Serious errors that block core functionality
  CRITICAL = 'critical' // System-threatening errors requiring immediate attention
}
```

## Features

### Legal Compliance Integration

- **UPL Protection**: All error messages avoid providing legal advice
- **Audit Trail**: Every error automatically logged for compliance monitoring
- **Correlation IDs**: Unique identifiers for error tracking and legal discovery
- **Breadcrumb System**: User journey tracking for debugging and compliance

### Production-Ready Error Handling

- **Graceful Degradation**: Error boundaries prevent application crashes
- **User-Friendly Messages**: Technical details hidden from end users
- **Recovery Mechanisms**: Automatic retry logic for transient failures
- **Context Preservation**: Maintains user state during error recovery

### Security & Privacy

- **Sanitized Responses**: Technical details only exposed in development
- **Rate Limiting Integration**: Error handling respects rate limiting
- **Encryption**: Sensitive error context encrypted in audit logs
- **IP Tracking**: Client IP tracking for security monitoring

## Usage

### Creating Errors

```typescript
import { createCalculationError, createValidationError } from '@/lib/errors';

// Calculation error with legal compliance
const calcError = createCalculationError(
  'Property division calculation failed',
  {
    technicalDetails: {
      jurisdiction: 'CA',
      assetCount: 5,
      debtCount: 2
    },
    context: {
      userId: 'user-123',
      endpoint: '/api/calculate'
    }
  }
);

// Validation error with recovery guidance
const validationError = createValidationError(
  'Missing required field: jurisdiction',
  {
    technicalDetails: { field: 'jurisdiction' },
    recoverable: true
  }
);
```

### API Error Handling

```typescript
import { withErrorHandling } from '@/lib/api-error-handler';

async function handlePOST(request: NextRequest, context: ApiContext) {
  // Authentication check
  const session = await auth();
  if (!session?.user?.id) {
    throw createAuthErrorResponse('Authentication required');
  }

  // Business logic
  const result = await someBusinessLogic();
  
  return NextResponse.json({ success: true, result });
}

// Export with error handling wrapper
export const POST = withErrorHandling(handlePOST);
```

### React Error Boundaries

```typescript
import { ErrorBoundary, CalculatorErrorFallback } from '@/components/error-boundary';

function MyComponent() {
  return (
    <ErrorBoundary 
      feature="Property Calculator"
      fallback={CalculatorErrorFallback}
    >
      <PropertyCalculator />
    </ErrorBoundary>
  );
}
```

### Client-Side Error Display

```typescript
import { ErrorDisplay, useErrorHandler } from '@/components/error-display';

function CalculatorForm() {
  const { error, isLoading, handleAsync, clearError } = useErrorHandler();

  const submitCalculation = async (data: FormData) => {
    await handleAsync(
      () => api.calculate(data),
      {
        onSuccess: (result) => {
          // Handle success
        },
        onError: (error) => {
          // Error automatically captured
        }
      }
    );
  };

  return (
    <div>
      <ErrorDisplay 
        error={error}
        onRetry={() => submitCalculation(lastFormData)}
        onDismiss={clearError}
      />
      {/* Form content */}
    </div>
  );
}
```

### Logging and Monitoring

```typescript
import { logger } from '@/lib/logger';

// Performance monitoring
const timerId = logger.startPerformanceTimer('property-calculation');
try {
  const result = await calculatePropertyDivision(input);
  await logger.endPerformanceTimer(timerId, true);
} catch (error) {
  await logger.endPerformanceTimer(timerId, false);
  throw error;
}

// User action logging for compliance
await logger.logUserAction(
  'document_generated',
  userId,
  { documentType: 'MSA', jurisdiction: 'CA' }
);

// Calculation logging for legal compliance
await logger.logCalculation(
  'property_division',
  'CA',
  userId,
  calculationResult
);
```

## Configuration

### Environment Variables

```bash
# Logging configuration
LOG_LEVEL=INFO              # DEBUG, INFO, WARN, ERROR, CRITICAL
NODE_ENV=production         # Affects logging verbosity

# Error monitoring
SENTRY_DSN=your-sentry-dsn  # External error monitoring (optional)
```

### Log Levels by Environment

- **Development**: DEBUG level, full console output, technical details exposed
- **Staging**: INFO level, structured logging, sanitized error responses  
- **Production**: INFO level, audit logging only, user-friendly messages only

## Error Response Format

### API Error Response

```json
{
  "success": false,
  "error": {
    "code": "CALCULATION_ERROR",
    "message": "Unable to complete the calculation. Please verify your input data.",
    "correlationId": "550e8400-e29b-41d4-a716-446655440000",
    "recoverable": true,
    "retryable": false
  }
}
```

### HTTP Headers

All error responses include legal compliance headers:

```
X-Legal-Disclaimer: Educational calculations only. Not legal advice.
X-Professional-Consultation: Consult qualified legal professionals.
X-No-Attorney-Client: No attorney-client relationship created.
X-Correlation-ID: 550e8400-e29b-41d4-a716-446655440000
```

## Error Recovery Patterns

### Automatic Retry

```typescript
// Automatic retry for transient failures
const result = await retry(
  () => api.calculateProperty(data),
  {
    maxRetries: 3,
    retryDelay: 1000,
    backoff: 'exponential'
  }
);
```

### Graceful Fallback

```typescript
// Fallback to cached data or default behavior
try {
  const result = await api.getLiveData();
  return result;
} catch (error) {
  if (error.retryable) {
    // Show retry option to user
    return await showRetryDialog();
  } else {
    // Fall back to cached data
    return getCachedData();
  }
}
```

### State Preservation

```typescript
// Preserve user progress during errors
const [formState, setFormState] = useFormState();
const { error, handleAsync } = useErrorHandler();

const submitForm = async (data: FormData) => {
  // Save state before submission
  setFormState(data);
  
  await handleAsync(() => api.submit(data));
};

// Form state preserved if error occurs
```

## Testing

### Error Scenario Testing

```typescript
describe('Error Handling', () => {
  it('should handle calculation errors gracefully', async () => {
    const mockError = createCalculationError('Division by zero');
    
    jest.spyOn(api, 'calculate').mockRejectedValue(mockError);
    
    render(<CalculatorForm />);
    
    fireEvent.click(screen.getByRole('button', { name: /calculate/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/unable to complete/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });
});
```

### Error Boundary Testing

```typescript
function ThrowError() {
  throw createSystemError('Test error');
}

it('should catch errors in error boundary', () => {
  const onError = jest.fn();
  
  render(
    <ErrorBoundary onError={onError}>
      <ThrowError />
    </ErrorBoundary>
  );
  
  expect(onError).toHaveBeenCalled();
  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
});
```

## Monitoring and Alerts

### Key Metrics

- **Error Rate**: Percentage of requests resulting in errors
- **Error Categories**: Distribution of error types
- **Recovery Success**: Percentage of successful error recoveries
- **Response Times**: API response times during error conditions
- **User Impact**: Number of users affected by errors

### Alert Thresholds

- **Critical**: >5% error rate or any critical severity errors
- **High**: >2% error rate or >10 high severity errors/hour
- **Medium**: >1% error rate or unusual error pattern detection

### Legal Compliance Monitoring

- **UPL Violations**: Automated scanning for legal advice language
- **Audit Trail Gaps**: Missing or incomplete error audit logs
- **Data Privacy**: Exposure of sensitive information in error logs

## Best Practices

### Error Creation

1. **Use Specific Error Codes**: Choose appropriate ErrorCode for the situation
2. **Provide Context**: Include relevant technical details for debugging
3. **User-Friendly Messages**: Never expose technical details to users
4. **Legal Compliance**: Avoid language that could constitute legal advice

### Error Handling

1. **Fail Fast**: Detect and handle errors as early as possible
2. **Preserve Context**: Maintain user state and breadcrumbs
3. **Graceful Degradation**: Provide fallback functionality when possible
4. **Clear Recovery**: Offer clear next steps to users

### Logging

1. **Structured Logging**: Use consistent log formats and fields
2. **Correlation IDs**: Track requests across system boundaries
3. **Appropriate Levels**: Use correct log levels for different scenarios
4. **Performance**: Use async logging to avoid blocking operations

### Security

1. **Sanitize Outputs**: Never expose sensitive data in error messages
2. **Rate Limiting**: Implement error-based rate limiting
3. **Audit Everything**: Log all security-relevant errors
4. **Monitor Patterns**: Watch for suspicious error patterns

## Troubleshooting

### Common Issues

**Error Not Logged**
- Check log level configuration
- Verify audit logger is properly initialized
- Ensure database connectivity for audit logs

**Error Boundary Not Catching**
- Verify error is thrown during render or lifecycle
- Check if error boundary is properly positioned in component tree
- Ensure error is not caught in event handlers

**API Errors Not Formatted**
- Verify withErrorHandling wrapper is applied
- Check if error is thrown (not returned) from handler
- Ensure proper error type (EquiSplitError vs regular Error)

### Debugging

1. **Check Correlation ID**: Use correlation ID to trace error across logs
2. **Review Breadcrumbs**: Examine user journey leading to error
3. **Inspect Technical Details**: Look at error technical details for context
4. **Monitor Performance**: Check if error correlates with performance issues

## Migration Guide

### From Basic Error Handling

1. Replace manual error responses with error throwing
2. Wrap API handlers with withErrorHandling
3. Add Error Boundaries to React components
4. Update error display components to use new system

### Testing Migration

1. Update tests to expect new error response format
2. Add error boundary testing
3. Test error recovery flows
4. Verify logging integration

---

**Last Updated**: June 15, 2025  
**Version**: 1.0.0  
**Compliance Level**: Production-Ready Legal Technology