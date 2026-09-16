import { z } from 'zod';

/**
 * Treat '' / null as missing so optional fields accept empty form inputs.
 */
const emptyToUndefined = (val) => (val === '' || val === null ? undefined : val);

const optionalText = (schema) => z.preprocess(emptyToUndefined, schema.optional());

export const createTenantSchema = z
  .object({
    room: z.string().min(1, 'Room is required'),
    fullName: z
      .string()
      .min(2, 'Full name must be at least 2 characters')
      .max(150, 'Full name is too long')
      .trim(),
    mobile: optionalText(
      z.string().regex(/^[6-9]\d{9}$/, 'Please provide a valid 10-digit mobile number')
    ),
    email: optionalText(z.string().email('Invalid email address').toLowerCase()),
    permanentAddress: optionalText(z.string().max(500, 'Address is too long').trim()),
    occupation: optionalText(z.string().max(100, 'Occupation is too long').trim()),
    joiningDate: z
      .string()
      .refine(
        (val) => !isNaN(Date.parse(val)),
        'Please provide a valid date'
      ),
    leavingDate: optionalText(z.string().nullable()),
    status: z
      .enum(['ACTIVE', 'MOVED_OUT'])
      .default('ACTIVE'),
    notes: optionalText(z.string().max(2000, 'Notes is too long').trim()),
  })
  .strict();

export const updateTenantSchema = createTenantSchema
  .extend({ status: z.enum(['ACTIVE', 'MOVED_OUT']).optional() })
  .partial()
  .omit({ room: true });



