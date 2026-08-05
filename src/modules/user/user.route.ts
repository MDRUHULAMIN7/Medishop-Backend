import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { validateRequest } from '../../middlewares/validateRequest';
import {
  addAddress,
  getAddresses,
  getMe,
  listUsers,
  removeAddress,
  setDefaultAddress,
  updateAddress,
  updateMe,
  updateUserStatus,
} from './user.controller';
import {
  addressIdParamsSchema,
  createAddressSchema,
  updateAddressSchema,
  updateProfileSchema,
  updateUserStatusSchema,
  userIdParamsSchema,
} from './user.validation';

const router = Router();

/**
 * @openapi
 * /users/me:
 *   get:
 *     summary: Get authenticated user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile fetched successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticate, getMe);

/**
 * @openapi
 * /users/me:
 *   patch:
 *     summary: Update authenticated user profile (name, email, phone, avatar)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 description: Base64 or image URL string (max 5MB)
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.patch('/me', authenticate, validateRequest({ body: updateProfileSchema }), updateMe);

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Admin - List all registered users
 *     tags: [Users Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, blocked]
 *     responses:
 *       200:
 *         description: List of users fetched successfully
 */
router.get('/', authenticate, authorize('admin'), listUsers);

/**
 * @openapi
 * /users/{userId}/status:
 *   patch:
 *     summary: Admin - Block or unblock a user
 *     tags: [Users Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, blocked]
 *     responses:
 *       200:
 *         description: User status updated successfully
 */
router.patch(
  '/:userId/status',
  authenticate,
  authorize('admin'),
  validateRequest({ params: userIdParamsSchema, body: updateUserStatusSchema }),
  updateUserStatus
);

/**
 * @openapi
 * /users/me/addresses:
 *   get:
 *     summary: Get all shipping addresses for authenticated user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of shipping addresses
 */
router.get('/me/addresses', authenticate, getAddresses);

/**
 * @openapi
 * /users/me/addresses:
 *   post:
 *     summary: Add a shipping address for the authenticated user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Address added successfully
 */
router.post('/me/addresses', authenticate, validateRequest({ body: createAddressSchema }), addAddress);

/**
 * @openapi
 * /users/me/addresses/{addressId}:
 *   patch:
 *     summary: Update an existing shipping address
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Address updated successfully
 */
router.patch(
  '/me/addresses/:addressId',
  authenticate,
  validateRequest({ params: addressIdParamsSchema, body: updateAddressSchema }),
  updateAddress
);

/**
 * @openapi
 * /users/me/addresses/{addressId}/default:
 *   patch:
 *     summary: Set a shipping address as default
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Default address updated successfully
 */
router.patch(
  '/me/addresses/:addressId/default',
  authenticate,
  validateRequest({ params: addressIdParamsSchema }),
  setDefaultAddress
);

/**
 * @openapi
 * /users/me/addresses/{addressId}:
 *   delete:
 *     summary: Remove a shipping address
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Address removed successfully
 */
router.delete('/me/addresses/:addressId', authenticate, validateRequest({ params: addressIdParamsSchema }), removeAddress);

export default router;
