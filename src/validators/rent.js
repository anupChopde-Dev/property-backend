import { z } from 'zod';

export const createRentChargeSchema = z
  .object({
    room: z.string().min(1, 'Room ID is required'),
    tenant: z.string().optional().nullable(),
    billingMonth: z
      .string()
      .regex(/^\d{4}-\d{2}$/, 'Billing month must be in YYYY-MM format'),
    rentAmount: z
      .number()
      .min(0, 'Rent amount cannot be negative'),
    dueDate: z
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
  })
  .strict();

export const updateRentChargeSchema = z
  .object({
    rentAmount: z
      .number()
      .min(0, 'Rent amount cannot be negative')
      .optional(),
    dueDate: z
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
  })
  .strict();

export const createRentPaymentSchema = z
  .object({
    amount: z
      .number()
      .min(0, 'Payment amount cannot be negative'),
    paymentDate: z
      .string()
      .refine(
        (val) => !isNaN(Date.parse(val)),
        'Please provide a valid date'
      ),
    paymentMethod: z
      .enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER'])
      .default('CASH'),
    referenceNumber: z
      .string()
      .max(100, 'Reference number is too long')
      .trim()
      .optional(),
    notes: z
      .string()
      .max(500, 'Notes is too long')
      .trim()
      .optional(),
  })
  .strict();

// Type exports removed for JS compatibility
