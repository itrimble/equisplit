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
 * General rule: 50/50 split of community property.
 * This function also includes specific logic for Texas regarding income/appreciation
 * from separate property, which can be treated as community property.
 * Note: This implementation does not yet handle complex reimbursements or tracing.
 */
function calculateCommunityProperty(input: CalculationInput): PropertyDivision {
  const { assets, debts, marriageInfo, jurisdiction } = input;
  
  const assetDivisions: AssetDivision[] = [];
  const debtDivisions: DebtDivision[] = [];
  
  let totalCommunityAssets = 0;
  let totalSeparateAssetsSpouse1 = 0;
  let totalSeparateAssetsSpouse2 = 0;

  /**
   * Calculates Appreciation During Marriage (ADM) for a separate property asset.
   * @param asset The asset to calculate ADM for.
   * @param marrDate The date of marriage.
   * @param sepDate Optional date of separation.
   * @returns The calculated appreciation during marriage, or 0 if not applicable/calculable.
   *
   * SIMPLIFICATION: This is a simplified ADM calculation. It assumes appreciation is linear
   * and does not account for specific market fluctuations, contributions, or complex tracing
   * that might be required in a detailed legal analysis. It primarily considers the difference
   * between current value and acquisition value.
   */
  const calculateADM = (asset: Asset, marrDate: Date, sepDate?: Date): number => {
    // ADM is only relevant for separate property with known acquisition value and date.
    if (!asset.isSeparateProperty || typeof asset.acquisitionValue !== 'number' || !asset.acquisitionDate) {
      return 0;
    }
    // const acquisitionDate = new Date(asset.acquisitionDate); // Date conversion already happens in form/type
    // const marriageStartDate = new Date(marrDate);

    // Simplified ADM: current value minus acquisition value.
    // This does not perfectly isolate appreciation strictly "during" the marriage period
    // if the asset was acquired long before the marriage and the marriage was short,
    // or if acquired mid-marriage. This is a known simplification.
    // The primary purpose here is to capture the growth of separate property value.
    let appreciation = 0;
    if (asset.acquisitionValue < asset.currentValue) { // Only consider positive appreciation
        appreciation = asset.currentValue - asset.acquisitionValue;
    }
    return appreciation > 0 ? appreciation : 0;
  };

  assets.forEach(asset => {
    if (asset.isSeparateProperty) {
      // Start by assuming the full current value is separate property.
      let separatePropertyValue = asset.currentValue;
      // This will hold any portion of the separate property's appreciation/income
      // that is treated as community property (e.g., under Texas rules).
      let communityPortionFromSP = 0;
      // Best guess for the original value of the separate property corpus.
      // If acquisitionValue is unknown, current value is used, implying no calculable appreciation for ADM.
      // let initialSeparateCorpus = asset.acquisitionValue != null ? asset.acquisitionValue : asset.currentValue;

      let reasoning = `Separate property`; // Base reasoning for the asset division.

      // Texas-specific rule: Income and appreciation from separate property can be community property.
      if (jurisdiction === 'TX') {
        const adm = calculateADM(asset, marriageInfo.marriageDate, marriageInfo.separationDate);
        // Only apply ADM if it's positive and there's a basis (acquisitionValue) to calculate from.
        if (adm > 0 && asset.acquisitionValue != null) {
          communityPortionFromSP = adm;
          totalCommunityAssets += communityPortionFromSP; // Add the community portion to total community assets.

          // The original corpus (acquisition value) of the separate property remains separate.
          separatePropertyValue = asset.acquisitionValue;
          reasoning += ` (Texas rule: appreciation/income of ${communityPortionFromSP} treated as community)`;
        } else if (adm > 0 && asset.acquisitionValue == null) {
            // If ADM is positive but no acquisition value, we can't determine the separate corpus vs. community appreciation.
            // Asset remains fully separate by default in this simplified model.
            reasoning += ` (Texas rule: appreciation could not be determined due to missing acquisition value, treated as fully separate)`;
            // separatePropertyValue remains asset.currentValue
        }
      }

      // Determine ownership of the separate property portion.
      // Defaults to 'spouse1' if not specified (forms should ensure this is set).
      const owner = asset.ownedBy || 'spouse1';
      if (owner === 'spouse1') {
        totalSeparateAssetsSpouse1 += separatePropertyValue;
        // Append Texas rule details if applicable, otherwise just state it's SP of Spouse 1.
        reasoning = `Separate property of Spouse 1` + (reasoning.startsWith(" (Texas rule:") ? reasoning : "");
      } else if (owner === 'spouse2') {
        totalSeparateAssetsSpouse2 += separatePropertyValue;
        reasoning = `Separate property of Spouse 2` + (reasoning.startsWith(" (Texas rule:") ? reasoning : "");
      } else {
        // Fallback for unclear ownership - should be prevented by form validation.
        console.warn(`Separate asset ${asset.description || asset.id} has unclear ownership, defaulting to Spouse 1.`);
        totalSeparateAssetsSpouse1 += separatePropertyValue;
        reasoning = `Separate property (unclear owner, defaulted to Spouse 1)` + (reasoning.startsWith(" (Texas rule:") ? reasoning : "");
      }

      // The asset division includes the separate portion assigned to the owner,
      // plus half of any community portion (e.g., ADM in Texas).
      assetDivisions.push({
        assetId: asset.id,
        description: asset.description,
        totalValue: asset.currentValue,
        spouse1Share: (owner === 'spouse1' ? separatePropertyValue : 0) + (communityPortionFromSP / 2),
        spouse2Share: (owner === 'spouse2' ? separatePropertyValue : 0) + (communityPortionFromSP / 2),
        reasoning: reasoning
      });

    } else { // Standard Community Asset (not separate property)
      totalCommunityAssets += asset.currentValue;
      const halfValue = asset.currentValue / 2;
      assetDivisions.push({
        assetId: asset.id,
        description: asset.description,
        totalValue: asset.currentValue,
        spouse1Share: halfValue,
        spouse2Share: halfValue,
        reasoning: 'Community property - equal division'
      });
    }
  });
  
  let totalCommunityDebts = 0;
  let totalSeparateDebtsSpouse1 = 0;
  let totalSeparateDebtsSpouse2 = 0;

  debts.forEach(debt => {
    if (debt.isSeparateProperty) {
      let reasoning = `Separate debt`;
      const responsibleParty = debt.responsibility || 'spouse1';
      if (responsibleParty === 'spouse1') {
        totalSeparateDebtsSpouse1 += debt.currentBalance;
        reasoning = `Separate debt of Spouse 1`;
      } else if (responsibleParty === 'spouse2') {
        totalSeparateDebtsSpouse2 += debt.currentBalance;
        reasoning = `Separate debt of Spouse 2`;
      } else {
        console.warn(`Separate debt ${debt.description || debt.id} has unclear responsibility, defaulting to Spouse 1.`);
        totalSeparateDebtsSpouse1 += debt.currentBalance;
        reasoning = `Separate debt (unclear responsibility, defaulted to Spouse 1)`;
      }
      debtDivisions.push({
        debtId: debt.id,
        description: debt.description,
        totalBalance: debt.currentBalance,
        spouse1Responsibility: responsibleParty === 'spouse1' ? debt.currentBalance : 0,
        spouse2Responsibility: responsibleParty === 'spouse2' ? debt.currentBalance : 0,
        reasoning: reasoning
      });
    } else {
      totalCommunityDebts += debt.currentBalance;
      const halfBalance = debt.currentBalance / 2;
      debtDivisions.push({
        debtId: debt.id,
        description: debt.description,
        totalBalance: debt.currentBalance,
        spouse1Responsibility: halfBalance,
        spouse2Responsibility: halfBalance,
        reasoning: 'Community debt - equal responsibility'
      });
    }
  });
  
  const netCommunityEstate = totalCommunityAssets - totalCommunityDebts;
  const communitySharePerSpouse = netCommunityEstate / 2;
  
  const finalSpouse1NetValue = (totalSeparateAssetsSpouse1 + communitySharePerSpouse) - (totalSeparateDebtsSpouse1 + (totalCommunityDebts / 2));
  const finalSpouse2NetValue = (totalSeparateAssetsSpouse2 + communitySharePerSpouse) - (totalSeparateDebtsSpouse2 + (totalCommunityDebts / 2));
  
  return {
    spouse1Assets: assetDivisions.filter(a => a.spouse1Share !== 0 || (a.totalValue !== 0 && a.spouse1Share === 0 && a.spouse2Share === 0 && (a.reasoning.includes("Spouse 1")))),
    spouse2Assets: assetDivisions.filter(a => a.spouse2Share !== 0 || (a.totalValue !== 0 && a.spouse1Share === 0 && a.spouse2Share === 0 && (a.reasoning.includes("Spouse 2")))),
    spouse1Debts: debtDivisions.filter(d => d.spouse1Responsibility !== 0 || (d.totalBalance !== 0 && d.spouse1Responsibility === 0 && d.spouse2Responsibility === 0 && (d.reasoning.includes("Spouse 1")))),
    spouse2Debts: debtDivisions.filter(d => d.spouse2Responsibility !== 0 || (d.totalBalance !== 0 && d.spouse1Responsibility === 0 && d.spouse2Responsibility === 0 && (d.reasoning.includes("Spouse 2")))),
    totalSpouse1Value: finalSpouse1NetValue,
    totalSpouse2Value: finalSpouse2NetValue,
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