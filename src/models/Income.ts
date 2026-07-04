import { Document, Model, Schema, Types, model } from 'mongoose';
import { INCOME_SOURCES, IncomeSource } from '../types/domain';

export interface IIncome extends Document {
  user: Types.ObjectId;
  title: string;
  amount: number;
  source: IncomeSource;
  description?: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const incomeSchema = new Schema<IIncome>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    amount: { type: Number, required: true, min: 0.01 },
    source: { type: String, enum: INCOME_SOURCES, required: true },
    description: { type: String, trim: true, maxlength: 1000 },
    date: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

incomeSchema.index({ user: 1, date: -1 });

incomeSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const obj = ret as unknown as Record<string, unknown>;
    delete obj.__v;
    return obj;
  },
});

export const Income: Model<IIncome> = model<IIncome>('Income', incomeSchema);
