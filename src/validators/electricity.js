import { z } from 'zod';

export const createElectricityReadingSchema = z
  .object({
    room: z.string().min(1, 'Room ID is required'),
    tenant: z.string().optional().nullable(),
    billingMonth: z
      .string()
      .regex(/^\d{4}-\d{2}$/, 'Billing month must be in YYYY-MM format'),
    previousReading: z
      .number()
      .min(0, 'Previous reading cannot be negative'),
    currentReading: z
      .number()
      .min(0, 'Current reading cannot be negative'),
    ratePerUnit: z
      .number()
      .min(0, 'Rate per unit cannot be negative'),
    readingDate: z
      .string()
      .refine(
        (val) => !isNaN(Date.parse(val)),
        'Please provide a valid date'
      ),
    notes: z
      .string()
      .max(500, 'Notes is too long')
      .trim()
      .optional(),
    fixedCharge: z
      .number()
      .min(0, 'Fixed charge cannot be negative')
      .default(0),
    otherCharge: z
      .number()
      .min(0, 'Other charge cannot be negative')
      .default(0),
  })
  .strict();

export const updateElectricityReadingSchema = z
  .object({
    previousReading: z
      .number()
      .min(0, 'Previous reading cannot be negative')
      .optional(),
    currentReading: z
      .number()
      .min(0, 'Current reading cannot be negative')
      .optional(),
    ratePerUnit: z
      .number()
      .min(0, 'Rate per unit cannot be negative')
      .optional(),
    readingDate: z
      .string()
      .optional()
      .nullable()
      .refine(
        (val) => !val || !isNaN(Date.parse(val)),
        'Please provide a valid date'
      ),
    notes: z
      .string()
      .max(500, 'Notes is too long')
      .trim()
      .optional(),
    fixedCharge: z
      .number()
      .min(0, 'Fixed charge cannot be negative')
      .optional(),
    otherCharge: z
      .number()
      .min(0, 'Other charge cannot be negative')
      .optional(),
  })
  .strict();



