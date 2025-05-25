'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { CalculatorStepper } from '@/components/calculator/calculator-stepper';
import { CalculatorSteps } from '@/components/calculator/calculator-steps';
import { CalculatorSidebar } from '@/components/calculator/calculator-sidebar';
import { useMultiStepForm } from '@/hooks/useMultiStepForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Shield, Lock, Save, Clock } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

const TOTAL_STEPS = 6;

export default function CalculatorPage() {
  const searchParams = useSearchParams();
  const preselectedState = searchParams?.get('state');
  
  const {
    formState,
    currentStep,
    totalSteps,
    isValid,
    canProceed,
    lastSaved,
    getCurrentStepData,
    getAllData,
    updateStepData,
    goToStep,
    nextStep,
    prevStep,
    canNavigateToStep,
    resetForm,
    getProgress,
    isStepComplete,
    isLastStep,
    isFirstStep,
  } = useMultiStepForm({
    totalSteps: TOTAL_STEPS,
    autoSaveInterval: 30000, // 30 seconds
    storageKey: 'equisplit-calculator-v1'
  });

  const [showSidebar, setShowSidebar] = useState(false);

  // Pre-populate state if provided in URL
  useEffect(() => {
    if (preselectedState && !getCurrentStepData().jurisdiction) {
      updateStepData(1, { jurisdiction: preselectedState.toUpperCase() });
    }
  }, [preselectedState, getCurrentStepData, updateStepData]);

  const progress = getProgress();

  const stepTitles = [
    'Personal Information',
    'Real Estate Assets',
    'Financial Accounts',
    'Personal Property & Vehicles',
    'Debts & Liabilities',
    'Special Circumstances'
  ];

  const handleSaveProgress = () => {
    // Manual save functionality
    const allData = getAllData();
    console.log('Saving progress:', allData);
    // In a real app, this would save to a backend
  };

  const handleStartOver = () => {
    if (confirm('Are you sure you want to start over? All entered data will be lost.')) {
      resetForm();
    }
  };

  return (
    <MainLayout showFooter={false}>
      {/* Security Notice Bar */}
      <div className="bg-green-50 border-b border-green-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-2 flex items-center justify-center space-x-4 text-sm text-green-700">
            <div className="flex items-center space-x-1">
              <Shield className="h-4 w-4" />
              <span>Your data is encrypted and secure</span>
            </div>
            <div className="flex items-center space-x-1">
              <Lock className="h-4 w-4" />
              <span>Bank-level security</span>
            </div>
            {lastSaved && (
              <div className="flex items-center space-x-1">
                <Save className="h-4 w-4" />
                <span>Auto-saved {new Date(lastSaved).toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex min-h-screen bg-gray-50">
        {/* Mobile Sidebar Toggle */}
        <div className="lg:hidden fixed top-20 left-4 z-10">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSidebar(!showSidebar)}
            className="bg-white"
          >
            {showSidebar ? 'Hide' : 'Show'} Progress
          </Button>
        </div>

        {/* Sidebar */}
        <div className={`
          ${showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          fixed lg:static inset-y-0 left-0 z-40 w-80 bg-white border-r border-gray-200 
          transform transition-transform duration-300 ease-in-out
        `}>
          <CalculatorSidebar
            currentStep={currentStep}
            totalSteps={totalSteps}
            stepTitles={stepTitles}
            progress={progress}
            isStepComplete={isStepComplete}
            canNavigateToStep={canNavigateToStep}
            onStepClick={goToStep}
            onSaveProgress={handleSaveProgress}
            onStartOver={handleStartOver}
            formData={getAllData()}
          />
        </div>

        {/* Overlay for mobile sidebar */}
        {showSidebar && (
          <div 
            className="lg:hidden fixed inset-0 z-30 bg-black bg-opacity-50"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 lg:ml-0">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Property Division Calculator
                  </h1>
                  <p className="text-lg text-gray-600 mt-1">
                    Step {currentStep} of {totalSteps}: {stepTitles[currentStep - 1]}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500 mb-1">
                    {progress}% Complete
                  </div>
                  <Progress value={progress} className="w-32" />
                </div>
              </div>

              {/* Step Progress Indicator */}
              <CalculatorStepper
                currentStep={currentStep}
                totalSteps={totalSteps}
                stepTitles={stepTitles}
                isStepComplete={isStepComplete}
                canNavigateToStep={canNavigateToStep}
                onStepClick={goToStep}
              />
            </div>

            {/* Step Content */}
            <Card className="mb-8">
              <CardContent className="p-8">
                <CalculatorSteps
                  currentStep={currentStep}
                  stepData={getCurrentStepData()}
                  onUpdateData={(data) => updateStepData(currentStep, data)}
                  preselectedState={preselectedState}
                />
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <div>
                {!isFirstStep && (
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    className="mr-4"
                  >
                    Previous Step
                  </Button>
                )}
              </div>

              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  onClick={handleSaveProgress}
                  className="text-gray-600"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Progress
                </Button>

                {isLastStep ? (
                  <Button
                    variant="legal"
                    size="lg"
                    disabled={!isValid}
                    onClick={() => {
                      // Navigate to results page
                      window.location.href = '/calculator/results';
                    }}
                  >
                    Calculate Division
                  </Button>
                ) : (
                  <Button
                    variant="legal"
                    onClick={nextStep}
                    disabled={!canProceed}
                  >
                    Next Step
                  </Button>
                )}
              </div>
            </div>

            {/* Help Text */}
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Need Help?</strong> This information will be used to calculate your property division 
                according to your state's laws. All data is encrypted and securely stored. You can save your 
                progress and return anytime to complete the calculation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}