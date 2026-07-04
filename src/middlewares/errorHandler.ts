import { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger';
import { isProduction } from '../config/env';
import { ApiError } from '../utils/ApiError';

/** 404 for unmatched routes. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

/**
 * Global error handler — the single place errors become JSON. Every response
 * has the shape { success: false, message, errors? }.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors ? { errors: err.errors } : {}),
    });
    return;
  }

  // Unexpected error: log the stack, hide details from clients in production
  logger.error(err.stack ?? err.message);
  res.status(500).json({
    success: false,
    message: isProduction ? 'Internal server error' : err.message,
  });
}
