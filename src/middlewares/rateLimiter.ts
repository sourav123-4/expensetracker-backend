import rateLimit from 'express-rate-limit';
import { env, isTest } from '../config/env';

/** Tight limiter for credential endpoints (login, forgot-password, verify-otp). */
export const authRateLimiter = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  limit: isTest ? 1000 : env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later' },
});

/** General API limiter — generous, protects against runaway clients. */
export const apiRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: isTest ? 10_000 : 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please slow down' },
});
