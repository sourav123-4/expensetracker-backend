import { FilterQuery, SortOrder } from 'mongoose';
import { IIncome, Income } from '../models/Income';
import { PageParams } from '../utils/pagination';

export interface IncomeListFilters {
  source?: string;
  dateFrom?: Date;
  dateTo?: Date;
  q?: string;
}

export const incomeRepository = {
  create(userId: string, data: Partial<IIncome>): Promise<IIncome> {
    return Income.create({ ...data, user: userId });
  },

  findById(userId: string, id: string): Promise<IIncome | null> {
    return Income.findOne({ _id: id, user: userId }).exec();
  },

  async list(
    userId: string,
    filters: IncomeListFilters,
    sort: { sortBy: 'date' | 'amount' | 'createdAt'; order: 'asc' | 'desc' },
    page: PageParams,
  ): Promise<{ items: IIncome[]; total: number }> {
    const query: FilterQuery<IIncome> = { user: userId };
    if (filters.source) query.source = filters.source;
    if (filters.dateFrom || filters.dateTo) {
      query.date = {};
      if (filters.dateFrom) query.date.$gte = filters.dateFrom;
      if (filters.dateTo) query.date.$lte = filters.dateTo;
    }
    if (filters.q) {
      const rx = new RegExp(filters.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ title: rx }, { description: rx }];
    }

    const sortSpec: Record<string, SortOrder> = {
      [sort.sortBy]: sort.order === 'asc' ? 1 : -1,
      _id: -1,
    };

    const [items, total] = await Promise.all([
      Income.find(query).sort(sortSpec).skip(page.skip).limit(page.limit).exec(),
      Income.countDocuments(query).exec(),
    ]);
    return { items, total };
  },

  update(userId: string, id: string, data: Partial<IIncome>): Promise<IIncome | null> {
    return Income.findOneAndUpdate({ _id: id, user: userId }, data, {
      new: true,
      runValidators: true,
    }).exec();
  },

  async delete(userId: string, id: string): Promise<boolean> {
    const result = await Income.deleteOne({ _id: id, user: userId }).exec();
    return result.deletedCount === 1;
  },
};
