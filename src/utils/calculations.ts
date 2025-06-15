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
import { isCommunityPropertyState, STATE_INFO } from './states';

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

  const calculateADM = (asset: Asset, marrDate: Date, sepDate?: Date): number => {
    if (!asset.isSeparateProperty || typeof asset.acquisitionValue !== 'number' || !asset.acquisitionDate) {
      return 0;
    }
    // Simplified: appreciation is current value minus acquisition value.
    let appreciation = 0;
    if (asset.acquisitionValue < asset.currentValue) {
        appreciation = asset.currentValue - asset.acquisitionValue;
    }
    return appreciation > 0 ? appreciation : 0;
  };

  // Determine if the current jurisdiction is a Quasi-Community Property state.
  // This information is used to decide if an asset marked as QCP should be treated as community property.
  const currentJurisdictionInfo = STATE_INFO[jurisdiction];
  const isQCPJurisdiction = currentJurisdictionInfo?.isQCPState === true;

  assets.forEach(asset => {
    // Explicitly check for Asset type having the new field for safety, though it should.
    const currentAsset = asset as Asset & { isQuasiCommunityProperty?: boolean };

    // **Quasi-Community Property (QCP) Logic**
    // If the asset is marked as QCP and the current jurisdiction recognizes QCP,
    // it's treated as community property for division purposes. This overrides
    // its separate property status or any Texas-specific ADM rules for this asset.
    // Assumption: The user has correctly identified and flagged assets as QCP based on legal definitions.
    if (isQCPJurisdiction && currentAsset.isQuasiCommunityProperty === true) {
      // Asset is QCP and we are in a QCP state: treat as community property for division
      totalCommunityAssets += currentAsset.currentValue;
      const halfValue = currentAsset.currentValue / 2;
      assetDivisions.push({
        assetId: currentAsset.id,
        description: currentAsset.description,
        totalValue: currentAsset.currentValue,
        spouse1Share: halfValue,
        spouse2Share: halfValue,
        reasoning: `Treated as community property under ${jurisdiction} QCP rules.`
      });
    } else {
      // Not QCP or not in a QCP state, proceed with existing separate/community logic
      if (currentAsset.isSeparateProperty) {
        let separatePropertyValue = currentAsset.currentValue;
        let communityPortionFromSP = 0;
        let reasoning = `Separate property`;

        if (jurisdiction === 'TX') {
          const adm = calculateADM(currentAsset, marriageInfo.marriageDate, marriageInfo.separationDate);
          if (adm > 0 && currentAsset.acquisitionValue != null) {
            communityPortionFromSP = adm;
            totalCommunityAssets += communityPortionFromSP;
            separatePropertyValue = currentAsset.acquisitionValue;
            reasoning += ` (Texas rule: appreciation/income of ${communityPortionFromSP} treated as community)`;
          } else if (adm > 0 && currentAsset.acquisitionValue == null) {
              reasoning += ` (Texas rule: appreciation could not be determined due to missing acquisition value, treated as fully separate)`;
          }
        }

        const owner = currentAsset.ownedBy || 'spouse1';
        if (owner === 'spouse1') {
          totalSeparateAssetsSpouse1 += separatePropertyValue;
          reasoning = `Separate property of Spouse 1` + (reasoning.includes("(Texas rule:") ? /\((Texas rule:[^)]+\))/.exec(reasoning)?.[1] || "" : "");
        } else if (owner === 'spouse2') {
          totalSeparateAssetsSpouse2 += separatePropertyValue;
          reasoning = `Separate property of Spouse 2` + (reasoning.includes("(Texas rule:") ? /\((Texas rule:[^)]+\))/.exec(reasoning)?.[1] || "" : "");
        } else {
          console.warn(`Separate asset ${currentAsset.description || currentAsset.id} has unclear ownership, defaulting to Spouse 1.`);
          totalSeparateAssetsSpouse1 += separatePropertyValue;
          reasoning = `Separate property (unclear owner, defaulted to Spouse 1)` + (reasoning.includes("(Texas rule:") ? /\((Texas rule:[^)]+\))/.exec(reasoning)?.[1] || "" : "");
        }

        // Ensure the Texas rule part of the reasoning is correctly appended if it exists
        let finalReasoning = reasoning;
        if (jurisdiction === 'TX' && communityPortionFromSP > 0) {
            finalReasoning = (owner === 'spouse1' ? `Separate property of Spouse 1` : owner === 'spouse2' ? `Separate property of Spouse 2` : `Separate property (unclear owner, defaulted to Spouse 1)`) +
                             ` (Texas rule: appreciation/income of ${communityPortionFromSP} treated as community)`;
        } else if (jurisdiction === 'TX' && calculateADM(currentAsset, marriageInfo.marriageDate, marriageInfo.separationDate) > 0 && currentAsset.acquisitionValue == null) {
             finalReasoning = (owner === 'spouse1' ? `Separate property of Spouse 1` : owner === 'spouse2' ? `Separate property of Spouse 2` : `Separate property (unclear owner, defaulted to Spouse 1)`) +
                              ` (Texas rule: appreciation could not be determined due to missing acquisition value, treated as fully separate)`;
        }


        assetDivisions.push({
          assetId: currentAsset.id,
          description: currentAsset.description,
          totalValue: currentAsset.currentValue,
          spouse1Share: (owner === 'spouse1' ? separatePropertyValue : 0) + (communityPortionFromSP / 2),
          spouse2Share: (owner === 'spouse2' ? separatePropertyValue : 0) + (communityPortionFromSP / 2),
          reasoning: finalReasoning
        });

      } else { // Standard Community Asset (not QCP, not SP)
        totalCommunityAssets += currentAsset.currentValue;
        const halfValue = currentAsset.currentValue / 2;
        assetDivisions.push({
          assetId: currentAsset.id,
          description: currentAsset.description,
          totalValue: currentAsset.currentValue,
          spouse1Share: halfValue,
          spouse2Share: halfValue,
          reasoning: 'Community property - equal division'
        });
      }
    }
  });
  
  // Debt processing (remains unchanged for this subtask)
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
  
  // Return statement filtering logic (ensure it correctly lists QCP assets as split for both)
  return {
    spouse1Assets: assetDivisions.filter(a => a.spouse1Share !== 0 || (a.reasoning.includes("Spouse 1") && a.totalValue !== 0 && a.spouse2Share === 0 && !a.reasoning.includes("QCP rules")) || (a.reasoning.includes("QCP rules") && a.spouse1Share !==0) ),
    spouse2Assets: assetDivisions.filter(a => a.spouse2Share !== 0 || (a.reasoning.includes("Spouse 2") && a.totalValue !== 0 && a.spouse1Share === 0 && !a.reasoning.includes("QCP rules")) || (a.reasoning.includes("QCP rules") && a.spouse2Share !==0) ),
    spouse1Debts: debtDivisions.filter(d => d.spouse1Responsibility !== 0 || (d.reasoning.includes("Spouse 1") && d.totalBalance !== 0 && d.spouse2Responsibility === 0)),
    spouse2Debts: debtDivisions.filter(d => d.spouse2Responsibility !== 0 || (d.reasoning.includes("Spouse 2") && d.totalBalance !== 0 && d.spouse1Responsibility === 0)),
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
export function calculateEquityFactor(factors: EquitableDistributionFactors): number {
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

  // Pennsylvania-specific factors adjustment
  // Check if any PA-specific factors are present to apply PA logic.
  // Using a few key PA fields to trigger this block.
  const isPennsylvaniaContext = factors.priorMarriageSpouse1 !== undefined ||
                               factors.priorMarriageSpouse2 !== undefined ||
                               factors.stationSpouse1 !== undefined ||
                               factors.stationSpouse2 !== undefined ||
                               factors.vocationalSkillsSpouse1 !== undefined ||
                               factors.vocationalSkillsSpouse2 !== undefined ||
                               factors.estateSpouse1 !== undefined ||
                               factors.estateSpouse2 !== undefined ||
                               factors.needsSpouse1 !== undefined ||
                               factors.needsSpouse2 !== undefined ||
                               factors.contributionToEducationTrainingSpouse1 !== undefined ||
                               factors.contributionToEducationTrainingSpouse2 !== undefined ||
                               factors.opportunityFutureAcquisitionsSpouse1 !== undefined ||
                               factors.opportunityFutureAcquisitionsSpouse2 !== undefined ||
                               factors.sourcesOfIncomeDetailsSpouse1 !== undefined ||
                               factors.sourcesOfIncomeDetailsSpouse2 !== undefined ||
                               factors.standardOfLiving !== undefined ||
                               factors.economicCircumstancesAtDivorceSpouse1 !== undefined ||
                               factors.economicCircumstancesAtDivorceSpouse2 !== undefined ||
                               factors.expenseOfSaleAssets !== undefined;

  if (isPennsylvaniaContext) {
    // Prior Marriages
    if (factors.priorMarriageSpouse1 && !factors.priorMarriageSpouse2) {
      score += 0.01; // Spouse 1 has prior marriage, may slightly favor Spouse 2
    } else if (factors.priorMarriageSpouse2 && !factors.priorMarriageSpouse1) {
      score -= 0.01; // Spouse 2 has prior marriage, may slightly favor Spouse 1
    }

    // Contribution to Education/Training
    if (factors.contributionToEducationTrainingSpouse1 && !factors.contributionToEducationTrainingSpouse2) {
      score += 0.02; // Spouse 1 contributed to Spouse 2's education
    } else if (factors.contributionToEducationTrainingSpouse2 && !factors.contributionToEducationTrainingSpouse1) {
      score -= 0.02; // Spouse 2 contributed to Spouse 1's education
    }

    // Opportunity for Future Acquisitions (presence implies advantage)
    const s1HasOpp = factors.opportunityFutureAcquisitionsSpouse1 && factors.opportunityFutureAcquisitionsSpouse1.length > 0;
    const s2HasOpp = factors.opportunityFutureAcquisitionsSpouse2 && factors.opportunityFutureAcquisitionsSpouse2.length > 0;
    if (s1HasOpp && !s2HasOpp) {
      score -= 0.01; // Spouse 1 has better defined future opportunities
    } else if (s2HasOpp && !s1HasOpp) {
      score += 0.01; // Spouse 2 has better defined future opportunities
    }

    // Needs of Spouses (presence implies greater need)
    const s1HasNeeds = factors.needsSpouse1 && factors.needsSpouse1.length > 0;
    const s2HasNeeds = factors.needsSpouse2 && factors.needsSpouse2.length > 0;
    if (s1HasNeeds && !s2HasNeeds) {
      score += 0.02; // Spouse 1 has greater needs
    } else if (s2HasNeeds && !s1HasNeeds) {
      score -= 0.02; // Spouse 2 has greater needs
    }

    // Standard of Living (presence implies it's a factor, heuristic: person detailing it might be more concerned)
    if (factors.standardOfLiving && factors.standardOfLiving.length > 5) { // Check for some minimal content
      // This is a weak heuristic. A more sophisticated approach might be needed.
      // For now, a very small adjustment if standard of living is detailed.
      // Assuming detailed by S1, may indicate S1 anticipates a greater drop or wishes to preserve it.
      // score += 0.01; // Small nudge, potentially benefits spouse more concerned with maintaining it.
      // Decided to keep this neutral for now as it's too subjective without more context.
    }

    // Economic Circumstances at Divorce (presence implies notable circumstances for that spouse)
    const s1EcoCirc = factors.economicCircumstancesAtDivorceSpouse1 && factors.economicCircumstancesAtDivorceSpouse1.length > 0;
    const s2EcoCirc = factors.economicCircumstancesAtDivorceSpouse2 && factors.economicCircumstancesAtDivorceSpouse2.length > 0;
    if (s1EcoCirc && !s2EcoCirc) {
      score += 0.02; // Spouse 1 has specific economic circumstances highlighted (implies disadvantage)
    } else if (s2EcoCirc && !s1EcoCirc) {
      score -= 0.02; // Spouse 2 has specific economic circumstances highlighted
    }

    // Value of Separate Estates
    if (typeof factors.estateSpouse1 === 'number' && typeof factors.estateSpouse2 === 'number') {
      if (factors.estateSpouse1 > factors.estateSpouse2 * 2) { // S1 estate significantly larger
        score -= 0.02;
      } else if (factors.estateSpouse2 > factors.estateSpouse1 * 2) { // S2 estate significantly larger
        score += 0.02;
      }
    } else if (typeof factors.estateSpouse1 === 'number' && factors.estateSpouse1 > 0 && factors.estateSpouse2 === undefined) {
        score -= 0.01; // S1 has separate estate, S2 doesn't (or not specified)
    } else if (typeof factors.estateSpouse2 === 'number' && factors.estateSpouse2 > 0 && factors.estateSpouse1 === undefined) {
        score += 0.01; // S2 has separate estate, S1 doesn't (or not specified)
    }


    // Expense of Selling Assets (if significant, may push towards more balanced distribution)
    if (typeof factors.expenseOfSaleAssets === 'number' && factors.expenseOfSaleAssets > 0) {
      // If expenses are high, and score is skewed, nudge it slightly towards center.
      // Threshold for "high" expense could be absolute or relative to total assets.
      // For now, any positive value triggers a small adjustment.
      if (score > 0.55) {
        score -= 0.01;
      } else if (score < 0.45) {
        score += 0.01;
      }
    }

    // Station in Life (presence of details implies complexity or dependence for that spouse)
    const s1Station = factors.stationSpouse1 && factors.stationSpouse1.length > 0;
    const s2Station = factors.stationSpouse2 && factors.stationSpouse2.length > 0;
    if (s1Station && !s2Station) {
      score += 0.01; // S1's station described, S2's not - implies S1's might be more of a factor.
    } else if (s2Station && !s1Station) {
      score -= 0.01;
    }

    // Vocational Skills (presence of details implies specific skills or lack thereof being highlighted)
    const s1VocSkills = factors.vocationalSkillsSpouse1 && factors.vocationalSkillsSpouse1.length > 0;
    const s2VocSkills = factors.vocationalSkillsSpouse2 && factors.vocationalSkillsSpouse2.length > 0;
    if (s1VocSkills && !s2VocSkills) { // S1 details skills, S2 does not.
        // This is highly heuristic. Does detailing skills mean good skills or bad skills?
        // Assuming it's to highlight a point relevant to their case (e.g. S1 has outdated skills).
        // score += 0.01; // Tentatively give slight benefit to S1 if they detailed this.
        // Decided to keep this neutral for now as it's too subjective.
    } else if (s2VocSkills && !s1VocSkills) {
        // score -= 0.01;
    }
     // Sources of Income (presence of details implies other sources for that spouse)
    const s1SrcInc = factors.sourcesOfIncomeDetailsSpouse1 && factors.sourcesOfIncomeDetailsSpouse1.length > 0;
    const s2SrcInc = factors.sourcesOfIncomeDetailsSpouse2 && factors.sourcesOfIncomeDetailsSpouse2.length > 0;
    if (s1SrcInc && !s2SrcInc) { // S1 has other income sources detailed
        score -= 0.01;
    } else if (s2SrcInc && !s1SrcInc) { // S2 has other income sources detailed
        score += 0.01;
    }

  }
  
  // Ensure factor stays within reasonable bounds
  const clampedScore = Math.max(0.3, Math.min(0.7, score));
  // Round to avoid floating point precision issues
  return Math.round(clampedScore * 1000) / 1000;
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
  if (input.marriageInfo?.hasPrenup) confidence += 10;
  
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