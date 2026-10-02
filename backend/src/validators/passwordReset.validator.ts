import { z } from 'zod';

export const forgotPasswordSchema = z.object({ email: z.string().email() });
export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8),
});