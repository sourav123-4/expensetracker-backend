import { z } from 'zod';
import { INCOME_SOURCES } from '../types/domain';

const incomeBody = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  source: z.enum(INCOME_SOURCES),
  description: z.string().trim().max(1000).optional(),
  date: z.coerce.date().default(() => new Date()),
});

export const createIncomeSchema = incomeBody;
export const updateIncomeSchema = incomeBody.partial();

export const listIncomeQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  source: z.enum(INCOME_SOURCES).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  q: z.string().trim().max(100).optional(),
  sortBy: z.enum(['date', 'amount', 'createdAt']).default('date'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type ListIncomeQuery = z.infer<typeof listIncomeQuerySchema>;
