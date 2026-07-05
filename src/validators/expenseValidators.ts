import { Types } from 'mongoose';
import { z } from 'zod';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../types/domain';

export const objectIdSchema = z.object({
  id: z.string().refine((v) => Types.ObjectId.isValid(v), 'Invalid id'),
});

const expenseBody = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().trim().max(1000).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).default('Cash'),
  date: z.coerce.date().default(() => new Date()),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
  isRecurring: z.boolean().default(false),
  location: z.string().trim().max(200).optional(),
});

export const createExpenseSchema = expenseBody;
export const updateExpenseSchema = expenseBody.partial();

export const categorizeExpenseSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(120),
});

export const listExpenseQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  minAmount: z.coerce.number().nonnegative().optional(),
  maxAmount: z.coerce.number().nonnegative().optional(),
  q: z.string().trim().max(100).optional(),
  sortBy: z.enum(['date', 'amount', 'category', 'createdAt']).default('date'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type ListExpenseQuery = z.infer<typeof listExpenseQuerySchema>;
