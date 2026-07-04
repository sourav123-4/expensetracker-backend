import { Request, Response } from 'express';
import { notificationService } from '../services/notificationService';
import { userService } from '../services/userService';
import { sendSuccess } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const userController = {
  updateProfile: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.updateProfile(req.userId as string, req.body);
    sendSuccess(res, { user }, { message: 'Profile updated' });
  }),

  addFcmToken: asyncHandler(async (req: Request, res: Response) => {
    await userService.addFcmToken(req.userId as string, req.body.token);
    sendSuccess(res, null, { message: 'Device registered for notifications' });
  }),

  removeFcmToken: asyncHandler(async (req: Request, res: Response) => {
    await userService.removeFcmToken(req.userId as string, req.body.token);
    sendSuccess(res, null, { message: 'Device unregistered' });
  }),

  exportData: asyncHandler(async (req: Request, res: Response) => {
    const bundle = await userService.exportData(req.userId as string);
    sendSuccess(res, bundle);
  }),

  importData: asyncHandler(async (req: Request, res: Response) => {
    const result = await userService.importData(req.userId as string, req.body);
    sendSuccess(res, result, { message: 'Data imported' });
  }),

  sendTestPush: asyncHandler(async (req: Request, res: Response) => {
    const result = await notificationService.sendToUser(req.userId as string, {
      title: 'ExpenseFlow',
      body: 'Push notifications are working 🎉',
      data: { type: 'test' },
    });
    sendSuccess(res, result, {
      message:
        result.sent > 0
          ? `Sent to ${result.sent} device(s)`
          : 'No pushes sent — check Firebase config and device registration',
    });
  }),
};
