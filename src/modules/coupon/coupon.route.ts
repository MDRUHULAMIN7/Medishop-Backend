import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { validateRequest } from '../../middlewares/validateRequest';
import {
  applyCoupon,
  createCoupon,
  deleteCoupon,
  getAllCoupons,
  getCouponById,
  getValidPublicCoupons,
  updateCoupon,
} from './coupon.controller';
import {
  applyCouponSchema,
  couponIdSchema,
  createCouponSchema,
  updateCouponSchema,
} from './coupon.validation';

const router = Router();

/**
 * @openapi
 * /coupons/apply:
 *   post:
 *     summary: Validate and calculate discount for a coupon code
 *     tags: [Coupons]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, orderAmount]
 *             properties:
 *               code:
 *                 type: string
 *                 example: MEDI100
 *               orderAmount:
 *                 type: number
 *                 example: 500
 *     responses:
 *       200:
 *         description: Coupon successfully applied and discount calculated
 *       400:
 *         description: Invalid, expired, exhausted, or inapplicable coupon
 *       404:
 *         description: Coupon code not found
 */
router.post('/apply', validateRequest({ body: applyCouponSchema }), applyCoupon);

/**
 * @openapi
 * /coupons/valid:
 *   get:
 *     summary: List currently active public coupons (cached)
 *     tags: [Coupons]
 *     responses:
 *       200:
 *         description: List of valid public coupons
 */
router.get('/valid', getValidPublicCoupons);

/**
 * @openapi
 * /coupons:
 *   get:
 *     summary: List all coupons (Admin only)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: All coupons retrieved
 */
router.get('/', authenticate, authorize('admin'), getAllCoupons);

/**
 * @openapi
 * /coupons/{id}:
 *   get:
 *     summary: Get single coupon details (Admin only)
 *     tags: [Coupons]
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
 *         description: Coupon details
 *       404:
 *         description: Coupon not found
 */
router.get('/:id', authenticate, authorize('admin'), validateRequest({ params: couponIdSchema }), getCouponById);

/**
 * @openapi
 * /coupons:
 *   post:
 *     summary: Create new discount coupon (Admin only)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, discountType, discountValue, startDate, endDate]
 *             properties:
 *               code:
 *                 type: string
 *               description:
 *                 type: string
 *               discountType:
 *                 type: string
 *                 enum: [percentage, fixed_amount]
 *               discountValue:
 *                 type: number
 *               maxDiscountAmount:
 *                 type: number
 *               minOrderAmount:
 *                 type: number
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               usageLimit:
 *                 type: integer
 *               perUserLimit:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Coupon created successfully
 */
router.post(
  '/',
  authenticate,
  authorize('admin'),
  validateRequest({ body: createCouponSchema }),
  createCoupon
);

/**
 * @openapi
 * /coupons/{id}:
 *   patch:
 *     summary: Update coupon rules/dates/limits (Admin only)
 *     tags: [Coupons]
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
 *         description: Coupon updated successfully
 */
router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  validateRequest({ params: couponIdSchema, body: updateCouponSchema }),
  updateCoupon
);

/**
 * @openapi
 * /coupons/{id}:
 *   delete:
 *     summary: Delete coupon (Admin only)
 *     tags: [Coupons]
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
 *         description: Coupon deleted successfully
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  validateRequest({ params: couponIdSchema }),
  deleteCoupon
);

export default router;
