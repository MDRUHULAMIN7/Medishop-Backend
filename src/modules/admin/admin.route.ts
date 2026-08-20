import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { validateRequest } from '../../middlewares/validateRequest';
import {
  getDashboardSummary,
  getAnalytics,
  getLowStockReport,
  getOrderStatusBreakdown,
  getProductInsights,
  getSalesSummary,
} from './admin.controller';
import { adminAnalyticsQuerySchema, lowStockQuerySchema, productInsightsParamsSchema } from './admin.validation';

const router = Router();

// All Admin Dashboard endpoints require Admin authentication
router.use(authenticate);

// Reporting is read-only and is also used by the sales workspace.
router.get('/reports/analytics', authorize('pharmacist', 'sales_staff', 'inventory_manager'), validateRequest({ query: adminAnalyticsQuerySchema }), getAnalytics);
router.get('/reports/export-data', authorize('pharmacist', 'sales_staff', 'inventory_manager'), validateRequest({ query: adminAnalyticsQuerySchema }), getAnalytics);
router.get('/products/:productId/insights', authorize('pharmacist', 'sales_staff', 'inventory_manager'), validateRequest({ params: productInsightsParamsSchema }), getProductInsights);

router.use(authorize('pharmacist'));

/**
 * @openapi
 * /admin/dashboard/summary:
 *   get:
 *     summary: Aggregated Admin Dashboard overview KPIs (Revenue, order breakdown, user count, low stock count)
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Aggregated dashboard KPIs
 */
router.get('/dashboard/summary', getDashboardSummary);

/**
 * @openapi
 * /admin/dashboard/sales:
 *   get:
 *     summary: Detailed sales & revenue summary analytics (Online orders + POS counter sales)
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Aggregated sales and revenue numbers
 */
router.get('/dashboard/sales', getSalesSummary);

/**
 * @openapi
 * /admin/dashboard/order-breakdown:
 *   get:
 *     summary: Order status breakdown count (pending, processing, shipped, delivered, cancelled)
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Order status breakdown count
 */
router.get('/dashboard/order-breakdown', getOrderStatusBreakdown);

/**
 * @openapi
 * /admin/dashboard/low-stock:
 *   get:
 *     summary: Low-stock inventory alert report
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of low stock products needing restock
 */
router.get(
  '/dashboard/low-stock',
  validateRequest({ query: lowStockQuerySchema }),
  getLowStockReport
);

export default router;
