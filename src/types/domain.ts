/** Enumerations shared by models, validators, and the Swagger spec. */

export const EXPENSE_CATEGORIES = [
  'Food',
  'Shopping',
  'Fuel',
  'Travel',
  'Health',
  'Medicine',
  'Investment',
  'Entertainment',
  'Bills',
  'Others',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const PAYMENT_METHODS = ['Cash', 'Card', 'UPI', 'NetBanking', 'Wallet', 'Other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const INCOME_SOURCES = [
  'Salary',
  'Business',
  'Freelancing',
  'Bonus',
  'Cashback',
  'Investment',
  'Interest',
  'Gift',
  'Other',
] as const;
export type IncomeSource = (typeof INCOME_SOURCES)[number];
