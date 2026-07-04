import { Request, Response } from 'express';
import { dashboardService } from '../services/dashboardService';
import { sendSuccess } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const dashboardController = {
  summary: asyncHandler(async (req: Request, res: Response) => {
    const month = req.query.month as string;
    const summary = await dashboardService.getSummary(req.userId as string, month);
    sendSuccess(res, summary);
  }),
};
