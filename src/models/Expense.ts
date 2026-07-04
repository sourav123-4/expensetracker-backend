import { Document, Model, Schema, Types, model } from 'mongoose';
import { EXPENSE_CATEGORIES, ExpenseCategory, PAYMENT_METHODS, PaymentMethod } from '../types/domain';

export interface IExpense extends Document {
  user: Types.ObjectId;
  title: string;
  amount: number;
  category: ExpenseCategory;
  description?: string;
  paymentMethod: PaymentMethod;
  date: Date;
  tags: string[];
  isRecurring: boolean;
  receiptUrl: string | null;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    amount: { type: Number, required: true, min: 0.01 },
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    description: { type: String, trim: true, maxlength: 1000 },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'Cash' },
    date: { type: Date, required: true, default: Date.now },
    tags: { type: [String], default: [] },
    isRecurring: { type: Boolean, default: false },
    receiptUrl: { type: String, default: null },
    location: { type: String, trim: true, maxlength: 200 },
  },
  { timestamps: true },
);

// Compound indexes matching the list endpoint's dominant query patterns
expenseSchema.index({ user: 1, date: -1 });
expenseSchema.index({ user: 1, category: 1, date: -1 });
// Text search over title/description/tags for the `q` parameter
expenseSchema.index({ title: 'text', description: 'text', tags: 'text' });

expenseSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const obj = ret as unknown as Record<string, unknown>;
    delete obj.__v;
    return obj;
  },
});

export const Expense: Model<IExpense> = model<IExpense>('Expense', expenseSchema);
