import { IIncome } from '../models/Income';
import { IncomeListFilters, incomeRepository } from '../repositories/incomeRepository';
import { ApiError } from '../utils/ApiError';
import { PaginationMeta } from '../utils/ApiResponse';
import { buildMeta, toPageParams } from '../utils/pagination';

export const incomeService = {
  create(userId: string, data: Partial<IIncome>): Promise<IIncome> {
    return incomeRepository.create(userId, data);
  },

  async getById(userId: string, id: string): Promise<IIncome> {
    const income = await incomeRepository.findById(userId, id);
    if (!income) throw ApiError.notFound('Income entry not found');
    return income;
  },

  async list(
    userId: string,
    filters: IncomeListFilters,
    sort: { sortBy: 'date' | 'amount' | 'createdAt'; order: 'asc' | 'desc' },
    pageInput: { page?: number; limit?: number },
  ): Promise<{ items: IIncome[]; meta: PaginationMeta }> {
    const page = toPageParams(pageInput.page, pageInput.limit);
    const { items, total } = await incomeRepository.list(userId, filters, sort, page);
    return { items, meta: buildMeta(page, total) };
  },

  async update(userId: string, id: string, data: Partial<IIncome>): Promise<IIncome> {
    const updated = await incomeRepository.update(userId, id, data);
    if (!updated) throw ApiError.notFound('Income entry not found');
    return updated;
  },

  async delete(userId: string, id: string): Promise<void> {
    const deleted = await incomeRepository.delete(userId, id);
    if (!deleted) throw ApiError.notFound('Income entry not found');
  },
};
