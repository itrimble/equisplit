'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // Used for potential redirects or query params
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { CalculationInput, PropertyDivision, PersonalInfoFormData, PropertyDebtSummaryPayload, Asset, Debt, StepFormData, MarriageInfo, USState, EquitableDistributionFactors } from '@/types';
import { calculatePropertyDivision, calculateConfidenceLevel } from '@/utils/calculations';
import { generatePropertyDebtSummaryPayload } from '@/utils/documentPayloadTransformer';
import { prepareMsaTemplateData } from '@/utils/msaDataTransformer'; // Added MSA data transformer
import { getStateInfo, isCommunityPropertyState } from '@/utils/states';
import { validateTemplateFile, getTemplateErrorMessage, TEMPLATE_REGISTRY } from '@/utils/template-validator';
import { useMultiStepForm } from '@/hooks/useMultiStepForm';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';

const STORAGE_KEY = 'equisplit-calculator-v1';

export default function ResultsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaryPayload, setSummaryPayload] = useState<PropertyDebtSummaryPayload | null>(null);
  const [propertyDivisionResult, setPropertyDivisionResult] = useState<PropertyDivision | null>(null);
  const [calculationInputForDisplay, setCalculationInputForDisplay] = useState<CalculationInput | null>(null);
  const [confidenceLevel, setConfidenceLevel] = useState<number | null>(null);
  const [isGeneratingMsa, setIsGeneratingMsa] = useState(false); // State for MSA generation loading

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (!savedData) {
        setError("No calculation data found. Please complete the calculator first.");
        // Optional: Redirect to calculator start
        // router.push('/calculator');
        setIsLoading(false);
        return;
      }

      const parsedSavedData = JSON.parse(savedData);
      const steps = parsedSavedData.steps as StepFormData[];

      // Reconstruct PersonalInfo (assuming it's primarily from step 1)
      // This is a simplified reconstruction. A more robust approach might involve
      // dedicated logic or ensuring form steps store data with clear keys.
      const personalInfoStepData = steps.find(s => s.step === 1)?.data || {};
      const personalInfo: PersonalInfoFormData = {
        firstName: personalInfoStepData.firstName || "Spouse 1",
        lastName: personalInfoStepData.lastName || "",
        spouseFirstName: personalInfoStepData.spouseFirstName || "Spouse 2",
        spouseLastName: personalInfoStepData.spouseLastName || "",
        spouseDateOfBirth: personalInfoStepData.spouseDateOfBirth || new Date(),
        // Add other PersonalInfoForm fields if they are needed by getSpouseNames
        // For now, names are the most critical for the payload.
        // The rest of PersonalInfoForm isn't directly used by generatePropertyDebtSummaryPayload
        // apart from what's already in CalculationInput.marriageInfo.
        email: personalInfoStepData.email || "",
        dateOfBirth: personalInfoStepData.dateOfBirth || new Date(),
        jurisdiction: personalInfoStepData.jurisdiction || 'CA',
        marriageDate: personalInfoStepData.marriageDate || new Date(),
        separationDate: personalInfoStepData.separationDate,
        currentStatus: personalInfoStepData.currentStatus || 'separated'
      };

      // Reconstruct CalculationInput
      const assets: Asset[] = [];
      const realEstateData = steps.find(s => s.step === 2)?.data.realEstateProperties || [];
      realEstateData.forEach((p: any) => assets.push({ ...p, type: 'real_estate', id: p.id || crypto.randomUUID() } as Asset));

      const financialAccountsData = steps.find(s => s.step === 3)?.data.financialAccounts || [];
      financialAccountsData.forEach((acc: any) => assets.push({ ...acc, type: acc.accountType, id: acc.id || crypto.randomUUID() } as Asset)); // Map acc.accountType to AssetType if needed

      const personalPropertyData = steps.find(s => s.step === 4)?.data.personalProperties || [];
      personalPropertyData.forEach((p: any) => assets.push({ ...p, type: p.itemCategory === 'vehicle' ? 'vehicle' : 'personal_property', id: p.id || crypto.randomUUID() } as Asset));

      const debtsInput: Debt[] = [];
      const debtsData = steps.find(s => s.step === 5)?.data.debts || [];
      debtsData.forEach((d: any) => debtsInput.push({ ...d, type: d.debtType, id: d.id || crypto.randomUUID() } as Debt)); // Map d.debtType to DebtType

      const marriageInfoData = steps.find(s => s.step === 1)?.data || {};
      const marriageInfo: MarriageInfo = {
        marriageDate: new Date(marriageInfoData.marriageDate),
        separationDate: marriageInfoData.separationDate ? new Date(marriageInfoData.separationDate) : undefined,
        jurisdiction: marriageInfoData.jurisdiction as USState,
        propertyRegime: 'community', // This should be determined dynamically based on state
        hasPrenup: steps.find(s => s.step === 6)?.data.hasPrenup || false,
        specialCircumstances: [], // Placeholder
      };

      const specialFactorsData = steps.find(s => s.step === 6)?.data || {};
      const specialFactors: EquitableDistributionFactors = {
          // Existing general factors
          marriageDuration: typeof specialFactorsData.marriageDurationYears === 'number'
                            ? specialFactorsData.marriageDurationYears
                            : (specialFactorsData.marriageDurationYears ? parseFloat(specialFactorsData.marriageDurationYears) : 0), // Ensure it's a number, default 0
          ageSpouse1: 0, // Placeholder - Data not from Step 6
          ageSpouse2: 0, // Placeholder - Data not from Step 6
          healthSpouse1: specialFactorsData.healthSpouse1 || 'not_applicable',
          healthSpouse2: specialFactorsData.healthSpouse2 || 'not_applicable',
          incomeSpouse1: 0, // Placeholder - Data not from Step 6
          incomeSpouse2: 0, // Placeholder - Data not from Step 6
          earnCapacitySpouse1: 0, // Placeholder - Data not from Step 6
          earnCapacitySpouse2: 0, // Placeholder - Data not from Step 6
          contributionToMarriage: `${specialFactorsData.contributionDetailsSpouse1 || ''} ${specialFactorsData.contributionDetailsSpouse2 || ''}`.trim(), // General contributions
          custodyArrangement: specialFactorsData.custodyArrangement || undefined, // Assuming form might have this, though not explicitly added in PA task
          domesticViolence: specialFactorsData.domesticViolence || false,
          wastingOfAssets: specialFactorsData.wastingOfAssets || false,
          taxConsequences: specialFactorsData.significantTaxConsequences || false, // Maps from form's 'significantTaxConsequences'

          // New PA specific factors (ensure keys match those in specialCircumstancesSchema)
          priorMarriageSpouse1: specialFactorsData.priorMarriageSpouse1 || false,
          priorMarriageSpouse2: specialFactorsData.priorMarriageSpouse2 || false,
          stationSpouse1: specialFactorsData.stationSpouse1 || undefined,
          stationSpouse2: specialFactorsData.stationSpouse2 || undefined,
          vocationalSkillsSpouse1: specialFactorsData.vocationalSkillsSpouse1 || undefined,
          vocationalSkillsSpouse2: specialFactorsData.vocationalSkillsSpouse2 || undefined,

          // Numeric PA fields - Zod schema in form step should ensure these are numbers or undefined
          estateSpouse1: specialFactorsData.estateSpouse1, // Should be number or undefined
          estateSpouse2: specialFactorsData.estateSpouse2, // Should be number or undefined

          needsSpouse1: specialFactorsData.needsSpouse1 || undefined,
          needsSpouse2: specialFactorsData.needsSpouse2 || undefined,
          contributionToEducationTrainingSpouse1: specialFactorsData.contributionToEducationTrainingSpouse1 || false,
          contributionToEducationTrainingSpouse2: specialFactorsData.contributionToEducationTrainingSpouse2 || false,
          opportunityFutureAcquisitionsSpouse1: specialFactorsData.opportunityFutureAcquisitionsSpouse1 || undefined,
          opportunityFutureAcquisitionsSpouse2: specialFactorsData.opportunityFutureAcquisitionsSpouse2 || undefined,
          sourcesOfIncomeDetailsSpouse1: specialFactorsData.sourcesOfIncomeDetailsSpouse1 || undefined,
          sourcesOfIncomeDetailsSpouse2: specialFactorsData.sourcesOfIncomeDetailsSpouse2 || undefined,
          standardOfLiving: specialFactorsData.standardOfLiving || undefined,
          economicCircumstancesAtDivorceSpouse1: specialFactorsData.economicCircumstancesAtDivorceSpouse1 || undefined,
          economicCircumstancesAtDivorceSpouse2: specialFactorsData.economicCircumstancesAtDivorceSpouse2 || undefined,

          expenseOfSaleAssets: specialFactorsData.expenseOfSaleAssets, // Should be number or undefined
      };


      const calculationInput: CalculationInput = {
        jurisdiction: marriageInfo.jurisdiction,
        propertyRegime: marriageInfo.propertyRegime, // Needs to be set correctly
        marriageInfo,
        assets,
        debts: debtsInput,
        specialFactors: Object.keys(specialFactorsData).length > 0 ? specialFactors : undefined,
      };

      // Determine propertyRegime based on jurisdiction for CalculationInput
      // This logic should ideally live within a utility or be part of useMultiStepForm's data prep
      // Dynamic import used here to avoid potential server/client component issues with direct import in page
      import('@/utils/states').then(({ isCommunityPropertyState }) => {
        if (isCommunityPropertyState(calculationInput.jurisdiction)) {
            calculationInput.propertyRegime = 'community';
        } else {
            calculationInput.propertyRegime = 'equitable';
        }

        const divisionResult = calculatePropertyDivision(calculationInput);
        setPropertyDivisionResult(divisionResult);

        const payload = generatePropertyDebtSummaryPayload(personalInfo, calculationInput, divisionResult);
        const calculatedConfidence = calculateConfidenceLevel(calculationInput);

        setSummaryPayload(payload);
        setCalculationInputForDisplay(calculationInput);
        setConfidenceLevel(calculatedConfidence);
        setIsLoading(false);
      }).catch(e => {
        console.error("Error dynamically importing states utility:", e);
        setError(`Failed to load state information: ${e.message}`);
        setIsLoading(false);
      });

    } catch (e: any) {
      console.error("Error processing results:", e);
      setError(`Failed to process calculation results: ${e.message}`);
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const handleGenerateMsaDocx = async () => {
    if (!calculationInputForDisplay || !propertyDivisionResult || !summaryPayload) {
      alert("Data not ready for MSA generation. Please wait or try refreshing.");
      return;
    }
    
    setIsGeneratingMsa(true);
    try {
      // Validate template file before attempting to use it
      const templateConfig = TEMPLATE_REGISTRY.msa;
      const validationResult = await validateTemplateFile(templateConfig.path);
      
      if (!validationResult.exists || !validationResult.accessible) {
        const errorMessage = getTemplateErrorMessage('msa', validationResult);
        throw new Error(errorMessage);
      }

      const msaData = prepareMsaTemplateData(
        calculationInputForDisplay,
        propertyDivisionResult,
        summaryPayload
      );

      const response = await fetch('/templates/msa_template.docx');
      if (!response.ok) {
        throw new Error(`Failed to fetch MSA template. Status: ${response.status}. The template file may be missing or corrupted. Please contact support.`);
      }
      
      const templateArrayBuffer = await response.arrayBuffer();

      // Validate template content size
      if (templateArrayBuffer.byteLength < 1024) {
        throw new Error('The MSA template file appears to be corrupted or empty. Please contact support.');
      }

      const zip = new PizZip(templateArrayBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => "", // Return empty string for null/undefined values in simple placeholders
        errorLogging: process.env.NODE_ENV === 'development' // Enable error logging in development
      });

      doc.setData(msaData);
      doc.render();

      const outputBlob = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      saveAs(outputBlob, 'EquiSplit_MSA_Draft.docx');

    } catch (error: any) {
      console.error("Error generating MSA DOCX:", error);
      
      // Provide more user-friendly error messages
      let userMessage = 'Failed to generate MSA document. ';
      if (error.message.includes('template')) {
        userMessage += 'There was an issue with the document template. Please contact support.';
      } else if (error.message.includes('fetch')) {
        userMessage += 'There was a network error. Please check your connection and try again.';
      } else if (error.message.includes('render') || error.message.includes('docxtemplater')) {
        userMessage += 'There was an error processing your data. Please verify your inputs and try again.';
      } else {
        userMessage += error.message || 'An unexpected error occurred. Please try again or contact support.';
      }
      
      alert(userMessage);
    } finally {
      setIsGeneratingMsa(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!summaryPayload) {
      alert("No summary data available to generate PDF.");
      return;
    }

    const doc = new jsPDF({
      orientation: 'p', // portrait
      unit: 'pt',       // points
      format: 'a4'
    });

    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    const margin = 40; // Page margin in points
    let currentY = margin;

    // Names for table headers and text
    const s1Name = summaryPayload.caseInfo.spouse1FullName || "Spouse 1";
    const s2Name = summaryPayload.caseInfo.spouse2FullName || "Spouse 2";

    // Helper for adding text and advancing Y, with page break check
    const addTextAndAdvanceY = (text: string | string[], x: number, options: any = {}, yOffset: number = 0) => {
      const fontSize = options.fontSize || 10;
      const fontStyle = options.fontStyle || "normal";
      doc.setFont("helvetica", fontStyle);
      doc.setFontSize(fontSize);

      const textBlockHeight = (Array.isArray(text) ? text.length : 1) * fontSize * 0.7 + yOffset; // Approximate height with leading
      if (currentY + textBlockHeight > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
      }
      doc.text(text, x, currentY + yOffset, options);
      currentY += textBlockHeight;
    };

    // Helper for ensuring space before next element
    const ensureSpace = (spaceNeeded: number) => {
        if (currentY + spaceNeeded > pageHeight - margin) {
            doc.addPage();
            currentY = margin;
        } else {
            currentY += spaceNeeded;
        }
    };


    // ==== Document Title ====
    addTextAndAdvanceY(summaryPayload.documentTitle, pageWidth / 2, { align: 'center', fontSize: 20, fontStyle: 'bold' }, 0);
    ensureSpace(15);

    // ==== Case Information ====
    addTextAndAdvanceY("Case Information", margin, { fontSize: 14, fontStyle: 'bold' });
    ensureSpace(5);
    doc.setFontSize(10); // Set for subsequent lines
    doc.setFont("helvetica", "normal");
    addTextAndAdvanceY(`Prepared for: ${s1Name} & ${s2Name}`, margin, {fontSize: 10});
    addTextAndAdvanceY(`Jurisdiction: ${summaryPayload.caseInfo.jurisdiction}`, margin, {fontSize: 10});
    addTextAndAdvanceY(`Date of Marriage: ${summaryPayload.caseInfo.marriageDate}`, margin, {fontSize: 10});
    addTextAndAdvanceY(`Date of Separation: ${summaryPayload.caseInfo.separationDate}`, margin, {fontSize: 10});
    addTextAndAdvanceY(`Date Prepared: ${summaryPayload.preparedDate}`, margin, {fontSize: 10});
    ensureSpace(15);

    // ==== Summary of Overall Division ====
    addTextAndAdvanceY("Summary of Overall Division", margin, { fontSize: 14, fontStyle: 'bold' });
    ensureSpace(5);
    const s = summaryPayload.summary;
    const currencyFormat = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

    const summaryItems = [
      { label: "Total Community Assets:", value: currencyFormat(s.totalCommunityAssetsValue) },
      { label: "Total Community Debts:", value: currencyFormat(s.totalCommunityDebtsValue) },
      { label: "Net Community Estate:", value: currencyFormat(s.netCommunityEstateValue), bold: true },
      { label: `  ${s1Name}'s Share:`, value: currencyFormat(s.spouse1ShareOfNetCommunity), indent: true },
      { label: `  ${s2Name}'s Share:`, value: currencyFormat(s.spouse2ShareOfNetCommunity), indent: true },
      null, // Spacer
      { label: `${s1Name}'s Net Separate Estate:`, value: currencyFormat(s.spouse1NetSeparateEstate) },
      { label: `${s2Name}'s Net Separate Estate:`, value: currencyFormat(s.spouse2NetSeparateEstate) },
      null, // Spacer
      { label: `Total Net Awarded to ${s1Name}:`, value: currencyFormat(s.totalNetAwardedToSpouse1), bold: true },
      { label: `Total Net Awarded to ${s2Name}:`, value: currencyFormat(s.totalNetAwardedToSpouse2), bold: true },
    ];
    if (s.equalizationPayment && s.equalizationPayment.amount !== 0) {
      summaryItems.push(null);
      summaryItems.push({ label: "Equalization Payment:", value: `${currencyFormat(s.equalizationPayment.amount)} from ${s.equalizationPayment.fromSpouse} to ${s.equalizationPayment.toSpouse}`, bold: true });
    }

    summaryItems.forEach(item => {
      if (item === null) {
        ensureSpace(3); return;
      }
      const xPos = item.indent ? margin + 10 : margin;
      doc.setFont("helvetica", item.bold ? "bold" : "normal");
      addTextAndAdvanceY(`${item.label}`, xPos, {fontSize: 10});
      addTextAndAdvanceY(item.value, margin + 150 > pageWidth - margin - 50 ? pageWidth - margin - 50 : margin + 150 , {fontSize: 10, align: "left"}, -((10 * 0.7) + 2)); // Place value on same line, then advance Y
    });
    ensureSpace(15);

    // ==== Tables ====
    const tableStyles = { fontSize: 9, cellPadding: 2.5, lineColor: [200, 200, 200] as [number, number, number], lineWidth: 0.5 };
    const headStyles = { fillColor: [22, 160, 133] as [number, number, number], textColor: 255, fontStyle: 'bold' as const, halign: 'center' as const, fontSize: 10, cellPadding: 3 };
    const bodyStyles = { textColor: 50, fontSize: 9 };
    const alternateRowStyles = { fillColor: [240, 240, 240] as [number, number, number] };

    const addTableToPdf = (title: string, head: any[], body: any[][], columnStyles: any = {}) => {
        const estBodyHeight = body.length * (tableStyles.fontSize + tableStyles.cellPadding * 2);
        const estTitleHeight = 16 + 5; // title font size + space
        const estHeaderHeight = (headStyles.fontSize || tableStyles.fontSize) + (headStyles.cellPadding || tableStyles.cellPadding) * 2 + 5;
        if (currentY + estTitleHeight + estHeaderHeight + estBodyHeight > pageHeight - margin) {
            doc.addPage();
            currentY = margin;
        }

        addTextAndAdvanceY(title, margin, { fontSize: 14, fontStyle: 'bold' });
        ensureSpace(2); // Small space before table
        autoTable(doc, {
            head, body, startY: currentY,
            margin: { left: margin, right: margin },
            styles: tableStyles, headStyles, bodyStyles, alternateRowStyles,
            columnStyles: columnStyles,
            didDrawPage: (data) => { // Handle page breaks within autoTable
                currentY = margin; // Reset Y for new page header if autoTable adds one
            }
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;
    };

    const commonCurrencyStyle = { halign: 'right' };
    const descriptionColStyle = { cellWidth: 'auto' }; // auto or number
    const reasoningColStyle = { cellWidth: 100 }; // example fixed width

    if (summaryPayload.communityAssets.length > 0) {
        addTableToPdf("Division of Community/Marital Assets",
        [["Description", "Type", "Total Value", `Awarded to ${s1Name}`, `Awarded to ${s2Name}`, "Reasoning"]],
        summaryPayload.communityAssets.map(a => [
            a.description, a.type || '-',
            currencyFormat(a.totalValue),
            currencyFormat(a.awardedToSpouse1 || 0),
            currencyFormat(a.awardedToSpouse2 || 0),
            a.reasoning || '-'
        ]),
        { 0: descriptionColStyle, 2: commonCurrencyStyle, 3: commonCurrencyStyle, 4: commonCurrencyStyle, 5: reasoningColStyle }
        );
    }

    if (summaryPayload.communityDebts.length > 0) {
        addTableToPdf("Allocation of Community/Marital Debts",
        [["Description", "Creditor", "Type", "Total Balance", `Resp. for ${s1Name}`, `Resp. for ${s2Name}`, "Reasoning"]],
        summaryPayload.communityDebts.map(d => [
            d.description, d.creditor || '-', d.type || '-',
            currencyFormat(d.totalBalance),
            currencyFormat(d.responsibilitySpouse1 || 0),
            currencyFormat(d.responsibilitySpouse2 || 0),
            d.reasoning || '-'
        ]),
        { 0: descriptionColStyle, 3: commonCurrencyStyle, 4: commonCurrencyStyle, 5: commonCurrencyStyle, 6: reasoningColStyle }
        );
    }

    // Separate Property tables
    const separateAssetCols = [["Description", "Type", "Value", "Reasoning"]];
    const separateAssetColStyles = { 0: descriptionColStyle, 2: commonCurrencyStyle, 3: reasoningColStyle};
    if (summaryPayload.spouse1SeparateAssets.length > 0) {
        addTableToPdf(`${s1Name}'s Separate Assets`, separateAssetCols,
        summaryPayload.spouse1SeparateAssets.map(a => [a.description, a.type || '-', currencyFormat(a.value || 0), a.reasoning || '-']),
        separateAssetColStyles);
    }
    if (summaryPayload.spouse2SeparateAssets.length > 0) {
        addTableToPdf(`${s2Name}'s Separate Assets`, separateAssetCols,
        summaryPayload.spouse2SeparateAssets.map(a => [a.description, a.type || '-', currencyFormat(a.value || 0), a.reasoning || '-']),
        separateAssetColStyles);
    }

    const separateDebtCols = [["Description", "Creditor", "Type", "Balance", "Reasoning"]];
    const separateDebtColStyles = {0: descriptionColStyle, 3: commonCurrencyStyle, 4: reasoningColStyle};
    if (summaryPayload.spouse1SeparateDebts.length > 0) {
        addTableToPdf(`${s1Name}'s Separate Debts`, separateDebtCols,
        summaryPayload.spouse1SeparateDebts.map(d => [d.description, d.creditor || '-', d.type || '-', currencyFormat(d.balance || 0), d.reasoning || '-']),
        separateDebtColStyles);
    }
     if (summaryPayload.spouse2SeparateDebts.length > 0) {
        addTableToPdf(`${s2Name}'s Separate Debts`, separateDebtCols,
        summaryPayload.spouse2SeparateDebts.map(d => [d.description, d.creditor || '-', d.type || '', currencyFormat(d.balance || 0), d.reasoning || '-']),
        separateDebtColStyles);
    }

    // ==== Disclaimers ====
    ensureSpace(15);
    addTextAndAdvanceY("Disclaimers:", margin, { fontSize: 12, fontStyle: 'bold' }); // Title for disclaimers
    ensureSpace(3);
    doc.setFont("helvetica", "normal"); // Ensure disclaimer text is normal
    summaryPayload.disclaimers.forEach(disc => {
      const splitLines = doc.splitTextToSize(disc, pageWidth - (margin * 2));
      addTextAndAdvanceY(splitLines, margin, { fontSize: 8 }); // Smaller font for disclaimers
    });

    doc.save("EquiSplit_Property_Debt_Summary.pdf");
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          <p className="ml-4 text-lg">Loading results...</p>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8 text-center">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-red-600">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error}</p>
              <Button onClick={() => router.push('/calculator')} className="mt-4">
                Back to Calculator
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (!summaryPayload || !propertyDivisionResult) {
     return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8 text-center">
           <p>No summary data or division results available.</p>
            <Button onClick={() => router.push('/calculator')} className="mt-4">
                Back to Calculator
            </Button>
        </div>
      </MainLayout>
    );
  }

  // Basic display of results (can be expanded)
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Calculation Results Summary</CardTitle>
            <CardDescription>This is a summary of your property division based on the data you provided.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">Overall Net Worth Division:</h3>
              <p>Spouse 1 ({summaryPayload.caseInfo.spouse1FullName}) Total Net Value: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(propertyDivisionResult.totalSpouse1Value)}</p>
              <p>Spouse 2 ({summaryPayload.caseInfo.spouse2FullName}) Total Net Value: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(propertyDivisionResult.totalSpouse2Value)}</p>
              {propertyDivisionResult.equalizationPayment && propertyDivisionResult.paymentFrom && (
                <p className="mt-2 font-semibold text-blue-600">
                  Equalization Payment: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(propertyDivisionResult.equalizationPayment)} from {propertyDivisionResult.paymentFrom === 'spouse1' ? summaryPayload.caseInfo.spouse1FullName : summaryPayload.caseInfo.spouse2FullName} to {propertyDivisionResult.paymentFrom === 'spouse1' ? summaryPayload.caseInfo.spouse2FullName : summaryPayload.caseInfo.spouse1FullName}.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-4">
              <Button onClick={handleDownloadPdf} size="lg" disabled={isGeneratingMsa}>
                Download PDF Summary
              </Button>
              <Button
                onClick={handleGenerateMsaDocx}
                size="lg"
                variant="outline"
                disabled={isGeneratingMsa || !calculationInputForDisplay || !propertyDivisionResult || !summaryPayload}
              >
                {isGeneratingMsa ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Generate MSA Draft (DOCX)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* --- Overall Financial Summary Cards --- */}
        {summaryPayload && propertyDivisionResult && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-6 text-gray-700">Overall Financial Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Spouse 1 Net Value */}
              <Card>
              <CardHeader>
                <CardTitle className="text-lg text-blue-700">{summaryPayload.caseInfo.spouse1FullName || 'Spouse 1'}'s Total Net Value</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(propertyDivisionResult.totalSpouse1Value)}
                </p>
              </CardContent>
            </Card>

            {/* Spouse 2 Net Value */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-blue-700">{summaryPayload.caseInfo.spouse2FullName || 'Spouse 2'}'s Total Net Value</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(propertyDivisionResult.totalSpouse2Value)}
                </p>
              </CardContent>
            </Card>

            {/* Total Marital Assets */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-gray-700">Total Marital Assets Value</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(summaryPayload.summary.totalCommunityAssetsValue)}
                </p>
                <CardDescription className="text-xs">(Note: Represents total assets subject to division based on input)</CardDescription>
              </CardContent>
            </Card>

            {/* Total Marital Debts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-gray-700">Total Marital Debts Value</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(summaryPayload.summary.totalCommunityDebtsValue)}
                </p>
                <CardDescription className="text-xs">(Note: Represents total debts subject to division based on input)</CardDescription>
              </CardContent>
            </Card>

            {/* Net Marital Estate */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-gray-700">Net Marital Estate Value</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(summaryPayload.summary.netCommunityEstateValue)}
                </p>
              </CardContent>
            </Card>

            {/* Equalization Payment */}
            {propertyDivisionResult.equalizationPayment && propertyDivisionResult.equalizationPayment > 0 && propertyDivisionResult.paymentFrom && (
              <Card className="lg:col-span-1"> {/* Allow it to span if fewer than 3 items in last row for larger screens */}
                <CardHeader>
                  <CardTitle className="text-lg text-green-700">Equalization Payment</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-semibold">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(propertyDivisionResult.equalizationPayment)}
                  </p>
                  <p className="text-sm">
                    From: {propertyDivisionResult.paymentFrom === 'spouse1' ? summaryPayload.caseInfo.spouse1FullName : summaryPayload.caseInfo.spouse2FullName}
                  </p>
                  <p className="text-sm">
                    To: {propertyDivisionResult.paymentFrom === 'spouse1' ? summaryPayload.caseInfo.spouse2FullName : summaryPayload.caseInfo.spouse1FullName}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        )}

        {/* --- Visual Summary Charts --- */}
        {summaryPayload && propertyDivisionResult && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-6 text-gray-700">Visual Summary</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

              {/* Marital Asset Division Pie Chart */}
              {(() => {
                const s1Name = summaryPayload.caseInfo.spouse1FullName || "Spouse 1";
                const s2Name = summaryPayload.caseInfo.spouse2FullName || "Spouse 2";
                let s1MaritalAssetTotal = 0;
                let s2MaritalAssetTotal = 0;

                summaryPayload.communityAssets.forEach(asset => {
                  s1MaritalAssetTotal += asset.awardedToSpouse1 || 0;
                  s2MaritalAssetTotal += asset.awardedToSpouse2 || 0;
                });

                const totalMaritalAssetsForChart = s1MaritalAssetTotal + s2MaritalAssetTotal;

                if (totalMaritalAssetsForChart === 0) {
                  return (
                    <Card>
                      <CardHeader><CardTitle className="text-xl text-gray-600">Marital Asset Division</CardTitle></CardHeader>
                      <CardContent><p className="text-sm text-gray-500">No marital assets to visualize.</p></CardContent>
                    </Card>
                  );
                }

                const pieData = [
                  { name: s1Name, value: s1MaritalAssetTotal },
                  { name: s2Name, value: s2MaritalAssetTotal },
                ];
                const COLORS = ['#0088FE', '#00C49F']; // Blue, Green

                return (
                  <Card>
                    <CardHeader><CardTitle className="text-xl text-gray-600">Marital Asset Division</CardTitle></CardHeader>
                    <CardContent className="h-[350px] md:h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Net Worth Comparison Bar Chart */}
              {(() => {
                const s1Name = summaryPayload.caseInfo.spouse1FullName || "Spouse 1";
                const s2Name = summaryPayload.caseInfo.spouse2FullName || "Spouse 2";
                const netWorthData = [
                  { name: s1Name, "Total Net Value": propertyDivisionResult.totalSpouse1Value },
                  { name: s2Name, "Total Net Value": propertyDivisionResult.totalSpouse2Value },
                ];
                 const COLORS = ['#FFBB28', '#FF8042']; // Yellow, Orange

                return (
                  <Card>
                    <CardHeader><CardTitle className="text-xl text-gray-600">Overall Net Value Comparison</CardTitle></CardHeader>
                    <CardContent className="h-[350px] md:h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={netWorthData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis tickFormatter={(value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(value)} />
                          <Tooltip formatter={(value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)} />
                          <Legend />
                          <Bar dataKey="Total Net Value">
                             {netWorthData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          </div>
        )}

        {/* --- Detailed Breakdown Tables --- */}
        {summaryPayload && propertyDivisionResult && (
          <div className="space-y-8 mb-8"> {/* Added mb-8 for spacing */}
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-gray-700">Detailed Asset and Debt Division</h2> {/* mb-6 for consistency */}
            </div>

            {/* Helper function for table cell formatting */}
            {(() => {
              const formatCurrency = (value: number | undefined) =>
                value !== undefined ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value) : 'N/A';

              const s1Name = summaryPayload.caseInfo.spouse1FullName || "Spouse 1";
              const s2Name = summaryPayload.caseInfo.spouse2FullName || "Spouse 2";

              const renderTable = (title: string, headers: string[], data: any[], columns: (keyof any | ((item: any) => string | number))[], noDataMsg: string) => {
                if (!data || data.length === 0) {
                  return (
                    <Card className="mb-6">
                      <CardHeader><CardTitle className="text-xl text-gray-600">{title}</CardTitle></CardHeader>
                      <CardContent><p className="text-sm text-gray-500">{noDataMsg}</p></CardContent>
                    </Card>
                  );
                }
                return (
                  <Card className="mb-6">
                    <CardHeader><CardTitle className="text-xl text-gray-600">{title}</CardTitle></CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              {headers.map(header => (
                                <th key={header} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {data.map((item, index) => (
                              <tr key={index} className={index % 2 === 0 ? undefined : "bg-gray-50"}>
                                {columns.map((col, colIndex) => (
                                  <td key={colIndex} className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                    {typeof col === 'function' ? col(item) : (typeof item[col] === 'number' && (String(col).toLowerCase().includes('value') || String(col).toLowerCase().includes('share') || String(col).toLowerCase().includes('balance') || String(col).toLowerCase().includes('responsibility')) ? formatCurrency(item[col]) : (item[col] ?? 'N/A'))}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                );
              };

              return (
                <>
                  {/* Marital Assets Table */}
                  {renderTable(
                    "Division of Marital Assets",
                    ["Description", "Type", "Total Value", `Awarded to ${s1Name}`, `Awarded to ${s2Name}`, "Reasoning"],
                    summaryPayload.communityAssets,
                    ['description', 'type', 'totalValue', 'awardedToSpouse1', 'awardedToSpouse2', 'reasoning'],
                    "No marital assets to display."
                  )}

                  {/* Spouse 1 Separate Assets Table */}
                  {renderTable(
                    `${s1Name}'s Separate Assets`,
                    ["Description", "Type", "Value", "Reasoning"],
                    summaryPayload.spouse1SeparateAssets,
                    ['description', 'type', 'value', 'reasoning'],
                    `No separate assets listed for ${s1Name}.`
                  )}

                  {/* Spouse 2 Separate Assets Table */}
                  {renderTable(
                    `${s2Name}'s Separate Assets`,
                    ["Description", "Type", "Value", "Reasoning"],
                    summaryPayload.spouse2SeparateAssets,
                    ['description', 'type', 'value', 'reasoning'],
                    `No separate assets listed for ${s2Name}.`
                  )}

                  {/* Marital Debts Table */}
                  {renderTable(
                    "Allocation of Marital Debts",
                    ["Description", "Creditor", "Type", "Total Balance", `Resp. for ${s1Name}`, `Resp. for ${s2Name}`, "Reasoning"],
                    summaryPayload.communityDebts,
                    ['description', 'creditor', 'type', 'totalBalance', 'responsibilitySpouse1', 'responsibilitySpouse2', 'reasoning'],
                    "No marital debts to display."
                  )}

                  {/* Spouse 1 Separate Debts Table */}
                  {renderTable(
                    `${s1Name}'s Separate Debts`,
                    ["Description", "Creditor", "Type", "Balance", "Reasoning"],
                    summaryPayload.spouse1SeparateDebts,
                    ['description', 'creditor', 'type', 'balance', 'reasoning'],
                    `No separate debts listed for ${s1Name}.`
                  )}

                  {/* Spouse 2 Separate Debts Table */}
                  {renderTable(
                    `${s2Name}'s Separate Debts`,
                    ["Description", "Creditor", "Type", "Balance", "Reasoning"],
                    summaryPayload.spouse2SeparateDebts,
                    ['description', 'creditor', 'type', 'balance', 'reasoning'],
                    `No separate debts listed for ${s2Name}.`
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* --- Calculation Confidence Level --- */}
        {confidenceLevel !== null && (
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="text-xl text-gray-800">Calculation Confidence</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <p className="text-3xl font-bold text-center text-blue-600">{confidenceLevel}%</p>
                    <p className="text-xs text-gray-600 leading-relaxed">
                        This score reflects an estimate of the calculation's straightforwardness based on the data provided.
                        Factors like complex assets (e.g., business interests), significant special circumstances (e.g., domestic violence,
                        wasting of assets), or limited asset/debt information can lower this score. It is for informational
                        purposes only and not a legal assessment of certainty or a substitute for professional legal advice.
                    </p>
                </CardContent>
            </Card>
        )}

        {/* --- State-Specific Explanation & Legal Context --- */}
        {summaryPayload && calculationInputForDisplay && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-xl text-gray-800">
                Understanding Your Results in {getStateInfo(summaryPayload.caseInfo.jurisdiction as USState)?.name || summaryPayload.caseInfo.jurisdiction}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-700">
              <p>
                The division of property in your jurisdiction, <strong>{getStateInfo(summaryPayload.caseInfo.jurisdiction as USState)?.name || summaryPayload.caseInfo.jurisdiction}</strong>,
                follows an <strong>{isCommunityPropertyState(summaryPayload.caseInfo.jurisdiction as USState) ? 'Community Property' : 'Equitable Distribution'}</strong> model.
              </p>

              {!isCommunityPropertyState(summaryPayload.caseInfo.jurisdiction as USState) && getStateInfo(summaryPayload.caseInfo.jurisdiction as USState)?.equitableFactors && (
                <div>
                  <h4 className="font-semibold mt-3 mb-1">Key Factors Considered in Equitable Distribution:</h4>
                  <ul className="list-disc list-inside space-y-1 pl-2 text-xs">
                    {getStateInfo(summaryPayload.caseInfo.jurisdiction as USState)?.equitableFactors?.map((factor, index) => (
                      <li key={index}>{factor}</li>
                    ))}
                  </ul>
                </div>
              )}

              {summaryPayload.caseInfo.jurisdiction === 'PA' && calculationInputForDisplay.specialFactors && (
                (() => {
                  const paFactorsUsed = Object.entries(calculationInputForDisplay.specialFactors)
                    .filter(([key, value]) =>
                      key.startsWith('priorMarriage') || key.startsWith('stationS') || key.startsWith('vocationalSkillsS') ||
                      key.startsWith('estateS') || key.startsWith('needsS') || key.startsWith('contributionToEducation') ||
                      key.startsWith('opportunityFuture') || key.startsWith('sourcesOfIncome') || key.startsWith('standardOfLiving') ||
                      key.startsWith('economicCircumstancesAtDivorce') || key.startsWith('expenseOfSaleAssets')
                    )
                    .some(([key, value]) => value !== undefined && value !== false && value !== ''); // Check if any PA factor has a meaningful value

                  if (paFactorsUsed) {
                    return (
                      <p className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md text-xs">
                        <strong>Pennsylvania Specific Considerations:</strong> Additional factors specific to Pennsylvania, such as prior marriages,
                        contributions to education/training, future earning opportunities, and specific needs of the parties, were
                        considered in this calculation based on the information you provided. These factors can influence the
                        equitable division of marital property.
                      </p>
                    );
                  }
                  return null;
                })()
              )}

              {summaryPayload.disclaimers && summaryPayload.disclaimers.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-2 text-red-700">Important Disclaimers:</h4>
                  <ul className="list-disc list-inside space-y-1 pl-2 text-xs">
                    {summaryPayload.disclaimers.map((disclaimer, index) => (
                      <li key={index}>{disclaimer}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="mt-12 text-center">
          <Button onClick={() => router.push('/calculator')} variant="outline" size="lg">
            Start New Calculation
          </Button>
        </div>

        {/* Optional: Display raw payload for debugging during development */}
        {process.env.NODE_ENV === 'development' && (
          <Card>
            <CardHeader>
              <CardTitle>Developer Info: Raw PDF Payload</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto text-xs">
                {JSON.stringify(summaryPayload, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
