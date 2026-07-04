import { Request, Response } from 'express';
import { incomeService } from '../services/incomeService';
import { sendSuccess } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { ListIncomeQuery } from '../validators/incomeValidators';

export const incomeController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const income = await incomeService.create(req.userId as string, req.body);
    sendSuccess(res, { income }, { statusCode: 201, message: 'Income added' });
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListIncomeQuery;
    const { sortBy, order, page, limit, ...filters } = query;
    const result = await incomeService.list(
      req.userId as string,
      filters,
      { sortBy, order },
      { page, limit },
    );
    sendSuccess(res, { income: result.items }, { meta: result.meta });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const income = await incomeService.getById(req.userId as string, req.params.id);
    sendSuccess(res, { income });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const income = await incomeService.update(req.userId as string, req.params.id, req.body);
    sendSuccess(res, { income }, { message: 'Income updated' });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    await incomeService.delete(req.userId as string, req.params.id);
    sendSuccess(res, null, { message: 'Income deleted' });
  }),
};
