import { Router } from 'express';
import { expenseController } from '../controllers/expenseController';
import { authGuard } from '../middlewares/authGuard';
import { receiptUpload } from '../middlewares/upload';
import { validate } from '../middlewares/validate';
import {
  createExpenseSchema,
  listExpenseQuerySchema,
  objectIdSchema,
  updateExpenseSchema,
} from '../validators/expenseValidators';

export const expenseRoutes = Router();

expenseRoutes.use(authGuard);

/**
 * @openapi
 * /expenses:
 *   get:
 *     tags: [Expenses]
 *     summary: List expenses (paginated, filterable, searchable, sortable)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20, maximum: 100 } }
 *       - { in: query, name: category, schema: { type: string } }
 *       - { in: query, name: paymentMethod, schema: { type: string } }
 *       - { in: query, name: dateFrom, schema: { type: string, format: date } }
 *       - { in: query, name: dateTo, schema: { type: string, format: date } }
 *       - { in: query, name: minAmount, schema: { type: number } }
 *       - { in: query, name: maxAmount, schema: { type: number } }
 *       - { in: query, name: q, schema: { type: string }, description: Search title/description/tags }
 *       - { in: query, name: sortBy, schema: { type: string, enum: [date, amount, category, createdAt] } }
 *       - { in: query, name: order, schema: { type: string, enum: [asc, desc] } }
 *     responses:
 *       200: { description: Paginated expense list with meta }
 *   post:
 *     tags: [Expenses]
 *     summary: Create an expense
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Expense created }
 */
expenseRoutes
  .route('/')
  .get(validate(listExpenseQuerySchema, 'query'), expenseController.list)
  .post(validate(createExpenseSchema), expenseController.create);

/**
 * @openapi
 * /expenses/{id}:
 *   get:
 *     tags: [Expenses]
 *     summary: Get one expense
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Expense }
 *       404: { description: Not found }
 *   patch:
 *     tags: [Expenses]
 *     summary: Update an expense
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Updated expense }
 *   delete:
 *     tags: [Expenses]
 *     summary: Delete an expense
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Deleted }
 */
expenseRoutes
  .route('/:id')
  .get(validate(objectIdSchema, 'params'), expenseController.getById)
  .patch(
    validate(objectIdSchema, 'params'),
    validate(updateExpenseSchema),
    expenseController.update,
  )
  .delete(validate(objectIdSchema, 'params'), expenseController.delete);

/**
 * @openapi
 * /expenses/{id}/receipt:
 *   post:
 *     tags: [Expenses]
 *     summary: Upload a receipt image (multipart field `receipt`)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Receipt uploaded — expense returned with receiptUrl }
 */
expenseRoutes.post(
  '/:id/receipt',
  validate(objectIdSchema, 'params'),
  receiptUpload.single('receipt'),
  expenseController.uploadReceipt,
);
