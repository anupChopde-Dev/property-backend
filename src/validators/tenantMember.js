import { z } from 'zod';

export const createTenantMemberSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Name is required')
      .max(150, 'Name is too long')
      .trim(),
    relationship: z.enum([
      'Primary',
      'Spouse',
      'Son',
      'Daughter',
      'Father',
      'Mother',
      'Brother',
      'Sister',
      'Other Family',
      'Other',
    ]), // Fixed: removed .string(), .min(), .max(), .trim()
    dateOfBirth: z
      .string()
      .optional()
      .nullable()
      .refine(
        (val) => !val || !isNaN(Date.parse(val)),
        'Please provide a valid date'
      ),
    phone: z
      .string()
      .regex(/^[6-9]\d{9}$/, 'Please provide a valid 10-digit mobile number')
      .optional(),
    notes: z
      .string()
      .max(500, 'Notes is too long')
      .trim()
      .optional(),
    isActive: z.boolean().default(true),
  })
  .strict();

export const updateTenantMemberSchema = createTenantMemberSchema.partial();