import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authGuard } from '../middlewares/authGuard';
import { authRateLimiter } from '../middlewares/rateLimiter';
import { validate } from '../middlewares/validate';
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  verifyOtpSchema,
} from '../validators/authValidators';

export const authRoutes = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Create an account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       201: { description: Account created — returns user + token pair }
 *       409: { description: Email already registered }
 */
authRoutes.post('/register', authRateLimiter, validate(registerSchema), authController.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with email + password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200: { description: Logged in — returns user + token pair }
 *       401: { description: Invalid credentials }
 */
authRoutes.post('/login', authRateLimiter, validate(loginSchema), authController.login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Rotate a refresh token for a new token pair
 *     responses:
 *       200: { description: New access + refresh tokens }
 *       401: { description: Invalid, expired, or reused refresh token }
 */
authRoutes.post('/refresh', validate(refreshSchema), authController.refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Revoke a refresh token (log out this session)
 *     responses:
 *       200: { description: Logged out }
 */
authRoutes.post('/logout', validate(refreshSchema), authController.logout);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Send a 6-digit password reset code
 *     responses:
 *       200: { description: Always OK (anti-enumeration) }
 */
authRoutes.post(
  '/forgot-password',
  authRateLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);

/**
 * @openapi
 * /auth/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Exchange a valid OTP for a single-use reset token
 *     responses:
 *       200: { description: Code verified — returns resetToken }
 *       400: { description: Invalid or expired code }
 */
authRoutes.post('/verify-otp', authRateLimiter, validate(verifyOtpSchema), authController.verifyOtp);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Set a new password using a reset token
 *     responses:
 *       200: { description: Password reset; all sessions revoked }
 *       400: { description: Invalid or expired reset token }
 */
authRoutes.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Current user profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: User profile }
 *       401: { description: Missing/invalid access token }
 */
authRoutes.get('/me', authGuard, authController.me);
