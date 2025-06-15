'use client';

import { useEffect } from 'react';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, DollarSign, PlusCircle, Trash2, XCircle } from 'lucide-react';

// Schema for a single property (remains the same)
const realEstatePropertySchema = z.object({
  id: z.string().optional(), // For potential unique key, not strictly needed by RHF useFieldArray's own id
  description: z.string().min(1, "Property description or address is required."),
  propertyType: z.enum([
    "primary_residence",
    "rental_property",
    "vacation_home",
    "land",
    "other"
  ], { required_error: "Property type is required." }),
  currentValue: z.preprocess(
    (val) => String(val).replace(/[^0-9.-]+/g, ''),
    z.string().min(1, "Current market value is required.")
      .refine(val => !isNaN(parseFloat(val)), { message: "Must be a valid number."})
      .refine(val => parseFloat(val) > 0, { message: "Value must be positive."})
  ),
  acquisitionDate: z.string().optional(),
  acquisitionValue: z.preprocess(
    (val) => String(val).replace(/[^0-9.-]+/g, ''),
    z.string().optional()
      .refine(val => val === '' || val === undefined || !isNaN(parseFloat(val)), { message: "Must be a valid number if provided."})
      .refine(val => val === '' || val === undefined || parseFloat(val) > 0, { message: "Value must be positive if provided."})
  ).optional(),
  mortgageBalance: z.preprocess(
    (val) => String(val).replace(/[^0-9.-]+/g, ''),
    z.string().optional()
      .refine(val => val === '' || val === undefined || !isNaN(parseFloat(val)), { message: "Must be a valid number if provided."})
      .refine(val => val === '' || val === undefined || parseFloat(val) >= 0, { message: "Value cannot be negative."})
  ).optional(),
  isSeparateProperty: z.boolean().default(false),
  ownedBy: z.enum(["joint", "spouse1", "spouse2"]).optional(),
  notes: z.string().optional(),
  isQuasiCommunityProperty: z.boolean().default(false), // <-- ADD THIS LINE
})
.superRefine((data, ctx) => {
    if (data.isSeparateProperty && !data.ownedBy) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ownedBy"],
        message: "Ownership is required for separate property.",
      });
    }
     if (!data.isSeparateProperty && data.ownedBy && data.ownedBy !== 'joint') {
      // If not separate, ownedBy should ideally be 'joint' or cleared.
      // This logic is better handled by setValue in useEffect but can be a validation too.
    }
  });

type RealEstatePropertyFormData = z.infer<typeof realEstatePropertySchema>;

// Schema for the entire step's data
const realEstateStepSchema = z.object({
  realEstateProperties: z.array(realEstatePropertySchema).optional(),
});

type RealEstateStepFormData = z.infer<typeof realEstateStepSchema>;

interface RealEstateStepProps {
  data: RealEstateStepFormData; // Updated to use RealEstateStepFormData
  onUpdate: (data: RealEstateStepFormData) => void; // Ensure onUpdate expects the correct type
}

// Sub-component for managing the isSeparateProperty and ownedBy fields
function PropertyOwnershipFields({ control, fieldIndex, errors }: { control: any, fieldIndex: number, errors: any }) {
  const isSeparate = useWatch({
    control,
    name: `realEstateProperties.${fieldIndex}.isSeparateProperty`
  });

  useEffect(() => {
    if (!isSeparate) {
      // If not separate, default ownedBy to 'joint'.
      // This interaction is better than trying to force it via Zod refinement alone for UX.
      control.setValue(`realEstateProperties.${fieldIndex}.ownedBy`, 'joint');
    }
  }, [isSeparate, control, fieldIndex]);

  return (
    <>
      <div className="space-y-2">
        <Label>Property Status <span className="text-red-500">*</span></Label>
        <Controller
          name={`realEstateProperties.${fieldIndex}.isSeparateProperty`}
          control={control}
          render={({ field }) => (
            <Select
              onValueChange={(value) => field.onChange(value === 'true')}
              defaultValue={String(field.value)}
            >
              <SelectTrigger className={errors?.isSeparateProperty ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select property status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Community/Marital Property</SelectItem>
                <SelectItem value="true">Separate Property</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors?.isSeparateProperty && (
          <p className="text-sm text-red-500 mt-1">{typeof errors.isSeparateProperty.message === 'string' ? errors.isSeparateProperty.message : 'Invalid selection'}</p>
        )}
      </div>

      {isSeparate && (
        <div>
          <Label htmlFor={`realEstateProperties.${fieldIndex}.ownedBy`}>If Separate, Owned By <span className="text-red-500">*</span></Label>
          <Controller
            name={`realEstateProperties.${fieldIndex}.ownedBy`}
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger className={errors?.ownedBy ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spouse1">You (Spouse 1)</SelectItem>
                  <SelectItem value="spouse2">Your Spouse (Spouse 2)</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors?.ownedBy && (
            <p className="text-sm text-red-500 mt-1">{errors.ownedBy.message}</p>
          )}
        </div>
      )}
    </>
  );
}


export function RealEstateStep({ data, onUpdate }: RealEstateStepProps) {
  const {
    control,
    register,
    handleSubmit, // We might not use a single top-level submit button for the whole array
    formState: { errors },
    watch, // Watch the entire array for changes to pass to onUpdate
  } = useForm<RealEstateStepFormData>({ // Use the main step schema
    resolver: zodResolver(realEstateStepSchema),
    defaultValues: {
      realEstateProperties: data.realEstateProperties && data.realEstateProperties.length > 0 ? data.realEstateProperties : [{
        description: '',
        propertyType: undefined,
        currentValue: '',
        acquisitionDate: '',
        acquisitionValue: '',
        mortgageBalance: '',
        isSeparateProperty: false,
        ownedBy: 'joint',
        notes: '',
      }], // Default with one empty item if no data
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "realEstateProperties",
  });

  // Watch the entire field array and propagate changes upwards
  const watchedProperties = watch("realEstateProperties");
  useEffect(() => {
    onUpdate({ realEstateProperties: watchedProperties });
  }, [watchedProperties, onUpdate]);

  const addNewProperty = () => {
    append({
      description: '',
      propertyType: undefined,
      currentValue: '',
      acquisitionDate: '',
      acquisitionValue: '',
      mortgageBalance: '',
      isSeparateProperty: false,
      ownedBy: 'joint',
      isQuasiCommunityProperty: false, // <-- ADD THIS LINE
      notes: '',
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Home className="h-6 w-6 mr-2 text-blue-600" />
              Real Estate Assets
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addNewProperty}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Property
            </Button>
          </CardTitle>
          <CardDescription>
            List all real estate properties. Add each property individually.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fields.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              <p>No real estate properties added yet.</p>
              <Button type="button" variant="link" onClick={addNewProperty} className="mt-2">
                Add your first property
              </Button>
            </div>
          )}
          <div className="space-y-8">
            {fields.map((item, index) => (
              <div key={item.id} className="p-6 border rounded-lg shadow-sm relative bg-slate-50">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-gray-800">
                    Property #{index + 1}
                  </h4>
                  {fields.length > 0 && ( // Show remove button only if there's at least one item
                     <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="text-red-500 hover:text-red-700"
                        aria-label={`Remove property ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Remove
                      </Button>
                  )}
                </div>

                <div className="space-y-6">
                  <div>
                    <Label htmlFor={`realEstateProperties.${index}.description`}>Description / Address <span className="text-red-500">*</span></Label>
                    <Input
                      id={`realEstateProperties.${index}.description`}
                      {...register(`realEstateProperties.${index}.description`)}
                      placeholder="e.g., 123 Main St, Anytown or Primary Home"
                      className={errors.realEstateProperties?.[index]?.description ? 'border-red-500' : ''}
                    />
                    {errors.realEstateProperties?.[index]?.description && (
                      <p className="text-sm text-red-500 mt-1">{errors.realEstateProperties?.[index]?.description?.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`realEstateProperties.${index}.propertyType`}>Property Type <span className="text-red-500">*</span></Label>
                    <Controller
                      name={`realEstateProperties.${index}.propertyType`}
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger className={errors.realEstateProperties?.[index]?.propertyType ? 'border-red-500' : ''}>
                            <SelectValue placeholder="Select property type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="primary_residence">Primary Residence</SelectItem>
                            <SelectItem value="rental_property">Rental Property</SelectItem>
                            <SelectItem value="vacation_home">Vacation Home</SelectItem>
                            <SelectItem value="land">Land</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.realEstateProperties?.[index]?.propertyType && (
                      <p className="text-sm text-red-500 mt-1">{errors.realEstateProperties?.[index]?.propertyType?.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor={`realEstateProperties.${index}.currentValue`}>Current Market Value <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id={`realEstateProperties.${index}.currentValue`}
                          type="text"
                          {...register(`realEstateProperties.${index}.currentValue`)}
                          placeholder="e.g., 500000"
                          className={`pl-8 ${errors.realEstateProperties?.[index]?.currentValue ? 'border-red-500' : ''}`}
                        />
                      </div>
                      {errors.realEstateProperties?.[index]?.currentValue && (
                        <p className="text-sm text-red-500 mt-1">{errors.realEstateProperties?.[index]?.currentValue?.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor={`realEstateProperties.${index}.acquisitionDate`}>Acquisition Date</Label>
                      <Controller
                        name={`realEstateProperties.${index}.acquisitionDate`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            id={`realEstateProperties.${index}.acquisitionDate`}
                            type="date"
                            {...field} // Spread field props
                            className={errors.realEstateProperties?.[index]?.acquisitionDate ? 'border-red-500' : ''}
                          />
                        )}
                      />
                       {errors.realEstateProperties?.[index]?.acquisitionDate && (
                        <p className="text-sm text-red-500 mt-1">{errors.realEstateProperties?.[index]?.acquisitionDate?.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor={`realEstateProperties.${index}.acquisitionValue`}>Acquisition Value</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id={`realEstateProperties.${index}.acquisitionValue`}
                          type="text"
                          {...register(`realEstateProperties.${index}.acquisitionValue`)}
                          placeholder="e.g., 300000"
                          className={`pl-8 ${errors.realEstateProperties?.[index]?.acquisitionValue ? 'border-red-500' : ''}`}
                        />
                      </div>
                      {errors.realEstateProperties?.[index]?.acquisitionValue && (
                        <p className="text-sm text-red-500 mt-1">{errors.realEstateProperties?.[index]?.acquisitionValue?.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor={`realEstateProperties.${index}.mortgageBalance`}>Mortgage Balance</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id={`realEstateProperties.${index}.mortgageBalance`}
                          type="text"
                          {...register(`realEstateProperties.${index}.mortgageBalance`)}
                          placeholder="e.g., 200000"
                          className={`pl-8 ${errors.realEstateProperties?.[index]?.mortgageBalance ? 'border-red-500' : ''}`}
                        />
                      </div>
                      {errors.realEstateProperties?.[index]?.mortgageBalance && (
                        <p className="text-sm text-red-500 mt-1">{errors.realEstateProperties?.[index]?.mortgageBalance?.message}</p>
                      )}
                    </div>
                  </div>

                  <PropertyOwnershipFields
                    control={control}
                    fieldIndex={index}
                    errors={errors.realEstateProperties?.[index]}
                  />

                  {/* QCP Switch */}
                  <div className="space-y-1 pt-3"> {/* Adjusted spacing slightly */}
                    <div className="flex items-center space-x-3"> {/* Increased space between switch and label */}
                      <Controller
                        name={`realEstateProperties.${index}.isQuasiCommunityProperty`}
                        control={control}
                        defaultValue={false} // Explicit default for Controller
                        render={({ field }) => (
                          <Switch
                            id={`realEstateProperties.${index}.isQuasiCommunityProperty`}
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            aria-labelledby={`qcp-label-${index}`}
                          />
                        )}
                      />
                      <Label htmlFor={`realEstateProperties.${index}.isQuasiCommunityProperty`} id={`qcp-label-${index}`} className="cursor-pointer text-sm font-medium">
                        Is this Quasi-Community Property?
                      </Label>
                    </div>
                    <p className="text-xs text-gray-500 pl-10"> {/* Indent help text under switch */}
                      Applies to property acquired while living out-of-state that would be community property if acquired in this state (e.g., CA, AZ, ID, WA).
                    </p>
                    {/* No specific error message needed for a boolean switch usually, unless a complex validation depends on it */}
                  </div>

                  <div>
                    <Label htmlFor={`realEstateProperties.${index}.notes`}>Notes</Label>
                    <Input
                      id={`realEstateProperties.${index}.notes`}
                      {...register(`realEstateProperties.${index}.notes`)}
                      placeholder="e.g., Needs repairs, inherited from aunt"
                      className={errors.realEstateProperties?.[index]?.notes ? 'border-red-500' : ''}
                    />
                     {errors.realEstateProperties?.[index]?.notes && (
                        <p className="text-sm text-red-500 mt-1">{errors.realEstateProperties?.[index]?.notes?.message}</p>
                      )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {/* No top-level submit button here; data is updated via onUpdate on watch.
          Step completion will be determined by useMultiStepForm's validation logic. */}
    </div>
  );
}

export default RealEstateStep;
