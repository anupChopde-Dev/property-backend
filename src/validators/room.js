import { z } from 'zod';

export const createRoomSchema = z
  .object({
    roomNumber: z
      .string()
      .min(1, 'Room number is required')
      .max(50, 'Room number is too long')
      .trim(),
    floor: z
      .string()
      .max(50, 'Floor is too long')
      .trim()
      .optional(),
    monthlyRent: z
      .number()
      .min(0, 'Monthly rent cannot be negative')
      .default(0),
    securityDeposit: z
      .number()
      .min(0, 'Security deposit cannot be negative')
      .default(0),
    status: z
      .enum(['VACANT', 'OCCUPIED', 'MAINTENANCE'])
      .default('VACANT'),
    notes: z
      .string()
      .max(2000, 'Notes is too long')
      .trim()
      .optional(),
  })
  .strict();

export const updateRoomSchema = createRoomSchema.partial();



