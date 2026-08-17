import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { validateRequest } from '../../middlewares/validateRequest';
import { checkout, getAllOrders, getMyOrders, getOrderById, updateOrderStatus, downloadInvoice } from './order.controller';
import { checkoutSchema, orderIdSchema, orderQuerySchema, updateOrderStatusSchema } from './order.validation';

const router = Router();

// All order routes require authentication
router.use(authenticate);

/**
 * @openapi
 * /orders/checkout:
 *   post:
 *     summary: Process cart checkout and create new order (With Idempotency-Key support)
 *     tags: [Orders & Lifecycle]
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
 *     summary: Get all orders for authenticated customer
 *     tags: [Orders & Lifecycle]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user orders
 */
router.get('/my', getMyOrders);

/**
 * @openapi
 * /orders:
 *   get:
 *     summary: List all customer orders for Admin / Staff with filtering
 *     tags: [Orders & Lifecycle]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: orderStatus
 *         schema:
 *           type: string
 *           enum: [pending, processing, shipped, delivered, cancelled]
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [pending, paid, failed, refunded]
 *     responses:
 *       200:
 *         description: Paginated list of all customer orders
 */
router.get(
  '/',
  authorize('admin', 'super_admin', 'pharmacist', 'sales_staff', 'order_manager'),
  validateRequest({ query: orderQuerySchema }),
  getAllOrders
);

/**
 * @openapi
 * /orders/{id}:
 *   get:
 *     summary: Get order details by ID
 *     tags: [Orders & Lifecycle]
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
router.get('/:id/invoice/download', validateRequest({ params: orderIdSchema }), downloadInvoice);
router.get('/:id/invoice/pdf', validateRequest({ params: orderIdSchema }), downloadInvoice);

router.get('/:id', validateRequest({ params: orderIdSchema }), getOrderById);

/**
 * @openapi
 * /orders/{id}/status:
 *   patch:
 *     summary: Advance order through full lifecycle (Admin / Staff only, emits real-time Socket.io events)
 *     tags: [Orders & Lifecycle]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderStatus:
 *                 type: string
 *                 enum: [pending, processing, shipped, delivered, cancelled]
 *               paymentStatus:
 *                 type: string
 *                 enum: [pending, paid, failed, refunded]
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order status updated and real-time socket event sent to customer
 */
router.patch(
  '/:id/status',
  authorize('admin', 'super_admin', 'pharmacist', 'sales_staff', 'order_manager'),
  validateRequest({ params: orderIdSchema, body: updateOrderStatusSchema }),
  updateOrderStatus
);

export default router;
