import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { validateRequest } from '../../middlewares/validateRequest';
import {
  createBrand,
  deleteBrand,
  getAllBrands,
  getBrandByIdOrSlug,
  getFeaturedBrands,
  toggleFeaturedBrand,
  updateBrand,
} from './brand.controller';
import {
  brandIdOrSlugSchema,
  brandIdSchema,
  createBrandSchema,
  updateBrandSchema,
} from './brand.validation';

const router = Router();

/**
 * @openapi
 * /brands:
 *   get:
 *     summary: List all manufacturer brands (cached)
 *     tags: [Brands]
 *     parameters:
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *         description: Set true to include inactive brands (Admin)
 *     responses:
 *       200:
 *         description: Brands retrieved successfully
 */
router.get('/', getAllBrands);

/**
 * @openapi
 * /brands/featured:
 *   get:
 *     summary: Get featured brands for homepage (cached)
 *     tags: [Brands]
 *     responses:
 *       200:
 *         description: Featured brands retrieved successfully
 */
router.get('/featured', getFeaturedBrands);

/**
 * @openapi
 * /brands/{idOrSlug}:
 *   get:
 *     summary: Get single brand by ID or Slug
 *     tags: [Brands]
 *     parameters:
 *       - in: path
 *         name: idOrSlug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Brand details
 *       404:
 *         description: Brand not found
 */
router.get('/:idOrSlug', validateRequest({ params: brandIdOrSlugSchema }), getBrandByIdOrSlug);

/**
 * @openapi
 * /brands:
 *   post:
 *     summary: Create new brand (Admin only)
 *     tags: [Brands]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               logo:
 *                 type: string
 *               isFeatured:
 *                 type: boolean
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Brand created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin role required
 */
router.post(
  '/',
  authenticate,
  authorize('admin', 'super_admin', 'inventory_manager', 'pharmacist'),
  validateRequest({ body: createBrandSchema }),
  createBrand
);

/**
 * @openapi
 * /brands/{id}:
 *   patch:
 *     summary: Update brand (Admin only)
 *     tags: [Brands]
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
 *         description: Brand updated successfully
 */
router.patch(
  '/:id',
  authenticate,
  authorize('admin', 'super_admin', 'inventory_manager', 'pharmacist'),
  validateRequest({ params: brandIdSchema, body: updateBrandSchema }),
  updateBrand
);

/**
 * @openapi
 * /brands/{id}/toggle-feature:
 *   patch:
 *     summary: Toggle isFeatured status of a brand (Admin only)
 *     tags: [Brands]
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
 *         description: Brand feature status toggled
 */
router.patch(
  '/:id/toggle-feature',
  authenticate,
  authorize('admin', 'super_admin', 'inventory_manager', 'pharmacist'),
  validateRequest({ params: brandIdSchema }),
  toggleFeaturedBrand
);

/**
 * @openapi
 * /brands/{id}:
 *   delete:
 *     summary: Delete brand (Admin only)
 *     tags: [Brands]
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
 *         description: Brand deleted successfully
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'super_admin', 'inventory_manager', 'pharmacist'),
  validateRequest({ params: brandIdSchema }),
  deleteBrand
);

export default router;
