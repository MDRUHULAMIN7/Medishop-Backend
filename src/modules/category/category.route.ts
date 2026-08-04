import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { validateRequest } from '../../middlewares/validateRequest';
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  getCategoryByIdOrSlug,
  getCategoryTree,
  getFeaturedCategories,
  toggleFeaturedCategory,
  updateCategory,
} from './category.controller';
import {
  categoryIdSchema,
  createCategorySchema,
  idOrSlugSchema,
  updateCategorySchema,
} from './category.validation';

const router = Router();

/**
 * @openapi
 * /categories:
 *   get:
 *     summary: List all categories (cached)
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *         description: Set true to include inactive categories (Admin)
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 */
router.get('/', getAllCategories);

/**
 * @openapi
 * /categories/tree:
 *   get:
 *     summary: Get hierarchical category tree (cached)
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Category tree retrieved successfully
 */
router.get('/tree', getCategoryTree);

/**
 * @openapi
 * /categories/featured:
 *   get:
 *     summary: Get featured categories for homepage (cached)
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Featured categories retrieved successfully
 */
router.get('/featured', getFeaturedCategories);

/**
 * @openapi
 * /categories/{idOrSlug}:
 *   get:
 *     summary: Get single category by ID or Slug
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: idOrSlug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category details
 *       404:
 *         description: Category not found
 */
router.get('/:idOrSlug', validateRequest({ params: idOrSlugSchema }), getCategoryByIdOrSlug);

/**
 * @openapi
 * /categories:
 *   post:
 *     summary: Create new category (Admin only)
 *     tags: [Categories]
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
 *               parentCategory:
 *                 type: string
 *               image:
 *                 type: string
 *               isFeatured:
 *                 type: boolean
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Category created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin role required
 */
router.post(
  '/',
  authenticate,
  authorize('admin'),
  validateRequest({ body: createCategorySchema }),
  createCategory
);

/**
 * @openapi
 * /categories/{id}:
 *   patch:
 *     summary: Update category (Admin only)
 *     tags: [Categories]
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
 *         description: Category updated successfully
 */
router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  validateRequest({ params: categoryIdSchema, body: updateCategorySchema }),
  updateCategory
);

/**
 * @openapi
 * /categories/{id}/toggle-feature:
 *   patch:
 *     summary: Toggle isFeatured status of a category (Admin only)
 *     tags: [Categories]
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
 *         description: Category feature status toggled
 */
router.patch(
  '/:id/toggle-feature',
  authenticate,
  authorize('admin'),
  validateRequest({ params: categoryIdSchema }),
  toggleFeaturedCategory
);

/**
 * @openapi
 * /categories/{id}:
 *   delete:
 *     summary: Delete category (Admin only)
 *     tags: [Categories]
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
 *         description: Category deleted successfully
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  validateRequest({ params: categoryIdSchema }),
  deleteCategory
);

export default router;
