import { calculateEquityFactor, calculatePropertyDivision, calculateConfidenceLevel } from '@/utils/calculations'
import { EquitableDistributionFactors, CalculationInputs, USState } from '@/types'

describe('Property Division Calculations', () => {
  // Base factors for a neutral scenario, resulting in a 0.5 score without PA factors.
  const neutralBaseFactors: EquitableDistributionFactors = {
    marriageDuration: 10,
    ageSpouse1: 40,
    ageSpouse2: 40,
    healthSpouse1: 'good',
    healthSpouse2: 'good',
    incomeSpouse1: 50000,
    incomeSpouse2: 50000,
    earnCapacitySpouse1: 50000,
    earnCapacitySpouse2: 50000,
    contributionToMarriage: 'Equal contributions',
    custodyArrangement: undefined,
    domesticViolence: false,
    wastingOfAssets: false,
    taxConsequences: false,
  }

  const sampleInputs: CalculationInputs = {
    personalInfo: {
      spouse1Name: 'John',
      spouse2Name: 'Jane',
      marriageDate: '2014-01-01',
      separationDate: '2024-01-01',
      filingState: 'PA' as USState,
      hasChildren: false,
    },
    assets: [],
    debts: [],
    realEstate: [],
    personalProperty: [],
    financialAccounts: [],
    specialCircumstances: neutralBaseFactors,
  }

  describe('calculateEquityFactor', () => {
    it('should return 0.5 for neutral base factors', () => {
      const score = calculateEquityFactor(neutralBaseFactors)
      expect(score).toBe(0.5)
    })

    it('should clamp score to maximum of 0.7', () => {
      const extremeFactors: EquitableDistributionFactors = {
        ...neutralBaseFactors,
        marriageDuration: 25,
        incomeSpouse1: 10000,
        incomeSpouse2: 100000,
        healthSpouse1: 'poor',
        custodyArrangement: 'sole_1',
        domesticViolence: true,
        wastingOfAssets: true,
      }
      const score = calculateEquityFactor(extremeFactors)
      expect(score).toBe(0.7)
    })

    it('should clamp score to minimum of 0.3', () => {
      const extremeFactors: EquitableDistributionFactors = {
        ...neutralBaseFactors,
        incomeSpouse1: 100000,
        incomeSpouse2: 10000,
        healthSpouse2: 'poor',
        custodyArrangement: 'sole_2',
      }
      const score = calculateEquityFactor(extremeFactors)
      expect(score).toBe(0.3)
    })

    it('should adjust for marriage duration', () => {
      const shortMarriage = { ...neutralBaseFactors, marriageDuration: 3 }
      expect(calculateEquityFactor(shortMarriage)).toBe(0.45)

      const longMarriage = { ...neutralBaseFactors, marriageDuration: 22 }
      expect(calculateEquityFactor(longMarriage)).toBe(0.55)
    })

    it('should adjust for income disparity', () => {
      const lowIncomeSpouse1 = { 
        ...neutralBaseFactors, 
        incomeSpouse1: 20000, 
        incomeSpouse2: 80000 
      }
      expect(calculateEquityFactor(lowIncomeSpouse1)).toBe(0.6)

      const highIncomeSpouse1 = { 
        ...neutralBaseFactors, 
        incomeSpouse1: 80000, 
        incomeSpouse2: 20000 
      }
      expect(calculateEquityFactor(highIncomeSpouse1)).toBe(0.4)
    })
  })

  describe('calculatePropertyDivision', () => {
    it('should handle community property states with 50/50 split', () => {
      const californiaInputs = {
        ...sampleInputs,
        personalInfo: { ...sampleInputs.personalInfo, filingState: 'CA' as USState },
        assets: [
          { id: '1', name: 'House', value: 500000, type: 'real_estate', isMarital: true },
          { id: '2', name: 'Car', value: 30000, type: 'vehicle', isMarital: true },
        ],
      }

      const result = calculatePropertyDivision(californiaInputs)
      
      expect(result.spouse1Share).toBe(0.5)
      expect(result.spouse2Share).toBe(0.5)
      expect(result.totalMaritalAssets).toBe(530000)
    })

    it('should handle equitable distribution states', () => {
      const result = calculatePropertyDivision(sampleInputs)
      
      expect(result.spouse1Share).toBeGreaterThanOrEqual(0.3)
      expect(result.spouse1Share).toBeLessThanOrEqual(0.7)
      expect(result.spouse1Share + result.spouse2Share).toBeCloseTo(1.0)
    })

    it('should separate marital and separate property', () => {
      const inputsWithSeparateProperty = {
        ...sampleInputs,
        assets: [
          { id: '1', name: 'Marital House', value: 400000, type: 'real_estate', isMarital: true },
          { id: '2', name: 'Inheritance', value: 100000, type: 'inheritance', isMarital: false },
        ],
      }

      const result = calculatePropertyDivision(inputsWithSeparateProperty)
      
      expect(result.totalMaritalAssets).toBe(400000)
      expect(result.totalSeparateAssets).toBe(100000)
    })
  })

  describe('calculateConfidenceLevel', () => {
    it('should return high confidence for complete data', () => {
      const completeInputs = {
        ...sampleInputs,
        assets: [{ id: '1', name: 'House', value: 500000, type: 'real_estate', isMarital: true }],
        debts: [{ id: '1', name: 'Mortgage', amount: 200000, type: 'mortgage', isMarital: true }],
      }

      const confidence = calculateConfidenceLevel(completeInputs)
      expect(confidence).toBeGreaterThan(0.8)
    })

    it('should return low confidence for incomplete data', () => {
      const incompleteInputs = {
        ...sampleInputs,
        specialCircumstances: {
          ...neutralBaseFactors,
          incomeSpouse1: 0,
          incomeSpouse2: 0,
        },
      }

      const confidence = calculateConfidenceLevel(incompleteInputs)
      expect(confidence).toBeLessThan(0.6)
    })

    it('should penalize missing financial data', () => {
      const noFinancialData = {
        ...sampleInputs,
        assets: [],
        debts: [],
        financialAccounts: [],
      }

      const confidence = calculateConfidenceLevel(noFinancialData)
      expect(confidence).toBeLessThan(0.5)
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero asset values', () => {
      const zeroAssetInputs = {
        ...sampleInputs,
        assets: [{ id: '1', name: 'Worthless Stock', value: 0, type: 'investment', isMarital: true }],
      }

      const result = calculatePropertyDivision(zeroAssetInputs)
      expect(result.totalMaritalAssets).toBe(0)
      expect(result.spouse1Share).toBe(0.5) // Default to equal split for zero assets
    })

    it('should handle negative debt values', () => {
      const debtInputs = {
        ...sampleInputs,
        debts: [{ id: '1', name: 'Credit Card', amount: -5000, type: 'credit_card', isMarital: true }],
      }

      const result = calculatePropertyDivision(debtInputs)
      expect(result.totalMaritalDebts).toBe(5000)
    })

    it('should handle missing spouse names gracefully', () => {
      const noNamesInputs = {
        ...sampleInputs,
        personalInfo: {
          ...sampleInputs.personalInfo,
          spouse1Name: '',
          spouse2Name: '',
        },
      }

      expect(() => calculatePropertyDivision(noNamesInputs)).not.toThrow()
    })
  })
})

describe('State-Specific Rules', () => {
  const communityPropertyStates: USState[] = ['CA', 'TX', 'AZ', 'NV', 'WA', 'ID', 'NM', 'LA', 'WI']
  
  communityPropertyStates.forEach(state => {
    it(`should apply 50/50 split for community property state: ${state}`, () => {
      const stateInputs = {
        ...sampleInputs,
        personalInfo: { ...sampleInputs.personalInfo, filingState: state },
        assets: [{ id: '1', name: 'Asset', value: 100000, type: 'investment', isMarital: true }],
      }

      const result = calculatePropertyDivision(stateInputs)
      expect(result.spouse1Share).toBe(0.5)
      expect(result.spouse2Share).toBe(0.5)
    })
  })

  it('should apply equitable distribution for non-community property states', () => {
    const equitableStates: USState[] = ['PA', 'NY', 'FL', 'IL']
    
    equitableStates.forEach(state => {
      const stateInputs = {
        ...sampleInputs,
        personalInfo: { ...sampleInputs.personalInfo, filingState: state },
        assets: [{ id: '1', name: 'Asset', value: 100000, type: 'investment', isMarital: true }],
      }

      const result = calculatePropertyDivision(stateInputs)
      // Should be close to equal but may vary based on factors
      expect(result.spouse1Share).toBeGreaterThanOrEqual(0.3)
      expect(result.spouse1Share).toBeLessThanOrEqual(0.7)
    })
  })
})