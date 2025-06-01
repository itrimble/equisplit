'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react'; // Icon for special circumstances

interface SpecialCircumstancesStepProps {
  data: Record<string, any>;
  onUpdate: (data: Record<string, any>) => void;
}

export function SpecialCircumstancesStep({ data, onUpdate }: SpecialCircumstancesStepProps) {
  // Simulate marking step as complete for navigation
  useEffect(() => {
    onUpdate({ __stepComplete: true });
  }, [onUpdate]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Special Circumstances
          </CardTitle>
          <CardDescription>
            Information about any special circumstances that might affect property division (e.g., prenuptial agreements, inheritances, economic fault) will be collected here.
            This section is currently a placeholder.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Detailed form fields for special circumstances will be added in a future update.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Note: For equitable distribution states, factors like marriage duration, contributions, health, etc., will be collected here or derived to determine a fair division.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default SpecialCircumstancesStep;
