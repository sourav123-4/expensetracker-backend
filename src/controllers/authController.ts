import { Request, Response } from 'express';
import { authService } from '../services/authService';
import { sendSuccess } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const { user, tokens } = await authService.register(req.body);
    sendSuccess(res, { user, ...tokens }, { statusCode: 201, message: 'Account created' });
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const { user, tokens } = await authService.login(req.body);
    sendSuccess(res, { user, ...tokens }, { message: 'Logged in' });
  }),

  google: asyncHandler(async (req: Request, res: Response) => {
    const { user, tokens } = await authService.loginWithGoogle(req.body.idToken);
    sendSuccess(res, { user, ...tokens }, { message: 'Logged in' });
  }),

  phone: asyncHandler(async (req: Request, res: Response) => {
    const { user, tokens } = await authService.loginWithPhone(req.body.idToken);
    sendSuccess(res, { user, ...tokens }, { message: 'Logged in' });
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const tokens = await authService.refresh(req.body.refreshToken);
    sendSuccess(res, tokens, { message: 'Token refreshed' });
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    await authService.logout(req.body.refreshToken);
    sendSuccess(res, null, { message: 'Logged out' });
  }),

  forgotPassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.forgotPassword(req.body.email);
    // Same response whether or not the account exists
    sendSuccess(res, null, { message: 'If that email exists, a code has been sent' });
  }),

  verifyOtp: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.verifyOtp(req.body.email, req.body.otp);
    sendSuccess(res, result, { message: 'Code verified' });
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.resetPassword(req.body.email, req.body.resetToken, req.body.newPassword);
    sendSuccess(res, null, { message: 'Password reset; please log in again' });
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.getProfile(req.userId as string);
    sendSuccess(res, { user });
  }),
};
