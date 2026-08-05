import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validateRequest } from '../../middlewares/validateRequest';
import {
  getMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from './notification.controller';
import { notificationIdSchema, notificationQuerySchema } from './notification.validation';

const router = Router();

// All notification endpoints require user authentication
router.use(authenticate);

/**
 * @openapi
 * /notifications/my:
 *   get:
 *     summary: Get persisted notifications feed for logged-in user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paginated notifications feed and unread count
 */
router.get('/my', validateRequest({ query: notificationQuerySchema }), getMyNotifications);

/**
 * @openapi
 * /notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read for logged-in user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.patch('/read-all', markAllNotificationsAsRead);

/**
 * @openapi
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark single notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
router.patch('/:id/read', validateRequest({ params: notificationIdSchema }), markNotificationAsRead);

export default router;
