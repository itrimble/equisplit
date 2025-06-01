'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Car, Gem } from 'lucide-react'; // Using Gem as a generic icon for personal property

interface PersonalPropertyStepProps {
  data: Record<string, any>;
  onUpdate: (data: Record<string, any>) => void;
}

export function PersonalPropertyStep({ data, onUpdate }: PersonalPropertyStepProps) {
  // Simulate marking step as complete for navigation
  useEffect(() => {
    onUpdate({ __stepComplete: true });
  }, [onUpdate]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Car className="h-5 w-5 mr-2" />
            <Gem className="h-5 w-5 mr-2" /> {/* Added Gem for other personal property */}
            Personal Property & Vehicles
          </CardTitle>
          <CardDescription>
            Information about vehicles, jewelry, furniture, and other valuable personal property will be collected here.
            This section is currently a placeholder.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Detailed form fields for personal property and vehicles will be added in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default PersonalPropertyStep;
