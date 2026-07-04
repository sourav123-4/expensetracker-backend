import { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
}

/**
 * Consistent success envelope: { success, message, data, meta? }.
 * The mobile client's RTK Query layer relies on this exact shape.
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  options: { statusCode?: number; message?: string; meta?: PaginationMeta } = {},
): Response {
  const { statusCode = 200, message = 'OK', meta } = options;
  return res.status(statusCode).json({ success: true, message, data, ...(meta ? { meta } : {}) });
}
