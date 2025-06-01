'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button'; // If needed for any actions within the form
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea'; // Assuming Textarea component exists
import { Switch } from '@/components/ui/switch';     // Assuming Switch component exists
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, FileText, HeartPulse, Users, DollarSignIcon, Scale } from 'lucide-react'; // Added more icons

// --- Zod Schema (as defined previously) ---
const healthStatusEnum = z.enum([
  "not_applicable", "excellent", "good", "fair", "poor"
], { required_error: "Health status selection is required." });

const specialCircumstancesSchema = z.object({
  hasPrenup: z.boolean().default(false),
  prenupDetails: z.string().optional(),
  marriageDurationYears: z.preprocess(
    (val) => String(val).replace(/[^0-9]/g, ''),
    z.string().optional()
      .refine(val => val === '' || val === undefined || (parseInt(val, 10) >= 0 && parseInt(val, 10) <= 100),
              { message: "Years must be between 0 and 100 if provided." })
  ).optional(),
  healthSpouse1: healthStatusEnum.default("not_applicable"),
  healthSpouse2: healthStatusEnum.default("not_applicable"),
  contributionDetailsSpouse1: z.string().optional(),
  contributionDetailsSpouse2: z.string().optional(),
  domesticViolence: z.boolean().default(false),
  domesticViolenceDetails: z.string().optional(),
  wastingOfAssets: z.boolean().default(false),
  wastingOfAssetsDetails: z.string().optional(),
  significantTaxConsequences: z.boolean().default(false),
  significantTaxConsequencesDetails: z.string().optional(),
  otherSignificantCircumstances: z.string().optional(),
})
.superRefine((data, ctx) => {
  if (data.hasPrenup && (!data.prenupDetails || data.prenupDetails.trim() === "")) {
    ctx.addIssue({ path: ["prenupDetails"], message: "Details are required if a prenuptial agreement exists." });
  }
  if (data.domesticViolence && (!data.domesticViolenceDetails || data.domesticViolenceDetails.trim() === "")) {
    ctx.addIssue({ path: ["domesticViolenceDetails"], message: "Details are required if domestic violence is indicated." });
  }
  if (data.wastingOfAssets && (!data.wastingOfAssetsDetails || data.wastingOfAssetsDetails.trim() === "")) {
    ctx.addIssue({ path: ["wastingOfAssetsDetails"], message: "Details are required if wasting of assets is indicated." });
  }
  if (data.significantTaxConsequences && (!data.significantTaxConsequencesDetails || data.significantTaxConsequencesDetails.trim() === "")) {
    ctx.addIssue({ path: ["significantTaxConsequencesDetails"], message: "Details are required if significant tax consequences are indicated." });
  }
});

type SpecialCircumstancesFormData = z.infer<typeof specialCircumstancesSchema>;

interface SpecialCircumstancesStepProps {
  data: SpecialCircumstancesFormData;
  onUpdate: (data: SpecialCircumstancesFormData) => void;
}

export function SpecialCircumstancesStep({ data, onUpdate }: SpecialCircumstancesStepProps) {
  const { control, register, handleSubmit, formState: { errors }, watch, setValue } = useForm<SpecialCircumstancesFormData>({
    resolver: zodResolver(specialCircumstancesSchema),
    defaultValues: data || { // Initialize with passed data or defaults from schema
      hasPrenup: false,
      healthSpouse1: "not_applicable",
      healthSpouse2: "not_applicable",
      domesticViolence: false,
      wastingOfAssets: false,
      significantTaxConsequences: false,
    },
  });

  const watchedFields = watch(); // Watch all fields
  useEffect(() => {
    onUpdate(watchedFields);
  }, [watchedFields, onUpdate]);

  // Conditional visibility watchers
  const watchHasPrenup = watch("hasPrenup");
  const watchDomesticViolence = watch("domesticViolence");
  const watchWastingOfAssets = watch("wastingOfAssets");
  const watchSignificantTaxConsequences = watch("significantTaxConsequences");

  // Reset detail fields if their corresponding boolean is toggled off
  useEffect(() => { if (!watchHasPrenup) setValue("prenupDetails", ""); }, [watchHasPrenup, setValue]);
  useEffect(() => { if (!watchDomesticViolence) setValue("domesticViolenceDetails", ""); }, [watchDomesticViolence, setValue]);
  useEffect(() => { if (!watchWastingOfAssets) setValue("wastingOfAssetsDetails", ""); }, [watchWastingOfAssets, setValue]);
  useEffect(() => { if (!watchSignificantTaxConsequences) setValue("significantTaxConsequencesDetails", ""); }, [watchSignificantTaxConsequences, setValue]);


  // onSubmit is not strictly necessary if data is updated on watch,
  // but can be useful for explicit save/validation trigger if desired.
  // For now, we rely on the useEffect above.
  // const onSubmit = (formData: SpecialCircumstancesFormData) => {
  //   onUpdate(formData);
  // };

  return (
    <form className="space-y-8"> {/* Removed onSubmit={handleSubmit(onSubmit)} for now */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-6 w-6 mr-2 text-blue-600" />
            Legal Agreements & Duration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Has Prenup */}
          <div className="flex items-center space-x-2">
            <Controller name="hasPrenup" control={control} render={({ field }) => <Switch id="hasPrenup" checked={field.value} onCheckedChange={field.onChange} />} />
            <Label htmlFor="hasPrenup" className="cursor-pointer">Do you have a prenuptial or postnuptial agreement?</Label>
          </div>
          {watchHasPrenup && (
            <div>
              <Label htmlFor="prenupDetails">Details of the agreement (e.g., key terms affecting property division) <span className="text-red-500">*</span></Label>
              <Textarea id="prenupDetails" {...register("prenupDetails")} placeholder="Summarize relevant terms" className={errors.prenupDetails ? 'border-red-500' : ''} rows={3}/>
              {errors.prenupDetails && <p className="text-sm text-red-500 mt-1">{errors.prenupDetails.message}</p>}
            </div>
          )}
          {/* Marriage Duration */}
          <div>
            <Label htmlFor="marriageDurationYears">Duration of Marriage (in years, if known and relevant beyond calculated dates)</Label>
            <Input id="marriageDurationYears" type="number" {...register("marriageDurationYears")} placeholder="e.g., 10" className={errors.marriageDurationYears ? 'border-red-500' : ''}/>
            {errors.marriageDurationYears && <p className="text-sm text-red-500 mt-1">{errors.marriageDurationYears.message}</p>}
            <p className="text-xs text-gray-500 mt-1">This may be calculated from dates in Step 1. Enter here if there are specific considerations about the duration.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <HeartPulse className="h-6 w-6 mr-2 text-blue-600" />
            Health Considerations
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="healthSpouse1">Your Health Status (Spouse 1)</Label>
            <Controller name="healthSpouse1" control={control} render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger className={errors.healthSpouse1 ? 'border-red-500' : ''}><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_applicable">Prefer not to say / Not applicable</SelectItem>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            )} />
            {errors.healthSpouse1 && <p className="text-sm text-red-500 mt-1">{errors.healthSpouse1.message}</p>}
          </div>
          <div>
            <Label htmlFor="healthSpouse2">Spouse's Health Status (Spouse 2)</Label>
            <Controller name="healthSpouse2" control={control} render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger className={errors.healthSpouse2 ? 'border-red-500' : ''}><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_applicable">Prefer not to say / Not applicable</SelectItem>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            )} />
            {errors.healthSpouse2 && <p className="text-sm text-red-500 mt-1">{errors.healthSpouse2.message}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-6 w-6 mr-2 text-blue-600" />
            Contributions to Marriage
          </CardTitle>
          <CardDescription>Describe significant non-financial contributions, career support, homemaking, etc., by each spouse.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="contributionDetailsSpouse1">Your Contributions (Spouse 1)</Label>
            <Textarea id="contributionDetailsSpouse1" {...register("contributionDetailsSpouse1")} placeholder="e.g., Primary caregiver, supported spouse's education, managed household." className={errors.contributionDetailsSpouse1 ? 'border-red-500' : ''} rows={3}/>
            {errors.contributionDetailsSpouse1 && <p className="text-sm text-red-500 mt-1">{errors.contributionDetailsSpouse1.message}</p>}
          </div>
          <div>
            <Label htmlFor="contributionDetailsSpouse2">Spouse's Contributions (Spouse 2)</Label>
            <Textarea id="contributionDetailsSpouse2" {...register("contributionDetailsSpouse2")} placeholder="e.g., Primary earner, significant career sacrifices for family, home improvements." className={errors.contributionDetailsSpouse2 ? 'border-red-500' : ''} rows={3}/>
            {errors.contributionDetailsSpouse2 && <p className="text-sm text-red-500 mt-1">{errors.contributionDetailsSpouse2.message}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-6 w-6 mr-2 text-orange-500" />
            Conduct & Financial Factors
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Domestic Violence */}
          <div className="flex items-center space-x-2">
            <Controller name="domesticViolence" control={control} render={({ field }) => <Switch id="domesticViolence" checked={field.value} onCheckedChange={field.onChange} />} />
            <Label htmlFor="domesticViolence" className="cursor-pointer">Has there been any domestic violence during the marriage that might be relevant?</Label>
          </div>
          {watchDomesticViolence && (
            <div>
              <Label htmlFor="domesticViolenceDetails">Details regarding domestic violence (optional, provide if comfortable and relevant) <span className="text-red-500">*</span></Label>
              <Textarea id="domesticViolenceDetails" {...register("domesticViolenceDetails")} placeholder="Describe briefly if applicable" className={errors.domesticViolenceDetails ? 'border-red-500' : ''} rows={3}/>
              {errors.domesticViolenceDetails && <p className="text-sm text-red-500 mt-1">{errors.domesticViolenceDetails.message}</p>}
            </div>
          )}

          {/* Wasting of Assets */}
          <div className="flex items-center space-x-2">
            <Controller name="wastingOfAssets" control={control} render={({ field }) => <Switch id="wastingOfAssets" checked={field.value} onCheckedChange={field.onChange} />} />
            <Label htmlFor="wastingOfAssets" className="cursor-pointer">Has there been any wasting or dissipation of marital assets by either spouse?</Label>
          </div>
          {watchWastingOfAssets && (
            <div>
              <Label htmlFor="wastingOfAssetsDetails">Details of asset wasting (e.g., gambling, extravagant spending without consent) <span className="text-red-500">*</span></Label>
              <Textarea id="wastingOfAssetsDetails" {...register("wastingOfAssetsDetails")} placeholder="Describe the situation" className={errors.wastingOfAssetsDetails ? 'border-red-500' : ''} rows={3}/>
              {errors.wastingOfAssetsDetails && <p className="text-sm text-red-500 mt-1">{errors.wastingOfAssetsDetails.message}</p>}
            </div>
          )}

          {/* Significant Tax Consequences */}
          <div className="flex items-center space-x-2">
            <Controller name="significantTaxConsequences" control={control} render={({ field }) => <Switch id="significantTaxConsequences" checked={field.value} onCheckedChange={field.onChange} />} />
            <Label htmlFor="significantTaxConsequences" className="cursor-pointer">Are there any known significant tax consequences related to the division of specific assets?</Label>
          </div>
          {watchSignificantTaxConsequences && (
            <div>
              <Label htmlFor="significantTaxConsequencesDetails">Details of tax consequences (e.g., large capital gains on asset sale) <span className="text-red-500">*</span></Label>
              <Textarea id="significantTaxConsequencesDetails" {...register("significantTaxConsequencesDetails")} placeholder="Describe the tax implications" className={errors.significantTaxConsequencesDetails ? 'border-red-500' : ''} rows={3}/>
              {errors.significantTaxConsequencesDetails && <p className="text-sm text-red-500 mt-1">{errors.significantTaxConsequencesDetails.message}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
         <CardTitle className="flex items-center">
            <Scale className="h-6 w-6 mr-2 text-blue-600" />
            Other Significant Circumstances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="otherSignificantCircumstances">Are there any other significant circumstances the calculator should consider for equitable distribution (if applicable in your state)?</Label>
            <Textarea id="otherSignificantCircumstances" {...register("otherSignificantCircumstances")} placeholder="Describe any other factors" className={errors.otherSignificantCircumstances ? 'border-red-500' : ''} rows={4}/>
            {errors.otherSignificantCircumstances && <p className="text-sm text-red-500 mt-1">{errors.otherSignificantCircumstances.message}</p>}
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

export default SpecialCircumstancesStep;
