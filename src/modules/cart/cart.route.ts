import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validateRequest } from '../../middlewares/validateRequest';
import { addCartItem, clearCart, getCart, removeCartItem, updateCartItem } from './cart.controller';
import { addCartItemSchema, productIdParamsSchema, updateCartItemSchema } from './cart.validation';

const router = Router();

// All cart routes require user authentication
router.use(authenticate);

/**
 * @openapi
 * /cart:
 *   get:
 *     summary: Get authenticated user's cart (with real-time price & stock validation)
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart details with calculated totals and stock availability
 *       401:
 *         description: Unauthorized
 */
router.get('/', getCart);

/**
 * @openapi
 * /cart/items:
 *   post:
 *     summary: Add product item to user's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, quantity]
 *             properties:
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Item added and updated cart returned
 */
router.post('/items', validateRequest({ body: addCartItemSchema }), addCartItem);

/**
 * @openapi
 * /cart/items/{productId}:
 *   patch:
 *     summary: Update product quantity in user's cart
 *     tags: [Cart]
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
 *             required: [quantity]
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Quantity updated and cart returned
 */
router.patch(
  '/items/:productId',
  validateRequest({ params: productIdParamsSchema, body: updateCartItemSchema }),
  updateCartItem
);

/**
 * @openapi
 * /cart/items/{productId}:
 *   delete:
 *     summary: Remove item from cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item removed and cart returned
 */
router.delete(
  '/items/:productId',
  validateRequest({ params: productIdParamsSchema }),
  removeCartItem
);

/**
 * @openapi
 * /cart:
 *   delete:
 *     summary: Clear all items from user's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared successfully
 */
router.delete('/', clearCart);

export default router;
