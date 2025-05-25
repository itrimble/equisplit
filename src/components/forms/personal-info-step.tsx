'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STATE_INFO, USState } from '@/utils/states';
import { MapPin, Users, Calendar, AlertCircle } from 'lucide-react';

const personalInfoSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  occupation: z.string().optional(),
  spouseFirstName: z.string().min(1, 'Spouse first name is required'),
  spouseLastName: z.string().min(1, 'Spouse last name is required'),
  spouseEmail: z.string().email().optional().or(z.literal('')),
  spousePhone: z.string().optional(),
  spouseDateOfBirth: z.string().optional(),
  spouseOccupation: z.string().optional(),
  marriageDate: z.string().min(1, 'Marriage date is required'),
  separationDate: z.string().optional(),
  jurisdiction: z.string().min(1, 'State selection is required'),
  currentStatus: z.enum(['married', 'separated', 'filing', 'divorced']),
});

type PersonalInfoFormData = z.infer<typeof personalInfoSchema>;

interface PersonalInfoStepProps {
  data: Record<string, any>;
  onUpdate: (data: Record<string, any>) => void;
  preselectedState?: string | null;
}

export function PersonalInfoStep({ data, onUpdate, preselectedState }: PersonalInfoStepProps) {
  const [selectedState, setSelectedState] = useState<USState | ''>('');

  const form = useForm<PersonalInfoFormData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      email: data.email || '',
      phone: data.phone || '',
      dateOfBirth: data.dateOfBirth || '',
      occupation: data.occupation || '',
      spouseFirstName: data.spouseFirstName || '',
      spouseLastName: data.spouseLastName || '',
      spouseEmail: data.spouseEmail || '',
      spousePhone: data.spousePhone || '',
      spouseDateOfBirth: data.spouseDateOfBirth || '',
      spouseOccupation: data.spouseOccupation || '',
      marriageDate: data.marriageDate || '',
      separationDate: data.separationDate || '',
      jurisdiction: data.jurisdiction || preselectedState?.toUpperCase() || '',
      currentStatus: data.currentStatus || 'separated',
    },
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue } = form;
  const watchedValues = watch();

  // Update parent component when form values change
  useEffect(() => {
    const subscription = watch((value) => {
      onUpdate(value);
    });
    return () => subscription.unsubscribe();
  }, [watch, onUpdate]);

  // Set preselected state
  useEffect(() => {
    if (preselectedState && !selectedState) {
      const stateCode = preselectedState.toUpperCase() as USState;
      setSelectedState(stateCode);
      setValue('jurisdiction', stateCode);
    }
  }, [preselectedState, selectedState, setValue]);

  const handleStateChange = (value: string) => {
    setSelectedState(value as USState);
    setValue('jurisdiction', value);
  };

  const selectedStateInfo = selectedState ? STATE_INFO[selectedState] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Personal Information</h2>
        <p className="text-gray-600">
          Let's start with some basic information about you and your spouse. This helps us 
          determine which state laws apply to your property division.
        </p>
      </div>

      <form className="space-y-6">
        {/* Your Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Your Information
            </CardTitle>
            <CardDescription>
              Enter your personal details
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                {...register('firstName')}
                className={errors.firstName ? 'border-red-500' : ''}
              />
              {errors.firstName && (
                <p className="text-sm text-red-500 mt-1">{errors.firstName.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                {...register('lastName')}
                className={errors.lastName ? 'border-red-500' : ''}
              />
              {errors.lastName && (
                <p className="text-sm text-red-500 mt-1">{errors.lastName.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                {...register('phone')}
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                {...register('dateOfBirth')}
              />
            </div>

            <div>
              <Label htmlFor="occupation">Occupation</Label>
              <Input
                id="occupation"
                {...register('occupation')}
                placeholder="e.g., Software Engineer"
              />
            </div>
          </CardContent>
        </Card>

        {/* Spouse Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Spouse Information
            </CardTitle>
            <CardDescription>
              Enter your spouse's details
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="spouseFirstName">Spouse First Name *</Label>
              <Input
                id="spouseFirstName"
                {...register('spouseFirstName')}
                className={errors.spouseFirstName ? 'border-red-500' : ''}
              />
              {errors.spouseFirstName && (
                <p className="text-sm text-red-500 mt-1">{errors.spouseFirstName.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="spouseLastName">Spouse Last Name *</Label>
              <Input
                id="spouseLastName"
                {...register('spouseLastName')}
                className={errors.spouseLastName ? 'border-red-500' : ''}
              />
              {errors.spouseLastName && (
                <p className="text-sm text-red-500 mt-1">{errors.spouseLastName.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="spouseEmail">Spouse Email</Label>
              <Input
                id="spouseEmail"
                type="email"
                {...register('spouseEmail')}
                className={errors.spouseEmail ? 'border-red-500' : ''}
              />
              {errors.spouseEmail && (
                <p className="text-sm text-red-500 mt-1">{errors.spouseEmail.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="spousePhone">Spouse Phone</Label>
              <Input
                id="spousePhone"
                type="tel"
                {...register('spousePhone')}
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <Label htmlFor="spouseDateOfBirth">Spouse Date of Birth</Label>
              <Input
                id="spouseDateOfBirth"
                type="date"
                {...register('spouseDateOfBirth')}
              />
            </div>

            <div>
              <Label htmlFor="spouseOccupation">Spouse Occupation</Label>
              <Input
                id="spouseOccupation"
                {...register('spouseOccupation')}
                placeholder="e.g., Teacher"
              />
            </div>
          </CardContent>
        </Card>

        {/* Marriage Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Marriage Information
            </CardTitle>
            <CardDescription>
              Key dates and current status of your marriage
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="marriageDate">Marriage Date *</Label>
              <Input
                id="marriageDate"
                type="date"
                {...register('marriageDate')}
                className={errors.marriageDate ? 'border-red-500' : ''}
              />
              {errors.marriageDate && (
                <p className="text-sm text-red-500 mt-1">{errors.marriageDate.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="separationDate">Separation Date</Label>
              <Input
                id="separationDate"
                type="date"
                {...register('separationDate')}
              />
              <p className="text-xs text-gray-500 mt-1">
                When you stopped living together as a married couple
              </p>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="currentStatus">Current Status</Label>
              <select
                {...register('currentStatus')}
                className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2 bg-white"
              >
                <option value="married">Still married and living together</option>
                <option value="separated">Separated but not divorced</option>
                <option value="filing">Filing for divorce</option>
                <option value="divorced">Divorce proceedings started</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* State Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Jurisdiction
            </CardTitle>
            <CardDescription>
              Select the state where you were married or where the divorce will be filed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="jurisdiction">State *</Label>
              <select
                value={selectedState}
                onChange={(e) => handleStateChange(e.target.value)}
                className={`w-full mt-1 border rounded-md px-3 py-2 bg-white ${
                  errors.jurisdiction ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select a state...</option>
                {Object.entries(STATE_INFO).map(([code, info]) => (
                  <option key={code} value={code}>
                    {info.name}
                  </option>
                ))}
              </select>
              {errors.jurisdiction && (
                <p className="text-sm text-red-500 mt-1">{errors.jurisdiction.message}</p>
              )}
            </div>

            {/* State Information */}
            {selectedStateInfo && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-900">
                      {selectedStateInfo.name} Property Division Laws
                    </h4>
                    <p className="text-sm text-blue-700 mt-1">
                      This state follows{' '}
                      <strong>
                        {selectedStateInfo.propertyRegime === 'community' 
                          ? 'Community Property' 
                          : 'Equitable Distribution'
                        }
                      </strong>{' '}
                      laws for property division.
                    </p>
                    {selectedStateInfo.specialRules && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-blue-900">Special Rules:</p>
                        <ul className="text-sm text-blue-700 list-disc list-inside mt-1">
                          {selectedStateInfo.specialRules.map((rule, index) => (
                            <li key={index}>{rule}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}