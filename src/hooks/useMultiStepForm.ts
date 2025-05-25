'use client';

import { useState, useEffect, useCallback } from 'react';
import { MultiStepFormState, StepFormData } from '@/types';

export interface UseMultiStepFormProps {
  totalSteps: number;
  onSave?: (data: MultiStepFormState) => void;
  autoSaveInterval?: number; // milliseconds
  storageKey?: string;
}

export function useMultiStepForm({
  totalSteps,
  onSave,
  autoSaveInterval = 30000, // 30 seconds
  storageKey = 'equisplit-calculator'
}: UseMultiStepFormProps) {
  const [formState, setFormState] = useState<MultiStepFormState>(() => {
    // Initialize with empty steps
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
      canProceed: false
    };
  });

  // Load saved data on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsedData = JSON.parse(saved);
          // Validate the saved data structure
          if (parsedData.steps && Array.isArray(parsedData.steps)) {
            setFormState(prev => ({
              ...prev,
              ...parsedData,
              steps: parsedData.steps.map((step: any, index: number) => ({
                ...step,
                lastUpdated: new Date(step.lastUpdated || Date.now())
              }))
            }));
          }
        }
      } catch (error) {
        console.warn('Failed to load saved form data:', error);
        // Clear corrupted data
        localStorage.removeItem(storageKey);
      }
    }
  }, [storageKey]);

  // Auto-save functionality
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

  const updateStepData = useCallback((stepNumber: number, data: Record<string, any>) => {
    setFormState(prev => {
      const newSteps = [...prev.steps];
      const stepIndex = stepNumber - 1;
      
      if (stepIndex >= 0 && stepIndex < newSteps.length) {
        newSteps[stepIndex] = {
          ...newSteps[stepIndex],
          data: { ...newSteps[stepIndex].data, ...data },
          lastUpdated: new Date()
        };

        // Check if step is complete based on required fields
        const isComplete = validateStepData(stepNumber, newSteps[stepIndex].data);
        newSteps[stepIndex].isComplete = isComplete;
      }

      const updatedState = {
        ...prev,
        steps: newSteps,
        isValid: newSteps.every(step => step.isComplete),
        canProceed: newSteps[prev.currentStep - 1]?.isComplete || false
      };

      // Call onSave if provided
      if (onSave) {
        onSave(updatedState);
      }

      return updatedState;
    });
  }, [onSave]);

  const validateStepData = (stepNumber: number, data: Record<string, any>): boolean => {
    switch (stepNumber) {
      case 1: // Personal Information
        return !!(data.firstName && data.lastName && data.marriageDate && data.jurisdiction);
      case 2: // Real Estate
        return true; // Optional step
      case 3: // Financial Accounts
        return true; // Optional step
      case 4: // Personal Property
        return true; // Optional step
      case 5: // Debts
        return true; // Optional step
      case 6: // Special Circumstances
        return true; // Optional step
      default:
        return true;
    }
  };

  const goToStep = useCallback((stepNumber: number) => {
    if (stepNumber >= 1 && stepNumber <= totalSteps) {
      setFormState(prev => ({
        ...prev,
        currentStep: stepNumber
      }));
    }
  }, [totalSteps]);

  const nextStep = useCallback(() => {
    setFormState(prev => {
      const nextStepNumber = Math.min(prev.currentStep + 1, totalSteps);
      return {
        ...prev,
        currentStep: nextStepNumber
      };
    });
  }, [totalSteps]);

  const prevStep = useCallback(() => {
    setFormState(prev => {
      const prevStepNumber = Math.max(prev.currentStep - 1, 1);
      return {
        ...prev,
        currentStep: prevStepNumber
      };
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
      canProceed: false
    };

    setFormState(resetState);

    // Clear saved data
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

  const canNavigateToStep = useCallback((stepNumber: number) => {
    // Allow navigation to current step or any previous step
    if (stepNumber <= formState.currentStep) return true;
    
    // Allow navigation to next step if current step is complete
    if (stepNumber === formState.currentStep + 1) {
      return formState.steps[formState.currentStep - 1]?.isComplete || false;
    }
    
    return false;
  }, [formState.currentStep, formState.steps]);

  return {
    // State
    formState,
    currentStep: formState.currentStep,
    totalSteps: formState.totalSteps,
    isValid: formState.isValid,
    canProceed: formState.canProceed,
    lastSaved: formState.lastSaved,
    
    // Step data
    getCurrentStepData,
    getAllData,
    updateStepData,
    
    // Navigation
    goToStep,
    nextStep,
    prevStep,
    canNavigateToStep,
    
    // Utilities
    resetForm,
    getProgress,
    
    // Individual step completion status
    isStepComplete: (stepNumber: number) => 
      formState.steps[stepNumber - 1]?.isComplete || false,
    
    // Check if we're on the last step
    isLastStep: formState.currentStep === totalSteps,
    
    // Check if we're on the first step
    isFirstStep: formState.currentStep === 1,
  };
}