import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { validateRequest } from '../../middlewares/validateRequest';
import { createStore, getStores } from './pos.controller';
import { createStoreSchema } from './pos.validation';

const router = Router();

// Store routes require staff/admin authentication
router.use(authenticate);
router.use(authorize('admin', 'pharmacist'));

/**
 * @openapi
 * /stores:
 *   get:
 *     summary: List physical pharmacy stores
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of stores
 */
router.get('/', getStores);

/**
 * @openapi
 * /stores:
 *   post:
 *     summary: Create new physical store branch (Admin only)
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, code, address, phone]
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               address:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Store created successfully
 */
router.post('/', authorize('admin'), validateRequest({ body: createStoreSchema }), createStore);

export default router;
