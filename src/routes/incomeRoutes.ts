import { Router } from 'express';
import { incomeController } from '../controllers/incomeController';
import { authGuard } from '../middlewares/authGuard';
import { validate } from '../middlewares/validate';
import { objectIdSchema } from '../validators/expenseValidators';
import {
  createIncomeSchema,
  listIncomeQuerySchema,
  updateIncomeSchema,
} from '../validators/incomeValidators';

export const incomeRoutes = Router();

incomeRoutes.use(authGuard);

/**
 * @openapi
 * /income:
 *   get:
 *     tags: [Income]
 *     summary: List income entries (paginated, filterable)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated income list with meta }
 *   post:
 *     tags: [Income]
 *     summary: Add an income entry
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Income added }
 */
incomeRoutes
  .route('/')
  .get(validate(listIncomeQuerySchema, 'query'), incomeController.list)
  .post(validate(createIncomeSchema), incomeController.create);

/**
 * @openapi
 * /income/{id}:
 *   get:
 *     tags: [Income]
 *     summary: Get one income entry
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Income entry }
 *   patch:
 *     tags: [Income]
 *     summary: Update an income entry
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Updated income entry }
 *   delete:
 *     tags: [Income]
 *     summary: Delete an income entry
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Deleted }
 */
incomeRoutes
  .route('/:id')
  .get(validate(objectIdSchema, 'params'), incomeController.getById)
  .patch(validate(objectIdSchema, 'params'), validate(updateIncomeSchema), incomeController.update)
  .delete(validate(objectIdSchema, 'params'), incomeController.delete);
