'use client';

import { useState, useEffect, useCallback } from 'react';
import { MultiStepFormState, StepFormData } from '@/types';
import { z } from 'zod';

// --- Zod Schemas for Validation within the Hook ---

// Schemas for Real Estate Step (Step 2)
const realEstatePropertyInHookSchema = z.object({
  description: z.string().min(1),
  propertyType: z.enum(["primary_residence", "rental_property", "vacation_home", "land", "other"]),
  currentValue: z.preprocess(
    (val) => String(val).replace(/[^0-9.-]+/g, ''),
    z.string().min(1).refine(val => !isNaN(parseFloat(val))).refine(val => parseFloat(val) > 0)
  ),
  acquisitionDate: z.string().optional(),
  acquisitionValue: z.preprocess(
    (val) => String(val).replace(/[^0-9.-]+/g, ''),
    z.string().optional().refine(val => val === '' || val === undefined || !isNaN(parseFloat(val)))
      .refine(val => val === '' || val === undefined || parseFloat(val) > 0)
  ).optional(),
  mortgageBalance: z.preprocess(
    (val) => String(val).replace(/[^0-9.-]+/g, ''),
    z.string().optional().refine(val => val === '' || val === undefined || !isNaN(parseFloat(val)))
      .refine(val => val === '' || val === undefined || parseFloat(val) >= 0)
  ).optional(),
  isSeparateProperty: z.boolean().default(false),
  ownedBy: z.enum(["joint", "spouse1", "spouse2"]).optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.isSeparateProperty && !data.ownedBy) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["ownedBy"], message: "Ownership required." });
    }
});
const realEstateStepInHookSchema = z.object({
  realEstateProperties: z.array(realEstatePropertyInHookSchema).optional(),
});

// Schemas for Financial Accounts Step (Step 3)
const accountTypeInHookEnum = z.enum([
  "checking", "savings", "money_market", "cd", "brokerage_taxable",
  "retirement_401k_403b", "retirement_ira_roth", "retirement_pension",
  "crypto", "cash_value_life_insurance", "hsa", "other_financial"
]);
const financialAccountInHookSchema = z.object({
  accountType: accountTypeInHookEnum,
  institutionName: z.string().min(1),
  accountNickname: z.string().optional(),
  accountNumberLast4: z.string().length(4).regex(/^\d{4}$/).optional().or(z.literal('')),
  currentBalance: z.preprocess(
    (val) => String(val).replace(/[^0-9.-]+/g, ''),
    z.string().min(1).refine(val => !isNaN(parseFloat(val)))
      .refine(val => parseFloat(val) >= 0)
  ),
  isSeparateProperty: z.boolean().default(false),
  ownedBy: z.enum(["joint", "spouse1", "spouse2"]).optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.isSeparateProperty && !data.ownedBy) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["ownedBy"], message: "Ownership required." });
    }
});
const financialAccountsStepInHookSchema = z.object({
  financialAccounts: z.array(financialAccountInHookSchema).optional(),
});

// Schemas for Personal Property Step (Step 4)
const commonPersonalPropertyInHookSchemaBase = z.object({
  description: z.string().min(1),
  currentValue: z.preprocess(
    (val) => String(val).replace(/[^0-9.-]+/g, ''),
    z.string().min(1).refine(val => !isNaN(parseFloat(val))).refine(val => parseFloat(val) >= 0)
  ),
  isSeparateProperty: z.boolean().default(false),
  ownedBy: z.enum(["joint", "spouse1", "spouse2"]).optional(),
  notes: z.string().optional(),
});
const commonPersonalPropertyInHookSchema = commonPersonalPropertyInHookSchemaBase.superRefine((data, ctx) => {
  if (data.isSeparateProperty && !data.ownedBy) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["ownedBy"], message: "Ownership required." });
  }
});
const vehiclePropertyInHookSchema = commonPersonalPropertyInHookSchema.extend({
  itemCategory: z.literal("vehicle"),
  vehicleMake: z.string().min(1),
  vehicleModel: z.string().min(1),
  vehicleYear: z.preprocess(
    (val) => String(val).replace(/[^0-9]/g, ''),
    z.string().length(4).refine(val => !isNaN(parseInt(val, 10)) && parseInt(val, 10) > 1900 && parseInt(val, 10) <= new Date().getFullYear() + 1)
  ),
  vinLast6: z.string().length(6).regex(/^[a-zA-Z0-9]{6}$/).optional().or(z.literal('')),
});
const OTHER_PROPERTY_CATEGORIES_IN_HOOK = ["jewelry", "electronics", "furniture", "art_collectibles", "other_valuables"] as const;
const otherPersonalPropertyInHookSchema = commonPersonalPropertyInHookSchema.extend({
  itemCategory: z.enum(OTHER_PROPERTY_CATEGORIES_IN_HOOK),
});
const personalPropertyItemInHookSchema = z.discriminatedUnion("itemCategory", [
  vehiclePropertyInHookSchema,
  otherPersonalPropertyInHookSchema,
]);
const personalPropertyStepInHookSchema = z.object({
  personalProperties: z.array(personalPropertyItemInHookSchema).optional(),
});

// **NEW**: Schemas for Debts Step (Step 5)
const debtTypeInHookEnum = z.enum([
  "mortgage", "heloc", "vehicle_loan", "student_loan", "credit_card",
  "personal_loan", "medical_debt", "tax_debt", "alimony_arrears",
  "child_support_arrears", "business_debt", "other_debt"
]);

const debtItemInHookSchema = z.object({
  debtType: debtTypeInHookEnum,
  creditorName: z.string().min(1),
  accountNickname: z.string().optional(),
  accountNumberLast4: z.string().length(4).regex(/^\d{4}$/).optional().or(z.literal('')),
  currentBalance: z.preprocess(
    (val) => String(val).replace(/[^0-9.-]+/g, ''),
    z.string().min(1).refine(val => !isNaN(parseFloat(val))).refine(val => parseFloat(val) > 0) // Debts are positive amounts
  ),
  isSeparateDebt: z.boolean().default(false),
  responsibility: z.enum(["joint", "spouse1", "spouse2"]).optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.isSeparateDebt && !data.responsibility) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["responsibility"], message: "Responsibility required for separate debt." });
    }
});

const debtsStepInHookSchema = z.object({
  debts: z.array(debtItemInHookSchema).optional(),
});
// **END NEW SCHEMAS FOR STEP 5**

// **NEW**: Schemas for Special Circumstances Step (Step 6)
const healthStatusInHookEnum = z.enum(["not_applicable", "excellent", "good", "fair", "poor"]);

const specialCircumstancesInHookSchema = z.object({
  hasPrenup: z.boolean().default(false),
  prenupDetails: z.string().optional(),
  marriageDurationYears: z.preprocess(
    (val) => String(val).replace(/[^0-9]/g, ''),
    z.string().optional()
      .refine(val => val === '' || val === undefined || (parseInt(val, 10) >= 0 && parseInt(val, 10) <= 100))
  ).optional(),
  healthSpouse1: healthStatusInHookEnum.default("not_applicable"),
  healthSpouse2: healthStatusInHookEnum.default("not_applicable"),
  contributionDetailsSpouse1: z.string().optional(),
  contributionDetailsSpouse2: z.string().optional(),
  domesticViolence: z.boolean().default(false),
  domesticViolenceDetails: z.string().optional(),
  wastingOfAssets: z.boolean().default(false),
  wastingOfAssetsDetails: z.string().optional(),
  significantTaxConsequences: z.boolean().default(false),
  significantTaxConsequencesDetails: z.string().optional(),
  otherSignificantCircumstances: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.hasPrenup && (!data.prenupDetails || data.prenupDetails.trim() === "")) {
    ctx.addIssue({ path: ["prenupDetails"], message: "Details required if prenup exists." });
  }
  if (data.domesticViolence && (!data.domesticViolenceDetails || data.domesticViolenceDetails.trim() === "")) {
    ctx.addIssue({ path: ["domesticViolenceDetails"], message: "Details required if domestic violence indicated." });
  }
  if (data.wastingOfAssets && (!data.wastingOfAssetsDetails || data.wastingOfAssetsDetails.trim() === "")) {
    ctx.addIssue({ path: ["wastingOfAssetsDetails"], message: "Details required if wasting of assets indicated." });
  }
  if (data.significantTaxConsequences && (!data.significantTaxConsequencesDetails || data.significantTaxConsequencesDetails.trim() === "")) {
    ctx.addIssue({ path: ["significantTaxConsequencesDetails"], message: "Details required if tax consequences indicated." });
  }
});
// **END NEW SCHEMAS FOR STEP 6**


export interface UseMultiStepFormProps {
  // ... (props remain the same)
  totalSteps: number;
  onSave?: (data: MultiStepFormState) => void;
  autoSaveInterval?: number;
  storageKey?: string;
}

export function useMultiStepForm({
  // ... (hook setup remains the same)
  totalSteps,
  onSave,
  autoSaveInterval = 30000,
  storageKey = 'equisplit-calculator'
}: UseMultiStepFormProps) {
  const [formState, setFormState] = useState<MultiStepFormState>(() => {
    // ... (initial state setup remains the same)
    const initialSteps: StepFormData[] = Array.from({ length: totalSteps }, (_, index) => ({
      step: index + 1,
      isComplete: false,
      data: {},
      lastUpdated: new Date()
    }));
    return {
      currentStep: 1,
      totalSteps,
      steps: initialSteps,
      isValid: false,
      canProceed: false,
      lastSaved: undefined,
    };
  });

  const validateStepData = useCallback((stepNumber: number, stepData: Record<string, any>): boolean => {
    // Ensure stepData is an object, even if empty, to prevent safeParse errors on undefined
    const currentData = stepData || {};
    switch (stepNumber) {
      case 1: // Personal Information
        return !!(currentData.firstName && currentData.lastName && currentData.marriageDate && currentData.jurisdiction);
      case 2: // Real Estate Assets
        if (!currentData.realEstateProperties || currentData.realEstateProperties.length === 0) return true;
        return realEstateStepInHookSchema.safeParse(currentData).success;
      case 3: // Financial Accounts
        if (!currentData.financialAccounts || currentData.financialAccounts.length === 0) return true;
        return financialAccountsStepInHookSchema.safeParse(currentData).success;
      case 4: // Personal Property & Vehicles
        if (!currentData.personalProperties || currentData.personalProperties.length === 0) return true;
        return personalPropertyStepInHookSchema.safeParse(currentData).success;
      case 5: // Debts & Liabilities
        if (!currentData.debts || currentData.debts.length === 0) return true;
        return debtsStepInHookSchema.safeParse(currentData).success;
      case 6: // **NEW** Special Circumstances
        // This step might be considered "complete" even if mostly empty,
        // as long as the conditionally required fields are met.
        // The schema's superRefine handles the conditional requirements.
        // An empty object {} should pass if all fields are optional or have defaults
        // and no conditional requirements are triggered.
        return specialCircumstancesInHookSchema.safeParse(currentData).success;
      default:
        return true; // Default to true for any steps not explicitly handled or future steps
    }
  }, []);


  useEffect(() => {
    if (typeof window !== 'undefined' && storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsedData = JSON.parse(saved) as Partial<MultiStepFormState>;
          const currentSteps = parsedData.steps && parsedData.steps.length === totalSteps
            ? parsedData.steps.map(step => ({
                ...step,
                lastUpdated: step.lastUpdated ? new Date(step.lastUpdated) : new Date()
              }))
            : Array.from({ length: totalSteps }, (_, index) => ({
                step: index + 1, isComplete: false, data: {}, lastUpdated: new Date()
              }));

          const validatedSteps = currentSteps.map(step => ({
            ...step,
            isComplete: validateStepData(step.step, step.data || {}) // Pass empty object if data is undefined
          }));

          setFormState(prev => ({
            ...prev,
            ...parsedData,
            steps: validatedSteps,
            currentStep: parsedData.currentStep || 1,
            lastSaved: parsedData.lastSaved ? new Date(parsedData.lastSaved) : undefined,
            canProceed: validatedSteps[(parsedData.currentStep || 1) - 1]?.isComplete || false,
            isValid: validatedSteps.every(step => step.isComplete)
          }));
        }
      } catch (error) {
        console.warn('Failed to load or parse saved form data:', error);
        localStorage.removeItem(storageKey);
      }
    }
  }, [storageKey, totalSteps, validateStepData]);

   useEffect(() => {
    if (autoSaveInterval && storageKey) {
      const interval = setInterval(() => {
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(storageKey, JSON.stringify(formState));
            setFormState(prev => ({ ...prev, lastSaved: new Date() }));
          } catch (error) {
            console.warn('Failed to auto-save form data:', error);
          }
        }
      }, autoSaveInterval);
      return () => clearInterval(interval);
    }
  }, [formState, autoSaveInterval, storageKey]);

  const updateStepData = useCallback((stepNumber: number, newData: Record<string, any>) => {
    setFormState(prev => {
      const newSteps = [...prev.steps];
      const stepIndex = stepNumber - 1;
      
      if (stepIndex >= 0 && stepIndex < newSteps.length) {
        const updatedStepData = { ...newSteps[stepIndex].data, ...newData };
        newSteps[stepIndex] = {
          ...newSteps[stepIndex],
          data: updatedStepData,
          isComplete: validateStepData(stepNumber, updatedStepData),
          lastUpdated: new Date()
        };
      }

      const isOverallValid = newSteps.every(s => s.isComplete);
      const canCurrentStepProceed = newSteps[prev.currentStep - 1]?.isComplete || false;

      const updatedState = { ...prev, steps: newSteps, isValid: isOverallValid, canProceed: canCurrentStepProceed };
      if (onSave) { onSave(updatedState); }
      return updatedState;
    });
  }, [onSave, validateStepData]);

  const goToStep = useCallback((stepNumber: number) => {
    if (stepNumber >= 1 && stepNumber <= totalSteps) {
        const targetStepIndex = stepNumber - 1;
        if (stepNumber < formState.currentStep ||
            formState.steps[targetStepIndex]?.isComplete ||
            (stepNumber === formState.currentStep + 1 && formState.steps[formState.currentStep - 1]?.isComplete) ||
            (stepNumber > formState.currentStep + 1 && formState.steps.slice(formState.currentStep -1, targetStepIndex).every(s => s.isComplete))
            ) {
            setFormState(prev => ({
                ...prev, currentStep: stepNumber,
                canProceed: prev.steps[targetStepIndex]?.isComplete || false,
            }));
        }
    }
  }, [totalSteps, formState.currentStep, formState.steps]);

  const nextStep = useCallback(() => {
    setFormState(prev => {
      if (prev.currentStep < totalSteps && prev.steps[prev.currentStep - 1]?.isComplete) {
        const newCurrentStep = prev.currentStep + 1;
        return { ...prev, currentStep: newCurrentStep, canProceed: prev.steps[newCurrentStep - 1]?.isComplete || false };
      }
      return prev;
    });
  }, [totalSteps]);

  const prevStep = useCallback(() => {
    setFormState(prev => {
      if (prev.currentStep > 1) {
        const newCurrentStep = prev.currentStep - 1;
        return { ...prev, currentStep: newCurrentStep, canProceed: prev.steps[newCurrentStep - 1]?.isComplete || false };
      }
      return prev;
    });
  }, []);

  const resetForm = useCallback(() => {
    const initialSteps: StepFormData[] = Array.from({ length: totalSteps }, (_, index) => ({
      step: index + 1, isComplete: false, data: {}, lastUpdated: new Date()
    }));
    const resetState = {
      currentStep: 1, totalSteps, steps: initialSteps,
      isValid: false, canProceed: false, lastSaved: undefined,
    };
    setFormState(resetState);
    if (typeof window !== 'undefined' && storageKey) { localStorage.removeItem(storageKey); }
  }, [totalSteps, storageKey]);

  const getCurrentStepData = useCallback(() => formState.steps[formState.currentStep - 1]?.data || {}, [formState.currentStep, formState.steps]);
  const getAllData = useCallback(() => formState.steps.reduce((acc, step) => ({ ...acc, ...step.data }), {}), [formState.steps]);
  const getProgress = useCallback(() => Math.round((formState.steps.filter(step => step.isComplete).length / totalSteps) * 100), [formState.steps, totalSteps]);

  const canNavigateToStep = useCallback((stepNumber: number): boolean => {
    if (stepNumber === formState.currentStep) return true;
    if (stepNumber < formState.currentStep) return true;
    for (let i = formState.currentStep -1; i < stepNumber -1; i++) {
        if (!formState.steps[i]?.isComplete) return false;
    }
    return true;
  }, [formState.currentStep, formState.steps]);

  return {
    formState, currentStep: formState.currentStep, totalSteps: formState.totalSteps,
    isValid: formState.isValid, canProceed: formState.canProceed, lastSaved: formState.lastSaved,
    getCurrentStepData, getAllData, updateStepData, goToStep, nextStep, prevStep,
    canNavigateToStep, resetForm, getProgress,
    isStepComplete: (stepNumber: number) => formState.steps[stepNumber - 1]?.isComplete || false,
    isLastStep: formState.currentStep === totalSteps, isFirstStep: formState.currentStep === 1,
  };
}