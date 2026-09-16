import { z } from 'zod';

export const createExpenseSchema = z
  .object({
    property: z.string().min(1, 'Property ID is required'),
    room: z.string().optional().nullable(),
    category: z
      .enum([
        'REPAIR',
        'MAINTENANCE',
        'PLUMBING',
        'ELECTRICAL',
        'CLEANING',
        'PAINTING',
        'PROPERTY_TAX',
        'OTHER',
      ]),
    amount: z.number().min(0, 'Amount cannot be negative'),
    date: z
      .string()
      .refine(
        (val) => !isNaN(Date.parse(val)),
        'Please provide a valid date'
      ),
    description: z
      .string()
      .max(500, 'Description is too long')
      .trim()
      .optional(),
    notes: z
      .string()
      .max(500, 'Notes is too long')
      .trim()
      .optional(),
  })
  .strict();

export const updateExpenseSchema = createExpenseSchema.partial();



