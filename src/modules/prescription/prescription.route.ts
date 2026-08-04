import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { upload } from '../../middlewares/upload';
import { validateRequest } from '../../middlewares/validateRequest';
import {
  getMyPrescriptionById,
  getMyPrescriptions,
  getPrescriptionById,
  getPrescriptionQueue,
  reviewPrescription,
  uploadPrescription,
} from './prescription.controller';
import {
  prescriptionIdSchema,
  prescriptionQuerySchema,
  reviewPrescriptionSchema,
  uploadPrescriptionSchema,
} from './prescription.validation';

const router = Router();

// All prescription routes require user authentication
router.use(authenticate);

/**
 * @openapi
 * /prescriptions:
 *   post:
 *     summary: Upload prescription images (Emits real-time prescription:submitted socket event)
 *     tags: [Prescriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               note:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Prescription uploaded and submitted to review queue
 */
router.post(
  '/',
  upload.array('images', 5),
  validateRequest({ body: uploadPrescriptionSchema }),
  uploadPrescription
);

/**
 * @openapi
 * /prescriptions/my:
 *   get:
 *     summary: Get all prescriptions uploaded by authenticated user
 *     tags: [Prescriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user prescriptions
 */
router.get('/my', getMyPrescriptions);

/**
 * @openapi
 * /prescriptions/my/{id}:
 *   get:
 *     summary: Get specific prescription status uploaded by user
 *     tags: [Prescriptions]
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
 *         description: Prescription details
 */
router.get('/my/:id', validateRequest({ params: prescriptionIdSchema }), getMyPrescriptionById);

/**
 * @openapi
 * /prescriptions:
 *   get:
 *     summary: Pharmacist Review Queue (Admin / Pharmacist only)
 *     tags: [Prescriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *     responses:
 *       200:
 *         description: Pharmacist review queue items
 */
router.get(
  '/',
  authorize('admin', 'pharmacist'),
  validateRequest({ query: prescriptionQuerySchema }),
  getPrescriptionQueue
);

/**
 * @openapi
 * /prescriptions/{id}:
 *   get:
 *     summary: View prescription detail & images (Admin / Pharmacist only)
 *     tags: [Prescriptions]
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
 *         description: Prescription details
 */
router.get(
  '/:id',
  authorize('admin', 'pharmacist'),
  validateRequest({ params: prescriptionIdSchema }),
  getPrescriptionById
);

/**
 * @openapi
 * /prescriptions/{id}/review:
 *   patch:
 *     summary: Approve or Reject prescription (Admin / Pharmacist only. Emits real-time prescription:updated socket event)
 *     tags: [Prescriptions]
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *               rejectionReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Prescription review status updated
 */
router.patch(
  '/:id/review',
  authorize('admin', 'pharmacist'),
  validateRequest({ params: prescriptionIdSchema, body: reviewPrescriptionSchema }),
  reviewPrescription
);

export default router;
