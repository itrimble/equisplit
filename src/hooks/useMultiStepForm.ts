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
    switch (stepNumber) {
      case 1: // Personal Information
        return !!(stepData.firstName && stepData.lastName && stepData.marriageDate && stepData.jurisdiction);
      case 2: // Real Estate Assets
        if (!stepData.realEstateProperties || stepData.realEstateProperties.length === 0) return true;
        return realEstateStepInHookSchema.safeParse(stepData).success;
      case 3: // Financial Accounts
        if (!stepData.financialAccounts || stepData.financialAccounts.length === 0) return true;
        return financialAccountsStepInHookSchema.safeParse(stepData).success;
      case 4: // Personal Property & Vehicles
        if (!stepData.personalProperties || stepData.personalProperties.length === 0) return true;
        return personalPropertyStepInHookSchema.safeParse(stepData).success;
      case 5: // **NEW** Debts & Liabilities
        if (!stepData.debts || stepData.debts.length === 0) {
          return true; // Valid if no debts are entered
        }
        const debtsValidation = debtsStepInHookSchema.safeParse(stepData);
        return debtsValidation.success;
      case 6: return true; // SpecialCircumstances - still placeholder validation
      default:
        return true;
    }
  }, []); // Schemas are defined in the hook's scope, so no external deps needed for validateStepData itself


  // ... (useEffect for loading from storage remains the same - it uses validateStepData)
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
                step: index + 1,
                isComplete: false,
                data: {},
                lastUpdated: new Date()
              }));

          const validatedSteps = currentSteps.map(step => ({
            ...step,
            isComplete: validateStepData(step.step, step.data)
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

  // ... (useEffect for autoSave remains the same)
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

  // ... (updateStepData remains the same - it uses validateStepData)
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

      const updatedState = {
        ...prev,
        steps: newSteps,
        isValid: isOverallValid,
        canProceed: canCurrentStepProceed,
      };

      if (onSave) {
        onSave(updatedState);
      }
      return updatedState;
    });
  }, [onSave, validateStepData]);

  // ... (rest of the hook: goToStep, nextStep, prevStep, resetForm, getCurrentStepData, getAllData, getProgress, canNavigateToStep, and return statement remain the same)
  const goToStep = useCallback((stepNumber: number) => {
    if (stepNumber >= 1 && stepNumber <= totalSteps) {
        const targetStepIndex = stepNumber - 1;
        if (stepNumber < formState.currentStep ||
            formState.steps[targetStepIndex]?.isComplete ||
            (stepNumber === formState.currentStep + 1 && formState.steps[formState.currentStep - 1]?.isComplete) ||
            (stepNumber > formState.currentStep + 1 && formState.steps.slice(formState.currentStep -1, targetStepIndex).every(s => s.isComplete))
            ) {
            setFormState(prev => ({
                ...prev,
                currentStep: stepNumber,
                canProceed: prev.steps[targetStepIndex]?.isComplete || false,
            }));
        }
    }
  }, [totalSteps, formState.currentStep, formState.steps]);

  const nextStep = useCallback(() => {
    setFormState(prev => {
      if (prev.currentStep < totalSteps && prev.steps[prev.currentStep - 1]?.isComplete) {
        const newCurrentStep = prev.currentStep + 1;
        return {
          ...prev,
          currentStep: newCurrentStep,
          canProceed: prev.steps[newCurrentStep - 1]?.isComplete || false,
        };
      }
      return prev;
    });
  }, [totalSteps]);

  const prevStep = useCallback(() => {
    setFormState(prev => {
      if (prev.currentStep > 1) {
        const newCurrentStep = prev.currentStep - 1;
        return {
          ...prev,
          currentStep: newCurrentStep,
          canProceed: prev.steps[newCurrentStep - 1]?.isComplete || false,
        };
      }
      return prev;
    });
  }, []);

  const resetForm = useCallback(() => {
    const initialSteps: StepFormData[] = Array.from({ length: totalSteps }, (_, index) => ({
      step: index + 1,
      isComplete: false,
      data: {},
      lastUpdated: new Date()
    }));
    const resetState = {
      currentStep: 1,
      totalSteps,
      steps: initialSteps,
      isValid: false,
      canProceed: false,
      lastSaved: undefined,
    };
    setFormState(resetState);
    if (typeof window !== 'undefined' && storageKey) {
      localStorage.removeItem(storageKey);
    }
  }, [totalSteps, storageKey]);

  const getCurrentStepData = useCallback(() => {
    return formState.steps[formState.currentStep - 1]?.data || {};
  }, [formState.currentStep, formState.steps]);

  const getAllData = useCallback(() => {
    return formState.steps.reduce((acc, step) => {
      return { ...acc, ...step.data };
    }, {});
  }, [formState.steps]);

  const getProgress = useCallback(() => {
    const completedSteps = formState.steps.filter(step => step.isComplete).length;
    return Math.round((completedSteps / totalSteps) * 100);
  }, [formState.steps, totalSteps]);

  const canNavigateToStep = useCallback((stepNumber: number): boolean => {
    if (stepNumber === formState.currentStep) return true;
    if (stepNumber < formState.currentStep) return true;

    for (let i = formState.currentStep -1; i < stepNumber -1; i++) {
        if (!formState.steps[i]?.isComplete) return false;
    }
    return true;
  }, [formState.currentStep, formState.steps]);

  return {
    formState,
    currentStep: formState.currentStep,
    totalSteps: formState.totalSteps,
    isValid: formState.isValid,
    canProceed: formState.canProceed,
    lastSaved: formState.lastSaved,
    getCurrentStepData,
    getAllData,
    updateStepData,
    goToStep,
    nextStep,
    prevStep,
    canNavigateToStep,
    resetForm,
    getProgress,
    isStepComplete: (stepNumber: number) => 
      formState.steps[stepNumber - 1]?.isComplete || false,
    isLastStep: formState.currentStep === totalSteps,
    isFirstStep: formState.currentStep === 1,
  };
}