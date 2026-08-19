import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { validateRequest } from '../../middlewares/validateRequest';
import {
  adjustStock,
  createStore,
  getInventoryList,
  getMyCustomerPurchases,
  getPosSaleByInvoice,
  downloadPosSaleInvoice,
  getPosSales,
  getStockLedger,
  getStores,
  getTodayStats,
  processPosSale,
  voidPosSale,
} from './pos.controller';
import {
  createStoreSchema,
  invoiceNumberParamsSchema,
  posCheckoutSchema,
  stockAdjustmentSchema,
} from './pos.validation';

const router = Router();

// Require user authentication
router.use(authenticate);

// 1. Customer Endpoint: Fetch logged in customer's in-store / POS purchases
router.get('/my-purchases', getMyCustomerPurchases);
router.get('/sales/invoice/:invoiceNumber/download', validateRequest({ params: invoiceNumberParamsSchema }), downloadPosSaleInvoice);

// 2. Staff / Admin protected endpoints
router.use(authorize('admin', 'super_admin', 'pharmacist', 'sales_staff', 'inventory_manager'));

/**
 * @openapi
 * /pos/stats/today:
 *   get:
 *     summary: Get today's POS sales statistics, revenue, payment breakdown and staff metrics
 *     tags: [Shared Inventory & POS]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Today's sales statistics
 */
router.get('/stats/today', getTodayStats);

/**
 * @openapi
 * /pos/stores:
 *   get:
 *     summary: List physical pharmacy stores
 *     tags: [Shared Inventory & POS]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of stores
 */
router.get('/stores', getStores);

/**
 * @openapi
 * /pos/stores:
 *   post:
 *     summary: Create new physical store branch (Admin only)
 *     tags: [Shared Inventory & POS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, code, address, phone]
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               address:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Store created successfully
 */
router.post('/stores', authorize('admin'), validateRequest({ body: createStoreSchema }), createStore);

/**
 * @openapi
 * /pos/inventory:
 *   get:
 *     summary: Get central shared inventory stock levels
 *     tags: [Shared Inventory & POS]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory stock levels across stores
 */
router.get('/inventory', getInventoryList);

/**
 * @openapi
 * /pos/inventory/adjust:
 *   post:
 *     summary: Adjust central stock quantity and record in audit Stock Ledger
 *     tags: [Shared Inventory & POS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, quantityChange, reason]
 *             properties:
 *               productId:
 *                 type: string
 *               quantityChange:
 *                 type: integer
 *               reason:
 *                 type: string
 *                 enum: [purchase_restock, manual_adjustment, damage_expiry_writeoff]
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Stock adjusted and ledger entry recorded
 */
router.post('/inventory/adjust', validateRequest({ body: stockAdjustmentSchema }), adjustStock);

/**
 * @openapi
 * /pos/inventory/ledger:
 *   get:
 *     summary: Get immutable audit Stock Ledger movement history
 *     tags: [Shared Inventory & POS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stock ledger movement history
 */
router.get('/inventory/ledger', getStockLedger);

/**
 * @openapi
 * /pos/checkout:
 *   post:
 *     summary: Process offline POS counter sale, print invoice, and deduct central inventory
 *     tags: [Shared Inventory & POS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items, paidAmount]
 *             properties:
 *               customerName:
 *                 type: string
 *               customerPhone:
 *                 type: string
 *               paidAmount:
 *                 type: number
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, card, bkash, nagad]
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productId, quantity]
 *                   properties:
 *                     productId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *                     unitPrice:
 *                       type: number
 *     responses:
 *       201:
 *         description: POS sale completed, invoice generated, and central stock updated
 */
router.post('/checkout', validateRequest({ body: posCheckoutSchema }), processPosSale);

/**
 * @openapi
 * /pos/sales:
 *   get:
 *     summary: Get list of POS counter sales
 *     tags: [Shared Inventory & POS]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of POS counter sales
 */
router.get('/sales', getPosSales);

/**
 * @openapi
 * /pos/sales/invoice/{invoiceNumber}:
 *   get:
 *     summary: Get printable POS invoice details by invoice number
 *     tags: [Shared Inventory & POS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: POS invoice details
 */
router.get('/sales/invoice/:invoiceNumber', validateRequest({ params: invoiceNumberParamsSchema }), getPosSaleByInvoice);

/**
 * @openapi
 * /pos/sales/invoice/{invoiceNumber}/void:
 *   post:
 *     summary: Void POS sale and restore central inventory stock via ledger
 *     tags: [Shared Inventory & POS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invoice voided and stock restored to inventory
 */
router.post('/sales/invoice/:invoiceNumber/void', validateRequest({ params: invoiceNumberParamsSchema }), voidPosSale);

export default router;
