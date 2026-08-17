import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { getFullSettings, getPublicSettings, updateSettings } from './settings.controller';

const router = Router();

/**
 * @openapi
 * /settings/public:
 *   get:
 *     summary: Get public site branding and settings (Cached in Redis)
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Public site settings
 */
router.get('/public', getPublicSettings);

/**
 * @openapi
 * /settings:
 *   get:
 *     summary: Get full admin settings (Admin only)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Full site settings
 */
router.get('/', authenticate, authorize('admin', 'super_admin', 'marketing_editor'), getFullSettings);

/**
 * @openapi
 * /settings:
 *   put:
 *     summary: Update site settings and invalidate Redis cache (Admin only)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Updated site settings
 */
router.put('/', authenticate, authorize('admin', 'super_admin', 'marketing_editor'), updateSettings);

export default router;
