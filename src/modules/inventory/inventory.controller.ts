import { Request, Response } from 'express';
import { HTTP_STATUS } from '../../config/constants';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { inventoryService } from './inventory.service';

export const receiveBatch = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || (req as any).user?._id;
  const result = await inventoryService.receiveBatch(req.body, undefined, userId);
  return ApiResponse.success(res, 'Batch received and stock recorded successfully', result, HTTP_STATUS.CREATED);
});

export const adjustStock = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || (req as any).user?._id;
  const { productId, batchId, type, quantityDelta, referenceId } = req.body;
  const result = await inventoryService.adjustStock(
    productId,
    batchId,
    type,
    Number(quantityDelta),
    referenceId,
    userId
  );
  return ApiResponse.success(res, 'Stock adjusted successfully', result);
});

export const recalculateStock = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const result = await inventoryService.recalculateStock(productId);
  return ApiResponse.success(res, 'Stock recalculated and repaired successfully', result);
});

export const getBatches = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const batches = await inventoryService.getBatches(productId);
  return ApiResponse.success(res, 'Product batches fetched successfully', batches);
});

export const getLedger = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const ledger = await inventoryService.getLedger(productId, limit);
  return ApiResponse.success(res, 'Stock audit ledger fetched successfully', ledger);
});
