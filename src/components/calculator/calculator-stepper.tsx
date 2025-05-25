'use client';

import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';

interface CalculatorStepperProps {
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
  isStepComplete: (stepNumber: number) => boolean;
  canNavigateToStep: (stepNumber: number) => boolean;
  onStepClick: (stepNumber: number) => void;
}

export function CalculatorStepper({
  currentStep,
  totalSteps,
  stepTitles,
  isStepComplete,
  canNavigateToStep,
  onStepClick
}: CalculatorStepperProps) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center justify-between">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isCurrent = stepNumber === currentStep;
          const isComplete = isStepComplete(stepNumber);
          const canNavigate = canNavigateToStep(stepNumber);
          
          return (
            <li key={stepNumber} className="relative flex-1">
              {/* Step Circle */}
              <div className="flex items-center">
                <button
                  onClick={() => canNavigate && onStepClick(stepNumber)}
                  disabled={!canNavigate}
                  className={cn(
                    'relative flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors',
                    {
                      // Current step
                      'border-blue-600 bg-blue-600 text-white': isCurrent,
                      // Completed step
                      'border-green-600 bg-green-600 text-white hover:bg-green-700': 
                        isComplete && !isCurrent,
                      // Future step (not accessible)
                      'border-gray-300 bg-white text-gray-500 cursor-not-allowed': 
                        !canNavigate && !isCurrent && !isComplete,
                      // Accessible but not current
                      'border-gray-300 bg-white text-gray-500 hover:border-gray-400 hover:bg-gray-50': 
                        canNavigate && !isCurrent && !isComplete,
                    }
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isComplete ? (
                    <Check className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <span>{stepNumber}</span>
                  )}
                </button>

                {/* Step Label - Hidden on mobile, shown on larger screens */}
                <div className="ml-4 hidden sm:block">
                  <div
                    className={cn(
                      'text-sm font-medium',
                      {
                        'text-blue-600': isCurrent,
                        'text-green-600': isComplete && !isCurrent,
                        'text-gray-500': !isCurrent && !isComplete,
                      }
                    )}
                  >
                    {stepTitles[index]}
                  </div>
                  {isCurrent && (
                    <div className="text-xs text-gray-500">Current step</div>
                  )}
                  {isComplete && !isCurrent && (
                    <div className="text-xs text-green-600">Completed</div>
                  )}
                </div>
              </div>

              {/* Connector Line */}
              {stepNumber < totalSteps && (
                <div
                  className={cn(
                    'absolute top-5 left-10 -ml-px h-0.5 w-full',
                    {
                      'bg-green-600': isComplete,
                      'bg-gray-300': !isComplete,
                    }
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile Step Labels */}
      <div className="sm:hidden mt-4">
        <div className="text-center">
          <div className="text-sm font-medium text-gray-900">
            {stepTitles[currentStep - 1]}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Step {currentStep} of {totalSteps}
          </div>
        </div>
      </div>
    </nav>
  );
}