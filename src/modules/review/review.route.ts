import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validateRequest } from '../../middlewares/validateRequest';
import { createReview, getProductReviews } from './review.controller';
import { createReviewSchema, productIdParamsSchema, reviewQuerySchema } from './review.validation';

const router = Router({ mergeParams: true });

/**
 * @openapi
 * /products/{productId}/reviews:
 *   get:
 *     summary: Get public reviews for a product
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated product reviews
 */
router.get(
  '/',
  validateRequest({ params: productIdParamsSchema, query: reviewQuerySchema }),
  getProductReviews
);

/**
 * @openapi
 * /products/{productId}/reviews:
 *   post:
 *     summary: Submit a verified purchase review (Only customers with a delivered order for this product)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating]
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               comment:
 *                 type: string
 *                 example: Highly effective medicine, delivered on time.
 *     responses:
 *       201:
 *         description: Review submitted successfully and rating average updated
 *       403:
 *         description: Review rejected (Not a verified buyer with a delivered order)
 */
router.post(
  '/',
  authenticate,
  validateRequest({ params: productIdParamsSchema, body: createReviewSchema }),
  createReview
);

export default router;
