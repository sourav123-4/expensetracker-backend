import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Enter a valid email address');
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(80),
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20, 'Invalid refresh token'),
});

export const forgotPasswordSchema = z.object({ email });

export const verifyOtpSchema = z.object({
  email,
  otp: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
});

export const resetPasswordSchema = z.object({
  email,
  resetToken: z.string().min(20, 'Invalid reset token'),
  newPassword: password,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
