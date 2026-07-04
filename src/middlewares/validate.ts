import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { ApiError } from '../utils/ApiError';

type Target = 'body' | 'query' | 'params';

/**
 * Validates and coerces a request segment with a Zod schema. On success the
 * parsed (typed, defaulted) value replaces the raw one.
 */
export function validate(schema: ZodSchema, target: Target = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const errors: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || target;
        (errors[key] ??= []).push(issue.message);
      }
      return next(ApiError.badRequest('Validation failed', errors));
    }
    // req.query is a getter in Express 5 types; defineProperty works for all targets
    Object.defineProperty(req, target, { value: result.data, writable: true });
    next();
  };
}
