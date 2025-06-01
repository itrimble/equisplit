'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Landmark } from 'lucide-react';

interface FinancialAccountsStepProps {
  data: Record<string, any>;
  onUpdate: (data: Record<string, any>) => void;
}

export function FinancialAccountsStep({ data, onUpdate }: FinancialAccountsStepProps) {
  // Simulate marking step as complete for navigation
  useEffect(() => {
    onUpdate({ __stepComplete: true });
  }, [onUpdate]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Landmark className="h-5 w-5 mr-2" />
            Financial Accounts
          </CardTitle>
          <CardDescription>
            Information about bank accounts, investment accounts, and retirement accounts will be collected here.
            This section is currently a placeholder.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Detailed form fields for financial accounts will be added in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default FinancialAccountsStep;
