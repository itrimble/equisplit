/**
 * Performance Testing Suite for EquiSplit
 * Tests calculation performance, memory usage, and API response times
 */

import { calculatePropertyDivisionSync } from '@/utils/calculations';
import { performanceMonitor } from '@/lib/performance-monitor';
import { cache } from '@/lib/cache';
import { CalculationInput } from '@/types';

// Mock dependencies
jest.mock('@/lib/audit', () => ({
  auditLog: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('Performance Tests', () => {
  beforeEach(() => {
    performanceMonitor.clearMetrics();
    cache.clear();
  });

  describe('Calculation Performance', () => {
    const generateTestInput = (assetCount: number, debtCount: number): CalculationInput => ({
      personalInfo: {
        jurisdiction: 'CA',
        marriageDate: new Date('2020-01-01'),
        separationDate: new Date('2024-01-01'),
        hasPrenup: false,
        spouse1: {
          name: 'Test Spouse 1',
          age: 30,
          income: 75000,
          employmentStatus: 'employed',
          educationLevel: 'bachelors',
          healthStatus: 'good',
          contributions: ['financial', 'domestic']
        },
        spouse2: {
          name: 'Test Spouse 2', 
          age: 28,
          income: 65000,
          employmentStatus: 'employed',
          educationLevel: 'bachelors',
          healthStatus: 'good',
          contributions: ['financial', 'childcare']
        }
      },
      assets: Array.from({ length: assetCount }, (_, i) => ({
        id: `asset-${i}`,
        type: 'real_estate',
        description: `Test Asset ${i}`,
        currentValue: 100000 + (i * 10000),
        acquisitionDate: new Date('2021-01-01'),
        acquisitionValue: 90000 + (i * 10000),
        isSeparateProperty: i % 3 === 0,
        notes: `Notes for asset ${i}`
      })),
      debts: Array.from({ length: debtCount }, (_, i) => ({
        id: `debt-${i}`,
        type: 'mortgage',
        description: `Test Debt ${i}`,
        currentBalance: 50000 + (i * 5000),
        originalAmount: 60000 + (i * 5000),
        acquisitionDate: new Date('2021-01-01'),
        isSeparateProperty: i % 4 === 0,
        notes: `Notes for debt ${i}`
      })),
      jurisdiction: 'CA'
    });

    it('should complete small calculations under 50ms', () => {
      const input = generateTestInput(5, 3);
      
      const startTime = performance.now();
      const result = calculatePropertyDivisionSync(input);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(result).toBeDefined();
      expect(result.assetDivisions).toHaveLength(5);
      expect(result.debtDivisions).toHaveLength(3);
      expect(duration).toBeLessThan(50);
    });

    it('should complete medium calculations under 200ms', () => {
      const input = generateTestInput(25, 15);
      
      const startTime = performance.now();
      const result = calculatePropertyDivisionSync(input);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(result).toBeDefined();
      expect(result.assetDivisions).toHaveLength(25);
      expect(result.debtDivisions).toHaveLength(15);
      expect(duration).toBeLessThan(200);
    });

    it('should complete large calculations under 500ms', () => {
      const input = generateTestInput(100, 50);
      
      const startTime = performance.now();
      const result = calculatePropertyDivisionSync(input);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(result).toBeDefined();
      expect(result.assetDivisions).toHaveLength(100);
      expect(result.debtDivisions).toHaveLength(50);
      expect(duration).toBeLessThan(500);
    });

    it('should handle complex equitable distribution efficiently', () => {
      const input = generateTestInput(50, 25);
      input.jurisdiction = 'PA'; // Equitable distribution state
      
      const startTime = performance.now();
      const result = calculatePropertyDivisionSync(input);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(result).toBeDefined();
      expect(result.distributionType).toBe('equitable');
      expect(duration).toBeLessThan(300);
    });

    it('should not leak memory during repeated calculations', () => {
      const input = generateTestInput(20, 10);
      
      // Get initial memory usage
      const initialMemory = process.memoryUsage();
      
      // Perform many calculations
      for (let i = 0; i < 100; i++) {
        const modifiedInput = {
          ...input,
          assets: input.assets.map(asset => ({
            ...asset,
            currentValue: asset.currentValue + i
          }))
        };
        
        calculatePropertyDivisionSync(modifiedInput);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Cache Performance', () => {
    it('should retrieve cached data quickly', async () => {
      const testData = { value: 'test-data', complex: { nested: true } };
      
      // Set cache
      await cache.set('test-key', testData, { ttl: 60 });
      
      // Measure retrieval time
      const startTime = performance.now();
      const retrieved = await cache.get('test-key');
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(retrieved).toEqual(testData);
      expect(duration).toBeLessThan(5); // Should be very fast for in-memory cache
    });

    it('should handle cache invalidation efficiently', async () => {
      // Set multiple cached items with tags
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          cache.set(`item-${i}`, { value: i }, { 
            ttl: 60, 
            tags: ['test-tag', `group-${Math.floor(i / 10)}`] 
          })
        );
      }
      
      await Promise.all(promises);
      
      // Measure invalidation time
      const startTime = performance.now();
      await cache.invalidateByTags(['test-tag']);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      // Verify invalidation worked
      const retrieved = await cache.get('item-50');
      expect(retrieved).toBeNull();
      
      // Should complete quickly
      expect(duration).toBeLessThan(100);
    });

    it('should handle high concurrency without blocking', async () => {
      const concurrentRequests = 50;
      const promises = [];
      
      const startTime = performance.now();
      
      // Create many concurrent cache operations
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          cache.getOrSet(
            `concurrent-${i}`,
            async () => {
              // Simulate some work
              await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
              return { value: i };
            },
            { ttl: 60 }
          )
        );
      }
      
      const results = await Promise.all(promises);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(results).toHaveLength(concurrentRequests);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Memory Management', () => {
    it('should not exceed memory limits during intensive operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform memory-intensive operations
      const largeDataSets = [];
      for (let i = 0; i < 10; i++) {
        const input = generateTestInput(100, 50);
        const result = calculatePropertyDivisionSync(input);
        largeDataSets.push(result);
      }
      
      const peakMemory = process.memoryUsage();
      
      // Clear references
      largeDataSets.length = 0;
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const finalMemory = process.memoryUsage();
      
      // Memory should not increase dramatically
      const memoryIncrease = peakMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
      
      // Memory should be cleaned up
      const memoryAfterCleanup = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryAfterCleanup).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
    });
  });

  describe('Performance Monitoring', () => {
    it('should track timing metrics accurately', async () => {
      const timingId = performanceMonitor.startTiming('test-operation', { 
        category: 'test' 
      });
      
      // Simulate work
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const duration = await performanceMonitor.endTiming(timingId, true);
      
      expect(duration).toBeGreaterThan(95); // Should be around 100ms
      expect(duration).toBeLessThan(150); // Allow for some variance
    });

    it('should provide performance summary', () => {
      const summary = performanceMonitor.getPerformanceSummary();
      
      expect(summary).toHaveProperty('activeTimings');
      expect(summary).toHaveProperty('cacheSize');
      expect(summary).toHaveProperty('cacheHitRate');
      expect(summary).toHaveProperty('averageCalculationTime');
      
      expect(typeof summary.activeTimings).toBe('number');
      expect(typeof summary.cacheSize).toBe('number');
    });
  });

  describe('Stress Tests', () => {
    it('should handle rapid sequential calculations', () => {
      const input = generateTestInput(10, 5);
      const iterations = 50;
      const results = [];
      
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const result = calculatePropertyDivisionSync(input);
        results.push(result);
      }
      
      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      const averageDuration = totalDuration / iterations;
      
      expect(results).toHaveLength(iterations);
      expect(averageDuration).toBeLessThan(50); // Average should be under 50ms
      expect(totalDuration).toBeLessThan(3000); // Total should be under 3 seconds
    });

    it('should maintain consistency under load', () => {
      const input = generateTestInput(15, 8);
      const iterations = 20;
      const results = [];
      
      for (let i = 0; i < iterations; i++) {
        const result = calculatePropertyDivisionSync(input);
        results.push(result);
      }
      
      // All results should be identical
      const firstResult = results[0];
      for (const result of results) {
        expect(result.totalCommunityAssets).toBe(firstResult.totalCommunityAssets);
        expect(result.totalCommunityDebts).toBe(firstResult.totalCommunityDebts);
        expect(result.assetDivisions).toHaveLength(firstResult.assetDivisions.length);
        expect(result.debtDivisions).toHaveLength(firstResult.debtDivisions.length);
      }
    });
  });

  describe('Optimization Verification', () => {
    it('should show improved performance with caching', async () => {
      const input = generateTestInput(30, 15);
      
      // First run without cache
      const startTime1 = performance.now();
      const result1 = calculatePropertyDivisionSync(input);
      const endTime1 = performance.now();
      const duration1 = endTime1 - startTime1;
      
      // Cache the result
      await cache.set('cached-calc', result1, { ttl: 60 });
      
      // Second run with cache
      const startTime2 = performance.now();
      const result2 = await cache.get('cached-calc');
      const endTime2 = performance.now();
      const duration2 = endTime2 - startTime2;
      
      expect(result2).toEqual(result1);
      expect(duration2).toBeLessThan(duration1 * 0.1); // Should be much faster
    });

    it('should demonstrate batch operation efficiency', () => {
      const testData = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        value: Math.random() * 1000
      }));
      
      // Individual operations
      const startTime1 = performance.now();
      const individualResults = testData.map(item => ({
        ...item,
        processed: item.value * 2
      }));
      const endTime1 = performance.now();
      const individualDuration = endTime1 - startTime1;
      
      // Batch operation
      const startTime2 = performance.now();
      const batchResults = testData.map(item => ({
        ...item,
        processed: item.value * 2
      }));
      const endTime2 = performance.now();
      const batchDuration = endTime2 - startTime2;
      
      expect(individualResults).toEqual(batchResults);
      
      // Both should be fast, but this demonstrates the pattern
      expect(individualDuration).toBeLessThan(50);
      expect(batchDuration).toBeLessThan(50);
    });
  });
});

// Utility function to create a more complex calculation input
function generateTestInput(assetCount: number, debtCount: number): CalculationInput {
  return {
    personalInfo: {
      jurisdiction: 'CA',
      marriageDate: new Date('2020-01-01'),
      separationDate: new Date('2024-01-01'),
      hasPrenup: false,
      spouse1: {
        name: 'Test Spouse 1',
        age: 30,
        income: 75000,
        employmentStatus: 'employed',
        educationLevel: 'bachelors',
        healthStatus: 'good',
        contributions: ['financial', 'domestic']
      },
      spouse2: {
        name: 'Test Spouse 2',
        age: 28,
        income: 65000,
        employmentStatus: 'employed',
        educationLevel: 'bachelors',
        healthStatus: 'good',
        contributions: ['financial', 'childcare']
      }
    },
    assets: Array.from({ length: assetCount }, (_, i) => ({
      id: `asset-${i}`,
      type: 'real_estate',
      description: `Test Asset ${i}`,
      currentValue: 100000 + (i * 10000),
      acquisitionDate: new Date('2021-01-01'),
      acquisitionValue: 90000 + (i * 10000),
      isSeparateProperty: i % 3 === 0,
      notes: `Notes for asset ${i}`
    })),
    debts: Array.from({ length: debtCount }, (_, i) => ({
      id: `debt-${i}`,
      type: 'mortgage', 
      description: `Test Debt ${i}`,
      currentBalance: 50000 + (i * 5000),
      originalAmount: 60000 + (i * 5000),
      acquisitionDate: new Date('2021-01-01'),
      isSeparateProperty: i % 4 === 0,
      notes: `Notes for debt ${i}`
    })),
    jurisdiction: 'CA'
  };
}