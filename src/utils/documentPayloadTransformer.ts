import {
  CalculationInput,
  PropertyDivision,
  PersonalInfoFormData, // Assuming this type is exported from types/index.ts or form component
  Asset,
  Debt,
  AssetDivision,
  DebtDivision,
  PropertyDebtSummaryPayload,
  CaseInfoPayload,
  SummaryTotalsPayload,
  AssetLineItemPayload,
  DebtLineItemPayload,
  EqualizationPaymentPayload,
  USState, // For STATE_INFO
} from '@/types'; // Assuming PersonalInfoFormData is also in types/index.ts
import { STATE_INFO } from './states'; // For getting full state name
import { format } from 'date-fns'; // For date formatting

/**
 * Helper function to format dates consistently for the PDF payload.
 * @param date - The date to format (can be Date object, string, or null/undefined).
 * @returns Formatted date string (MM/DD/YYYY), "N/A" if no date, or "Invalid Date" on error.
 */
const formatDate = (date?: Date | string | null): string => {
  if (!date) return "N/A";
  try {
    // Attempt to parse the date, robustly handling potential string inputs
    return format(new Date(date), 'MM/dd/yyyy');
  } catch (e) {
    // Catch any errors from date parsing or formatting
    console.error("Error formatting date:", date, e);
    return "Invalid Date";
  }
};

/**
 * Helper function to retrieve and format spouse names.
 * This is currently a placeholder and assumes names are directly available in PersonalInfoFormData.
 * Future improvements might involve a more structured way to define Spouse 1 and Spouse 2.
 * @param personalInfo - The PersonalInfoFormData object.
 * @returns An object containing s1Name and s2Name.
 */
const getSpouseNames = (personalInfo: PersonalInfoFormData): { s1Name: string, s2Name: string } => {
    // Placeholder logic: Assumes the 'personalInfo' object is for Spouse 1,
    // and spouse's details are for Spouse 2.
    // Uses empty strings as fallbacks if names are not provided, then defaults to "Spouse 1/2".
    const s1 = `${personalInfo.firstName || ''} ${personalInfo.lastName || ''}`.trim();
    const s2 = `${personalInfo.spouseFirstName || ''} ${personalInfo.spouseLastName || ''}`.trim();
    return { s1Name: s1 || "Spouse 1", s2Name: s2 || "Spouse 2" };
};

/**
 * Transforms raw calculation input and property division results into a structured payload
 * suitable for generating the Property & Debt Division Summary PDF.
 *
 * @param personalInfo - Personal information of the spouses.
 * @param calculationInput - The original input used for the division calculation.
 * @param propertyDivision - The calculated division of assets and debts.
 * @returns A PropertyDebtSummaryPayload object.
 */
export function generatePropertyDebtSummaryPayload(
  personalInfo: PersonalInfoFormData,
  calculationInput: CalculationInput,
  propertyDivision: PropertyDivision,
): PropertyDebtSummaryPayload {

  // Retrieve spouse names and full jurisdiction name for the header.
  const { s1Name, s2Name } = getSpouseNames(personalInfo);
  const jurisdictionName = STATE_INFO[calculationInput.jurisdiction]?.name || calculationInput.jurisdiction;

  // --- Prepare Case Info (Section I of PDF) ---
  // Formats basic case details like names, jurisdiction, and key dates.
  const caseInfo: CaseInfoPayload = {
    spouse1FullName: s1Name,
    spouse2FullName: s2Name,
    jurisdiction: jurisdictionName,
    marriageDate: formatDate(calculationInput.marriageInfo.marriageDate),
    separationDate: formatDate(calculationInput.marriageInfo.separationDate),
  };

  // --- Calculate Summary Totals (Section II of PDF) ---
  // Aggregates values for community/marital and separate estates.
  // Some values are derived here for clarity, though they might also be available
  // directly or indirectly from `propertyDivision` depending on calculation engine's output structure.

  let totalCommAssetsVal = 0;
  let totalCommDebtsVal = 0;

  // Consolidate community/QCP assets to avoid double counting and sum their total values.
  // This loop iterates through assets awarded to Spouse 1.
  const communityAssetsForSummary: AssetLineItemPayload[] = [];
  propertyDivision.spouse1Assets.forEach(ad => {
      // Identifies assets treated as community or QCP based on their reasoning string.
      if (ad.reasoning.includes("Community property") || ad.reasoning.includes("QCP rules")) {
          // Simple check to prevent double-adding if an asset is listed for both spouses (e.g., 50/50 split).
          if (!communityAssetsForSummary.find(a => a.description === ad.description)) {
              totalCommAssetsVal += ad.totalValue;
              communityAssetsForSummary.push({
                  description: ad.description,
                  type: calculationInput.assets.find(a => a.id === ad.assetId)?.type, // Original asset type.
                  totalValue: ad.totalValue,
                  awardedToSpouse1: ad.spouse1Share,
                  awardedToSpouse2: ad.spouse2Share,
                  reasoning: ad.reasoning
              });
          }
      }
  });
   // Safeguard: Check Spouse 2's assets for any community/QCP items not captured above
   // (e.g., if an asset was 100% awarded to Spouse 2).
   propertyDivision.spouse2Assets.forEach(ad => {
      if (ad.reasoning.includes("Community property") || ad.reasoning.includes("QCP rules")) {
          if (!communityAssetsForSummary.find(a => a.description === ad.description)) {
              totalCommAssetsVal += ad.totalValue;
              communityAssetsForSummary.push({
                  description: ad.description,
                  type: calculationInput.assets.find(a => a.id === ad.assetId)?.type,
                  totalValue: ad.totalValue,
                  awardedToSpouse1: ad.spouse1Share,
                  awardedToSpouse2: ad.spouse2Share,
                  reasoning: ad.reasoning
              });
          }
      }
  });

  // Consolidate community debts similarly.
  const communityDebtsForSummary: DebtLineItemPayload[] = [];
  propertyDivision.spouse1Debts.forEach(dd => {
      if (dd.reasoning.includes("Community debt")) {
          if (!communityDebtsForSummary.find(d => d.description === dd.description)){
            totalCommDebtsVal += dd.totalBalance;
            communityDebtsForSummary.push({
                description: dd.description,
                creditor: calculationInput.debts.find(d => d.id === dd.debtId)?.creditorName, // Original creditor.
                type: calculationInput.debts.find(d => d.id === dd.debtId)?.type,             // Original debt type.
                totalBalance: dd.totalBalance,
                responsibilitySpouse1: dd.spouse1Responsibility,
                responsibilitySpouse2: dd.spouse2Responsibility,
                reasoning: dd.reasoning
            });
          }
      }
  });
  // Safeguard for community debts awarded 100% to Spouse 2.
  propertyDivision.spouse2Debts.forEach(dd => {
      if (dd.reasoning.includes("Community debt")) {
          if (!communityDebtsForSummary.find(d => d.description === dd.description)){
            totalCommDebtsVal += dd.totalBalance;
            communityDebtsForSummary.push({
                description: dd.description,
                creditor: calculationInput.debts.find(d => d.id === dd.debtId)?.creditorName,
                type: calculationInput.debts.find(d => d.id === dd.debtId)?.type,
                totalBalance: dd.totalBalance,
                responsibilitySpouse1: dd.spouse1Responsibility,
                responsibilitySpouse2: dd.spouse2Responsibility,
                reasoning: dd.reasoning
            });
          }
      }
  });

  const netCommEstateVal = totalCommAssetsVal - totalCommDebtsVal;

  // Placeholder/Derivation: Calculate each spouse's share of the net community estate.
  // Ideally, the `propertyDivision` object from the calculation engine would provide these
  // values directly if the division isn't a simple 50/50 split (e.g., in equitable distribution).
  // For now, this attempts to back-calculate from total awards minus separate net estates.
  // This specific calculation might need refinement based on the exact structure of `propertyDivision.totalSpouseXValue`.
  const s1NetSeparateEstateVal = propertyDivision.spouse1Assets.filter(a => a.reasoning.includes("Separate property of Spouse 1")).reduce((sum, a) => sum + a.spouse1Share, 0) -
                                 propertyDivision.spouse1Debts.filter(d => d.reasoning.includes("Separate debt of Spouse 1")).reduce((sum, d) => sum + d.spouse1Responsibility, 0);
  const s1ShareNetComm = propertyDivision.totalSpouse1Value - s1NetSeparateEstateVal;

  const s2NetSeparateEstateVal = propertyDivision.spouse2Assets.filter(a => a.reasoning.includes("Separate property of Spouse 2")).reduce((sum, a) => sum + a.spouse2Share, 0) -
                                 propertyDivision.spouse2Debts.filter(d => d.reasoning.includes("Separate debt of Spouse 2")).reduce((sum, d) => sum + d.spouse2Responsibility, 0);
  const s2ShareNetComm = propertyDivision.totalSpouse2Value - s2NetSeparateEstateVal;


  // Calculate total value of separate assets and debts for each spouse.
  const s1SeparateAssetsVal = propertyDivision.spouse1Assets
    .filter(ad => ad.reasoning.includes("Separate property of Spouse 1") && !ad.reasoning.includes("QCP rules")) // Exclude QCP already counted as community
    .reduce((sum, ad) => sum + ad.totalValue, 0);
  const s1SeparateDebtsVal = propertyDivision.spouse1Debts
    .filter(dd => dd.reasoning.includes("Separate debt of Spouse 1"))
    .reduce((sum, dd) => sum + dd.totalBalance, 0);

  const s2SeparateAssetsVal = propertyDivision.spouse2Assets
    .filter(ad => ad.reasoning.includes("Separate property of Spouse 2") && !ad.reasoning.includes("QCP rules")) // Exclude QCP
    .reduce((sum, ad) => sum + ad.totalValue, 0);
  const s2SeparateDebtsVal = propertyDivision.spouse2Debts
    .filter(dd => dd.reasoning.includes("Separate debt of Spouse 2"))
    .reduce((sum, dd) => sum + dd.totalBalance, 0);

  const summary: SummaryTotalsPayload = {
    totalCommunityAssetsValue: totalCommAssetsVal,
    totalCommunityDebtsValue: totalCommDebtsVal,
    netCommunityEstateValue: netCommEstateVal,
    spouse1ShareOfNetCommunity: s1ShareNetComm,
    spouse2ShareOfNetCommunity: s2ShareNetComm,
    spouse1SeparateAssetsValue: s1SeparateAssetsVal,
    spouse1SeparateDebtsValue: s1SeparateDebtsVal,
    spouse1NetSeparateEstate: s1SeparateAssetsVal - s1SeparateDebtsVal,
    spouse2SeparateAssetsValue: s2SeparateAssetsVal,
    spouse2SeparateDebtsValue: s2SeparateDebtsVal,
    spouse2NetSeparateEstate: s2SeparateAssetsVal - s2SeparateDebtsVal,
    totalNetAwardedToSpouse1: propertyDivision.totalSpouse1Value,
    totalNetAwardedToSpouse2: propertyDivision.totalSpouse2Value,
    // Construct equalization payment details if applicable.
    equalizationPayment: propertyDivision.equalizationPayment && propertyDivision.paymentFrom
      ? {
          amount: propertyDivision.equalizationPayment,
          fromSpouse: propertyDivision.paymentFrom === 'spouse1' ? s1Name : s2Name,
          toSpouse: propertyDivision.paymentFrom === 'spouse1' ? s2Name : s1Name,
        }
      : null,
  };

  // --- Prepare Itemized Lists (Sections III-VIII of PDF) ---
  // Map assets/debts from propertyDivision to AssetLineItemPayload/DebtLineItemPayload.

  // Spouse 1's Separate Assets (excluding QCP treated as community)
  const s1SeparateAssetsList: AssetLineItemPayload[] = propertyDivision.spouse1Assets
    .filter(ad => ad.reasoning.includes("Separate property of Spouse 1") && !ad.reasoning.includes("QCP rules"))
    .map(ad => ({
      description: ad.description,
      type: calculationInput.assets.find(a => a.id === ad.assetId)?.type, // Get original asset type.
      value: ad.totalValue, // For separate assets, 'value' field is used.
      reasoning: ad.reasoning,
    }));

  // Spouse 2's Separate Assets (excluding QCP treated as community)
  const s2SeparateAssetsList: AssetLineItemPayload[] = propertyDivision.spouse2Assets
    .filter(ad => ad.reasoning.includes("Separate property of Spouse 2") && !ad.reasoning.includes("QCP rules"))
    .map(ad => ({
      description: ad.description,
      type: calculationInput.assets.find(a => a.id === ad.assetId)?.type,
      value: ad.totalValue,
      reasoning: ad.reasoning,
    }));

  // Spouse 1's Separate Debts
  const s1SeparateDebtsList: DebtLineItemPayload[] = propertyDivision.spouse1Debts
    .filter(dd => dd.reasoning.includes("Separate debt of Spouse 1"))
    .map(dd => ({
      description: dd.description,
      creditor: calculationInput.debts.find(d => d.id === dd.debtId)?.creditorName,
      type: calculationInput.debts.find(d => d.id === dd.debtId)?.type,
      balance: dd.totalBalance, // For separate debts, 'balance' field is used.
      reasoning: dd.reasoning,
    }));

  // Spouse 2's Separate Debts
  const s2SeparateDebtsList: DebtLineItemPayload[] = propertyDivision.spouse2Debts
    .filter(dd => dd.reasoning.includes("Separate debt of Spouse 2"))
    .map(dd => ({
      description: dd.description,
      creditor: calculationInput.debts.find(d => d.id === dd.debtId)?.creditorName,
      type: calculationInput.debts.find(d => d.id === dd.debtId)?.type,
      balance: dd.totalBalance,
      reasoning: dd.reasoning,
    }));

  // Assemble the final payload.
  return {
    documentTitle: "Property & Debt Division Summary", // Static title.
    preparedDate: formatDate(new Date()), // Date of PDF generation.
    caseInfo,
    summary,
    communityAssets: communityAssetsForSummary,
    communityDebts: communityDebtsForSummary,
    spouse1SeparateAssets: s1SeparateAssetsList,
    spouse1SeparateDebts: s1SeparateDebtsList,
    spouse2SeparateAssets: s2SeparateAssetsList,
    spouse2SeparateDebts: s2SeparateDebtsList,
    // Static disclaimer text.
    disclaimers: [
      "This summary is based on information provided by the users and calculations performed by EquiSplit.",
      "It is for informational and discussion purposes only and does not constitute legal advice.",
      "All values are estimates unless otherwise specified.",
      "Users should consult with a qualified legal professional in their jurisdiction for advice tailored to their specific situation."
    ],
  };
}
