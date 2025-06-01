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
import { calculatePropertyDivision } from '@/utils/calculations';
import { generatePropertyDebtSummaryPayload } from '@/utils/documentPayloadTransformer';
import { useMultiStepForm } from '@/hooks/useMultiStepForm'; // To get storage key or form structure

const STORAGE_KEY = 'equisplit-calculator-v1'; // Ensure this matches useMultiStepForm

export default function ResultsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaryPayload, setSummaryPayload] = useState<PropertyDebtSummaryPayload | null>(null);
  const [propertyDivisionResult, setPropertyDivisionResult] = useState<PropertyDivision | null>(null);

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
        // Add other PersonalInfoFormData fields if they are needed by getSpouseNames
        // For now, names are the most critical for the payload.
        // The rest of PersonalInfoFormData isn't directly used by generatePropertyDebtSummaryPayload
        // apart from what's already in CalculationInput.marriageInfo.
        email: personalInfoStepData.email, // Example, may not be needed for PDF
        dateOfBirth: personalInfoStepData.dateOfBirth, // Example
        jurisdiction: personalInfoStepData.jurisdiction, // Used for marriageInfo
        marriageDate: personalInfoStepData.marriageDate, // Used for marriageInfo
        separationDate: personalInfoStepData.separationDate, // Used for marriageInfo
        currentStatus: personalInfoStepData.currentStatus, // Example
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
      const specialFactors: EquitableDistributionFactors = { // Map from specialFactorsData
          marriageDuration: parseFloat(specialFactorsData.marriageDurationYears) || 0,
          ageSpouse1: 0, // Placeholder - should come from personalInfo if needed by calc
          ageSpouse2: 0, // Placeholder
          healthSpouse1: specialFactorsData.healthSpouse1 || 'not_applicable',
          healthSpouse2: specialFactorsData.healthSpouse2 || 'not_applicable',
          incomeSpouse1: 0, // Placeholder
          incomeSpouse2: 0, // Placeholder
          earnCapacitySpouse1: 0, // Placeholder
          earnCapacitySpouse2: 0, // Placeholder
          contributionToMarriage: `${specialFactorsData.contributionDetailsSpouse1 || ''} ${specialFactorsData.contributionDetailsSpouse2 || ''}`.trim(),
          domesticViolence: specialFactorsData.domesticViolence || false,
          wastingOfAssets: specialFactorsData.wastingOfAssets || false,
          taxConsequences: specialFactorsData.significantTaxConsequences || false,
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
        setSummaryPayload(payload);
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
      summaryItems.push({ label: "Equalization Payment:", value: `${currencyFormat(s.equalizationPayment.amount)} from ${s.equalizationPayment.fromSpouse} to ${s.equalizationPayment.toSpouse}`, bold: true, span: true });
    }

    summaryItems.forEach(item => {
      if (item === null) {
        ensureSpace(3); return;
      }
      const xPos = item.indent ? margin + 10 : margin;
      doc.setFont("helvetica", item.bold ? "bold" : "normal");
      if (item.span) {
         addTextAndAdvanceY(`${item.label} ${item.value}`, xPos, {fontSize: 10});
      } else {
         addTextAndAdvanceY(`${item.label}`, xPos, {fontSize: 10});
         addTextAndAdvanceY(item.value, margin + 150 > pageWidth - margin - 50 ? pageWidth - margin - 50 : margin + 150 , {fontSize: 10, align: "left"}, -((10 * 0.7) + 2)); // Place value on same line, then advance Y
      }
    });
    ensureSpace(15);

    // ==== Tables ====
    const tableStyles = { fontSize: 9, cellPadding: 2.5, lineColor: [200, 200, 200], lineWidth: 0.5 };
    const headStyles = { fillColor: [22, 160, 133], textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 10, cellPadding: 3 };
    const bodyStyles = { textColor: 50, fontSize: 9 };
    const alternateRowStyles = { fillColor: [240, 240, 240] };

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
            <Button onClick={handleDownloadPdf} size="lg">
              Download PDF Summary (Proof of Concept)
            </Button>
          </CardContent>
        </Card>

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
