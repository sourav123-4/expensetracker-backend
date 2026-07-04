import { FilterQuery, SortOrder } from 'mongoose';
import { Expense, IExpense } from '../models/Expense';
import { PageParams } from '../utils/pagination';

export interface ExpenseListFilters {
  category?: string;
  paymentMethod?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
  q?: string;
}

export interface ExpenseSort {
  sortBy: 'date' | 'amount' | 'category' | 'createdAt';
  order: 'asc' | 'desc';
}

function buildQuery(userId: string, filters: ExpenseListFilters): FilterQuery<IExpense> {
  const query: FilterQuery<IExpense> = { user: userId };

  if (filters.category) query.category = filters.category;
  if (filters.paymentMethod) query.paymentMethod = filters.paymentMethod;

  if (filters.dateFrom || filters.dateTo) {
    query.date = {};
    if (filters.dateFrom) query.date.$gte = filters.dateFrom;
    if (filters.dateTo) query.date.$lte = filters.dateTo;
  }

  if (filters.minAmount != null || filters.maxAmount != null) {
    query.amount = {};
    if (filters.minAmount != null) query.amount.$gte = filters.minAmount;
    if (filters.maxAmount != null) query.amount.$lte = filters.maxAmount;
  }

  if (filters.q) {
    // Regex over indexed fields rather than $text so partial words match
    // ("groc" finds "Groceries"), which is what a mobile search box needs.
    const rx = new RegExp(filters.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ title: rx }, { description: rx }, { tags: rx }];
  }

  return query;
}

export const expenseRepository = {
  create(userId: string, data: Partial<IExpense>): Promise<IExpense> {
    return Expense.create({ ...data, user: userId });
  },

  findById(userId: string, id: string): Promise<IExpense | null> {
    return Expense.findOne({ _id: id, user: userId }).exec();
  },

  async list(
    userId: string,
    filters: ExpenseListFilters,
    sort: ExpenseSort,
    page: PageParams,
  ): Promise<{ items: IExpense[]; total: number }> {
    const query = buildQuery(userId, filters);
    const sortSpec: Record<string, SortOrder> = {
      [sort.sortBy]: sort.order === 'asc' ? 1 : -1,
      _id: -1, // stable tie-break for pagination
    };

    const [items, total] = await Promise.all([
      Expense.find(query).sort(sortSpec).skip(page.skip).limit(page.limit).exec(),
      Expense.countDocuments(query).exec(),
    ]);

    return { items, total };
  },

  async update(userId: string, id: string, data: Partial<IExpense>): Promise<IExpense | null> {
    return Expense.findOneAndUpdate({ _id: id, user: userId }, data, {
      new: true,
      runValidators: true,
    }).exec();
  },

  async delete(userId: string, id: string): Promise<boolean> {
    const result = await Expense.deleteOne({ _id: id, user: userId }).exec();
    return result.deletedCount === 1;
  },
};
