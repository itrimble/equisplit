'use client';

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AlertTriangle, 
  InfoIcon, 
  XCircle, 
  RefreshCw, 
  HelpCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { EquiSplitError, ErrorSeverity, ErrorCategory } from '@/lib/errors';

interface ErrorDisplayProps {
  error: EquiSplitError | Error | string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  showTechnicalDetails?: boolean;
}

interface ErrorCardProps {
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable?: boolean;
  retryable?: boolean;
  correlationId?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  onReportError?: () => void;
  technicalDetails?: Record<string, any>;
  showTechnicalDetails?: boolean;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  className = '',
  showTechnicalDetails = false
}) => {
  if (!error) return null;

  // Handle different error types
  if (typeof error === 'string') {
    return (
      <ErrorCard
        title="Error"
        message={error}
        severity="medium"
        onDismiss={onDismiss}
        className={className}
      />
    );
  }

  if (error instanceof EquiSplitError) {
    return (
      <ErrorCard
        title={getErrorTitle(error)}
        message={error.userMessage}
        severity={error.severity}
        recoverable={error.recoverable}
        retryable={error.retryable}
        correlationId={error.correlationId}
        technicalDetails={error.technicalDetails}
        showTechnicalDetails={showTechnicalDetails}
        onRetry={onRetry}
        onDismiss={onDismiss}
        onReportError={() => reportError(error)}
        className={className}
      />
    );
  }

  // Handle regular Error objects
  return (
    <ErrorCard
      title="Unexpected Error"
      message="An unexpected error occurred. Please try again or contact support if the problem persists."
      severity="high"
      retryable={true}
      onRetry={onRetry}
      onDismiss={onDismiss}
      technicalDetails={{ message: error.message, stack: error.stack }}
      showTechnicalDetails={showTechnicalDetails}
      className={className}
    />
  );
};

const ErrorCard: React.FC<ErrorCardProps & { className?: string }> = ({
  title,
  message,
  severity,
  recoverable = false,
  retryable = false,
  correlationId,
  technicalDetails,
  showTechnicalDetails = false,
  onRetry,
  onDismiss,
  onReportError,
  className = ''
}) => {
  const [showDetails, setShowDetails] = React.useState(false);
  
  const { 
    icon: Icon, 
    bgColor, 
    borderColor, 
    textColor,
    iconColor 
  } = getSeverityStyles(severity);

  return (
    <Card className={`${borderColor} ${className}`}>
      <CardHeader className={`${bgColor} border-b`}>
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-full ${iconColor}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <CardTitle className={`text-lg ${textColor}`}>{title}</CardTitle>
            {correlationId && (
              <p className="text-sm text-gray-500 mt-1">
                Error ID: {correlationId}
              </p>
            )}
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-8 w-8 p-0"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <p className="text-gray-700 mb-4">{message}</p>

        {(recoverable || retryable || onReportError) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {retryable && onRetry && (
              <Button onClick={onRetry} size="sm" className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            )}
            
            {onReportError && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onReportError}
                className="flex items-center gap-2"
              >
                <HelpCircle className="h-4 w-4" />
                Report Issue
              </Button>
            )}
          </div>
        )}

        {technicalDetails && (
          <div className="mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-gray-600 p-0 h-auto"
            >
              {showDetails ? 'Hide' : 'Show'} Technical Details
            </Button>
            
            {showDetails && (
              <div className="mt-2 p-3 bg-gray-50 rounded border">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-40">
                  {JSON.stringify(technicalDetails, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Inline Alert Component for smaller errors
interface InlineErrorProps {
  error: EquiSplitError | Error | string | null;
  variant?: 'default' | 'destructive';
  className?: string;
}

export const InlineError: React.FC<InlineErrorProps> = ({
  error,
  variant = 'destructive',
  className = ''
}) => {
  if (!error) return null;

  const message = typeof error === 'string' 
    ? error 
    : error instanceof EquiSplitError 
      ? error.userMessage 
      : 'An unexpected error occurred';

  return (
    <Alert variant={variant} className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
};

// Success notification component
interface SuccessDisplayProps {
  message: string;
  title?: string;
  onDismiss?: () => void;
  className?: string;
}

export const SuccessDisplay: React.FC<SuccessDisplayProps> = ({
  message,
  title = 'Success',
  onDismiss,
  className = ''
}) => {
  return (
    <Alert className={`border-green-200 bg-green-50 ${className}`}>
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertTitle className="text-green-800">{title}</AlertTitle>
      <AlertDescription className="text-green-700">{message}</AlertDescription>
      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="absolute top-2 right-2 h-6 w-6 p-0 text-green-600 hover:text-green-800"
        >
          <XCircle className="h-4 w-4" />
        </Button>
      )}
    </Alert>
  );
};

// Loading state component
interface LoadingDisplayProps {
  message?: string;
  className?: string;
}

export const LoadingDisplay: React.FC<LoadingDisplayProps> = ({
  message = 'Loading...',
  className = ''
}) => {
  return (
    <Alert className={`border-blue-200 bg-blue-50 ${className}`}>
      <Clock className="h-4 w-4 text-blue-600 animate-spin" />
      <AlertDescription className="text-blue-700">{message}</AlertDescription>
    </Alert>
  );
};

// Utility functions
function getErrorTitle(error: EquiSplitError): string {
  switch (error.category) {
    case ErrorCategory.VALIDATION:
      return 'Input Validation Error';
    case ErrorCategory.AUTHENTICATION:
      return 'Authentication Required';
    case ErrorCategory.AUTHORIZATION:
      return 'Access Denied';
    case ErrorCategory.CALCULATION:
      return 'Calculation Error';
    case ErrorCategory.PAYMENT:
      return 'Payment Processing Error';
    case ErrorCategory.FILE_PROCESSING:
      return 'File Processing Error';
    case ErrorCategory.LEGAL_COMPLIANCE:
      return 'Compliance Requirement';
    case ErrorCategory.NETWORK:
      return 'Connection Error';
    case ErrorCategory.EXTERNAL_SERVICE:
      return 'Service Unavailable';
    default:
      return 'System Error';
  }
}

function getSeverityStyles(severity: string) {
  switch (severity) {
    case 'low':
      return {
        icon: InfoIcon,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-900',
        iconColor: 'bg-blue-100 text-blue-600'
      };
    case 'medium':
      return {
        icon: AlertTriangle,
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        textColor: 'text-yellow-900',
        iconColor: 'bg-yellow-100 text-yellow-600'
      };
    case 'high':
    case 'critical':
      return {
        icon: XCircle,
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-900',
        iconColor: 'bg-red-100 text-red-600'
      };
    default:
      return {
        icon: AlertTriangle,
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        textColor: 'text-gray-900',
        iconColor: 'bg-gray-100 text-gray-600'
      };
  }
}

function reportError(error: EquiSplitError): void {
  // In a real implementation, this would send error details to monitoring service
  console.log('Error reported to monitoring service:', {
    correlationId: error.correlationId,
    category: error.category,
    code: error.code,
    userMessage: error.userMessage,
    timestamp: new Date().toISOString()
  });

  // Show user confirmation
  alert(`Error reported with ID: ${error.correlationId}\n\nOur team has been notified and will investigate this issue.`);
}

// Hook for managing error state in components
export function useErrorHandler() {
  const [error, setError] = React.useState<EquiSplitError | Error | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleAsync = React.useCallback(async <T>(
    asyncFn: () => Promise<T>,
    options?: {
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
      loadingMessage?: string;
    }
  ): Promise<T | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await asyncFn();
      options?.onSuccess?.(result);
      return result;
      
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error(String(error));
      setError(errorInstance);
      options?.onError?.(errorInstance);
      return null;
      
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  const retry = React.useCallback(async <T>(
    asyncFn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T | null> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        setIsLoading(true);
        setError(null);
        
        const result = await asyncFn();
        return result;
        
      } catch (error) {
        if (attempt === maxRetries) {
          const errorInstance = error instanceof Error ? error : new Error(String(error));
          setError(errorInstance);
          return null;
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      } finally {
        if (attempt === maxRetries) {
          setIsLoading(false);
        }
      }
    }
    
    return null;
  }, []);

  return {
    error,
    isLoading,
    handleAsync,
    clearError,
    retry
  };
}