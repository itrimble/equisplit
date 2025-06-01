import { calculateEquityFactor } from './calculations';
import { EquitableDistributionFactors } from '../types';

// Base factors for a neutral scenario, resulting in a 0.5 score without PA factors.
const neutralBaseFactors: EquitableDistributionFactors = {
  marriageDuration: 10, // Neither short nor long
  ageSpouse1: 40,
  ageSpouse2: 40, // No age difference
  healthSpouse1: 'good',
  healthSpouse2: 'good', // No health disparity
  incomeSpouse1: 50000,
  incomeSpouse2: 50000, // No income disparity
  earnCapacitySpouse1: 50000,
  earnCapacitySpouse2: 50000, // No earning capacity disparity
  contributionToMarriage: 'Equal contributions', // Assuming this doesn't have a score impact currently
  custodyArrangement: undefined, // No custody factor
  domesticViolence: false,
  wastingOfAssets: false,
  taxConsequences: false,
  // No PA factors by default
};

describe('calculateEquityFactor', () => {
  it('should return 0.5 for neutral base factors', () => {
    const score = calculateEquityFactor(neutralBaseFactors);
    expect(score).toBe(0.5);
  });

  // --- Tests for Pre-existing General Factors ---
  describe('General Factor Adherence', () => {
    it('should decrease score for short marriage duration', () => {
      const factors = { ...neutralBaseFactors, marriageDuration: 3 }; // < 5 years
      expect(calculateEquityFactor(factors)).toBe(0.5 - 0.05);
    });

    it('should increase score for long marriage duration', () => {
      const factors = { ...neutralBaseFactors, marriageDuration: 22 }; // > 20 years
      expect(calculateEquityFactor(factors)).toBe(0.5 + 0.05);
    });

    it('should adjust score for significant age difference (Spouse 1 older)', () => {
      const factors = { ...neutralBaseFactors, ageSpouse1: 55, ageSpouse2: 40 }; // Diff > 10, S1 older
      expect(calculateEquityFactor(factors)).toBe(0.5 - 0.03);
    });

    it('should adjust score for significant age difference (Spouse 2 older)', () => {
      const factors = { ...neutralBaseFactors, ageSpouse1: 40, ageSpouse2: 55 }; // Diff > 10, S2 older
      expect(calculateEquityFactor(factors)).toBe(0.5 + 0.03);
    });

    it('should increase score if Spouse 1 has significantly lower income', () => {
      const factors = { ...neutralBaseFactors, incomeSpouse1: 20000, incomeSpouse2: 80000 }; // Ratio < 0.3
      expect(calculateEquityFactor(factors)).toBe(0.5 + 0.1);
    });

    it('should decrease score if Spouse 1 has significantly higher income', () => {
      const factors = { ...neutralBaseFactors, incomeSpouse1: 80000, incomeSpouse2: 20000 }; // Ratio > 0.7
      expect(calculateEquityFactor(factors)).toBe(0.5 - 0.1);
    });

    it('should increase score if Spouse 1 has lower earning capacity', () => {
        const factors = { ...neutralBaseFactors, earnCapacitySpouse1: 30000, earnCapacitySpouse2: 70001 }; // Ratio < 0.4 (approx)
        expect(calculateEquityFactor(factors)).toBe(0.5 + 0.05);
    });

    it('should decrease score if Spouse 1 has higher earning capacity', () => {
        const factors = { ...neutralBaseFactors, earnCapacitySpouse1: 70001, earnCapacitySpouse2: 30000 }; // Ratio > 0.6 (approx)
        expect(calculateEquityFactor(factors)).toBe(0.5 - 0.05);
    });

    it('should increase score if Spouse 1 has poor health and Spouse 2 does not', () => {
      const factors = { ...neutralBaseFactors, healthSpouse1: 'poor' };
      expect(calculateEquityFactor(factors)).toBe(0.5 + 0.05);
    });

    it('should decrease score if Spouse 2 has poor health and Spouse 1 does not', () => {
      const factors = { ...neutralBaseFactors, healthSpouse2: 'poor' };
      expect(calculateEquityFactor(factors)).toBe(0.5 - 0.05);
    });

    it('should increase score for sole custody to Spouse 1', () => {
      const factors = { ...neutralBaseFactors, custodyArrangement: 'sole_1' };
      expect(calculateEquityFactor(factors)).toBe(0.5 + 0.08);
    });

    it('should decrease score for sole custody to Spouse 2', () => {
      const factors = { ...neutralBaseFactors, custodyArrangement: 'sole_2' };
      expect(calculateEquityFactor(factors)).toBe(0.5 - 0.08);
    });

    it('should increase score for domestic violence', () => {
      const factors = { ...neutralBaseFactors, domesticViolence: true };
      expect(calculateEquityFactor(factors)).toBe(0.5 + 0.1);
    });

    it('should increase score for wasting of assets', () => {
      const factors = { ...neutralBaseFactors, wastingOfAssets: true };
      expect(calculateEquityFactor(factors)).toBe(0.5 + 0.05);
    });
  });

  // --- Tests for Pennsylvania-Specific Factors ---
  describe('Pennsylvania Specific Factor Adjustments', () => {
    it('should increase score if Spouse 1 has prior marriage and Spouse 2 does not (PA context)', () => {
      const factors: EquitableDistributionFactors = { ...neutralBaseFactors, priorMarriageSpouse1: true, priorMarriageSpouse2: false };
      expect(calculateEquityFactor(factors)).toBeCloseTo(0.5 + 0.01);
    });

    it('should decrease score if Spouse 2 has prior marriage and Spouse 1 does not (PA context)', () => {
      const factors: EquitableDistributionFactors = { ...neutralBaseFactors, priorMarriageSpouse1: false, priorMarriageSpouse2: true };
      expect(calculateEquityFactor(factors)).toBeCloseTo(0.5 - 0.01);
    });

    it('should not change score if both or neither have prior marriages (PA context)', () => {
      const factors1: EquitableDistributionFactors = { ...neutralBaseFactors, priorMarriageSpouse1: true, priorMarriageSpouse2: true };
      expect(calculateEquityFactor(factors1)).toBeCloseTo(0.5);
      const factors2: EquitableDistributionFactors = { ...neutralBaseFactors, priorMarriageSpouse1: false, priorMarriageSpouse2: false };
      expect(calculateEquityFactor(factors2)).toBeCloseTo(0.5); // No PA context if only these are false and others undefined
    });

    it('should increase score if Spouse 1 contributed to Spouse 2 education (PA context)', () => {
      const factors: EquitableDistributionFactors = { ...neutralBaseFactors, contributionToEducationTrainingSpouse1: true };
      expect(calculateEquityFactor(factors)).toBeCloseTo(0.5 + 0.02);
    });

    it('should decrease score if Spouse 2 contributed to Spouse 1 education (PA context)', () => {
      const factors: EquitableDistributionFactors = { ...neutralBaseFactors, contributionToEducationTrainingSpouse2: true };
      expect(calculateEquityFactor(factors)).toBeCloseTo(0.5 - 0.02);
    });

    it('should decrease score if Spouse 1 has defined future opportunity and Spouse 2 does not (PA context)', () => {
      const factors: EquitableDistributionFactors = { ...neutralBaseFactors, opportunityFutureAcquisitionsSpouse1: 'Has good prospects' };
      expect(calculateEquityFactor(factors)).toBeCloseTo(0.5 - 0.01);
    });

    it('should increase score if Spouse 2 has defined future opportunity and Spouse 1 does not (PA context)', () => {
      const factors: EquitableDistributionFactors = { ...neutralBaseFactors, opportunityFutureAcquisitionsSpouse2: 'Has good prospects' };
      expect(calculateEquityFactor(factors)).toBeCloseTo(0.5 + 0.01);
    });

    it('should increase score if Spouse 1 has defined needs and Spouse 2 does not (PA context)', () => {
      const factors: EquitableDistributionFactors = { ...neutralBaseFactors, needsSpouse1: 'Significant medical needs' };
      expect(calculateEquityFactor(factors)).toBeCloseTo(0.5 + 0.02);
    });

    it('should decrease score if Spouse 2 has defined needs and Spouse 1 does not (PA context)', () => {
      const factors: EquitableDistributionFactors = { ...neutralBaseFactors, needsSpouse2: 'Significant medical needs' };
      expect(calculateEquityFactor(factors)).toBeCloseTo(0.5 - 0.02);
    });

    it('should increase score if Spouse 1 has specific economic circumstances and Spouse 2 does not (PA context)', () => {
      const factors: EquitableDistributionFactors = { ...neutralBaseFactors, economicCircumstancesAtDivorceSpouse1: 'Lost job recently' };
      expect(calculateEquityFactor(factors)).toBeCloseTo(0.5 + 0.02);
    });

    it('should decrease score if Spouse 2 has specific economic circumstances and Spouse 1 does not (PA context)', () => {
      const factors: EquitableDistributionFactors = { ...neutralBaseFactors, economicCircumstancesAtDivorceSpouse2: 'Lost job recently' };
      expect(calculateEquityFactor(factors)).toBeCloseTo(0.5 - 0.02);
    });

    it('should decrease score if Spouse 1 separate estate is much larger (PA context)', () => {
      const factors: EquitableDistributionFactors = { ...neutralBaseFactors, estateSpouse1: 100000, estateSpouse2: 40000 }; // S1 > S2 * 2
      expect(calculateEquityFactor(factors)).toBeCloseTo(0.5 - 0.02);
    });

    it('should increase score if Spouse 2 separate estate is much larger (PA context)', () => {
      const factors: EquitableDistributionFactors = { ...neutralBaseFactors, estateSpouse1: 40000, estateSpouse2: 100000 }; // S2 > S1 * 2
      expect(calculateEquityFactor(factors)).toBeCloseTo(0.5 + 0.02);
    });

    it('should decrease score if only Spouse 1 has separate estate (PA context)', () => {
      const factors: EquitableDistributionFactors = { ...neutralBaseFactors, estateSpouse1: 50000 };
      expect(calculateEquityFactor(factors)).toBeCloseTo(0.5 - 0.01);
    });

    it('should increase score if only Spouse 2 has separate estate (PA context)', () => {
      const factors: EquitableDistributionFactors = { ...neutralBaseFactors, estateSpouse2: 50000 };
      expect(calculateEquityFactor(factors)).toBeCloseTo(0.5 + 0.01);
    });

    it('should adjust score towards center if expenseOfSaleAssets is high and score is skewed high (PA context)', () => {
      let factors: EquitableDistributionFactors = { ...neutralBaseFactors, incomeSpouse1: 20000, incomeSpouse2: 80000 }; // Score = 0.6
      factors = { ...factors, expenseOfSaleAssets: 10000 }; // High expense
      // Initial score for income disparity: 0.5 + 0.1 = 0.6. Expense nudge: -0.01
      expect(calculateEquityFactor(factors)).toBeCloseTo(0.6 - 0.01);
    });

    it('should adjust score towards center if expenseOfSaleAssets is high and score is skewed low (PA context)', () => {
      let factors: EquitableDistributionFactors = { ...neutralBaseFactors, incomeSpouse1: 80000, incomeSpouse2: 20000 }; // Score = 0.4
      factors = { ...factors, expenseOfSaleAssets: 10000 }; // High expense
      // Initial score for income disparity: 0.5 - 0.1 = 0.4. Expense nudge: +0.01
      expect(calculateEquityFactor(factors)).toBeCloseTo(0.4 + 0.01);
    });

    it('should not adjust for expenseOfSaleAssets if score is already centered (PA context)', () => {
      const factors: EquitableDistributionFactors = { ...neutralBaseFactors, expenseOfSaleAssets: 10000 };
      expect(calculateEquityFactor(factors)).toBeCloseTo(0.5);
    });

    it('should increase score if Spouse 1 station is detailed and Spouse 2 is not (PA context)', () => {
      const factors: EquitableDistributionFactors = { ...neutralBaseFactors, stationSpouse1: 'Details about station' };
      expect(calculateEquityFactor(factors)).toBeCloseTo(0.5 + 0.01);
    });

    it('should decrease score if Spouse 2 station is detailed and Spouse 1 is not (PA context)', () => {
      const factors: EquitableDistributionFactors = { ...neutralBaseFactors, stationSpouse2: 'Details about station' };
      expect(calculateEquityFactor(factors)).toBeCloseTo(0.5 - 0.01);
    });

    it('should decrease score if Spouse 1 has other income sources detailed and Spouse 2 does not (PA context)', () => {
      const factors: EquitableDistributionFactors = { ...neutralBaseFactors, sourcesOfIncomeDetailsSpouse1: 'Has other income' };
      expect(calculateEquityFactor(factors)).toBeCloseTo(0.5 - 0.01);
    });

    it('should increase score if Spouse 2 has other income sources detailed and Spouse 1 does not (PA context)', () => {
      const factors: EquitableDistributionFactors = { ...neutralBaseFactors, sourcesOfIncomeDetailsSpouse2: 'Has other income' };
      expect(calculateEquityFactor(factors)).toBeCloseTo(0.5 + 0.01);
    });

    // Example of a combined PA factors test
    it('should sum PA adjustments correctly (e.g. S1 prior marriage, S2 needs)', () => {
        const factors: EquitableDistributionFactors = {
            ...neutralBaseFactors,
            priorMarriageSpouse1: true, // +0.01
            needsSpouse2: 'Significant needs' // -0.02
        };
        expect(calculateEquityFactor(factors)).toBeCloseTo(0.5 + 0.01 - 0.02); // 0.49
    });
  });

  // --- Tests for Score Clamping ---
  describe('Score Clamping', () => {
    it('should clamp score to 0.7 if factors heavily favor Spouse 1', () => {
      const factors: EquitableDistributionFactors = {
        ...neutralBaseFactors,
        marriageDuration: 25, // +0.05
        incomeSpouse1: 10000, incomeSpouse2: 100000, // +0.1
        healthSpouse1: 'poor', // +0.05
        custodyArrangement: 'sole_1', // +0.08
        domesticViolence: true, // +0.1
        wastingOfAssets: true, // +0.05
        // Total before PA: 0.5 + 0.05 + 0.1 + 0.05 + 0.08 + 0.1 + 0.05 = 0.93
        // Adding some PA factors to push it further
        contributionToEducationTrainingSpouse1: true, // +0.02
        needsSpouse1: "Many needs", // +0.02
      };
      // Expected: 0.5 + 0.05 (duration) + 0.1 (income) + 0.05 (health) + 0.08 (custody) + 0.1 (dv) + 0.05 (waste) = 0.93
      // PA: +0.02 (edu contrib) + 0.02 (needs S1) = +0.04
      // Total attempted score = 0.93 + 0.04 = 0.97
      expect(calculateEquityFactor(factors)).toBe(0.7);
    });

    it('should clamp score to 0.3 if factors heavily favor Spouse 2', () => {
      const factors: EquitableDistributionFactors = {
        ...neutralBaseFactors,
        ageSpouse2: 60, ageSpouse1: 40, // +0.03 (favors S1, so -0.03 for S2 in calculation, S2 older means S1 gets less)
        incomeSpouse1: 100000, incomeSpouse2: 10000, // -0.1
        healthSpouse2: 'poor', // -0.05
        custodyArrangement: 'sole_2', // -0.08
        // Total before PA: 0.5 -0.03 (age for S1) -0.1 -0.05 -0.08 = 0.24
        // Adding some PA factors
        contributionToEducationTrainingSpouse2: true, // -0.02
        needsSpouse2: "Many needs", // -0.02
      };
      // Expected: 0.5 -0.03 (age for S1) -0.1 (income) -0.05 (health) -0.08 (custody) = 0.24
      // PA: -0.02 (edu contrib for S2) -0.02 (needs S2) = -0.04
      // Total attempted score = 0.24 - 0.04 = 0.20
      expect(calculateEquityFactor(factors)).toBe(0.3);
    });
  });
});
