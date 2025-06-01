'use client';

import { useState, useEffect, useCallback } from 'react';
import { MultiStepFormState, StepFormData } from '@/types';
import { z } from 'zod'; // Import Zod

// --- Zod Schemas for Validation within the Hook ---
// Schema for a single real estate property (mirrors the one in RealEstateStep)
const realEstatePropertyInHookSchema = z.object({
  description: z.string().min(1),
  propertyType: z.enum([
    "primary_residence",
    "rental_property",
    "vacation_home",
    "land",
    "other"
  ]),
  currentValue: z.preprocess(
    (val) => String(val).replace(/[^0-9.-]+/g, ''),
    z.string().min(1)
      .refine(val => !isNaN(parseFloat(val)))
      .refine(val => parseFloat(val) > 0)
  ),
  acquisitionDate: z.string().optional(),
  acquisitionValue: z.preprocess(
    (val) => String(val).replace(/[^0-9.-]+/g, ''),
    z.string().optional()
      .refine(val => val === '' || val === undefined || !isNaN(parseFloat(val)))
      .refine(val => val === '' || val === undefined || parseFloat(val) > 0)
  ).optional(),
  mortgageBalance: z.preprocess(
    (val) => String(val).replace(/[^0-9.-]+/g, ''),
    z.string().optional()
      .refine(val => val === '' || val === undefined || !isNaN(parseFloat(val)))
      .refine(val => val === '' || val === undefined || parseFloat(val) >= 0)
  ).optional(),
  isSeparateProperty: z.boolean().default(false),
  ownedBy: z.enum(["joint", "spouse1", "spouse2"]).optional(),
  notes: z.string().optional(),
})
.superRefine((data, ctx) => {
    if (data.isSeparateProperty && !data.ownedBy) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ownedBy"],
        message: "Ownership is required for separate property.", // This message won't be shown in UI from here
      });
    }
});

// Schema for the entire RealEstateStep's data
const realEstateStepInHookSchema = z.object({
  realEstateProperties: z.array(realEstatePropertyInHookSchema).optional(),
});


export interface UseMultiStepFormProps {
  totalSteps: number;
  onSave?: (data: MultiStepFormState) => void;
  autoSaveInterval?: number; // milliseconds
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
      lastSaved: undefined, // Initialize lastSaved
    };
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsedData = JSON.parse(saved) as Partial<MultiStepFormState>;

          // Ensure steps array is correctly initialized if missing from saved data
          const currentSteps = parsedData.steps && parsedData.steps.length === totalSteps
            ? parsedData.steps.map(step => ({
                ...step,
                lastUpdated: step.lastUpdated ? new Date(step.lastUpdated) : new Date()
              }))
            : Array.from({ length: totalSteps }, (_, index) => ({
                step: index + 1,
                isComplete: false, // Default to false, will be re-validated
                data: {},
                lastUpdated: new Date()
              }));

          // Re-validate completion status for all steps based on loaded data
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
            // Recalculate canProceed and isValid based on re-validated steps
            canProceed: validatedSteps[ (parsedData.currentStep || 1) - 1]?.isComplete || false,
            isValid: validatedSteps.every(step => step.isComplete)
          }));
        }
      } catch (error) {
        console.warn('Failed to load or parse saved form data:', error);
        localStorage.removeItem(storageKey);
      }
    }
  }, [storageKey, totalSteps]); // Added totalSteps dependency

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

  const validateStepData = useCallback((stepNumber: number, stepData: Record<string, any>): boolean => {
    switch (stepNumber) {
      case 1: // Personal Information
        return !!(stepData.firstName && stepData.lastName && stepData.marriageDate && stepData.jurisdiction);
      case 2: // Real Estate Assets
        // If realEstateProperties is not present or is an empty array, it's valid (user has none)
        if (!stepData.realEstateProperties || stepData.realEstateProperties.length === 0) {
          return true;
        }
        // If there are properties, validate them
        const validationResult = realEstateStepInHookSchema.safeParse(stepData);
        return validationResult.success;
      // Steps 3-6 are still placeholders for validation
      case 3: return true;
      case 4: return true;
      case 5: return true;
      case 6: return true;
      default:
        return true; // Default to true for any other steps not explicitly handled
    }
  }, []); // Empty dependency array as schemas are defined in scope

  const updateStepData = useCallback((stepNumber: number, newData: Record<string, any>) => {
    setFormState(prev => {
      const newSteps = [...prev.steps];
      const stepIndex = stepNumber - 1;
      
      if (stepIndex >= 0 && stepIndex < newSteps.length) {
        // Merge new data with existing data for the step
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
        // Only allow navigation if the target step is accessible
        // (current, previous, or next if current is complete, or any step if already completed)
        if (stepNumber < formState.currentStep ||
            formState.steps[targetStepIndex]?.isComplete ||
            canNavigateToStep(stepNumber)) {
            setFormState(prev => ({
                ...prev,
                currentStep: stepNumber,
                // Update canProceed based on the new current step's completeness
                canProceed: prev.steps[targetStepIndex]?.isComplete || false,
            }));
        } else {
            console.warn(`Navigation to step ${stepNumber} blocked or step not yet reachable.`);
        }
    }
  }, [totalSteps, formState.currentStep, formState.steps]); // Removed canNavigateToStep from deps to avoid loop

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
      return prev; // If current step not complete or already last step, don't change
    });
  }, [totalSteps]);

  const prevStep = useCallback(() => {
    setFormState(prev => {
      if (prev.currentStep > 1) {
        const newCurrentStep = prev.currentStep - 1;
        return {
          ...prev,
          currentStep: newCurrentStep,
          // Previous step is always considered proceedable for "Next" button logic
          // as its own completeness was already met to get there.
          // The canProceed here refers to the new current step's own data.
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
      canProceed: false, // Step 1 personal info is not complete by default
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
      // Only include data from completed steps for "getAllData" if desired,
      // or all data regardless of completion. For now, all data.
      return { ...acc, ...step.data };
    }, {});
  }, [formState.steps]);

  const getProgress = useCallback(() => {
    const completedSteps = formState.steps.filter(step => step.isComplete).length;
    return Math.round((completedSteps / totalSteps) * 100);
  }, [formState.steps, totalSteps]);

  const canNavigateToStep = useCallback((stepNumber: number): boolean => {
    if (stepNumber === formState.currentStep) return true; // Can always "navigate" to current
    // Can navigate to any previous step
    if (stepNumber < formState.currentStep) return true;
    // Can navigate to next step if current is complete
    if (stepNumber === formState.currentStep + 1 && formState.steps[formState.currentStep - 1]?.isComplete) {
        return true;
    }
    // If there are more steps ahead, check if all intermediate steps are complete
    if (stepNumber > formState.currentStep + 1) {
        for (let i = formState.currentStep -1; i < stepNumber -1; i++) {
            if (!formState.steps[i]?.isComplete) return false;
        }
        return true;
    }
    return false;
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