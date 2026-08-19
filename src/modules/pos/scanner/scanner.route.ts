import { Router } from 'express';
import { authenticate } from '../../../middlewares/authenticate';
import { authorize } from '../../../middlewares/authorize';
import { validateRequest } from '../../../middlewares/validateRequest';
import { authenticateScannerSession } from './scanner.middleware';
import { closeScannerSession, createScannerSession, getScannerSession } from './scanner.controller';
import { scannerSessionIdParamsSchema } from './scanner.validation';

const router = Router();
const staffRoles = ['admin', 'super_admin', 'pharmacist', 'sales_staff', 'inventory_manager'] as const;

router.post('/session', authenticate, authorize(...staffRoles), createScannerSession);
router.get(
  '/session/:sessionId',
  authenticateScannerSession,
  authorize(...staffRoles),
  validateRequest({ params: scannerSessionIdParamsSchema }),
  getScannerSession
);
router.delete(
  '/session/:sessionId',
  authenticate,
  authorize(...staffRoles),
  validateRequest({ params: scannerSessionIdParamsSchema }),
  closeScannerSession
);

export default router;
