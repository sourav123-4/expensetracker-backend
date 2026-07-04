import { z } from 'zod';

export const SUPPORTED_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD', 'JPY'] as const;

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    currency: z.enum(SUPPORTED_CURRENCIES).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

export const fcmTokenSchema = z.object({
  token: z.string().min(20, 'Invalid FCM token').max(4096),
});

export const importSchema = z.object({
  version: z.literal(1),
  expenses: z.array(z.record(z.unknown())).optional(),
  income: z.array(z.record(z.unknown())).optional(),
});
