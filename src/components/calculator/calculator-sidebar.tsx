'use client';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Scale, 
  Save, 
  RotateCcw, 
  Check, 
  Clock,
  Shield,
  Lock,
  HelpCircle,
  FileText,
  DollarSign
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatCurrency } from '@/utils/calculations';

interface CalculatorSidebarProps {
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
  progress: number;
  isStepComplete: (stepNumber: number) => boolean;
  canNavigateToStep: (stepNumber: number) => boolean;
  onStepClick: (stepNumber: number) => void;
  onSaveProgress: () => void;
  onStartOver: () => void;
  formData: Record<string, any>;
}

export function CalculatorSidebar({
  currentStep,
  totalSteps,
  stepTitles,
  progress,
  isStepComplete,
  canNavigateToStep,
  onStepClick,
  onSaveProgress,
  onStartOver,
  formData
}: CalculatorSidebarProps) {
  
  // Calculate estimated values from form data
  const calculateEstimatedValue = () => {
    let totalAssets = 0;
    let totalDebts = 0;
    
    // This is a simplified calculation - in reality, we'd use the full calculation engine
    Object.values(formData).forEach((value: any) => {
      if (typeof value === 'object' && value !== null) {
        if (value.type === 'asset' && value.currentValue) {
          totalAssets += parseFloat(value.currentValue) || 0;
        }
        if (value.type === 'debt' && value.currentBalance) {
          totalDebts += parseFloat(value.currentBalance) || 0;
        }
      }
    });
    
    return { totalAssets, totalDebts, netWorth: totalAssets - totalDebts };
  };

  const { totalAssets, totalDebts, netWorth } = calculateEstimatedValue();

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-2 mb-4">
          <Scale className="h-6 w-6 text-blue-600" />
          <span className="text-lg font-semibold">EquiSplit</span>
        </div>
        
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-500">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Security Indicators */}
        <div className="space-y-2">
          <div className="flex items-center text-xs text-green-600">
            <Shield className="h-3 w-3 mr-1" />
            <span>Data encrypted & secure</span>
          </div>
          <div className="flex items-center text-xs text-green-600">
            <Lock className="h-3 w-3 mr-1" />
            <span>Auto-saved every 30 seconds</span>
          </div>
        </div>
      </div>

      {/* Step Navigation */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Calculator Steps</h3>
          <nav className="space-y-2">
            {stepTitles.map((title, index) => {
              const stepNumber = index + 1;
              const isCurrent = stepNumber === currentStep;
              const isComplete = isStepComplete(stepNumber);
              const canNavigate = canNavigateToStep(stepNumber);
              
              return (
                <button
                  key={stepNumber}
                  onClick={() => canNavigate && onStepClick(stepNumber)}
                  disabled={!canNavigate}
                  className={cn(
                    'w-full flex items-center p-3 text-left text-sm rounded-lg transition-colors',
                    {
                      'bg-blue-50 border border-blue-200 text-blue-700': isCurrent,
                      'bg-green-50 border border-green-200 text-green-700 hover:bg-green-100': 
                        isComplete && !isCurrent && canNavigate,
                      'text-gray-400 cursor-not-allowed': !canNavigate,
                      'text-gray-700 hover:bg-gray-50': canNavigate && !isCurrent && !isComplete,
                    }
                  )}
                >
                  <div className={cn(
                    'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs mr-3',
                    {
                      'bg-blue-600 text-white': isCurrent,
                      'bg-green-600 text-white': isComplete && !isCurrent,
                      'bg-gray-300 text-gray-600': !canNavigate && !isCurrent && !isComplete,
                      'bg-gray-200 text-gray-600': canNavigate && !isCurrent && !isComplete,
                    }
                  )}>
                    {isComplete ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      stepNumber
                    )}
                  </div>
                  <span className="flex-1">{title}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Quick Summary */}
        {(totalAssets > 0 || totalDebts > 0) && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                Quick Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Assets:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(totalAssets)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Debts:</span>
                <span className="font-medium text-red-600">
                  {formatCurrency(totalDebts)}
                </span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between text-sm font-semibold">
                  <span>Net Worth:</span>
                  <span className={netWorth >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(netWorth)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={onSaveProgress}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Progress
          </Button>
          
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-600"
            onClick={onStartOver}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Start Over
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-gray-200 bg-gray-50">
        <div className="space-y-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Get Help
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-gray-600"
          >
            <FileText className="h-4 w-4 mr-2" />
            Legal Disclaimer
          </Button>
        </div>
        
        <div className="mt-4 text-xs text-gray-500 text-center">
          <p>This tool provides educational calculations only.</p>
          <p className="mt-1">Not legal advice.</p>
        </div>
      </div>
    </div>
  );
}