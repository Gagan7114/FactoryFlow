import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { type Resolver,useForm } from 'react-hook-form';

import { Button, Input, Label } from '@/shared/components/ui';

import { AUDIT_TYPE_FIELDS } from '../constants';
import { type AuditFormValues,buildAuditSchema } from '../schemas/audit.schema';
import type { AuditSubmitPayload, AuditTrackerType } from '../types';

interface AuditEntryFormProps {
  trackerType: AuditTrackerType;
  isSubmitting?: boolean;
  onSubmit: (payload: AuditSubmitPayload) => void;
}

export function AuditEntryForm({ trackerType, isSubmitting, onSubmit }: AuditEntryFormProps) {
  const fields = AUDIT_TYPE_FIELDS[trackerType];
  const schema = useMemo(() => buildAuditSchema(trackerType), [trackerType]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AuditFormValues>({
    // Schema shape is built dynamically per type; cast keeps RHF generics happy.
    resolver: zodResolver(schema) as unknown as Resolver<AuditFormValues>,
    // Re-mount via key in parent on type change keeps defaults clean.
  });

  function submit(values: AuditFormValues) {
    const payload: AuditSubmitPayload = {
      tracker_type: trackerType,
      invoice_date: String(values.invoice_date),
      party_name: String(values.party_name),
      invoice_no: String(values.invoice_no),
      amount: Number(values.amount),
    };

    // Attach the type-specific optional fields when present.
    const record = payload as unknown as Record<string, unknown>;
    for (const field of fields) {
      const value = values[field.key];
      if (field.key === 'amount' || field.key === 'invoice_date') continue;
      if (field.key === 'party_name' || field.key === 'invoice_no') continue;
      if (value === undefined || value === '') continue;
      record[field.key] = value;
    }

    onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.key} className="flex flex-col gap-1.5">
            <Label htmlFor={`audit-${field.key}`} className="text-xs">
              {field.label}
              {field.required && <span className="ml-0.5 text-destructive">*</span>}
            </Label>
            <Input
              id={`audit-${field.key}`}
              type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
              step={field.type === 'number' ? '0.01' : undefined}
              {...register(field.key)}
            />
            {errors[field.key] && (
              <p className="text-xs text-destructive">
                {String(errors[field.key]?.message)}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Entry'}
        </Button>
        <Button type="button" variant="outline" onClick={() => reset()} disabled={isSubmitting}>
          Reset
        </Button>
      </div>
    </form>
  );
}
