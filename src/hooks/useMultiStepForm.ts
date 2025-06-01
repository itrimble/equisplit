'use client';

import { useState, useEffect, useCallback } from 'react';
import { MultiStepFormState, StepFormData } from '@/types';
import { z } from 'zod';

// --- Zod Schemas for Validation within the Hook ---

// Schema for a single real estate property (from previous step)
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

// **NEW**: Schemas for Financial Accounts Step
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
      .refine(val => parseFloat(val) >= 0) // Simplified: balance >= 0
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
// **END NEW SCHEMAS**


export interface UseMultiStepFormProps {
  totalSteps: number;
  onSave?: (data: MultiStepFormState) => void;
  autoSaveInterval?: number;
  storageKey?: string;
}

export function useMultiStepForm({
  totalSteps,
  onSave,
  autoSaveInterval = 30000,
  storageKey = 'equisplit-calculator'
}: UseMultiStepFormProps) {
  const [formState, setFormState] = useState<MultiStepFormState>(() => {
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
        if (!stepData.realEstateProperties || stepData.realEstateProperties.length === 0) {
          return true;
        }
        const realEstateValidation = realEstateStepInHookSchema.safeParse(stepData);
        return realEstateValidation.success;
      case 3: // **NEW** Financial Accounts
        if (!stepData.financialAccounts || stepData.financialAccounts.length === 0) {
          return true;
        }
        const financialAccountsValidation = financialAccountsStepInHookSchema.safeParse(stepData);
        return financialAccountsValidation.success;
      // Steps 4-6 are still placeholders for validation
      case 4: return true;
      case 5: return true;
      case 6: return true;
      default:
        return true;
    }
  }, []); // Empty dependency array as schemas are defined in scope


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
  }, [storageKey, totalSteps, validateStepData]); // Added validateStepData

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


  const goToStep = useCallback((stepNumber: number) => {
    if (stepNumber >= 1 && stepNumber <= totalSteps) {
        const targetStepIndex = stepNumber - 1;
        if (stepNumber < formState.currentStep ||
            formState.steps[targetStepIndex]?.isComplete ||
            (stepNumber === formState.currentStep + 1 && formState.steps[formState.currentStep - 1]?.isComplete) || // Direct next step
            (stepNumber > formState.currentStep + 1 && formState.steps.slice(formState.currentStep -1, targetStepIndex).every(s => s.isComplete)) // Future steps if intermediates are complete
            ) {
            setFormState(prev => ({
                ...prev,
                currentStep: stepNumber,
                canProceed: prev.steps[targetStepIndex]?.isComplete || false,
            }));
        } else {
            // console.warn(`Navigation to step ${stepNumber} blocked.`);
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

    // Check if all steps from current up to (but not including) target stepNumber are complete
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