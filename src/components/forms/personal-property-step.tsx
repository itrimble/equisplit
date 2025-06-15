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
import { Car, Gem, DollarSign, PlusCircle, Trash2 } from 'lucide-react';

// --- Zod Schemas ---
const commonPersonalPropertySchemaBase = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Item description is required."),
  currentValue: z.preprocess(
    (val) => String(val).replace(/[^0-9.-]+/g, ''),
    z.string().min(1, "Current value is required.")
      .refine(val => !isNaN(parseFloat(val)), { message: "Must be a valid number." })
      .refine(val => parseFloat(val) >= 0, { message: "Value must be zero or positive." })
  ),
  isSeparateProperty: z.boolean().default(false),
  ownedBy: z.enum(["joint", "spouse1", "spouse2"]).optional(),
  notes: z.string().optional(),
  isQuasiCommunityProperty: z.boolean().default(false), // <-- ADD THIS LINE
});

// Refined common schema with superRefine for ownership
const commonPersonalPropertySchema = commonPersonalPropertySchemaBase.superRefine((data, ctx) => {
  if (data.isSeparateProperty && !data.ownedBy) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["ownedBy"],
      message: "Ownership is required for separate property.",
    });
  }
});

const vehiclePropertySchema = commonPersonalPropertySchema.extend({
  itemCategory: z.literal("vehicle"),
  vehicleMake: z.string().min(1, "Vehicle make is required."),
  vehicleModel: z.string().min(1, "Vehicle model is required."),
  vehicleYear: z.preprocess(
    (val) => String(val).replace(/[^0-9]/g, ''),
    z.string()
      .length(4, "Year must be 4 digits.")
      .refine(val => !isNaN(parseInt(val, 10)) && parseInt(val, 10) > 1900 && parseInt(val, 10) <= new Date().getFullYear() + 1, { message: "Enter a valid year." })
  ),
  vinLast6: z.string()
    .length(6, "Must be last 6 characters of VIN if provided.")
    .regex(/^[a-zA-Z0-9]{6}$/, "Must be 6 alphanumeric characters if provided.")
    .optional()
    .or(z.literal('')),
});

const OTHER_PROPERTY_CATEGORIES = [
  "jewelry", "electronics", "furniture", "art_collectibles", "other_valuables"
] as const;

const otherPersonalPropertySchema = commonPersonalPropertySchema.extend({
  itemCategory: z.enum(OTHER_PROPERTY_CATEGORIES, { required_error: "Item category is required." }),
});

const personalPropertyItemSchema = z.discriminatedUnion("itemCategory", [
  vehiclePropertySchema,
  otherPersonalPropertySchema,
]);

type PersonalPropertyItemFormData = z.infer<typeof personalPropertyItemSchema>;

const personalPropertyStepSchema = z.object({
  personalProperties: z.array(personalPropertyItemSchema).optional(),
});

type PersonalPropertyStepFormData = z.infer<typeof personalPropertyStepSchema>;

interface PersonalPropertyStepProps {
  data: PersonalPropertyStepFormData;
  onUpdate: (data: PersonalPropertyStepFormData) => void;
}

// Sub-component for ownership fields
function PropertyOwnershipFields({ control, fieldIndex, errors, propertyPath }: { control: any, fieldIndex: number, errors: any, propertyPath: string }) {
  const isSeparate = useWatch({
    control,
    name: `${propertyPath}.${fieldIndex}.isSeparateProperty`
  });

  useEffect(() => {
    if (!isSeparate) {
      control.setValue(`${propertyPath}.${fieldIndex}.ownedBy`, 'joint');
    }
    // control.trigger(`${propertyPath}.${fieldIndex}.ownedBy`);
  }, [isSeparate, control, fieldIndex, propertyPath]);

  return (
    <>
      <div className="space-y-2">
        <Label>Property Status <span className="text-red-500">*</span></Label>
        <Controller
          name={`${propertyPath}.${fieldIndex}.isSeparateProperty`}
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
        {errors?.isSeparateProperty && <p className="text-sm text-red-500 mt-1">{errors.isSeparateProperty.message?.toString()}</p>}
      </div>

      {isSeparate && (
        <div>
          <Label htmlFor={`${propertyPath}.${fieldIndex}.ownedBy`}>If Separate, Owned By <span className="text-red-500">*</span></Label>
          <Controller
            name={`${propertyPath}.${fieldIndex}.ownedBy`}
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
          {errors?.ownedBy && <p className="text-sm text-red-500 mt-1">{errors.ownedBy.message?.toString()}</p>}
        </div>
      )}
    </>
  );
}

// Sub-component for Vehicle Specific Fields
function VehicleSpecificFields({ control, fieldIndex, errors, propertyPath }: { control: any, fieldIndex: number, errors: any, propertyPath: string }) {
  return (
    <>
      <div>
        <Label htmlFor={`${propertyPath}.${fieldIndex}.vehicleMake`}>Make <span className="text-red-500">*</span></Label>
        <Input id={`${propertyPath}.${fieldIndex}.vehicleMake`} {...control.register(`${propertyPath}.${fieldIndex}.vehicleMake`)} placeholder="e.g., Toyota" className={errors?.vehicleMake ? 'border-red-500' : ''} />
        {errors?.vehicleMake && <p className="text-sm text-red-500 mt-1">{errors.vehicleMake.message?.toString()}</p>}
      </div>
      <div>
        <Label htmlFor={`${propertyPath}.${fieldIndex}.vehicleModel`}>Model <span className="text-red-500">*</span></Label>
        <Input id={`${propertyPath}.${fieldIndex}.vehicleModel`} {...control.register(`${propertyPath}.${fieldIndex}.vehicleModel`)} placeholder="e.g., Camry" className={errors?.vehicleModel ? 'border-red-500' : ''} />
        {errors?.vehicleModel && <p className="text-sm text-red-500 mt-1">{errors.vehicleModel.message?.toString()}</p>}
      </div>
      <div>
        <Label htmlFor={`${propertyPath}.${fieldIndex}.vehicleYear`}>Year <span className="text-red-500">*</span></Label>
        <Input id={`${propertyPath}.${fieldIndex}.vehicleYear`} type="text" {...control.register(`${propertyPath}.${fieldIndex}.vehicleYear`)} placeholder="e.g., 2020" maxLength={4} className={errors?.vehicleYear ? 'border-red-500' : ''} />
        {errors?.vehicleYear && <p className="text-sm text-red-500 mt-1">{errors.vehicleYear.message?.toString()}</p>}
      </div>
      <div>
        <Label htmlFor={`${propertyPath}.${fieldIndex}.vinLast6`}>VIN (Last 6 Chars, Optional)</Label>
        <Input id={`${propertyPath}.${fieldIndex}.vinLast6`} {...control.register(`${propertyPath}.${fieldIndex}.vinLast6`)} placeholder="e.g., A1B2C3" maxLength={6} className={errors?.vinLast6 ? 'border-red-500' : ''} />
        {errors?.vinLast6 && <p className="text-sm text-red-500 mt-1">{errors.vinLast6.message?.toString()}</p>}
      </div>
    </>
  );
}


export function PersonalPropertyStep({ data, onUpdate }: PersonalPropertyStepProps) {
  const { control, register, formState: { errors }, watch, setValue } = useForm<PersonalPropertyStepFormData>({
    resolver: zodResolver(personalPropertyStepSchema),
    defaultValues: {
      personalProperties: data.personalProperties && data.personalProperties.length > 0 ? data.personalProperties : [], // Start empty if no data
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "personalProperties",
  });

  const watchedItems = watch("personalProperties");
  useEffect(() => {
    onUpdate({ personalProperties: watchedItems });
  }, [watchedItems, onUpdate]);

  const addNewItem = (category?: PersonalPropertyItemFormData['itemCategory']) => {
    const baseItem: any = { // Use 'any' carefully, ensure all common fields are here
      description: '',
      currentValue: '',
      isSeparateProperty: false,
      ownedBy: 'joint',
      isQuasiCommunityProperty: false, // <-- ADD THIS LINE
      notes: '',
    };
    if (category === 'vehicle') {
      append({
        ...baseItem,
        itemCategory: 'vehicle',
        vehicleMake: '',
        vehicleModel: '',
        vehicleYear: '',
        vinLast6: '',
      });
    } else if (category) {
       append({ ...baseItem, itemCategory: category });
    } else {
      // Default to adding a generic 'other_valuables' or prompt user?
      // For now, let's not add if category is not specified and it's not vehicle.
      // Or, add a generic item:
       append({ ...baseItem, itemCategory: 'other_valuables' });
    }
  };

  // Watch individual itemCategory changes to reset conditional fields if category changes
  // This is complex with useFieldArray. Simpler to just let validation catch it for now,
  // or ensure users pick category first.

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Car className="h-6 w-6 mr-2 text-blue-600" />
              <Gem className="h-6 w-6 mr-2 text-blue-600" />
              Personal Property & Vehicles
            </div>
            {/* Simplified Add Button - User selects category inside the item form */}
            <Button type="button" variant="outline" size="sm" onClick={() => addNewItem('other_valuables')}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardTitle>
          <CardDescription>
            List valuable personal property (vehicles, jewelry, electronics, etc.). Choose a category for each item.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fields.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              <p>No personal property items added yet.</p>
              <div className="mt-2 space-x-2">
                 <Button type="button" variant="link" onClick={() => addNewItem('vehicle')}>
                    Add Vehicle
                  </Button>
                  <Button type="button" variant="link" onClick={() => addNewItem('jewelry')}>
                    Add Jewelry / Other
                  </Button>
              </div>
            </div>
          )}
          <div className="space-y-8">
            {fields.map((item, index) => {
              const currentItemCategory = watch(`personalProperties.${index}.itemCategory`);
              return (
                <div key={item.id} className="p-6 border rounded-lg shadow-sm relative bg-slate-50">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold text-gray-800">Item #{index + 1}</h4>
                    <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} className="text-red-500 hover:text-red-700" aria-label={`Remove item ${index + 1}`}>
                      <Trash2 className="h-4 w-4 mr-1" /> Remove
                    </Button>
                  </div>

                  <div className="space-y-6">
                    {/* Item Category */}
                    <div>
                      <Label htmlFor={`personalProperties.${index}.itemCategory`}>Item Category <span className="text-red-500">*</span></Label>
                      <Controller
                        name={`personalProperties.${index}.itemCategory`}
                        control={control}
                        render={({ field }) => (
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              // When category changes, reset specific fields of other categories
                              const currentProperty = watch(`personalProperties.${index}`);
                              const newDefaults: Partial<PersonalPropertyItemFormData> = {
                                ...commonPersonalPropertySchemaBase.parse({ // get defaults for common fields
                                    description: currentProperty.description, // keep existing common values
                                    currentValue: String(currentProperty.currentValue || ''),
                                    isSeparateProperty: currentProperty.isSeparateProperty,
                                    ownedBy: currentProperty.ownedBy,
                                    notes: currentProperty.notes,
                                }),
                                itemCategory: value as PersonalPropertyItemFormData['itemCategory'],
                              };
                              if (value === 'vehicle') {
                                setValue(`personalProperties.${index}`, {
                                  ...newDefaults,
                                  itemCategory: 'vehicle', // Explicitly set
                                  vehicleMake: '', vehicleModel: '', vehicleYear: '', vinLast6: ''
                                } as any); // Use 'as any' carefully or type newDefaults more strictly
                              } else {
                                // Clear vehicle fields if switching away from vehicle
                                const { vehicleMake, vehicleModel, vehicleYear, vinLast6, ...rest } = currentProperty as any;
                                setValue(`personalProperties.${index}`, {
                                   ...newDefaults, // keep common fields
                                   itemCategory: value as PersonalPropertyItemFormData['itemCategory'],
                                   // Ensure vehicle fields are undefined or not present
                                   vehicleMake: undefined, vehicleModel: undefined, vehicleYear: undefined, vinLast6: undefined,
                                } as any); // Use 'as any' or ensure correct typing
                              }
                            }}
                            defaultValue={field.value}
                          >
                            <SelectTrigger className={errors.personalProperties?.[index]?.itemCategory ? 'border-red-500' : ''}>
                              <SelectValue placeholder="Select item category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="vehicle">Vehicle (Car, Truck, Motorcycle, Boat, RV)</SelectItem>
                              <SelectItem value="jewelry">Jewelry</SelectItem>
                              <SelectItem value="electronics">Electronics</SelectItem>
                              <SelectItem value="furniture">Furniture</SelectItem>
                              <SelectItem value="art_collectibles">Art & Collectibles</SelectItem>
                              <SelectItem value="other_valuables">Other Valuables</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.personalProperties?.[index]?.itemCategory && <p className="text-sm text-red-500 mt-1">{errors.personalProperties?.[index]?.itemCategory?.message?.toString()}</p>}
                    </div>

                    {/* Common Fields */}
                    <div>
                      <Label htmlFor={`personalProperties.${index}.description`}>Description <span className="text-red-500">*</span></Label>
                      <Input id={`personalProperties.${index}.description`} {...register(`personalProperties.${index}.description`)} placeholder="e.g., Diamond Necklace, Living Room Sofa" className={errors.personalProperties?.[index]?.description ? 'border-red-500' : ''} />
                      {errors.personalProperties?.[index]?.description && <p className="text-sm text-red-500 mt-1">{errors.personalProperties?.[index]?.description?.message?.toString()}</p>}
                    </div>

                    <div>
                      <Label htmlFor={`personalProperties.${index}.currentValue`}>Current Value <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input id={`personalProperties.${index}.currentValue`} type="text" {...register(`personalProperties.${index}.currentValue`)} placeholder="e.g., 5000" className={`pl-8 ${errors.personalProperties?.[index]?.currentValue ? 'border-red-500' : ''}`} />
                      </div>
                      {errors.personalProperties?.[index]?.currentValue && <p className="text-sm text-red-500 mt-1">{errors.personalProperties?.[index]?.currentValue?.message?.toString()}</p>}
                    </div>

                    {/* Conditional Vehicle Fields */}
                    {currentItemCategory === 'vehicle' && (
                      <VehicleSpecificFields control={control} fieldIndex={index} errors={errors.personalProperties?.[index]} propertyPath="personalProperties" />
                    )}

                    <PropertyOwnershipFields control={control} fieldIndex={index} errors={errors.personalProperties?.[index]} propertyPath="personalProperties" />

                    {/* QCP Switch */}
                    <div className="space-y-1 pt-3">
                      <div className="flex items-center space-x-3">
                        <Controller
                          name={`personalProperties.${index}.isQuasiCommunityProperty`}
                          control={control}
                          defaultValue={false}
                          render={({ field }) => (
                            <Switch
                              id={`personalProperties.${index}.isQuasiCommunityProperty`}
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              aria-labelledby={`qcp-personal-property-label-${index}`}
                            />
                          )}
                        />
                        <Label htmlFor={`personalProperties.${index}.isQuasiCommunityProperty`} id={`qcp-personal-property-label-${index}`} className="cursor-pointer text-sm font-medium">
                          Is this Quasi-Community Property?
                        </Label>
                      </div>
                      <p className="text-xs text-gray-500 pl-10">
                        Applies to property acquired while living out-of-state that would be community property if acquired in this state (e.g., CA, AZ, ID, WA).
                      </p>
                    </div>

                    <div>
                      <Label htmlFor={`personalProperties.${index}.notes`}>Notes (Optional)</Label>
                      <Input id={`personalProperties.${index}.notes`} {...register(`personalProperties.${index}.notes`)} placeholder="e.g., Purchased with inheritance, appraisal details" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PersonalPropertyStep;
