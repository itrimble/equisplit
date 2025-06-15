'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, HelpCircle } from 'lucide-react';
import { EquiSplitError, createSystemError, globalBreadcrumbs } from '@/lib/errors';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  isolate?: boolean;
  feature?: string;
}

interface ErrorFallbackProps {
  error: Error;
  errorId: string;
  onRetry: () => void;
  onReportError: () => void;
  feature?: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorInstance = this.createErrorInstance(error, errorInfo);
    
    this.setState({
      errorId: errorInstance.correlationId
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Add breadcrumb for error boundary catch
    globalBreadcrumbs.addBreadcrumb({
      message: `Error boundary caught error in ${this.props.feature || 'application'}`,
      category: 'error_boundary',
      level: 'error',
      data: {
        componentStack: errorInfo.componentStack,
        errorMessage: error.message,
        feature: this.props.feature
      }
    });
  }

  private createErrorInstance(error: Error, errorInfo: React.ErrorInfo): EquiSplitError {
    if (error instanceof EquiSplitError) {
      return error;
    }

    return createSystemError(`React Error Boundary: ${error.message}`, {
      technicalDetails: {
        componentStack: errorInfo.componentStack,
        errorStack: error.stack,
        feature: this.props.feature,
        retryCount: this.retryCount
      },
      context: {
        breadcrumbs: globalBreadcrumbs.getBreadcrumbs()
      }
    });
  }

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      
      globalBreadcrumbs.addBreadcrumb({
        message: `User initiated retry (attempt ${this.retryCount}/${this.maxRetries})`,
        category: 'user_action',
        level: 'info',
        data: { feature: this.props.feature }
      });

      this.setState({
        hasError: false,
        error: null,
        errorId: null
      });
    }
  };

  private handleReportError = () => {
    if (this.state.errorId) {
      globalBreadcrumbs.addBreadcrumb({
        message: 'User reported error',
        category: 'user_action',
        level: 'info',
        data: { 
          errorId: this.state.errorId,
          feature: this.props.feature 
        }
      });

      // In a real implementation, this would send to error reporting service
      console.log(`Error reported: ${this.state.errorId}`);
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error}
          errorId={this.state.errorId || 'unknown'}
          onRetry={this.handleRetry}
          onReportError={this.handleReportError}
          feature={this.props.feature}
        />
      );
    }

    return this.props.children;
  }
}

// Default Error Fallback Component
export const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorId,
  onRetry,
  onReportError,
  feature
}) => {
  const isEquiSplitError = error instanceof EquiSplitError;
  const userMessage = isEquiSplitError ? error.userMessage : 'An unexpected error occurred';
  const isRetryable = isEquiSplitError ? error.retryable : true;

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            {feature ? `${feature} Error` : 'Something went wrong'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">{userMessage}</p>
          
          {process.env.NODE_ENV === 'development' && (
            <details className="text-left bg-gray-50 p-3 rounded">
              <summary className="cursor-pointer text-sm font-medium">
                Technical Details
              </summary>
              <pre className="mt-2 text-xs text-gray-700 whitespace-pre-wrap">
                {error.message}
                {error.stack && `\n\nStack:\n${error.stack}`}
              </pre>
            </details>
          )}
          
          <div className="flex flex-col gap-2">
            {isRetryable && (
              <Button onClick={onRetry} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              <Home className="h-4 w-4 mr-2" />
              Return Home
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={onReportError}
              className="w-full text-sm"
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              Report this error
            </Button>
          </div>
          
          {errorId && (
            <p className="text-xs text-gray-500 mt-4">
              Error ID: {errorId}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Feature-specific Error Fallbacks
export const CalculatorErrorFallback: React.FC<ErrorFallbackProps> = (props) => (
  <DefaultErrorFallback 
    {...props} 
    feature="Property Calculator"
  />
);

export const PaymentErrorFallback: React.FC<ErrorFallbackProps> = (props) => (
  <DefaultErrorFallback 
    {...props} 
    feature="Payment Processing"
  />
);

export const DashboardErrorFallback: React.FC<ErrorFallbackProps> = (props) => (
  <DefaultErrorFallback 
    {...props} 
    feature="User Dashboard"
  />
);

export const FileUploadErrorFallback: React.FC<ErrorFallbackProps> = (props) => (
  <DefaultErrorFallback 
    {...props} 
    feature="File Upload"
  />
);

// Higher-order component for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for handling async errors in components
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    // Add breadcrumb for async error
    globalBreadcrumbs.addBreadcrumb({
      message: 'Async error caught by useErrorHandler',
      category: 'async_error',
      level: 'error',
      data: {
        errorMessage: error.message
      }
    });

    setError(error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  // Throw error to be caught by error boundary
  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { handleError, clearError, error };
}