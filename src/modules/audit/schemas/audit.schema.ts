import { z } from 'zod';

import { AUDIT_TYPE_FIELDS, type AuditFieldDef } from '../constants';
import type { AuditTrackerType } from '../types';

function fieldSchema(field: AuditFieldDef) {
  if (field.type === 'number') {
    const base = z.coerce
      .number()
      .positive(`${field.label} must be greater than zero`);
    return field.required ? base : base.optional();
  }

  // text / date are submitted as strings
  if (field.required) {
    return z.string().trim().min(1, `${field.label} is required`);
  }
  return z.string().trim().optional().or(z.literal(''));
}

/**
 * Build a zod schema for the invoice-data fields of a given tracker type.
 * The shape is derived from AUDIT_TYPE_FIELDS so the form and validation
 * stay in lockstep with the column config.
 */
export function buildAuditSchema(type: AuditTrackerType) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of AUDIT_TYPE_FIELDS[type]) {
    shape[field.key] = fieldSchema(field);
  }
  return z.object(shape);
}

export type AuditFormValues = Record<string, unknown>;
