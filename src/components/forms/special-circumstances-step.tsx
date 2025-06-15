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
  contributionDetailsSpouse1: z.string().optional(), // Existing: General contribution
  contributionDetailsSpouse2: z.string().optional(), // Existing: General contribution

  domesticViolence: z.boolean().default(false),
  domesticViolenceDetails: z.string().optional(),
  wastingOfAssets: z.boolean().default(false),
  wastingOfAssetsDetails: z.string().optional(),
  significantTaxConsequences: z.boolean().default(false), // This corresponds to 'taxConsequences' in EquitableDistributionFactors
  significantTaxConsequencesDetails: z.string().optional(),

  // New PA Fields
  priorMarriageSpouse1: z.boolean().default(false).optional(),
  priorMarriageSpouse2: z.boolean().default(false).optional(),
  stationSpouse1: z.string().optional(),
  stationSpouse2: z.string().optional(),
  vocationalSkillsSpouse1: z.string().optional(),
  vocationalSkillsSpouse2: z.string().optional(),
  estateSpouse1: z.preprocess((val) => String(val === null || val === undefined ? '' : val).replace(/[^0-9]/g, ''),
    z.string().optional().refine(val => val === '' || val === undefined || (parseInt(val, 10) >= 0), { message: "Estate value must be a positive number if provided." })
  ).transform(val => val === '' || val === undefined ? undefined : parseInt(val, 10)).optional(),
  estateSpouse2: z.preprocess((val) => String(val === null || val === undefined ? '' : val).replace(/[^0-9]/g, ''),
    z.string().optional().refine(val => val === '' || val === undefined || (parseInt(val, 10) >= 0), { message: "Estate value must be a positive number if provided." })
  ).transform(val => val === '' || val === undefined ? undefined : parseInt(val, 10)).optional(),
  needsSpouse1: z.string().optional(),
  needsSpouse2: z.string().optional(),
  contributionToEducationTrainingSpouse1: z.boolean().default(false).optional(),
  contributionToEducationTrainingSpouse2: z.boolean().default(false).optional(),
  opportunityFutureAcquisitionsSpouse1: z.string().optional(),
  opportunityFutureAcquisitionsSpouse2: z.string().optional(),
  sourcesOfIncomeDetailsSpouse1: z.string().optional(),
  sourcesOfIncomeDetailsSpouse2: z.string().optional(),
  standardOfLiving: z.string().optional(),
  economicCircumstancesAtDivorceSpouse1: z.string().optional(),
  economicCircumstancesAtDivorceSpouse2: z.string().optional(),
  expenseOfSaleAssets: z.preprocess((val) => String(val === null || val === undefined ? '' : val).replace(/[^0-9]/g, ''),
    z.string().optional().refine(val => val === '' || val === undefined || (parseInt(val, 10) >= 0), { message: "Expense value must be a positive number if provided." })
  ).transform(val => val === '' || val === undefined ? undefined : parseInt(val, 10)).optional(),

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
      // PA Fields defaults
      priorMarriageSpouse1: false,
      priorMarriageSpouse2: false,
      contributionToEducationTrainingSpouse1: false,
      contributionToEducationTrainingSpouse2: false,
      // Strings and numbers will default to undefined if not provided, which is fine.
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
            <Textarea id="otherSignificantCircumstances" {...register("otherSignificantCircumstances")} placeholder="Describe any other factors not covered above" className={errors.otherSignificantCircumstances ? 'border-red-500' : ''} rows={4}/>
            {errors.otherSignificantCircumstances && <p className="text-sm text-red-500 mt-1">{errors.otherSignificantCircumstances.message}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Pennsylvania Specific Factors - Grouped Logically */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-6 w-6 mr-2 text-purple-600" /> {/* Example Icon Change */}
            Background & Station (PA Specific)
          </CardTitle>
          <CardDescription>Factors relevant for Pennsylvania equitable distribution concerning prior marriages and life station.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center space-x-2">
                <Controller name="priorMarriageSpouse1" control={control} render={({ field }) => <Switch id="priorMarriageSpouse1" checked={field.value} onCheckedChange={field.onChange} />} />
                <Label htmlFor="priorMarriageSpouse1" className="cursor-pointer">Spouse 1: Prior Marriages?</Label>
              </div>
              {errors.priorMarriageSpouse1 && <p className="text-sm text-red-500 mt-1">{errors.priorMarriageSpouse1.message}</p>}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <Controller name="priorMarriageSpouse2" control={control} render={({ field }) => <Switch id="priorMarriageSpouse2" checked={field.value} onCheckedChange={field.onChange} />} />
                <Label htmlFor="priorMarriageSpouse2" className="cursor-pointer">Spouse 2: Prior Marriages?</Label>
              </div>
              {errors.priorMarriageSpouse2 && <p className="text-sm text-red-500 mt-1">{errors.priorMarriageSpouse2.message}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="stationSpouse1">Spouse 1: Station in Life</Label>
            <Textarea id="stationSpouse1" {...register("stationSpouse1")} placeholder="Describe Spouse 1's station (e.g., social standing, lifestyle if relevant)" className={errors.stationSpouse1 ? 'border-red-500' : ''} rows={2}/>
            {errors.stationSpouse1 && <p className="text-sm text-red-500 mt-1">{errors.stationSpouse1.message}</p>}
          </div>
          <div>
            <Label htmlFor="stationSpouse2">Spouse 2: Station in Life</Label>
            <Textarea id="stationSpouse2" {...register("stationSpouse2")} placeholder="Describe Spouse 2's station" className={errors.stationSpouse2 ? 'border-red-500' : ''} rows={2}/>
            {errors.stationSpouse2 && <p className="text-sm text-red-500 mt-1">{errors.stationSpouse2.message}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSignIcon className="h-6 w-6 mr-2 text-green-600" /> {/* Example Icon Change */}
            Vocational Skills, Estate & Needs (PA Specific)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="vocationalSkillsSpouse1">Spouse 1: Vocational Skills & Employability</Label>
            <Textarea id="vocationalSkillsSpouse1" {...register("vocationalSkillsSpouse1")} placeholder="Describe skills and employability" className={errors.vocationalSkillsSpouse1 ? 'border-red-500' : ''} rows={2}/>
            {errors.vocationalSkillsSpouse1 && <p className="text-sm text-red-500 mt-1">{errors.vocationalSkillsSpouse1.message}</p>}
          </div>
          <div>
            <Label htmlFor="vocationalSkillsSpouse2">Spouse 2: Vocational Skills & Employability</Label>
            <Textarea id="vocationalSkillsSpouse2" {...register("vocationalSkillsSpouse2")} placeholder="Describe skills and employability" className={errors.vocationalSkillsSpouse2 ? 'border-red-500' : ''} rows={2}/>
            {errors.vocationalSkillsSpouse2 && <p className="text-sm text-red-500 mt-1">{errors.vocationalSkillsSpouse2.message}</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="estateSpouse1">Spouse 1: Approx. Value of Separate Estate</Label>
              <Input id="estateSpouse1" type="text" {...register("estateSpouse1")} inputMode="numeric" placeholder="e.g., 50000" className={errors.estateSpouse1 ? 'border-red-500' : ''}/>
              {errors.estateSpouse1 && <p className="text-sm text-red-500 mt-1">{errors.estateSpouse1.message}</p>}
            </div>
            <div>
              <Label htmlFor="estateSpouse2">Spouse 2: Approx. Value of Separate Estate</Label>
              <Input id="estateSpouse2" type="text" {...register("estateSpouse2")} inputMode="numeric" placeholder="e.g., 75000" className={errors.estateSpouse2 ? 'border-red-500' : ''}/>
              {errors.estateSpouse2 && <p className="text-sm text-red-500 mt-1">{errors.estateSpouse2.message}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="needsSpouse1">Spouse 1: Specific Needs</Label>
            <Textarea id="needsSpouse1" {...register("needsSpouse1")} placeholder="e.g., ongoing medical, educational" className={errors.needsSpouse1 ? 'border-red-500' : ''} rows={2}/>
            {errors.needsSpouse1 && <p className="text-sm text-red-500 mt-1">{errors.needsSpouse1.message}</p>}
          </div>
          <div>
            <Label htmlFor="needsSpouse2">Spouse 2: Specific Needs</Label>
            <Textarea id="needsSpouse2" {...register("needsSpouse2")} placeholder="e.g., ongoing medical, educational" className={errors.needsSpouse2 ? 'border-red-500' : ''} rows={2}/>
            {errors.needsSpouse2 && <p className="text-sm text-red-500 mt-1">{errors.needsSpouse2.message}</p>}
          </div>
        </CardContent>
      </Card>

      <Card> {/* Updated "Contributions to Marriage" to include new PA fields */}
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-6 w-6 mr-2 text-blue-600" />
            Contributions & Future Opportunities (PA Specific)
          </CardTitle>
          <CardDescription>Contributions to education/training, and opportunities for future acquisitions and income.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Existing Contribution Details - Kept for general contributions */}
          <div>
            <Label htmlFor="contributionDetailsSpouse1">Your General Contributions (Spouse 1)</Label>
            <Textarea id="contributionDetailsSpouse1" {...register("contributionDetailsSpouse1")} placeholder="e.g., Primary caregiver, supported spouse's education, managed household." className={errors.contributionDetailsSpouse1 ? 'border-red-500' : ''} rows={3}/>
            {errors.contributionDetailsSpouse1 && <p className="text-sm text-red-500 mt-1">{errors.contributionDetailsSpouse1.message}</p>}
          </div>
          <div>
            <Label htmlFor="contributionDetailsSpouse2">Spouse's General Contributions (Spouse 2)</Label>
            <Textarea id="contributionDetailsSpouse2" {...register("contributionDetailsSpouse2")} placeholder="e.g., Primary earner, significant career sacrifices for family, home improvements." className={errors.contributionDetailsSpouse2 ? 'border-red-500' : ''} rows={3}/>
            {errors.contributionDetailsSpouse2 && <p className="text-sm text-red-500 mt-1">{errors.contributionDetailsSpouse2.message}</p>}
          </div>
          <hr/> {/* Separator */}
          {/* New PA Specific Contribution Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center space-x-2">
                <Controller name="contributionToEducationTrainingSpouse1" control={control} render={({ field }) => <Switch id="contributionToEducationTrainingSpouse1" checked={field.value} onCheckedChange={field.onChange} />} />
                <Label htmlFor="contributionToEducationTrainingSpouse1" className="cursor-pointer">Spouse 1 contributed to Spouse 2's education/training?</Label>
              </div>
              {errors.contributionToEducationTrainingSpouse1 && <p className="text-sm text-red-500 mt-1">{errors.contributionToEducationTrainingSpouse1.message}</p>}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <Controller name="contributionToEducationTrainingSpouse2" control={control} render={({ field }) => <Switch id="contributionToEducationTrainingSpouse2" checked={field.value} onCheckedChange={field.onChange} />} />
                <Label htmlFor="contributionToEducationTrainingSpouse2" className="cursor-pointer">Spouse 2 contributed to Spouse 1's education/training?</Label>
              </div>
              {errors.contributionToEducationTrainingSpouse2 && <p className="text-sm text-red-500 mt-1">{errors.contributionToEducationTrainingSpouse2.message}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="opportunityFutureAcquisitionsSpouse1">Spouse 1: Opportunity for Future Acquisitions & Income</Label>
            <Textarea id="opportunityFutureAcquisitionsSpouse1" {...register("opportunityFutureAcquisitionsSpouse1")} placeholder="Describe opportunity" className={errors.opportunityFutureAcquisitionsSpouse1 ? 'border-red-500' : ''} rows={2}/>
            {errors.opportunityFutureAcquisitionsSpouse1 && <p className="text-sm text-red-500 mt-1">{errors.opportunityFutureAcquisitionsSpouse1.message}</p>}
          </div>
          <div>
            <Label htmlFor="opportunityFutureAcquisitionsSpouse2">Spouse 2: Opportunity for Future Acquisitions & Income</Label>
            <Textarea id="opportunityFutureAcquisitionsSpouse2" {...register("opportunityFutureAcquisitionsSpouse2")} placeholder="Describe opportunity" className={errors.opportunityFutureAcquisitionsSpouse2 ? 'border-red-500' : ''} rows={2}/>
            {errors.opportunityFutureAcquisitionsSpouse2 && <p className="text-sm text-red-500 mt-1">{errors.opportunityFutureAcquisitionsSpouse2.message}</p>}
          </div>
          <div>
            <Label htmlFor="sourcesOfIncomeDetailsSpouse1">Spouse 1: Other Sources of Income (Medical, Retirement, Insurance etc.)</Label>
            <Textarea id="sourcesOfIncomeDetailsSpouse1" {...register("sourcesOfIncomeDetailsSpouse1")} placeholder="Detail other income sources" className={errors.sourcesOfIncomeDetailsSpouse1 ? 'border-red-500' : ''} rows={2}/>
            {errors.sourcesOfIncomeDetailsSpouse1 && <p className="text-sm text-red-500 mt-1">{errors.sourcesOfIncomeDetailsSpouse1.message}</p>}
          </div>
          <div>
            <Label htmlFor="sourcesOfIncomeDetailsSpouse2">Spouse 2: Other Sources of Income (Medical, Retirement, Insurance etc.)</Label>
            <Textarea id="sourcesOfIncomeDetailsSpouse2" {...register("sourcesOfIncomeDetailsSpouse2")} placeholder="Detail other income sources" className={errors.sourcesOfIncomeDetailsSpouse2 ? 'border-red-500' : ''} rows={2}/>
            {errors.sourcesOfIncomeDetailsSpouse2 && <p className="text-sm text-red-500 mt-1">{errors.sourcesOfIncomeDetailsSpouse2.message}</p>}
          </div>
        </CardContent>
      </Card>

      <Card> {/* Updated "Conduct & Financial Factors" or New Card for Economic Context */}
         <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSignIcon className="h-6 w-6 mr-2 text-orange-500" /> {/* Example Icon Change */}
            Economic Context & Living Standards (PA Specific)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="standardOfLiving">Standard of Living Established During Marriage</Label>
            <Textarea id="standardOfLiving" {...register("standardOfLiving")} placeholder="Describe the marital standard of living" className={errors.standardOfLiving ? 'border-red-500' : ''} rows={2}/>
            {errors.standardOfLiving && <p className="text-sm text-red-500 mt-1">{errors.standardOfLiving.message}</p>}
          </div>
          <div>
            <Label htmlFor="economicCircumstancesAtDivorceSpouse1">Spouse 1: Economic Circumstances at Time of Divorce</Label>
            <Textarea id="economicCircumstancesAtDivorceSpouse1" {...register("economicCircumstancesAtDivorceSpouse1")} placeholder="Describe circumstances" className={errors.economicCircumstancesAtDivorceSpouse1 ? 'border-red-500' : ''} rows={2}/>
            {errors.economicCircumstancesAtDivorceSpouse1 && <p className="text-sm text-red-500 mt-1">{errors.economicCircumstancesAtDivorceSpouse1.message}</p>}
          </div>
          <div>
            <Label htmlFor="economicCircumstancesAtDivorceSpouse2">Spouse 2: Economic Circumstances at Time of Divorce</Label>
            <Textarea id="economicCircumstancesAtDivorceSpouse2" {...register("economicCircumstancesAtDivorceSpouse2")} placeholder="Describe circumstances" className={errors.economicCircumstancesAtDivorceSpouse2 ? 'border-red-500' : ''} rows={2}/>
            {errors.economicCircumstancesAtDivorceSpouse2 && <p className="text-sm text-red-500 mt-1">{errors.economicCircumstancesAtDivorceSpouse2.message}</p>}
          </div>
          <div>
            <Label htmlFor="expenseOfSaleAssets">Estimated Expense of Selling Assets (if a major factor)</Label>
            <Input id="expenseOfSaleAssets" type="text" {...register("expenseOfSaleAssets")} inputMode="numeric" placeholder="e.g., 10000" className={errors.expenseOfSaleAssets ? 'border-red-500' : ''}/>
            {errors.expenseOfSaleAssets && <p className="text-sm text-red-500 mt-1">{errors.expenseOfSaleAssets.message}</p>}
            <p className="text-xs text-gray-500 mt-1">Overall estimated cost if significant assets need to be sold as part of the division.</p>
          </div>
        </CardContent>
      </Card>

    </form>
  );
}

export default SpecialCircumstancesStep;
