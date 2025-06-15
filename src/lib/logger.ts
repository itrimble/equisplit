/**
 * Enhanced Logging System for EquiSplit
 * Extends existing audit logging with application-level logging and monitoring
 */

import { auditLogger } from './audit';
import { EquiSplitError, ErrorSeverity, globalBreadcrumbs } from './errors';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export enum LogCategory {
  SYSTEM = 'system',
  SECURITY = 'security',
  BUSINESS = 'business',
  PERFORMANCE = 'performance',
  USER_ACTION = 'user_action',
  API = 'api',
  DATABASE = 'database',
  CALCULATION = 'calculation',
  PAYMENT = 'payment',
  FILE_PROCESSING = 'file_processing',
  AUTHENTICATION = 'authentication',
  COMPLIANCE = 'compliance'
}

interface LogEntry {
  level: LogLevel;
  category: LogCategory;
  message: string;
  timestamp: Date;
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  context?: Record<string, any>;
  error?: Error;
  duration?: number;
  metadata?: Record<string, any>;
}

interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  operation: string;
  success: boolean;
  errorCount?: number;
}

class Logger {
  private logLevel: LogLevel;
  private performanceMetrics: Map<string, PerformanceMetrics> = new Map();

  constructor() {
    // Set log level based on environment
    this.logLevel = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    
    // Override with environment variable if set
    const envLogLevel = process.env.LOG_LEVEL;
    if (envLogLevel && LogLevel[envLogLevel as keyof typeof LogLevel] !== undefined) {
      this.logLevel = LogLevel[envLogLevel as keyof typeof LogLevel];
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private async writeLog(entry: LogEntry): Promise<void> {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    try {
      // Console logging for development
      if (process.env.NODE_ENV === 'development') {
        this.consoleLog(entry);
      }

      // Audit trail logging for compliance and monitoring
      await this.auditLog(entry);

      // Add to breadcrumbs for error tracking
      if (entry.level >= LogLevel.WARN) {
        globalBreadcrumbs.addBreadcrumb({
          message: entry.message,
          category: entry.category,
          level: entry.level >= LogLevel.ERROR ? 'error' : 'warning',
          data: {
            correlationId: entry.correlationId,
            context: entry.context
          }
        });
      }

    } catch (loggingError) {
      // Fallback to console if logging system fails
      console.error('Logging system failed:', loggingError);
      console.error('Original log entry:', entry);
    }
  }

  private consoleLog(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const level = LogLevel[entry.level];
    const prefix = `[${timestamp}] [${level}] [${entry.category}]`;
    
    const logData = {
      message: entry.message,
      correlationId: entry.correlationId,
      userId: entry.userId,
      context: entry.context,
      duration: entry.duration,
      metadata: entry.metadata
    };

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, logData);
        break;
      case LogLevel.INFO:
        console.info(prefix, logData);
        break;
      case LogLevel.WARN:
        console.warn(prefix, logData, entry.error);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(prefix, logData, entry.error);
        break;
    }
  }

  private async auditLog(entry: LogEntry): Promise<void> {
    const complianceLevel = this.getComplianceLevel(entry.category);
    
    await auditLogger.logSystemAction(
      'log_entry',
      entry.category,
      {
        level: LogLevel[entry.level],
        message: entry.message,
        correlationId: entry.correlationId,
        context: entry.context,
        duration: entry.duration,
        error: entry.error ? {
          name: entry.error.name,
          message: entry.error.message,
          stack: entry.error.stack
        } : undefined,
        category: entry.category,
        timestamp: entry.timestamp,
        ...entry.metadata
      },
      complianceLevel as any
    );
  }

  private getComplianceLevel(category: LogCategory): 'STANDARD' | 'FINANCIAL' | 'LEGAL' {
    switch (category) {
      case LogCategory.CALCULATION:
      case LogCategory.COMPLIANCE:
        return 'LEGAL';
      case LogCategory.PAYMENT:
        return 'FINANCIAL';
      default:
        return 'STANDARD';
    }
  }

  // Public logging methods
  debug(
    message: string,
    category: LogCategory = LogCategory.SYSTEM,
    context?: Record<string, any>
  ): Promise<void> {
    return this.writeLog({
      level: LogLevel.DEBUG,
      category,
      message,
      timestamp: new Date(),
      context
    });
  }

  info(
    message: string,
    category: LogCategory = LogCategory.SYSTEM,
    context?: Record<string, any>
  ): Promise<void> {
    return this.writeLog({
      level: LogLevel.INFO,
      category,
      message,
      timestamp: new Date(),
      context
    });
  }

  warn(
    message: string,
    category: LogCategory = LogCategory.SYSTEM,
    context?: Record<string, any>,
    error?: Error
  ): Promise<void> {
    return this.writeLog({
      level: LogLevel.WARN,
      category,
      message,
      timestamp: new Date(),
      context,
      error
    });
  }

  error(
    message: string,
    category: LogCategory = LogCategory.SYSTEM,
    error?: Error,
    context?: Record<string, any>
  ): Promise<void> {
    return this.writeLog({
      level: LogLevel.ERROR,
      category,
      message,
      timestamp: new Date(),
      error,
      context
    });
  }

  critical(
    message: string,
    category: LogCategory = LogCategory.SYSTEM,
    error?: Error,
    context?: Record<string, any>
  ): Promise<void> {
    return this.writeLog({
      level: LogLevel.CRITICAL,
      category,
      message,
      timestamp: new Date(),
      error,
      context
    });
  }

  // Performance monitoring methods
  startPerformanceTimer(
    operation: string,
    correlationId?: string
  ): string {
    const timerId = correlationId || `perf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.performanceMetrics.set(timerId, {
      startTime: performance.now(),
      operation,
      success: false,
      memoryUsage: process.memoryUsage?.()
    });

    return timerId;
  }

  endPerformanceTimer(
    timerId: string,
    success: boolean = true,
    context?: Record<string, any>
  ): Promise<void> {
    const metrics = this.performanceMetrics.get(timerId);
    if (!metrics) {
      return this.warn('Performance timer not found', LogCategory.PERFORMANCE, { timerId });
    }

    const endTime = performance.now();
    const duration = endTime - metrics.startTime;
    
    metrics.endTime = endTime;
    metrics.duration = duration;
    metrics.success = success;

    // Log performance metrics
    const logLevel = this.getPerformanceLogLevel(duration, success);
    const message = `${metrics.operation} completed in ${duration.toFixed(2)}ms`;

    this.performanceMetrics.delete(timerId);

    return this.writeLog({
      level: logLevel,
      category: LogCategory.PERFORMANCE,
      message,
      timestamp: new Date(),
      correlationId: timerId,
      duration,
      context: {
        operation: metrics.operation,
        success,
        memoryUsage: metrics.memoryUsage,
        ...context
      }
    });
  }

  private getPerformanceLogLevel(duration: number, success: boolean): LogLevel {
    if (!success) return LogLevel.ERROR;
    if (duration > 5000) return LogLevel.WARN; // > 5 seconds
    if (duration > 1000) return LogLevel.INFO;  // > 1 second
    return LogLevel.DEBUG;
  }

  // User action logging
  logUserAction(
    action: string,
    userId?: string,
    context?: Record<string, any>
  ): Promise<void> {
    return this.info(
      `User action: ${action}`,
      LogCategory.USER_ACTION,
      {
        userId,
        action,
        ...context
      }
    );
  }

  // API request logging
  logApiRequest(
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number,
    userId?: string,
    error?: Error
  ): Promise<void> {
    const level = statusCode >= 500 ? LogLevel.ERROR : 
                 statusCode >= 400 ? LogLevel.WARN : 
                 LogLevel.INFO;

    const message = `${method} ${endpoint} - ${statusCode} (${duration}ms)`;

    return this.writeLog({
      level,
      category: LogCategory.API,
      message,
      timestamp: new Date(),
      userId,
      duration,
      error,
      context: {
        method,
        endpoint,
        statusCode,
        success: statusCode < 400
      }
    });
  }

  // Calculation logging for legal compliance
  logCalculation(
    calculationType: string,
    state: string,
    userId?: string,
    result?: any,
    error?: Error
  ): Promise<void> {
    const level = error ? LogLevel.ERROR : LogLevel.INFO;
    const message = error 
      ? `Calculation failed: ${calculationType} for ${state}`
      : `Calculation completed: ${calculationType} for ${state}`;

    return this.writeLog({
      level,
      category: LogCategory.CALCULATION,
      message,
      timestamp: new Date(),
      userId,
      error,
      context: {
        calculationType,
        state,
        success: !error,
        resultSummary: result ? {
          totalAssets: result.totalAssets,
          totalDebts: result.totalDebts,
          distributionType: result.distributionType
        } : undefined
      }
    });
  }

  // Payment logging for financial compliance
  logPayment(
    action: string,
    amount?: number,
    currency?: string,
    userId?: string,
    paymentId?: string,
    error?: Error
  ): Promise<void> {
    const level = error ? LogLevel.ERROR : LogLevel.INFO;
    const message = error 
      ? `Payment failed: ${action}`
      : `Payment successful: ${action}`;

    return this.writeLog({
      level,
      category: LogCategory.PAYMENT,
      message,
      timestamp: new Date(),
      userId,
      error,
      context: {
        action,
        amount,
        currency,
        paymentId,
        success: !error
      }
    });
  }
}

// Export singleton logger instance
export const logger = new Logger();

// Helper function for logging EquiSplitErrors
export const logEquiSplitError = (error: EquiSplitError): Promise<void> => {
  const categoryMap: Record<string, LogCategory> = {
    'validation': LogCategory.SYSTEM,
    'authentication': LogCategory.AUTHENTICATION,
    'authorization': LogCategory.SECURITY,
    'business_logic': LogCategory.BUSINESS,
    'external_service': LogCategory.SYSTEM,
    'system': LogCategory.SYSTEM,
    'network': LogCategory.SYSTEM,
    'calculation': LogCategory.CALCULATION,
    'payment': LogCategory.PAYMENT,
    'file_processing': LogCategory.FILE_PROCESSING,
    'legal_compliance': LogCategory.COMPLIANCE
  };

  const logLevel = error.severity === ErrorSeverity.CRITICAL ? LogLevel.CRITICAL :
                  error.severity === ErrorSeverity.HIGH ? LogLevel.ERROR :
                  error.severity === ErrorSeverity.MEDIUM ? LogLevel.WARN :
                  LogLevel.INFO;

  return logger.writeLog({
    level: logLevel,
    category: categoryMap[error.category] || LogCategory.SYSTEM,
    message: error.message,
    timestamp: new Date(),
    correlationId: error.correlationId,
    userId: error.context.userId,
    error,
    context: {
      code: error.code,
      category: error.category,
      severity: error.severity,
      userMessage: error.userMessage,
      recoverable: error.recoverable,
      retryable: error.retryable,
      technicalDetails: error.technicalDetails
    }
  });
};