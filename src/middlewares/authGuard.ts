import { NextFunction, Request, Response } from 'express';
import { tokenService } from '../services/tokenService';
import { ApiError } from '../utils/ApiError';

/** Requires a valid Bearer access token; attaches `req.userId`. */
export function authGuard(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Missing access token'));
  }
  req.userId = tokenService.verifyAccessToken(header.slice('Bearer '.length));
  next();
}
