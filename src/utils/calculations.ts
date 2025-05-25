import { 
  CalculationInput, 
  PropertyDivision, 
  Asset, 
  Debt, 
  AssetDivision, 
  DebtDivision,
  EquitableDistributionFactors,
  USState
} from '@/types';
import { isCommunityPropertyState } from './states';

/**
 * Main calculation engine for property division
 */
export function calculatePropertyDivision(input: CalculationInput): PropertyDivision {
  if (isCommunityPropertyState(input.jurisdiction)) {
    return calculateCommunityProperty(input);
  } else {
    return calculateEquitableDistribution(input);
  }
}

/**
 * Community Property Calculation (9 states)
 * General rule: 50/50 split of community property
 */
function calculateCommunityProperty(input: CalculationInput): PropertyDivision {
  const { assets, debts, marriageInfo } = input;
  
  const assetDivisions: AssetDivision[] = [];
  const debtDivisions: DebtDivision[] = [];
  
  let totalCommunityAssets = 0;
  let totalSeparateAssetsSpouse1 = 0;
  let totalSeparateAssetsSpouse2 = 0;
  
  // Process assets
  assets.forEach(asset => {
    const division = calculateAssetDivision(asset, input);
    assetDivisions.push(division);
    
    if (asset.isSeparateProperty) {
      // Assume assets belong to user (spouse1) unless specified otherwise
      totalSeparateAssetsSpouse1 += asset.currentValue;
    } else {
      totalCommunityAssets += asset.currentValue;
    }
  });
  
  let totalCommunityDebts = 0;
  let totalSeparateDebtsSpouse1 = 0;
  let totalSeparateDebtsSpouse2 = 0;
  
  // Process debts
  debts.forEach(debt => {
    const division = calculateDebtDivision(debt, input);
    debtDivisions.push(division);
    
    if (debt.isSeparateProperty) {
      totalSeparateDebtsSpouse1 += debt.currentBalance;
    } else {
      totalCommunityDebts += debt.currentBalance;
    }
  });
  
  // Calculate net community estate
  const netCommunityEstate = totalCommunityAssets - totalCommunityDebts;
  const communitySharePerSpouse = netCommunityEstate / 2;
  
  // Calculate final values
  const spouse1TotalAssets = communitySharePerSpouse + totalSeparateAssetsSpouse1;
  const spouse2TotalAssets = communitySharePerSpouse + totalSeparateAssetsSpouse2;
  const spouse1TotalDebts = (totalCommunityDebts / 2) + totalSeparateDebtsSpouse1;
  const spouse2TotalDebts = (totalCommunityDebts / 2) + totalSeparateDebtsSpouse2;
  
  return {
    spouse1Assets: assetDivisions.filter(a => a.spouse1Share > 0),
    spouse2Assets: assetDivisions.filter(a => a.spouse2Share > 0),
    spouse1Debts: debtDivisions.filter(d => d.spouse1Responsibility > 0),
    spouse2Debts: debtDivisions.filter(d => d.spouse2Responsibility > 0),
    totalSpouse1Value: spouse1TotalAssets - spouse1TotalDebts,
    totalSpouse2Value: spouse2TotalAssets - spouse2TotalDebts,
  };
}

/**
 * Equitable Distribution Calculation (41 states + DC)
 * Considers multiple factors for fair division
 */
function calculateEquitableDistribution(input: CalculationInput): PropertyDivision {
  const { assets, debts, specialFactors } = input;
  
  if (!specialFactors) {
    throw new Error('Equitable distribution requires special factors');
  }
  
  // Calculate base equity factor (starting point for division)
  const equityFactor = calculateEquityFactor(specialFactors);
  
  const assetDivisions: AssetDivision[] = [];
  const debtDivisions: DebtDivision[] = [];
  
  let totalMaritalAssets = 0;
  let totalSeparateAssetsSpouse1 = 0;
  let totalSeparateAssetsSpouse2 = 0;
  
  // Process assets with equity factor
  assets.forEach(asset => {
    const division = calculateAssetDivisionEquitable(asset, input, equityFactor);
    assetDivisions.push(division);
    
    if (asset.isSeparateProperty) {
      totalSeparateAssetsSpouse1 += asset.currentValue;
    } else {
      totalMaritalAssets += asset.currentValue;
    }
  });
  
  let totalMaritalDebts = 0;
  let totalSeparateDebtsSpouse1 = 0;
  
  // Process debts with equity factor
  debts.forEach(debt => {
    const division = calculateDebtDivisionEquitable(debt, input, equityFactor);
    debtDivisions.push(division);
    
    if (debt.isSeparateProperty) {
      totalSeparateDebtsSpouse1 += debt.currentBalance;
    } else {
      totalMaritalDebts += debt.currentBalance;
    }
  });
  
  // Calculate equitable shares
  const spouse1AssetShare = totalMaritalAssets * equityFactor;
  const spouse2AssetShare = totalMaritalAssets * (1 - equityFactor);
  const spouse1DebtShare = totalMaritalDebts * equityFactor;
  const spouse2DebtShare = totalMaritalDebts * (1 - equityFactor);
  
  const totalSpouse1Value = (spouse1AssetShare + totalSeparateAssetsSpouse1) - 
                           (spouse1DebtShare + totalSeparateDebtsSpouse1);
  const totalSpouse2Value = spouse2AssetShare - spouse2DebtShare;
  
  // Calculate equalization payment if needed
  const difference = Math.abs(totalSpouse1Value - totalSpouse2Value);
  let equalizationPayment: number | undefined;
  let paymentFrom: 'spouse1' | 'spouse2' | undefined;
  
  if (difference > 1000) { // Only if significant difference
    equalizationPayment = difference / 2;
    paymentFrom = totalSpouse1Value > totalSpouse2Value ? 'spouse1' : 'spouse2';
  }
  
  return {
    spouse1Assets: assetDivisions.filter(a => a.spouse1Share > 0),
    spouse2Assets: assetDivisions.filter(a => a.spouse2Share > 0),
    spouse1Debts: debtDivisions.filter(d => d.spouse1Responsibility > 0),
    spouse2Debts: debtDivisions.filter(d => d.spouse2Responsibility > 0),
    totalSpouse1Value,
    totalSpouse2Value,
    equalizationPayment,
    paymentFrom,
  };
}

/**
 * Calculate equity factor for equitable distribution
 * Returns a value between 0.3 and 0.7 (30% to 70% for spouse 1)
 */
function calculateEquityFactor(factors: EquitableDistributionFactors): number {
  let score = 0.5; // Start at 50/50
  
  // Marriage duration factor
  if (factors.marriageDuration < 5) {
    score -= 0.05; // Shorter marriages favor more equal division
  } else if (factors.marriageDuration > 20) {
    score += 0.05; // Longer marriages consider more factors
  }
  
  // Age factor
  const ageDifference = factors.ageSpouse1 - factors.ageSpouse2;
  if (Math.abs(ageDifference) > 10) {
    score += ageDifference > 0 ? -0.03 : 0.03; // Adjust for significant age difference
  }
  
  // Income factor
  const totalIncome = factors.incomeSpouse1 + factors.incomeSpouse2;
  if (totalIncome > 0) {
    const incomeRatio = factors.incomeSpouse1 / totalIncome;
    if (incomeRatio < 0.3) {
      score += 0.1; // Lower earning spouse gets more
    } else if (incomeRatio > 0.7) {
      score -= 0.1; // Higher earning spouse gets less
    }
  }
  
  // Earning capacity factor
  const totalEarnCapacity = factors.earnCapacitySpouse1 + factors.earnCapacitySpouse2;
  if (totalEarnCapacity > 0) {
    const capacityRatio = factors.earnCapacitySpouse1 / totalEarnCapacity;
    if (capacityRatio < 0.4) {
      score += 0.05;
    } else if (capacityRatio > 0.6) {
      score -= 0.05;
    }
  }
  
  // Health factor
  if (factors.healthSpouse1 === 'poor' && factors.healthSpouse2 !== 'poor') {
    score += 0.05;
  } else if (factors.healthSpouse2 === 'poor' && factors.healthSpouse1 !== 'poor') {
    score -= 0.05;
  }
  
  // Custody factor
  if (factors.custodyArrangement === 'sole_1') {
    score += 0.08; // Primary custody parent gets more
  } else if (factors.custodyArrangement === 'sole_2') {
    score -= 0.08;
  }
  
  // Domestic violence factor
  if (factors.domesticViolence) {
    score += 0.1; // Victim gets more
  }
  
  // Wasting of assets factor
  if (factors.wastingOfAssets) {
    score += 0.05; // Non-wasting spouse gets more
  }
  
  // Ensure factor stays within reasonable bounds
  return Math.max(0.3, Math.min(0.7, score));
}

function calculateAssetDivision(asset: Asset, input: CalculationInput): AssetDivision {
  if (asset.isSeparateProperty) {
    return {
      assetId: asset.id,
      description: asset.description,
      totalValue: asset.currentValue,
      spouse1Share: asset.currentValue, // Assuming user is spouse1
      spouse2Share: 0,
      reasoning: 'Separate property acquired before marriage or through inheritance/gift'
    };
  }
  
  // Community property - 50/50 split
  const halfValue = asset.currentValue / 2;
  return {
    assetId: asset.id,
    description: asset.description,
    totalValue: asset.currentValue,
    spouse1Share: halfValue,
    spouse2Share: halfValue,
    reasoning: 'Community property acquired during marriage - equal division'
  };
}

function calculateAssetDivisionEquitable(
  asset: Asset, 
  input: CalculationInput, 
  equityFactor: number
): AssetDivision {
  if (asset.isSeparateProperty) {
    return {
      assetId: asset.id,
      description: asset.description,
      totalValue: asset.currentValue,
      spouse1Share: asset.currentValue,
      spouse2Share: 0,
      reasoning: 'Separate property not subject to division'
    };
  }
  
  const spouse1Share = asset.currentValue * equityFactor;
  const spouse2Share = asset.currentValue * (1 - equityFactor);
  
  return {
    assetId: asset.id,
    description: asset.description,
    totalValue: asset.currentValue,
    spouse1Share,
    spouse2Share,
    reasoning: `Equitable distribution based on marriage factors (${Math.round(equityFactor * 100)}%/${Math.round((1 - equityFactor) * 100)}%)`
  };
}

function calculateDebtDivision(debt: Debt, input: CalculationInput): DebtDivision {
  if (debt.isSeparateProperty) {
    return {
      debtId: debt.id,
      description: debt.description,
      totalBalance: debt.currentBalance,
      spouse1Responsibility: debt.currentBalance,
      spouse2Responsibility: 0,
      reasoning: 'Separate debt incurred before marriage'
    };
  }
  
  // Community debt - 50/50 split
  const halfBalance = debt.currentBalance / 2;
  return {
    debtId: debt.id,
    description: debt.description,
    totalBalance: debt.currentBalance,
    spouse1Responsibility: halfBalance,
    spouse2Responsibility: halfBalance,
    reasoning: 'Community debt incurred during marriage - equal responsibility'
  };
}

function calculateDebtDivisionEquitable(
  debt: Debt, 
  input: CalculationInput, 
  equityFactor: number
): DebtDivision {
  if (debt.isSeparateProperty) {
    return {
      debtId: debt.id,
      description: debt.description,
      totalBalance: debt.currentBalance,
      spouse1Responsibility: debt.currentBalance,
      spouse2Responsibility: 0,
      reasoning: 'Separate debt not subject to division'
    };
  }
  
  const spouse1Responsibility = debt.currentBalance * equityFactor;
  const spouse2Responsibility = debt.currentBalance * (1 - equityFactor);
  
  return {
    debtId: debt.id,
    description: debt.description,
    totalBalance: debt.currentBalance,
    spouse1Responsibility,
    spouse2Responsibility,
    reasoning: `Equitable debt allocation (${Math.round(equityFactor * 100)}%/${Math.round((1 - equityFactor) * 100)}%)`
  };
}

/**
 * Calculate confidence level for the calculation
 */
export function calculateConfidenceLevel(input: CalculationInput): number {
  let confidence = 85; // Base confidence
  
  // Reduce confidence for complex situations
  if (input.specialFactors?.domesticViolence) confidence -= 10;
  if (input.specialFactors?.wastingOfAssets) confidence -= 10;
  if (input.assets.some(a => a.type === 'business_interest')) confidence -= 15;
  if (input.assets.some(a => a.type === 'cryptocurrency')) confidence -= 10;
  
  // Increase confidence for simple situations
  if (input.assets.length <= 5 && input.debts.length <= 3) confidence += 5;
  if (input.marriageInfo.hasPrenup) confidence += 10;
  
  return Math.max(50, Math.min(95, confidence));
}

/**
 * Format currency values
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculate percentage of total
 */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}