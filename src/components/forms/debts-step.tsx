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
import { CreditCard, DollarSign, PlusCircle, Trash2 } from 'lucide-react';

// --- Zod Schemas ---
const debtTypeEnum = z.enum([
  "mortgage", "heloc", "vehicle_loan", "student_loan", "credit_card",
  "personal_loan", "medical_debt", "tax_debt", "alimony_arrears",
  "child_support_arrears", "business_debt", "other_debt"
], { required_error: "Debt type is required." });

const debtItemSchema = z.object({
  id: z.string().optional(),
  debtType: debtTypeEnum,
  creditorName: z.string().min(1, "Creditor name is required."),
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
      .refine(val => parseFloat(val) > 0, { message: "Balance must be positive." })
  ),
  isSeparateDebt: z.boolean().default(false),
  responsibility: z.enum(["joint", "spouse1", "spouse2"]).optional(),
  notes: z.string().optional(),
})
.superRefine((data, ctx) => {
  if (data.isSeparateDebt && !data.responsibility) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["responsibility"],
      message: "Responsibility is required for separate debts.",
    });
  }
});

type DebtItemFormData = z.infer<typeof debtItemSchema>;

const debtsStepSchema = z.object({
  debts: z.array(debtItemSchema).optional(),
});

type DebtsStepFormData = z.infer<typeof debtsStepSchema>;

interface DebtsStepProps {
  data: DebtsStepFormData;
  onUpdate: (data: DebtsStepFormData) => void;
}

// Sub-component for debt responsibility fields
function DebtResponsibilityFields({ control, fieldIndex, errors }: { control: any, fieldIndex: number, errors: any }) {
  const isSeparate = useWatch({
    control,
    name: `debts.${fieldIndex}.isSeparateDebt`
  });

  useEffect(() => {
    if (!isSeparate) {
      control.setValue(`debts.${fieldIndex}.responsibility`, 'joint');
    }
    // control.trigger(`debts.${fieldIndex}.responsibility`); // Optionally trigger re-validation
  }, [isSeparate, control, fieldIndex]);

  return (
    <>
      <div className="space-y-2">
        <Label>Debt Status <span className="text-red-500">*</span></Label>
        <Controller
          name={`debts.${fieldIndex}.isSeparateDebt`}
          control={control}
          render={({ field }) => (
            <Select
              onValueChange={(value) => field.onChange(value === 'true')}
              defaultValue={String(field.value)}
            >
              <SelectTrigger className={errors?.isSeparateDebt ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select debt status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Community/Marital Debt</SelectItem>
                <SelectItem value="true">Separate Debt</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors?.isSeparateDebt && <p className="text-sm text-red-500 mt-1">{errors.isSeparateDebt.message?.toString()}</p>}
      </div>

      {isSeparate && (
        <div>
          <Label htmlFor={`debts.${fieldIndex}.responsibility`}>If Separate, Responsibility Of <span className="text-red-500">*</span></Label>
          <Controller
            name={`debts.${fieldIndex}.responsibility`}
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger className={errors?.responsibility ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select responsible party" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spouse1">You (Spouse 1)</SelectItem>
                  <SelectItem value="spouse2">Your Spouse (Spouse 2)</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors?.responsibility && <p className="text-sm text-red-500 mt-1">{errors.responsibility.message?.toString()}</p>}
        </div>
      )}
    </>
  );
}


export function DebtsStep({ data, onUpdate }: DebtsStepProps) {
  const { control, register, formState: { errors }, watch } = useForm<DebtsStepFormData>({
    resolver: zodResolver(debtsStepSchema),
    defaultValues: {
      debts: data.debts && data.debts.length > 0 ? data.debts : [], // Start empty if no data
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "debts",
  });

  const watchedDebts = watch("debts");
  useEffect(() => {
    onUpdate({ debts: watchedDebts });
  }, [watchedDebts, onUpdate]);

  const addNewDebt = () => {
    append({
      debtType: undefined, // User must select
      creditorName: '',
      accountNickname: '',
      accountNumberLast4: '',
      currentBalance: '',
      isSeparateDebt: false,
      responsibility: 'joint',
      notes: '',
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <CreditCard className="h-6 w-6 mr-2 text-blue-600" />
              Debts & Liabilities
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addNewDebt}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Debt
            </Button>
          </CardTitle>
          <CardDescription>
            List all outstanding debts (e.g., mortgages, loans, credit cards).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fields.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              <p>No debts added yet.</p>
              <Button type="button" variant="link" onClick={addNewDebt} className="mt-2">
                Add your first debt
              </Button>
            </div>
          )}
          <div className="space-y-8">
            {fields.map((item, index) => (
              <div key={item.id} className="p-6 border rounded-lg shadow-sm relative bg-slate-50">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-gray-800">Debt #{index + 1}</h4>
                  <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} className="text-red-500 hover:text-red-700" aria-label={`Remove debt ${index + 1}`}>
                    <Trash2 className="h-4 w-4 mr-1" /> Remove
                  </Button>
                </div>

                <div className="space-y-6">
                  {/* Debt Type */}
                  <div>
                    <Label htmlFor={`debts.${index}.debtType`}>Debt Type <span className="text-red-500">*</span></Label>
                    <Controller
                      name={`debts.${index}.debtType`}
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger className={errors.debts?.[index]?.debtType ? 'border-red-500' : ''}>
                            <SelectValue placeholder="Select debt type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mortgage">Mortgage</SelectItem>
                            <SelectItem value="heloc">HELOC</SelectItem>
                            <SelectItem value="vehicle_loan">Vehicle Loan</SelectItem>
                            <SelectItem value="student_loan">Student Loan</SelectItem>
                            <SelectItem value="credit_card">Credit Card</SelectItem>
                            <SelectItem value="personal_loan">Personal Loan</SelectItem>
                            <SelectItem value="medical_debt">Medical Debt</SelectItem>
                            <SelectItem value="tax_debt">Tax Debt</SelectItem>
                            <SelectItem value="alimony_arrears">Alimony Arrears</SelectItem>
                            <SelectItem value="child_support_arrears">Child Support Arrears</SelectItem>
                            <SelectItem value="business_debt">Business Debt</SelectItem>
                            <SelectItem value="other_debt">Other Debt</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.debts?.[index]?.debtType && <p className="text-sm text-red-500 mt-1">{errors.debts?.[index]?.debtType?.message?.toString()}</p>}
                  </div>

                  {/* Creditor Name */}
                  <div>
                    <Label htmlFor={`debts.${index}.creditorName`}>Creditor Name <span className="text-red-500">*</span></Label>
                    <Input id={`debts.${index}.creditorName`} {...register(`debts.${index}.creditorName`)} placeholder="e.g., Wells Fargo, Amex" className={errors.debts?.[index]?.creditorName ? 'border-red-500' : ''} />
                    {errors.debts?.[index]?.creditorName && <p className="text-sm text-red-500 mt-1">{errors.debts?.[index]?.creditorName?.message?.toString()}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Account Nickname */}
                    <div>
                      <Label htmlFor={`debts.${index}.accountNickname`}>Account Nickname (Optional)</Label>
                      <Input id={`debts.${index}.accountNickname`} {...register(`debts.${index}.accountNickname`)} placeholder="e.g., Primary Mortgage, Visa Card" />
                    </div>
                    {/* Account Number Last 4 */}
                    <div>
                      <Label htmlFor={`debts.${index}.accountNumberLast4`}>Last 4 Digits of Acct # (Optional)</Label>
                      <Input id={`debts.${index}.accountNumberLast4`} {...register(`debts.${index}.accountNumberLast4`)} placeholder="e.g., 1234" maxLength={4} className={errors.debts?.[index]?.accountNumberLast4 ? 'border-red-500' : ''} />
                      {errors.debts?.[index]?.accountNumberLast4 && <p className="text-sm text-red-500 mt-1">{errors.debts?.[index]?.accountNumberLast4?.message?.toString()}</p>}
                    </div>
                  </div>

                  {/* Current Balance */}
                  <div>
                    <Label htmlFor={`debts.${index}.currentBalance`}>Current Balance Owed <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input id={`debts.${index}.currentBalance`} type="text" {...register(`debts.${index}.currentBalance`)} placeholder="e.g., 150000" className={`pl-8 ${errors.debts?.[index]?.currentBalance ? 'border-red-500' : ''}`} />
                    </div>
                    {errors.debts?.[index]?.currentBalance && <p className="text-sm text-red-500 mt-1">{errors.debts?.[index]?.currentBalance?.message?.toString()}</p>}
                  </div>

                  <DebtResponsibilityFields control={control} fieldIndex={index} errors={errors.debts?.[index]} />

                  <div>
                    <Label htmlFor={`debts.${index}.notes`}>Notes (Optional)</Label>
                    <Input id={`debts.${index}.notes`} {...register(`debts.${index}.notes`)} placeholder="e.g., Interest rate, payment terms" />
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

export default DebtsStep;
