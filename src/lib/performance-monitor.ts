/**
 * Performance Monitoring System for EquiSplit
 * Tracks Core Web Vitals, calculation performance, and system metrics
 */

import { logger } from './logger';

interface PerformanceMetric {
  name: string;
  value: number;
  startTime: number;
  endTime: number;
  tags?: Record<string, string | number>;
}

interface CalculationMetrics {
  duration: number;
  assetCount: number;
  debtCount: number;
  jurisdiction: string;
  calculationType: 'community' | 'equitable';
  cacheHit?: boolean;
}

interface WebVitalsMetric {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetric> = new Map();
  private calculationCache: Map<string, any> = new Map();
  private readonly CACHE_SIZE_LIMIT = 100;
  private readonly PERFORMANCE_THRESHOLDS = {
    calculation: {
      good: 50,      // < 50ms
      poor: 200      // > 200ms
    },
    api: {
      good: 100,     // < 100ms
      poor: 500      // > 500ms
    },
    database: {
      good: 50,      // < 50ms
      poor: 200      // > 200ms
    }
  };

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start tracking a performance metric
   */
  startTiming(metricName: string, tags?: Record<string, string | number>): string {
    const timingId = `${metricName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.metrics.set(timingId, {
      name: metricName,
      value: 0,
      startTime: performance.now(),
      endTime: 0,
      tags
    });

    return timingId;
  }

  /**
   * End tracking a performance metric
   */
  async endTiming(timingId: string, success: boolean = true): Promise<number> {
    const metric = this.metrics.get(timingId);
    if (!metric) {
      console.warn(`Performance metric not found: ${timingId}`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;
    
    metric.endTime = endTime;
    metric.value = duration;

    // Log to performance monitoring system
    await this.logPerformanceMetric(metric, success);

    // Clean up
    this.metrics.delete(timingId);

    return duration;
  }

  /**
   * Track calculation performance with caching
   */
  async trackCalculation<T>(
    calculationFn: () => T,
    metadata: Omit<CalculationMetrics, 'duration' | 'cacheHit'>
  ): Promise<T> {
    const cacheKey = this.generateCacheKey(metadata);
    
    // Check cache first
    if (this.calculationCache.has(cacheKey)) {
      await logger.debug('Calculation cache hit', 'performance', {
        cacheKey,
        jurisdiction: metadata.jurisdiction,
        calculationType: metadata.calculationType
      });

      return this.calculationCache.get(cacheKey);
    }

    // Execute calculation with timing
    const timingId = this.startTiming('calculation', {
      jurisdiction: metadata.jurisdiction,
      calculationType: metadata.calculationType,
      assetCount: metadata.assetCount,
      debtCount: metadata.debtCount
    });

    let result: T;
    let success = true;

    try {
      result = calculationFn();
      
      // Cache the result
      this.setCachedResult(cacheKey, result);
      
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = await this.endTiming(timingId, success);
      
      // Log calculation metrics
      await this.logCalculationMetrics({
        ...metadata,
        duration,
        cacheHit: false
      });
    }

    return result;
  }

  /**
   * Track Core Web Vitals
   */
  trackWebVital(metric: WebVitalsMetric): void {
    // Log to performance monitoring
    logger.info(`Web Vital: ${metric.name}`, 'performance', {
      metric: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id
    });

    // Send to analytics if configured
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', metric.name, {
        event_category: 'Web Vitals',
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        event_label: metric.id,
        non_interaction: true,
      });
    }
  }

  /**
   * Track page load performance
   */
  trackPageLoad(pageName: string, additionalMetrics?: Record<string, number>): void {
    if (typeof window === 'undefined') return;

    // Use Navigation Timing API
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      const metrics = {
        dns: navigation.domainLookupEnd - navigation.domainLookupStart,
        connection: navigation.connectEnd - navigation.connectStart,
        request: navigation.responseStart - navigation.requestStart,
        response: navigation.responseEnd - navigation.responseStart,
        domProcessing: navigation.domContentLoadedEventStart - navigation.responseEnd,
        domComplete: navigation.domComplete - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        total: navigation.loadEventEnd - navigation.navigationStart,
        ...additionalMetrics
      };

      logger.info(`Page Load: ${pageName}`, 'performance', {
        page: pageName,
        ...metrics
      });
    }
  }

  /**
   * Monitor memory usage
   */
  trackMemoryUsage(context: string): void {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      
      logger.debug('Memory Usage', 'performance', {
        context,
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usagePercentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
      });
    }
  }

  /**
   * Get performance summary for monitoring dashboards
   */
  getPerformanceSummary(): {
    activeTimings: number;
    cacheSize: number;
    cacheHitRate: number;
    averageCalculationTime: number;
  } {
    return {
      activeTimings: this.metrics.size,
      cacheSize: this.calculationCache.size,
      cacheHitRate: this.getCacheHitRate(),
      averageCalculationTime: this.getAverageCalculationTime()
    };
  }

  /**
   * Clear performance data (for testing or memory management)
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.calculationCache.clear();
  }

  // Private helper methods

  private generateCacheKey(metadata: Omit<CalculationMetrics, 'duration' | 'cacheHit'>): string {
    return `calc_${metadata.jurisdiction}_${metadata.calculationType}_${metadata.assetCount}_${metadata.debtCount}`;
  }

  private setCachedResult(key: string, result: any): void {
    // Implement LRU cache
    if (this.calculationCache.size >= this.CACHE_SIZE_LIMIT) {
      const firstKey = this.calculationCache.keys().next().value;
      this.calculationCache.delete(firstKey);
    }
    
    this.calculationCache.set(key, result);
  }

  private async logPerformanceMetric(metric: PerformanceMetric, success: boolean): Promise<void> {
    const level = this.getLogLevel(metric.name, metric.value);
    const category = this.getMetricCategory(metric.name);

    await logger.info(
      `Performance: ${metric.name} ${success ? 'completed' : 'failed'} in ${metric.value.toFixed(2)}ms`,
      category,
      {
        metric: metric.name,
        duration: metric.value,
        success,
        rating: this.getPerformanceRating(metric.name, metric.value),
        tags: metric.tags
      }
    );
  }

  private async logCalculationMetrics(metrics: CalculationMetrics): Promise<void> {
    await logger.info(
      `Calculation Performance: ${metrics.calculationType} for ${metrics.jurisdiction}`,
      'calculation',
      {
        ...metrics,
        rating: this.getPerformanceRating('calculation', metrics.duration),
        efficiency: this.calculateEfficiency(metrics)
      }
    );
  }

  private getLogLevel(metricName: string, value: number): 'debug' | 'info' | 'warn' | 'error' {
    const threshold = this.PERFORMANCE_THRESHOLDS[metricName as keyof typeof this.PERFORMANCE_THRESHOLDS];
    if (!threshold) return 'info';

    if (value > threshold.poor) return 'error';
    if (value > threshold.good) return 'warn';
    return 'info';
  }

  private getMetricCategory(metricName: string): string {
    if (metricName.includes('calculation')) return 'calculation';
    if (metricName.includes('api')) return 'api';
    if (metricName.includes('database')) return 'database';
    return 'performance';
  }

  private getPerformanceRating(metricName: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const threshold = this.PERFORMANCE_THRESHOLDS[metricName as keyof typeof this.PERFORMANCE_THRESHOLDS];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  private calculateEfficiency(metrics: CalculationMetrics): number {
    // Calculate efficiency based on complexity vs time
    const complexity = metrics.assetCount + metrics.debtCount;
    return complexity > 0 ? Math.round(complexity / metrics.duration * 1000) : 0;
  }

  private getCacheHitRate(): number {
    // This would need to be tracked over time in a real implementation
    return 0; // Placeholder
  }

  private getAverageCalculationTime(): number {
    // This would need to be tracked over time in a real implementation
    return 0; // Placeholder
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Client-side Web Vitals tracking
export function trackWebVitals(): void {
  if (typeof window === 'undefined') return;

  // Dynamic import for client-side only
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS((metric) => performanceMonitor.trackWebVital(metric as WebVitalsMetric));
    getFID((metric) => performanceMonitor.trackWebVital(metric as WebVitalsMetric));
    getFCP((metric) => performanceMonitor.trackWebVital(metric as WebVitalsMetric));
    getLCP((metric) => performanceMonitor.trackWebVital(metric as WebVitalsMetric));
    getTTFB((metric) => performanceMonitor.trackWebVital(metric as WebVitalsMetric));
  }).catch(error => {
    console.warn('Failed to load web-vitals library:', error);
  });
}

// Performance decorator for functions
export function withPerformanceTracking<T extends (...args: any[]) => any>(
  fn: T,
  metricName: string,
  tags?: Record<string, string | number>
): T {
  return ((...args: Parameters<T>) => {
    const timingId = performanceMonitor.startTiming(metricName, tags);
    
    try {
      const result = fn(...args);
      
      // Handle async functions
      if (result instanceof Promise) {
        return result
          .then(async (value) => {
            await performanceMonitor.endTiming(timingId, true);
            return value;
          })
          .catch(async (error) => {
            await performanceMonitor.endTiming(timingId, false);
            throw error;
          });
      }
      
      // Sync function
      performanceMonitor.endTiming(timingId, true);
      return result;
      
    } catch (error) {
      performanceMonitor.endTiming(timingId, false);
      throw error;
    }
  }) as T;
}

// React hook for performance monitoring
export function usePerformanceMonitoring() {
  return {
    startTiming: (metricName: string, tags?: Record<string, string | number>) => 
      performanceMonitor.startTiming(metricName, tags),
    endTiming: (timingId: string, success?: boolean) => 
      performanceMonitor.endTiming(timingId, success),
    trackMemory: (context: string) => 
      performanceMonitor.trackMemoryUsage(context),
    getSummary: () => 
      performanceMonitor.getPerformanceSummary()
  };
}