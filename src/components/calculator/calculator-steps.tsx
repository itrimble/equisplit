'use client';

import { PersonalInfoStep } from '@/components/forms/personal-info-step';
import { RealEstateStep } from '@/components/forms/real-estate-step';
import { FinancialAccountsStep } from '@/components/forms/financial-accounts-step';
import { PersonalPropertyStep } from '@/components/forms/personal-property-step';
import { DebtsStep } from '@/components/forms/debts-step';
import { SpecialCircumstancesStep } from '@/components/forms/special-circumstances-step';

interface CalculatorStepsProps {
  currentStep: number;
  stepData: Record<string, any>;
  onUpdateData: (data: Record<string, any>) => void;
  preselectedState?: string | null;
}

export function CalculatorSteps({
  currentStep,
  stepData,
  onUpdateData,
  preselectedState
}: CalculatorStepsProps) {
  const stepComponents = {
    1: (
      <PersonalInfoStep
        data={stepData}
        onUpdate={onUpdateData}
        preselectedState={preselectedState}
      />
    ),
    2: (
      <RealEstateStep
        data={stepData}
        onUpdate={onUpdateData}
      />
    ),
    3: (
      <FinancialAccountsStep
        data={stepData}
        onUpdate={onUpdateData}
      />
    ),
    4: (
      <PersonalPropertyStep
        data={stepData}
        onUpdate={onUpdateData}
      />
    ),
    5: (
      <DebtsStep
        data={stepData}
        onUpdate={onUpdateData}
      />
    ),
    6: (
      <SpecialCircumstancesStep
        data={stepData}
        onUpdate={onUpdateData}
      />
    ),
  };

  return (
    <div className="min-h-[400px]">
      {stepComponents[currentStep as keyof typeof stepComponents] || (
        <div className="text-center py-8">
          <p className="text-gray-500">Invalid step</p>
        </div>
      )}
    </div>
  );
}