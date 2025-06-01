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
import { Landmark, DollarSign, PlusCircle, Trash2 } from 'lucide-react'; // Added Landmark

// --- Zod Schemas ---
const accountTypeEnum = z.enum([
  "checking",
  "savings",
  "money_market",
  "cd",
  "brokerage_taxable",
  "retirement_401k_403b",
  "retirement_ira_roth",
  "retirement_pension",
  "crypto",
  "cash_value_life_insurance",
  "hsa",
  "other_financial"
], { required_error: "Account type is required." });

const financialAccountSchema = z.object({
  id: z.string().optional(),
  accountType: accountTypeEnum,
  institutionName: z.string().min(1, "Institution name is required."),
  accountNickname: z.string().optional(),
  accountNumberLast4: z.string()
    .length(4, "Must be last 4 digits if provided.")
    .regex(/^\d{4}$/, "Must be 4 digits if provided.")
    .optional()
    .or(z.literal('')),
  currentBalance: z.preprocess(
    (val) => String(val).replace(/[^0-9.-]+/g, ''),
    z.string().min(1, "Current balance is required.")
      .refine(val => !isNaN(parseFloat(val)), { message: "Must be a valid number." })
      .refine(val => parseFloat(val) >= 0, { message: "Balance must be zero or positive." })
      // Note: Simplified balance validation, specific account types might allow negative.
  ),
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
});

type FinancialAccountFormData = z.infer<typeof financialAccountSchema>;

const financialAccountsStepSchema = z.object({
  financialAccounts: z.array(financialAccountSchema).optional(),
});

type FinancialAccountsStepFormData = z.infer<typeof financialAccountsStepSchema>;

interface FinancialAccountsStepProps {
  data: FinancialAccountsStepFormData;
  onUpdate: (data: FinancialAccountsStepFormData) => void;
}

// Sub-component for ownership fields
function AccountOwnershipFields({ control, fieldIndex, errors }: { control: any, fieldIndex: number, errors: any }) {
  const isSeparate = useWatch({
    control,
    name: `financialAccounts.${fieldIndex}.isSeparateProperty`
  });

  useEffect(() => {
    if (!isSeparate) {
      control.setValue(`financialAccounts.${fieldIndex}.ownedBy`, 'joint');
    }
    // Optionally trigger validation for ownedBy if isSeparate changes, to clear errors
    // control.trigger(`financialAccounts.${fieldIndex}.ownedBy`);
  }, [isSeparate, control, fieldIndex]);

  return (
    <>
      <div className="space-y-2">
        <Label>Account Status <span className="text-red-500">*</span></Label>
        <Controller
          name={`financialAccounts.${fieldIndex}.isSeparateProperty`}
          control={control}
          render={({ field }) => (
            <Select
              onValueChange={(value) => field.onChange(value === 'true')}
              defaultValue={String(field.value)}
            >
              <SelectTrigger className={errors?.isSeparateProperty ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select account status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Community/Marital Account</SelectItem>
                <SelectItem value="true">Separate Account</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors?.isSeparateProperty && (
          <p className="text-sm text-red-500 mt-1">{errors.isSeparateProperty.message?.toString()}</p>
        )}
      </div>

      {isSeparate && (
        <div>
          <Label htmlFor={`financialAccounts.${fieldIndex}.ownedBy`}>If Separate, Owned By <span className="text-red-500">*</span></Label>
          <Controller
            name={`financialAccounts.${fieldIndex}.ownedBy`}
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
            <p className="text-sm text-red-500 mt-1">{errors.ownedBy.message?.toString()}</p>
          )}
        </div>
      )}
    </>
  );
}


export function FinancialAccountsStep({ data, onUpdate }: FinancialAccountsStepProps) {
  const {
    control,
    register,
    formState: { errors },
    watch,
  } = useForm<FinancialAccountsStepFormData>({
    resolver: zodResolver(financialAccountsStepSchema),
    defaultValues: {
      financialAccounts: data.financialAccounts && data.financialAccounts.length > 0 ? data.financialAccounts : [{
        accountType: undefined,
        institutionName: '',
        accountNickname: '',
        accountNumberLast4: '',
        currentBalance: '',
        isSeparateProperty: false,
        ownedBy: 'joint',
        notes: '',
      }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "financialAccounts",
  });

  const watchedAccounts = watch("financialAccounts");
  useEffect(() => {
    onUpdate({ financialAccounts: watchedAccounts });
  }, [watchedAccounts, onUpdate]);

  const addNewAccount = () => {
    append({
      accountType: undefined,
      institutionName: '',
      accountNickname: '',
      accountNumberLast4: '',
      currentBalance: '',
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
              <Landmark className="h-6 w-6 mr-2 text-blue-600" />
              Financial Accounts
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addNewAccount}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </CardTitle>
          <CardDescription>
            List all financial accounts (e.g., bank accounts, investments, retirement funds).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fields.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              <p>No financial accounts added yet.</p>
              <Button type="button" variant="link" onClick={addNewAccount} className="mt-2">
                Add your first account
              </Button>
            </div>
          )}
          <div className="space-y-8">
            {fields.map((item, index) => (
              <div key={item.id} className="p-6 border rounded-lg shadow-sm relative bg-slate-50">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-gray-800">
                    Account #{index + 1}
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    className="text-red-500 hover:text-red-700"
                    aria-label={`Remove account ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Remove
                  </Button>
                </div>

                <div className="space-y-6">
                  {/* Account Type */}
                  <div>
                    <Label htmlFor={`financialAccounts.${index}.accountType`}>Account Type <span className="text-red-500">*</span></Label>
                    <Controller
                      name={`financialAccounts.${index}.accountType`}
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger className={errors.financialAccounts?.[index]?.accountType ? 'border-red-500' : ''}>
                            <SelectValue placeholder="Select account type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="checking">Checking Account</SelectItem>
                            <SelectItem value="savings">Savings Account</SelectItem>
                            <SelectItem value="money_market">Money Market Account</SelectItem>
                            <SelectItem value="cd">Certificate of Deposit (CD)</SelectItem>
                            <SelectItem value="brokerage_taxable">Brokerage (Taxable)</SelectItem>
                            <SelectItem value="retirement_401k_403b">Retirement (401k, 403b, etc.)</SelectItem>
                            <SelectItem value="retirement_ira_roth">Retirement (IRA, Roth IRA)</SelectItem>
                            <SelectItem value="retirement_pension">Pension</SelectItem>
                            <SelectItem value="crypto">Cryptocurrency</SelectItem>
                            <SelectItem value="cash_value_life_insurance">Cash Value Life Insurance</SelectItem>
                            <SelectItem value="hsa">Health Savings Account (HSA)</SelectItem>
                            <SelectItem value="other_financial">Other Financial Account</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.financialAccounts?.[index]?.accountType && (
                      <p className="text-sm text-red-500 mt-1">{errors.financialAccounts?.[index]?.accountType?.message?.toString()}</p>
                    )}
                  </div>

                  {/* Institution Name */}
                  <div>
                    <Label htmlFor={`financialAccounts.${index}.institutionName`}>Institution Name <span className="text-red-500">*</span></Label>
                    <Input
                      id={`financialAccounts.${index}.institutionName`}
                      {...register(`financialAccounts.${index}.institutionName`)}
                      placeholder="e.g., Chase Bank, Fidelity, Coinbase"
                      className={errors.financialAccounts?.[index]?.institutionName ? 'border-red-500' : ''}
                    />
                    {errors.financialAccounts?.[index]?.institutionName && (
                      <p className="text-sm text-red-500 mt-1">{errors.financialAccounts?.[index]?.institutionName?.message?.toString()}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Account Nickname */}
                    <div>
                      <Label htmlFor={`financialAccounts.${index}.accountNickname`}>Account Nickname (Optional)</Label>
                      <Input
                        id={`financialAccounts.${index}.accountNickname`}
                        {...register(`financialAccounts.${index}.accountNickname`)}
                        placeholder="e.g., Joint Checking, Emergency Fund"
                      />
                    </div>
                    {/* Account Number Last 4 */}
                    <div>
                      <Label htmlFor={`financialAccounts.${index}.accountNumberLast4`}>Last 4 Digits of Acct # (Optional)</Label>
                      <Input
                        id={`financialAccounts.${index}.accountNumberLast4`}
                        {...register(`financialAccounts.${index}.accountNumberLast4`)}
                        placeholder="e.g., 1234"
                        maxLength={4}
                        className={errors.financialAccounts?.[index]?.accountNumberLast4 ? 'border-red-500' : ''}
                      />
                      {errors.financialAccounts?.[index]?.accountNumberLast4 && (
                        <p className="text-sm text-red-500 mt-1">{errors.financialAccounts?.[index]?.accountNumberLast4?.message?.toString()}</p>
                      )}
                    </div>
                  </div>

                  {/* Current Balance */}
                  <div>
                    <Label htmlFor={`financialAccounts.${index}.currentBalance`}>Current Balance <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id={`financialAccounts.${index}.currentBalance`}
                        type="text"
                        {...register(`financialAccounts.${index}.currentBalance`)}
                        placeholder="e.g., 10500.75"
                        className={`pl-8 ${errors.financialAccounts?.[index]?.currentBalance ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.financialAccounts?.[index]?.currentBalance && (
                      <p className="text-sm text-red-500 mt-1">{errors.financialAccounts?.[index]?.currentBalance?.message?.toString()}</p>
                    )}
                  </div>

                  {/* Ownership Fields */}
                  <AccountOwnershipFields
                    control={control}
                    fieldIndex={index}
                    errors={errors.financialAccounts?.[index]}
                  />

                  {/* QCP Switch */}
                  <div className="space-y-1 pt-3">
                    <div className="flex items-center space-x-3">
                      <Controller
                        name={`financialAccounts.${index}.isQuasiCommunityProperty`}
                        control={control}
                        defaultValue={false}
                        render={({ field }) => (
                          <Switch
                            id={`financialAccounts.${index}.isQuasiCommunityProperty`}
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            aria-labelledby={`qcp-financial-label-${index}`}
                          />
                        )}
                      />
                      <Label htmlFor={`financialAccounts.${index}.isQuasiCommunityProperty`} id={`qcp-financial-label-${index}`} className="cursor-pointer text-sm font-medium">
                        Is this Quasi-Community Property?
                      </Label>
                    </div>
                    <p className="text-xs text-gray-500 pl-10">
                      Applies to property acquired while living out-of-state that would be community property if acquired in this state (e.g., CA, AZ, ID, WA).
                    </p>
                  </div>

                  {/* Notes */}
                  <div>
                    <Label htmlFor={`financialAccounts.${index}.notes`}>Notes (Optional)</Label>
                    <Input
                      id={`financialAccounts.${index}.notes`}
                      {...register(`financialAccounts.${index}.notes`)}
                      placeholder="e.g., Vested amount, specific investment details"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default FinancialAccountsStep;
