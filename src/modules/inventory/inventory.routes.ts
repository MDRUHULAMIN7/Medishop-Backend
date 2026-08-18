import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import {
  receiveBatch,
  adjustStock,
  recalculateStock,
  recalculateAllStock,
  getBatches,
  getBatchesSummary,
  getLedger,
  updateBatch,
  deleteBatch,
} from './inventory.controller';

const router = Router();

// Admin / Staff protected inventory endpoints
router.use(authenticate);

router.post(
  '/receive-batch',
  authorize('admin', 'super_admin', 'inventory_manager', 'pharmacist', 'sales_staff'),
  receiveBatch
);

router.put(
  '/batch/:batchId',
  authorize('admin', 'super_admin', 'inventory_manager', 'pharmacist', 'sales_staff'),
  updateBatch
);

router.delete(
  '/batch/:batchId',
  authorize('admin', 'super_admin', 'inventory_manager', 'sales_staff'),
  deleteBatch
);

router.post(
  '/adjust-stock',
  authorize('admin', 'super_admin', 'inventory_manager', 'pharmacist', 'sales_staff'),
  adjustStock
);

router.post(
  '/recalculate-stock/:productId',
  authorize('admin', 'super_admin', 'inventory_manager'),
  recalculateStock
);

router.post(
  '/recalculate-all',
  authorize('admin', 'super_admin', 'inventory_manager'),
  recalculateAllStock
);

router.get(
  '/batches-summary',
  authorize('admin', 'super_admin', 'inventory_manager', 'pharmacist', 'sales_staff'),
  getBatchesSummary
);

router.get(
  '/batches/:productId',
  authorize('admin', 'super_admin', 'inventory_manager', 'pharmacist', 'sales_staff'),
  getBatches
);

router.get(
  '/ledger',
  authorize('admin', 'super_admin', 'inventory_manager', 'pharmacist', 'sales_staff'),
  getLedger
);

router.get(
  '/ledger/:productId',
  authorize('admin', 'super_admin', 'inventory_manager', 'pharmacist', 'sales_staff'),
  getLedger
);

export default router;


