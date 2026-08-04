import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { validateRequest } from '../../middlewares/validateRequest';
import {
  changePassword,
  checkIdentifier,
  completeRegistration,
  forgotPassword,
  login,
  logout,
  me,
  refresh,
  resetPassword,
  verifyOtp,
  verifyResetOtp,
} from './auth.controller';
import {
  changePasswordSchema,
  checkIdentifierSchema,
  completeRegistrationSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  verifyOtpSchema,
  verifyResetOtpSchema,
} from './auth.validation';

const router = Router();

/**
 * @openapi
 * /auth/check-identifier:
 *   post:
 *     summary: Check whether email/phone already exists
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier]
 *             properties:
 *               identifier:
 *                 type: string
 *                 example: test@example.com
 */
router.post('/check-identifier', validateRequest({ body: checkIdentifierSchema }), checkIdentifier);

/**
 * @openapi
 * /auth/verify-otp:
 *   post:
 *     summary: Verify registration OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier, otp]
 *             properties:
 *               identifier:
 *                 type: string
 *                 example: test@example.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 */
router.post('/verify-otp', validateRequest({ body: verifyOtpSchema }), verifyOtp);

/**
 * @openapi
 * /auth/complete-registration:
 *   post:
 *     summary: Complete registration after OTP verification
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [verificationToken, name, password]
 *             properties:
 *               verificationToken:
 *                 type: string
 *                 format: uuid
 *               name:
 *                 type: string
 *                 example: Test User
 *               password:
 *                 type: string
 *                 example: Password123
 */
router.post(
  '/complete-registration',
  validateRequest({ body: completeRegistrationSchema }),
  completeRegistration
);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login with email/phone and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier, password]
 *             properties:
 *               identifier:
 *                 type: string
 *                 example: test@example.com
 *               password:
 *                 type: string
 *                 example: Password123
 */
router.post('/login', validateRequest({ body: loginSchema }), login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 */
router.post('/refresh', refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Logout current session
 *     tags: [Auth]
 */
router.post('/logout', logout);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier]
 *             properties:
 *               identifier:
 *                 type: string
 *                 example: test@example.com
 */
router.post('/forgot-password', validateRequest({ body: forgotPasswordSchema }), forgotPassword);

/**
 * @openapi
 * /auth/verify-reset-otp:
 *   post:
 *     summary: Verify password reset OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier, otp]
 *             properties:
 *               identifier:
 *                 type: string
 *                 example: test@example.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 */
router.post('/verify-reset-otp', validateRequest({ body: verifyResetOtpSchema }), verifyResetOtp);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     summary: Reset password with verification token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [verificationToken, password]
 *             properties:
 *               verificationToken:
 *                 type: string
 *                 format: uuid
 *               password:
 *                 type: string
 *                 example: Password123
 */
router.post('/reset-password', validateRequest({ body: resetPasswordSchema }), resetPassword);

/**
 * @openapi
 * /auth/change-password:
 *   post:
 *     summary: Change password for authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: OldPassword123
 *               newPassword:
 *                 type: string
 *                 example: NewPassword123
 */
router.post(
  '/change-password',
  authenticate,
  authorize('customer', 'pharmacist', 'sales_staff', 'inventory_manager', 'admin'),
  validateRequest({ body: changePasswordSchema }),
  changePassword
);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get authenticated user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
router.get('/me', authenticate, me);

export default router;
