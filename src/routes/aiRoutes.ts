import { Router } from 'express';
import { aiController } from '../controllers/aiController';
import { authGuard } from '../middlewares/authGuard';
import { validate } from '../middlewares/validate';
import { parseTransactionSchema } from '../validators/aiValidators';

export const aiRoutes = Router();

aiRoutes.use(authGuard);

/**
 * @openapi
 * /ai/parse-transaction:
 *   post:
 *     tags: [AI]
 *     summary: Parse free text (e.g. "coffee 150 UPI") into a draft expense/income
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text: { type: string }
 *     responses:
 *       200: { description: Parsed draft transaction }
 *       400: { description: AI parsing not configured, or the text couldn't be parsed }
 */
aiRoutes.post('/parse-transaction', validate(parseTransactionSchema), aiController.parseTransaction);
