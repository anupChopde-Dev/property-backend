import { z } from 'zod';

export const createPropertySchema = z
  .object({
    name: z
      .string()
      .min(2, 'Property name must be at least 2 characters')
      .max(100, 'Property name is too long')
      .trim(),
    address: z
      .string()
      .max(500, 'Address is too long')
      .trim()
      .optional(),
    city: z
      .string()
      .max(100, 'City is too long')
      .trim()
      .optional(),
    state: z
      .string()
      .max(100, 'State is too long')
      .trim()
      .optional(),
    pincode: z
      .string()
      .regex(/^\d{6}$/, 'Please provide a valid 6-digit pincode')
      .optional(),
    description: z
      .string()
      .max(2000, 'Description is too long')
      .trim()
      .optional(),
    notes: z
      .string()
      .max(2000, 'Notes is too long')
      .trim()
      .optional(),
  })
  .strict();

export const updatePropertySchema = createPropertySchema.partial();



