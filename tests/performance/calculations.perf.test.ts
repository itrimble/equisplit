/**
 * Performance tests for calculation functions
 * These tests ensure that calculations remain fast even with large datasets
 */

import { calculatePropertyDivision, calculateEquityFactor } from '@/utils/calculations'
import { createMockCalculationInputs, createMockAsset, createMockDebt, measurePerformance } from '../utils/test-helpers'

describe('Calculation Performance Tests', () => {
  const PERFORMANCE_THRESHOLD = {
    SMALL_DATASET: 50, // 50ms
    MEDIUM_DATASET: 200, // 200ms
    LARGE_DATASET: 1000, // 1s
    XLARGE_DATASET: 5000, // 5s
  }

  it('should calculate division quickly with small dataset (10 assets, 5 debts)', async () => {
    const inputs = createMockCalculationInputs({
      assets: Array.from({ length: 10 }, (_, i) => 
        createMockAsset({ name: `Asset ${i}`, value: Math.random() * 1000000 })
      ),
      debts: Array.from({ length: 5 }, (_, i) => 
        createMockDebt({ name: `Debt ${i}`, amount: Math.random() * 100000 })
      ),
    })

    const duration = await measurePerformance(async () => {
      calculatePropertyDivision(inputs)
    }, 'Small dataset calculation')

    expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.SMALL_DATASET)
  })

  it('should calculate division quickly with medium dataset (100 assets, 50 debts)', async () => {
    const inputs = createMockCalculationInputs({
      assets: Array.from({ length: 100 }, (_, i) => 
        createMockAsset({ name: `Asset ${i}`, value: Math.random() * 1000000 })
      ),
      debts: Array.from({ length: 50 }, (_, i) => 
        createMockDebt({ name: `Debt ${i}`, amount: Math.random() * 100000 })
      ),
    })

    const duration = await measurePerformance(async () => {
      calculatePropertyDivision(inputs)
    }, 'Medium dataset calculation')

    expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.MEDIUM_DATASET)
  })

  it('should calculate division with large dataset (1000 assets, 500 debts)', async () => {
    const inputs = createMockCalculationInputs({
      assets: Array.from({ length: 1000 }, (_, i) => 
        createMockAsset({ name: `Asset ${i}`, value: Math.random() * 1000000 })
      ),
      debts: Array.from({ length: 500 }, (_, i) => 
        createMockDebt({ name: `Debt ${i}`, amount: Math.random() * 100000 })
      ),
    })

    const duration = await measurePerformance(async () => {
      calculatePropertyDivision(inputs)
    }, 'Large dataset calculation')

    expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.LARGE_DATASET)
  })

  it('should handle extreme dataset efficiently (10000 assets, 5000 debts)', async () => {
    const inputs = createMockCalculationInputs({
      assets: Array.from({ length: 10000 }, (_, i) => 
        createMockAsset({ name: `Asset ${i}`, value: Math.random() * 1000000 })
      ),
      debts: Array.from({ length: 5000 }, (_, i) => 
        createMockDebt({ name: `Debt ${i}`, amount: Math.random() * 100000 })
      ),
    })

    const duration = await measurePerformance(async () => {
      calculatePropertyDivision(inputs)
    }, 'Extreme dataset calculation')

    expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.XLARGE_DATASET)
  }, 30000) // 30 second timeout for extreme test

  it('should calculate equity factor quickly with complex circumstances', async () => {
    const complexCircumstances = {
      marriageDuration: 15,
      ageSpouse1: 55,
      ageSpouse2: 52,
      healthSpouse1: 'poor',
      healthSpouse2: 'good',
      incomeSpouse1: 150000,
      incomeSpouse2: 80000,
      earnCapacitySpouse1: 150000,
      earnCapacitySpouse2: 80000,
      contributionToMarriage: 'Spouse 1 contributed more',
      custodyArrangement: 'joint',
      domesticViolence: true,
      wastingOfAssets: false,
      taxConsequences: true,
      // Pennsylvania-specific factors
      priorMarriageSpouse1: true,
      priorMarriageSpouse2: false,
      contributionToEducationTrainingSpouse1: true,
      contributionToEducationTrainingSpouse2: false,
      opportunityFutureAcquisitionsSpouse1: 'Significant business prospects',
      opportunityFutureAcquisitionsSpouse2: 'Limited prospects',
      needsSpouse1: 'Medical expenses for chronic condition',
      needsSpouse2: 'Standard living expenses',
      economicCircumstancesAtDivorceSpouse1: 'Recently unemployed',
      economicCircumstancesAtDivorceSpouse2: 'Stable employment',
      estateSpouse1: 500000,
      estateSpouse2: 100000,
      expenseOfSaleAssets: 25000,
      stationSpouse1: 'High-profile executive position',
      stationSpouse2: 'Mid-level professional',
      sourcesOfIncomeDetailsSpouse1: 'Salary, bonuses, stock options, rental income',
      sourcesOfIncomeDetailsSpouse2: 'Salary only',
    }

    const duration = await measurePerformance(async () => {
      for (let i = 0; i < 1000; i++) {
        calculateEquityFactor(complexCircumstances)
      }
    }, '1000 complex equity factor calculations')

    expect(duration).toBeLessThan(100) // Should be very fast
  })

  it('should maintain consistent performance across multiple calculations', async () => {
    const inputs = createMockCalculationInputs({
      assets: Array.from({ length: 50 }, (_, i) => 
        createMockAsset({ name: `Asset ${i}`, value: Math.random() * 1000000 })
      ),
      debts: Array.from({ length: 25 }, (_, i) => 
        createMockDebt({ name: `Debt ${i}`, amount: Math.random() * 100000 })
      ),
    })

    const durations: number[] = []

    for (let i = 0; i < 10; i++) {
      const duration = await measurePerformance(async () => {
        calculatePropertyDivision(inputs)
      }, `Calculation iteration ${i + 1}`)
      durations.push(duration)
    }

    // Calculate coefficient of variation (standard deviation / mean)
    const mean = durations.reduce((sum, d) => sum + d, 0) / durations.length
    const variance = durations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / durations.length
    const standardDeviation = Math.sqrt(variance)
    const coefficientOfVariation = standardDeviation / mean

    // Performance should be consistent (CV < 0.5)
    expect(coefficientOfVariation).toBeLessThan(0.5)
    console.log(`Performance consistency: CV = ${coefficientOfVariation.toFixed(3)}`)
  })

  it('should not cause memory leaks with repeated calculations', async () => {
    const inputs = createMockCalculationInputs({
      assets: Array.from({ length: 100 }, (_, i) => 
        createMockAsset({ name: `Asset ${i}`, value: Math.random() * 1000000 })
      ),
    })

    const initialMemory = process.memoryUsage()

    // Perform many calculations
    for (let i = 0; i < 1000; i++) {
      calculatePropertyDivision(inputs)
      
      // Force garbage collection every 100 iterations
      if (i % 100 === 0 && global.gc) {
        global.gc()
      }
    }

    const finalMemory = process.memoryUsage()
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed

    // Memory usage should not increase significantly (less than 50MB)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
    console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)
  })

  it('should handle concurrent calculations efficiently', async () => {
    const inputs = createMockCalculationInputs({
      assets: Array.from({ length: 50 }, (_, i) => 
        createMockAsset({ name: `Asset ${i}`, value: Math.random() * 1000000 })
      ),
    })

    const startTime = performance.now()

    // Run 10 calculations concurrently
    const promises = Array.from({ length: 10 }, () => 
      Promise.resolve(calculatePropertyDivision(inputs))
    )

    await Promise.all(promises)

    const duration = performance.now() - startTime

    // Concurrent execution should not be significantly slower than sequential
    expect(duration).toBeLessThan(500) // 500ms for 10 concurrent calculations
    console.log(`Concurrent calculation time: ${duration.toFixed(2)}ms`)
  })

  it('should optimize calculations for different state types', async () => {
    const communityPropertyInputs = createMockCalculationInputs({
      personalInfo: {
        ...createMockCalculationInputs().personalInfo,
        filingState: 'CA', // Community property state
      },
      assets: Array.from({ length: 100 }, (_, i) => 
        createMockAsset({ name: `Asset ${i}`, value: Math.random() * 1000000 })
      ),
    })

    const equitableDistributionInputs = createMockCalculationInputs({
      personalInfo: {
        ...createMockCalculationInputs().personalInfo,
        filingState: 'PA', // Equitable distribution state
      },
      assets: Array.from({ length: 100 }, (_, i) => 
        createMockAsset({ name: `Asset ${i}`, value: Math.random() * 1000000 })
      ),
    })

    const cpDuration = await measurePerformance(async () => {
      calculatePropertyDivision(communityPropertyInputs)
    }, 'Community property calculation')

    const edDuration = await measurePerformance(async () => {
      calculatePropertyDivision(equitableDistributionInputs)
    }, 'Equitable distribution calculation')

    // Community property should be faster (simpler 50/50 split)
    expect(cpDuration).toBeLessThan(edDuration * 1.5)
    
    console.log(`CP vs ED performance ratio: ${(edDuration / cpDuration).toFixed(2)}`)
  })

  it('should handle edge cases without performance degradation', async () => {
    const edgeCases = [
      // Zero assets
      createMockCalculationInputs({ assets: [], debts: [] }),
      
      // Very high values
      createMockCalculationInputs({
        assets: [createMockAsset({ value: 999999999999 })],
        debts: [createMockDebt({ amount: 999999999999 })],
      }),
      
      // Very low values
      createMockCalculationInputs({
        assets: [createMockAsset({ value: 0.01 })],
        debts: [createMockDebt({ amount: 0.01 })],
      }),
      
      // Many zero-value assets
      createMockCalculationInputs({
        assets: Array.from({ length: 1000 }, (_, i) => 
          createMockAsset({ name: `Zero Asset ${i}`, value: 0 })
        ),
      }),
    ]

    for (const [index, inputs] of edgeCases.entries()) {
      const duration = await measurePerformance(async () => {
        calculatePropertyDivision(inputs)
      }, `Edge case ${index + 1}`)

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.SMALL_DATASET)
    }
  })
})