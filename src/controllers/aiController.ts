import { Request, Response } from 'express';
import { aiService } from '../services/aiService';
import { sendSuccess } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const aiController = {
  parseTransaction: asyncHandler(async (req: Request, res: Response) => {
    const transaction = await aiService.parseTransaction(req.body.text as string);
    sendSuccess(res, { transaction });
  }),
};
