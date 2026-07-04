import { Router } from 'express';
import { userController } from '../controllers/userController';
import { authGuard } from '../middlewares/authGuard';
import { validate } from '../middlewares/validate';
import { fcmTokenSchema, importSchema, updateProfileSchema } from '../validators/userValidators';

export const userRoutes = Router();

userRoutes.use(authGuard);

/**
 * @openapi
 * /users/me:
 *   patch:
 *     tags: [Users]
 *     summary: Update profile (name, currency)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Updated user }
 */
userRoutes.patch('/me', validate(updateProfileSchema), userController.updateProfile);

/**
 * @openapi
 * /users/me/fcm-token:
 *   put:
 *     tags: [Users]
 *     summary: Register this device's FCM token for push notifications
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Registered }
 *   delete:
 *     tags: [Users]
 *     summary: Unregister a device token (e.g. on logout)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Unregistered }
 */
userRoutes
  .route('/me/fcm-token')
  .put(validate(fcmTokenSchema), userController.addFcmToken)
  .delete(validate(fcmTokenSchema), userController.removeFcmToken);

/**
 * @openapi
 * /users/me/export:
 *   get:
 *     tags: [Users]
 *     summary: Export all account data as a JSON backup bundle
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Backup bundle (version, user, expenses, income) }
 */
userRoutes.get('/me/export', userController.exportData);

/**
 * @openapi
 * /users/me/import:
 *   post:
 *     tags: [Users]
 *     summary: Restore expenses/income from an export bundle into this account
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Row counts imported }
 *       400: { description: Invalid bundle }
 */
userRoutes.post('/me/import', validate(importSchema), userController.importData);

/**
 * @openapi
 * /users/me/test-push:
 *   post:
 *     tags: [Users]
 *     summary: Send a test push notification to all registered devices
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Send result }
 */
userRoutes.post('/me/test-push', userController.sendTestPush);
