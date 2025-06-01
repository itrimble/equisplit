'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard } from 'lucide-react'; // Icon for debts

interface DebtsStepProps {
  data: Record<string, any>;
  onUpdate: (data: Record<string, any>) => void;
}

export function DebtsStep({ data, onUpdate }: DebtsStepProps) {
  // Simulate marking step as complete for navigation
  useEffect(() => {
    onUpdate({ __stepComplete: true });
  }, [onUpdate]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Debts & Liabilities
          </CardTitle>
          <CardDescription>
            Information about mortgages, loans, credit card debts, and other liabilities will be collected here.
            This section is currently a placeholder.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Detailed form fields for debts and liabilities will be added in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default DebtsStep;
