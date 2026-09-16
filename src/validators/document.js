import { z } from 'zod';

export const uploadDocumentSchema = z
  .object({
    imageSlot: z
      .number()
      .int()
      .min(1, 'Image slot must be 1 or 2')
      .max(2, 'Image slot must be 1 or 2'),
    originalFileName: z.string().min(1, 'File name is required'),
    mimeType: z
      .enum(['image/jpeg', 'image/png', 'image/jpg']),
    size: z.number().min(0, 'File size cannot be negative'),
  })
  .strict();


