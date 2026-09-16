import { z } from 'zod';

export const registerSchema = z
  .object({
    email: z
      .string()
      .email('Invalid email address')
      .toLowerCase(),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(100, 'Password is too long'),
    fullName: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(150, 'Name is too long')
      .trim(),
    mobile: z
      .string()
      .optional()
      .refine(
        (val) => !val || /^[6-9]\d{9}$/.test(val),
        'Please provide a valid 10-digit mobile number'
      ),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().email('Invalid email address').toLowerCase(),
    password: z.string().min(1, 'Password is required'),
  })
  .strict();

export const updateProfileSchema = z
  .object({
    fullName: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(150, 'Name is too long')
      .trim()
      .optional(),
    mobile: z
      .string()
      .optional()
      .refine(
        (val) => !val || /^[6-9]\d{9}$/.test(val),
        'Please provide a valid 10-digit mobile number'
      ),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(100, 'Password is too long')
      .optional(),
  })
  .strict();

// Type exports for TypeScript compatibility (not used in JS)
// const RegisterInput = z.infer<typeof registerSchema>;
// const LoginInput = z.infer<typeof loginSchema>;
// const UpdateProfileInput = z.infer<typeof updateProfileSchema>;
