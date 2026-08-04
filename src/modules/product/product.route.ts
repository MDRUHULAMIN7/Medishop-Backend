import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { upload } from '../../middlewares/upload';
import { validateRequest } from '../../middlewares/validateRequest';
import {
  createProduct,
  deleteProduct,
  getFeaturedProducts,
  getProductByIdOrSlug,
  getProducts,
  toggleFeaturedProduct,
  updateProduct,
} from './product.controller';
import {
  createProductSchema,
  productIdOrSlugSchema,
  productIdSchema,
  productQuerySchema,
  updateProductSchema,
} from './product.validation';

const router = Router();

/**
 * @openapi
 * /products:
 *   get:
 *     summary: List & search products with filtering, sorting, pagination (cached)
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Full-text search keyword across name, genericName, description
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Category Mongo ID
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Brand Mongo ID
 *       - in: query
 *         name: dosageForm
 *         schema:
 *           type: string
 *         description: Dosage form (tablet, syrup, capsule, etc.)
 *       - in: query
 *         name: unitType
 *         schema:
 *           type: string
 *         description: Selling unit type (pcs, strip, box, bottle, etc.)
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sort order (price-asc, price-desc, rating, -createdAt)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Products fetched successfully
 */
router.get('/', validateRequest({ query: productQuerySchema }), getProducts);

/**
 * @openapi
 * /products/featured:
 *   get:
 *     summary: Get featured products for homepage (cached)
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Featured products fetched successfully
 */
router.get('/featured', getFeaturedProducts);

/**
 * @openapi
 * /products/{idOrSlug}:
 *   get:
 *     summary: Get product details by ID or Slug
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: idOrSlug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 */
router.get('/:idOrSlug', validateRequest({ params: productIdOrSlugSchema }), getProductByIdOrSlug);

/**
 * @openapi
 * /products:
 *   post:
 *     summary: Create product with image upload (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, dosageForm, unitType, category, brand, price, stock]
 *             properties:
 *               name:
 *                 type: string
 *               genericName:
 *                 type: string
 *               dosageForm:
 *                 type: string
 *                 enum: [tablet, syrup, capsule, saline, injection, ointment, drop, inhaler, powder, suppository, other]
 *               strength:
 *                 type: string
 *               unitType:
 *                 type: string
 *                 enum: [pcs, strip, box, bottle, tube, gm, ml, pack]
 *               packSize:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               brand:
 *                 type: string
 *               price:
 *                 type: number
 *               discountPrice:
 *                 type: number
 *               stock:
 *                 type: number
 *               expiryDate:
 *                 type: string
 *                 format: date
 *               batchNumber:
 *                 type: string
 *               requiresPrescription:
 *                 type: boolean
 *               isFeatured:
 *                 type: boolean
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Product created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin role required
 */
router.post(
  '/',
  authenticate,
  authorize('admin'),
  upload.array('images', 5),
  validateRequest({ body: createProductSchema }),
  createProduct
);

/**
 * @openapi
 * /products/{id}:
 *   patch:
 *     summary: Update product (Admin only)
 *     tags: [Products]
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
 *         description: Product updated successfully
 */
router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  upload.array('images', 5),
  validateRequest({ params: productIdSchema, body: updateProductSchema }),
  updateProduct
);

/**
 * @openapi
 * /products/{id}/toggle-feature:
 *   patch:
 *     summary: Toggle isFeatured status of a product (Admin only)
 *     tags: [Products]
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
 *         description: Product feature status toggled
 */
router.patch(
  '/:id/toggle-feature',
  authenticate,
  authorize('admin'),
  validateRequest({ params: productIdSchema }),
  toggleFeaturedProduct
);

/**
 * @openapi
 * /products/{id}:
 *   delete:
 *     summary: Delete product (Admin only)
 *     tags: [Products]
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
 *         description: Product deleted successfully
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  validateRequest({ params: productIdSchema }),
  deleteProduct
);

export default router;
