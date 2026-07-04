import { Router } from 'express';
import { z } from 'zod';
import { dashboardController } from '../controllers/dashboardController';
import { authGuard } from '../middlewares/authGuard';
import { validate } from '../middlewares/validate';

const summaryQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month must be YYYY-MM')
    .default(() => {
      const now = new Date();
      return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    }),
});

export const dashboardRoutes = Router();

dashboardRoutes.use(authGuard);

/**
 * @openapi
 * /dashboard/summary:
 *   get:
 *     tags: [Dashboard]
 *     summary: Monthly summary — totals, category breakdown, 6-month trend, recent transactions
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: string, example: "2026-07" }
 *         description: Defaults to the current month (UTC)
 *     responses:
 *       200: { description: Dashboard summary }
 */
dashboardRoutes.get('/summary', validate(summaryQuerySchema, 'query'), dashboardController.summary);
