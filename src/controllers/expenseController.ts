import { Request, Response } from 'express';
import { expenseService } from '../services/expenseService';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { ListExpenseQuery } from '../validators/expenseValidators';

export const expenseController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const expense = await expenseService.create(req.userId as string, req.body);
    sendSuccess(res, { expense }, { statusCode: 201, message: 'Expense created' });
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListExpenseQuery;
    const { sortBy, order, page, limit, ...filters } = query;
    const result = await expenseService.list(
      req.userId as string,
      filters,
      { sortBy, order },
      { page, limit },
    );
    sendSuccess(res, { expenses: result.items }, { meta: result.meta });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const expense = await expenseService.getById(req.userId as string, req.params.id);
    sendSuccess(res, { expense });
  }),

  categorize: asyncHandler(async (req: Request, res: Response) => {
    const category = await expenseService.categorize(req.body.title as string);
    sendSuccess(res, { category });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const expense = await expenseService.update(req.userId as string, req.params.id, req.body);
    sendSuccess(res, { expense }, { message: 'Expense updated' });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    await expenseService.delete(req.userId as string, req.params.id);
    sendSuccess(res, null, { message: 'Expense deleted' });
  }),

  uploadReceipt: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw ApiError.badRequest('Receipt image is required (field: receipt)');
    const expense = await expenseService.attachReceipt(
      req.userId as string,
      req.params.id,
      req.file,
    );
    sendSuccess(res, { expense }, { message: 'Receipt uploaded' });
  }),
};
