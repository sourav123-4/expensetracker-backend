import { UploadApiResponse } from 'cloudinary';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary';
import { IExpense } from '../models/Expense';
import {
  ExpenseListFilters,
  ExpenseSort,
  expenseRepository,
} from '../repositories/expenseRepository';
import { ApiError } from '../utils/ApiError';
import { PaginationMeta } from '../utils/ApiResponse';
import { buildMeta, toPageParams } from '../utils/pagination';

export const expenseService = {
  create(userId: string, data: Partial<IExpense>): Promise<IExpense> {
    return expenseRepository.create(userId, data);
  },

  async getById(userId: string, id: string): Promise<IExpense> {
    const expense = await expenseRepository.findById(userId, id);
    if (!expense) throw ApiError.notFound('Expense not found');
    return expense;
  },

  async list(
    userId: string,
    filters: ExpenseListFilters,
    sort: ExpenseSort,
    pageInput: { page?: number; limit?: number },
  ): Promise<{ items: IExpense[]; meta: PaginationMeta }> {
    const page = toPageParams(pageInput.page, pageInput.limit);
    const { items, total } = await expenseRepository.list(userId, filters, sort, page);
    return { items, meta: buildMeta(page, total) };
  },

  async update(userId: string, id: string, data: Partial<IExpense>): Promise<IExpense> {
    const updated = await expenseRepository.update(userId, id, data);
    if (!updated) throw ApiError.notFound('Expense not found');
    return updated;
  },

  async delete(userId: string, id: string): Promise<void> {
    const deleted = await expenseRepository.delete(userId, id);
    if (!deleted) throw ApiError.notFound('Expense not found');
  },

  /** Uploads a receipt image buffer to Cloudinary and stores the URL on the expense. */
  async attachReceipt(userId: string, id: string, file: Express.Multer.File): Promise<IExpense> {
    if (!isCloudinaryConfigured()) {
      throw ApiError.internal('Receipt uploads are not configured on this server');
    }

    // Ensure the expense exists and belongs to the user before uploading
    await this.getById(userId, id);

    const uploaded = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `expenseflow/receipts/${userId}`, resource_type: 'image' },
        (error, result) => (error || !result ? reject(error) : resolve(result)),
      );
      stream.end(file.buffer);
    });

    return this.update(userId, id, { receiptUrl: uploaded.secure_url } as Partial<IExpense>);
  },
};
