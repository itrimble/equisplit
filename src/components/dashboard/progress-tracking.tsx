'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircleIcon, 
  ClockIcon,
  PlayIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface ProgressTrackingProps {
  userId: string;
}

// Mock data - replace with actual API calls
const mockInProgressCalculations = [
  {
    id: 'calc_124',
    state: 'Pennsylvania',
    calculationType: 'EQUITABLE_DISTRIBUTION',
    progress: 65,
    currentStep: 'Asset Valuation',
    totalSteps: 6,
    completedSteps: 4,
    lastUpdated: new Date('2024-06-14T10:30:00'),
    nextAction: 'Complete property appraisal values',
    estimatedTimeRemaining: '15 minutes',
  },
  {
    id: 'calc_126',
    state: 'California',
    calculationType: 'COMMUNITY_PROPERTY',
    progress: 25,
    currentStep: 'Income Information',
    totalSteps: 5,
    completedSteps: 1,
    lastUpdated: new Date('2024-06-13T16:45:00'),
    nextAction: 'Enter spouse employment details',
    estimatedTimeRemaining: '25 minutes',
  },
];

const calculationSteps = {
  COMMUNITY_PROPERTY: [
    'Basic Information',
    'Asset Information',
    'Debt Information',
    'Income Information',
    'Review & Calculate',
  ],
  EQUITABLE_DISTRIBUTION: [
    'Basic Information',
    'Asset Information',
    'Debt Information',
    'Asset Valuation',
    'Equity Factors',
    'Review & Calculate',
  ],
};

function getStepStatus(stepIndex: number, completedSteps: number, currentStepIndex: number) {
  if (stepIndex < completedSteps) return 'completed';
  if (stepIndex === currentStepIndex) return 'current';
  return 'pending';
}

export function ProgressTracking({ userId }: ProgressTrackingProps) {
  if (mockInProgressCalculations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5" />
            Progress Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No calculations in progress
          </h3>
          <p className="text-gray-500 mb-4">
            Start a new calculation to track your progress here
          </p>
          <Link href="/calculator">
            <Button>
              <PlayIcon className="h-4 w-4 mr-2" />
              Start New Calculation
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClockIcon className="h-5 w-5" />
          Progress Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {mockInProgressCalculations.map((calculation) => {
          const steps = calculationSteps[calculation.calculationType];
          const currentStepIndex = steps.indexOf(calculation.currentStep);
          
          return (
            <div key={calculation.id} className="border rounded-lg p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {calculation.state} Property Division
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200">
                      {calculation.calculationType.replace('_', ' ')}
                    </Badge>
                    <span className="text-sm text-gray-500">ID: {calculation.id}</span>
                  </div>
                </div>
                
                <Link href={`/calculator?resume=${calculation.id}`}>
                  <Button size="sm">
                    Continue
                  </Button>
                </Link>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Step {calculation.completedSteps + 1} of {calculation.totalSteps}
                  </span>
                  <span className="text-sm text-gray-500">
                    {calculation.progress}% complete
                  </span>
                </div>
                <Progress value={calculation.progress} className="h-2" />
              </div>

              {/* Current Status */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      Next: {calculation.nextAction}
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Estimated time: {calculation.estimatedTimeRemaining}
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">
                      Last updated: {calculation.lastUpdated.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Step Progress */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Calculation Steps
                </h4>
                {steps.map((step, index) => {
                  const status = getStepStatus(index, calculation.completedSteps, currentStepIndex);
                  
                  return (
                    <div key={step} className="flex items-center gap-3">
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                        status === 'completed' 
                          ? 'bg-green-100 text-green-600'
                          : status === 'current'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        {status === 'completed' ? (
                          <CheckCircleIcon className="h-4 w-4" />
                        ) : (
                          <span className="text-xs font-medium">{index + 1}</span>
                        )}
                      </div>
                      
                      <span className={`text-sm ${
                        status === 'completed'
                          ? 'text-green-700 font-medium'
                          : status === 'current'
                          ? 'text-blue-700 font-medium'
                          : 'text-gray-500'
                      }`}>
                        {step}
                        {status === 'current' && (
                          <Badge variant="outline" className="ml-2 text-blue-700 bg-blue-50 border-blue-200">
                            Current
                          </Badge>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-6 pt-4 border-t">
                <Link href={`/calculator?resume=${calculation.id}`}>
                  <Button size="sm">
                    <PlayIcon className="h-4 w-4 mr-1" />
                    Continue
                  </Button>
                </Link>
                <Link href={`/dashboard/calculations/${calculation.id}`}>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </Link>
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                  Delete Draft
                </Button>
              </div>
            </div>
          );
        })}

        {/* Auto-save Notice */}
        <div className="text-center pt-4 border-t">
          <p className="text-sm text-gray-500">
            💾 Your progress is automatically saved as you complete each step
          </p>
        </div>
      </CardContent>
    </Card>
  );
}