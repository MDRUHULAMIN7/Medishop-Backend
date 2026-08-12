import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import {
  receiveBatch,
  adjustStock,
  recalculateStock,
  getBatches,
  getLedger,
} from './inventory.controller';

const router = Router();

// Admin / Staff protected inventory endpoints
router.post('/receive-batch', authenticate, authorize('admin', 'inventory_manager', 'pharmacist'), receiveBatch);
router.post('/adjust-stock', authenticate, authorize('admin', 'inventory_manager', 'pharmacist'), adjustStock);
router.post('/recalculate-stock/:productId', authenticate, authorize('admin'), recalculateStock);
router.get('/batches/:productId', authenticate, authorize('admin', 'inventory_manager', 'pharmacist'), getBatches);
router.get('/ledger/:productId', authenticate, authorize('admin', 'inventory_manager', 'pharmacist'), getLedger);

export default router;
