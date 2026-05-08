import { z } from 'zod';

import { VALIDATION_LIMITS, VALIDATION_MESSAGES, VALIDATION_PATTERNS } from '@/config/constants';

export const transporterSchema = z.object({
  name: z
    .string()
    .min(1, VALIDATION_MESSAGES.required('Transporter name'))
    .min(
      VALIDATION_LIMITS.name.min,
      VALIDATION_MESSAGES.minLength('Transporter name', VALIDATION_LIMITS.name.min),
    )
    .max(
      VALIDATION_LIMITS.name.max,
      VALIDATION_MESSAGES.maxLength('Transporter name', VALIDATION_LIMITS.name.max),
    ),
  contact_person: z
    .string()
    .min(1, VALIDATION_MESSAGES.required('Contact person'))
    .min(
      VALIDATION_LIMITS.name.min,
      VALIDATION_MESSAGES.minLength('Contact person', VALIDATION_LIMITS.name.min),
    )
    .max(
      VALIDATION_LIMITS.name.max,
      VALIDATION_MESSAGES.maxLength('Contact person', VALIDATION_LIMITS.name.max),
    ),
  mobile_no: z
    .string()
    .min(1, VALIDATION_MESSAGES.required('Mobile number'))
    .regex(VALIDATION_PATTERNS.phone, VALIDATION_MESSAGES.invalidPhone),
  gstin: z
    .string()
    .max(20, VALIDATION_MESSAGES.maxLength('GSTIN', 20))
    .refine(
      (value) =>
        value.trim() === '' ||
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value.trim()),
      'Please enter a valid GSTIN',
    ),
});

export type TransporterFormData = z.infer<typeof transporterSchema>;
