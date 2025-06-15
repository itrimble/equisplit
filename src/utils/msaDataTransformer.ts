import {
  PersonalInfoFormData,
  CalculationInput,
  PropertyDivision,
  PropertyDebtSummaryPayload,
  // Asset, // Not directly used from CalculationInput for lists
  // Debt,  // Not directly used from CalculationInput for lists
  // AssetDivision, // Not directly used
  // DebtDivision,  // Not directly used
  USState,
  AssetLineItemPayload, // Used from PropertyDebtSummaryPayload
  DebtLineItemPayload   // Used from PropertyDebtSummaryPayload
} from '@/types';
import { getStateName } from '@/utils/states';

export interface MsaTemplateData {
  spouse1_name: string;
  spouse2_name: string;
  spouse1_address_placeholder: string;
  spouse2_address_placeholder: string;
  marriage_date: string;
  separation_date: string;
  jurisdiction_state: string;
  marital_assets_s1: { description: string; value_s1: number | string }[]; // value can be formatted string
  marital_assets_s2: { description: string; value_s2: number | string }[]; // value can be formatted string
  separate_assets_s1: { description: string; value: number | string }[];    // value can be formatted string
  separate_assets_s2: { description: string; value: number | string }[];    // value can be formatted string
  marital_debts_s1: { description: string; balance_s1: number | string }[]; // balance can be formatted string
  marital_debts_s2: { description: string; balance_s2: number | string }[]; // balance can be formatted string
  separate_debts_s1: { description: string; balance: number | string }[];   // balance can be formatted string
  separate_debts_s2: { description: string; balance: number | string }[];   // balance can be formatted string
  spousal_support_details: string;
  child_support_custody_details: string;
  // Add any other fields that might be directly available or derived
  equalization_payment_details?: string;
}

const formatDate = (date: Date | string | undefined): string => {
  if (!date) return 'N/A';
  try {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (e) {
    return 'Invalid Date';
  }
};

const formatCurrency = (value: number | undefined): string => {
  if (value === undefined || value === null) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};


export function prepareMsaTemplateData(
  // personalInfo: PersonalInfoFormData, // Contained within summaryPayload.caseInfo
  calculationInput: CalculationInput,
  propertyDivisionResult: PropertyDivision,
  summaryPayload: PropertyDebtSummaryPayload
): MsaTemplateData {
  const s1Name = summaryPayload.caseInfo.spouse1FullName || 'Spouse 1';
  const s2Name = summaryPayload.caseInfo.spouse2FullName || 'Spouse 2';

  const marital_assets_s1 = summaryPayload.communityAssets
    .filter(a => (a.awardedToSpouse1 ?? 0) > 0)
    .map(a => ({
      description: a.description,
      value_s1: formatCurrency(a.awardedToSpouse1),
    }));

  const marital_assets_s2 = summaryPayload.communityAssets
    .filter(a => (a.awardedToSpouse2 ?? 0) > 0)
    .map(a => ({
      description: a.description,
      value_s2: formatCurrency(a.awardedToSpouse2),
    }));

  const separate_assets_s1 = summaryPayload.spouse1SeparateAssets.map(a => ({
    description: a.description,
    value: formatCurrency(a.value),
  }));

  const separate_assets_s2 = summaryPayload.spouse2SeparateAssets.map(a => ({
    description: a.description,
    value: formatCurrency(a.value),
  }));

  const marital_debts_s1 = summaryPayload.communityDebts
    .filter(d => (d.responsibilitySpouse1 ?? 0) > 0)
    .map(d => ({
      description: d.description,
      balance_s1: formatCurrency(d.responsibilitySpouse1),
    }));

  const marital_debts_s2 = summaryPayload.communityDebts
    .filter(d => (d.responsibilitySpouse2 ?? 0) > 0)
    .map(d => ({
      description: d.description,
      balance_s2: formatCurrency(d.responsibilitySpouse2),
    }));

  const separate_debts_s1 = summaryPayload.spouse1SeparateDebts.map(d => ({
    description: d.description,
    balance: formatCurrency(d.balance),
  }));

  const separate_debts_s2 = summaryPayload.spouse2SeparateDebts.map(d => ({
    description: d.description,
    balance: formatCurrency(d.balance),
  }));

  let equalization_payment_details_text = "";
  if (propertyDivisionResult.equalizationPayment && propertyDivisionResult.equalizationPayment > 0 && propertyDivisionResult.paymentFrom) {
    const payer = propertyDivisionResult.paymentFrom === 'spouse1' ? s1Name : s2Name;
    const payee = propertyDivisionResult.paymentFrom === 'spouse1' ? s2Name : s1Name;
    equalization_payment_details_text = `To equalize the division of marital property, ${payer} shall pay to ${payee} the sum of ${formatCurrency(propertyDivisionResult.equalizationPayment)}. This payment shall be made [within X days of the execution of this Agreement / upon sale of Y asset / etc. - SPECIFY TERMS].`;
  }


  return {
    spouse1_name: s1Name,
    spouse2_name: s2Name,
    spouse1_address_placeholder: "[Spouse 1 Address - To be completed by user/counsel]",
    spouse2_address_placeholder: "[Spouse 2 Address - To be completed by user/counsel]",
    marriage_date: formatDate(calculationInput.marriageInfo.marriageDate),
    separation_date: formatDate(calculationInput.marriageInfo.separationDate),
    jurisdiction_state: getStateName(calculationInput.jurisdiction as USState), // Cast as USState, should be validated upstream

    marital_assets_s1,
    marital_assets_s2,
    separate_assets_s1,
    separate_assets_s2,
    marital_debts_s1,
    marital_debts_s2,
    separate_debts_s1,
    separate_debts_s2,

    spousal_support_details: "[Details regarding spousal support, if any, are to be specified by the parties or their legal counsel. This calculation provides a property division summary only and does not determine spousal support obligations.]",
    child_support_custody_details: "[Details regarding child custody, visitation, and support are to be specified by the parties or their legal counsel. This calculator does not currently process detailed child-related information. Any child support obligations are separate from this property division.]",
    equalization_payment_details: equalization_payment_details_text || undefined, // Add to template if needed, e.g. {{#equalization_payment_details}}{{equalization_payment_details}}{{/equalization_payment_details}}
  };
}
