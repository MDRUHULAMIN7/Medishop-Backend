import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validateRequest } from '../../middlewares/validateRequest';
import { checkout, getMyOrders, getOrderById } from './order.controller';
import { checkoutSchema, orderIdSchema } from './order.validation';

const router = Router();

// All order routes require authentication
router.use(authenticate);

/**
 * @openapi
 * /orders/checkout:
 *   post:
 *     summary: Process cart checkout and create new order (With Idempotency-Key support)
 *     tags: [Orders & Checkout]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         schema:
 *           type: string
 *         description: Optional unique idempotency key to prevent duplicate checkouts
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               shippingAddressId:
 *                 type: string
 *               shippingAddress:
 *                 type: object
 *                 properties:
 *                   recipientName:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   district:
 *                     type: string
 *                   thana:
 *                     type: string
 *                   addressLine:
 *                     type: string
 *               paymentMethod:
 *                 type: string
 *                 enum: [cod, bkash, nagad, card]
 *               couponCode:
 *                 type: string
 *               prescriptionId:
 *                 type: string
 *               deliveryCharge:
 *                 type: number
 *               note:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order created successfully and cart cleared
 *       400:
 *         description: Checkout blocked (missing prescription, out of stock, or invalid coupon)
 */
router.post('/checkout', validateRequest({ body: checkoutSchema }), checkout);

/**
 * @openapi
 * /orders/my:
 *   get:
 *     summary: Get all orders for authenticated user
 *     tags: [Orders & Checkout]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user orders
 */
router.get('/my', getMyOrders);

/**
 * @openapi
 * /orders/{id}:
 *   get:
 *     summary: Get order details by ID
 *     tags: [Orders & Checkout]
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
 *         description: Order details
 */
router.get('/:id', validateRequest({ params: orderIdSchema }), getOrderById);

export default router;
