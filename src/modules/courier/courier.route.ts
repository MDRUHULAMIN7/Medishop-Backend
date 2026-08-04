import { Router } from 'express';
import {
  calculateCourierFee,
  cancelCourierShipment,
  createCourierShipment,
  getCourierProviderStatus,
  getCourierShipments,
  getCourierZones,
  requestCourierPickup,
  trackCourierShipment,
} from './courier.controller';
import { validateRequest } from '../../middlewares/validateRequest';
import {
  calculateCourierFeeSchema,
  cancelCourierShipmentParamsSchema,
  cancelCourierShipmentSchema,
  createCourierShipmentSchema,
  courierZoneQuerySchema,
  requestCourierPickupSchema,
  trackCourierShipmentParamsSchema,
} from './courier.validation';

const router = Router();

/**
 * @openapi
 * /courier/providers:
 *   get:
 *     summary: Courier provider status
 *     tags: [Courier]
 *     responses:
 *       200:
 *         description: Current courier provider status and readiness
 */
router.get('/providers', getCourierProviderStatus);

/**
 * @openapi
 * /courier/zones:
 *   get:
 *     summary: Get courier zones
 *     tags: [Courier]
 *     parameters:
 *       - in: query
 *         name: district
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Courier zone catalog
 */
router.get('/zones', validateRequest({ query: courierZoneQuerySchema }), getCourierZones);

/**
 * @openapi
 * /courier/rates:
 *   post:
 *     summary: Calculate courier delivery fee
 *     tags: [Courier]
 *     requestBody:
 *       required: true
 *     responses:
 *       200:
 *         description: Calculated courier quote
 */
router.post('/rates', validateRequest({ body: calculateCourierFeeSchema }), calculateCourierFee);

/**
 * @openapi
 * /courier/shipments:
 *   post:
 *     summary: Create courier shipment
 *     tags: [Courier]
 *     requestBody:
 *       required: true
 *     responses:
 *       201:
 *         description: Shipment created
 */
router.post('/shipments', validateRequest({ body: createCourierShipmentSchema }), createCourierShipment);

/**
 * @openapi
 * /courier/shipments:
 *   get:
 *     summary: List courier shipments
 *     tags: [Courier]
 *     responses:
 *       200:
 *         description: Stored courier shipments
 */
router.get('/shipments', getCourierShipments);

/**
 * @openapi
 * /courier/shipments/{trackingNumber}:
 *   get:
 *     summary: Track courier shipment
 *     tags: [Courier]
 *     parameters:
 *       - in: path
 *         name: trackingNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Shipment tracking details
 */
router.get(
  '/shipments/:trackingNumber',
  validateRequest({ params: trackCourierShipmentParamsSchema }),
  trackCourierShipment
);

/**
 * @openapi
 * /courier/shipments/{trackingNumber}/cancel:
 *   post:
 *     summary: Cancel courier shipment
 *     tags: [Courier]
 *     parameters:
 *       - in: path
 *         name: trackingNumber
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *     responses:
 *       200:
 *         description: Shipment cancelled
 */
router.post(
  '/shipments/:trackingNumber/cancel',
  validateRequest({
    params: cancelCourierShipmentParamsSchema,
    body: cancelCourierShipmentSchema,
  }),
  cancelCourierShipment
);

/**
 * @openapi
 * /courier/pickups:
 *   post:
 *     summary: Request courier pickup
 *     tags: [Courier]
 *     requestBody:
 *       required: true
 *     responses:
 *       201:
 *         description: Pickup request submitted
 */
router.post('/pickups', validateRequest({ body: requestCourierPickupSchema }), requestCourierPickup);

export default router;
