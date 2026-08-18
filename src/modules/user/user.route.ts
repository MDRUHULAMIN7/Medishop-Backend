import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { upload } from '../../middlewares/upload';
import { validateRequest } from '../../middlewares/validateRequest';
import {
  addAddress,
  getAddresses,
  getMe,
  getUserById,
  listUsers,
  removeAddress,
  setDefaultAddress,
  updateAddress,
  updateMe,
  updateUserStatus,
  uploadAvatar,
  sendStaffInvitation,
  getStaffInvitations,
  cancelStaffInvitation,
  getMyStaffInvitations,
  acceptStaffInvitation,
  declineStaffInvitation,
  searchCustomers,
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
 *     summary: Get authenticated user profile (Includes addresses)
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
 * /users/me/avatar:
 *   patch:
 *     summary: Upload avatar with Sharp optimization (Convert to WebP & resize)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     responses:
 *       200:
 *         description: Avatar updated successfully
 */
router.patch('/me/avatar', authenticate, upload.single('avatar'), uploadAvatar);

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

// ==========================================
// Specific Static Endpoints (MUST come before /:userId wildcard)
// ==========================================

// Customer autocomplete search for POS counter & staff assignment
router.get(
  '/customer-search',
  authenticate,
  authorize('admin', 'super_admin', 'sales_staff', 'pharmacist', 'inventory_manager'),
  searchCustomers
);

// Staff Promotion & Invitation System
router.post(
  '/staff-invitations',
  authenticate,
  authorize('admin', 'super_admin'),
  sendStaffInvitation
);

router.get(
  '/staff-invitations',
  authenticate,
  authorize('admin', 'super_admin'),
  getStaffInvitations
);

router.delete(
  '/staff-invitations/:invitationId',
  authenticate,
  authorize('admin', 'super_admin'),
  cancelStaffInvitation
);

// Customer self-service endpoints for pending staff invitations
router.get(
  '/me/staff-invitations',
  authenticate,
  getMyStaffInvitations
);

router.post(
  '/me/staff-invitations/:invitationId/accept',
  authenticate,
  acceptStaffInvitation
);

router.post(
  '/me/staff-invitations/:invitationId/decline',
  authenticate,
  declineStaffInvitation
);

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Admin - List all registered users for table view
 *     tags: [Users Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users fetched successfully
 */
router.get('/', authenticate, authorize('admin'), listUsers);

/**
 * @openapi
 * /users/{userId}:
 *   get:
 *     summary: Admin - Get single user full details
 *     tags: [Users Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details fetched successfully
 *       404:
 *         description: User not found
 */
router.get(
  '/:userId',
  authenticate,
  authorize('admin'),
  validateRequest({ params: userIdParamsSchema }),
  getUserById
);

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

export default router;
