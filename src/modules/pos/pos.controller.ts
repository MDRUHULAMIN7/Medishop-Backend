import { Request, Response } from 'express';
import { HTTP_STATUS } from '../../config/constants';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { UserModel } from '../user/user.model';
import { posService } from './pos.service';

// Store Handlers
export const getStores = asyncHandler(async (_req: Request, res: Response) => {
  const stores = await posService.getStores();
  return ApiResponse.success(res, 'Stores fetched successfully', stores);
});

export const createStore = asyncHandler(async (req: Request, res: Response) => {
  const store = await posService.createStore(req.body);
  return ApiResponse.success(res, 'Store created successfully', store, HTTP_STATUS.CREATED);
});

// Inventory & Stock Ledger Handlers
export const getInventoryList = asyncHandler(async (_req: Request, res: Response) => {
  const inventory = await posService.getInventoryList();
  return ApiResponse.success(res, 'Shared inventory list fetched successfully', inventory);
});

export const adjustStock = asyncHandler(async (req: Request, res: Response) => {
  const result = await posService.adjustStock(req.user!.id, req.body);
  return ApiResponse.success(res, 'Stock adjusted and ledger entry created successfully', result);
});

export const getStockLedger = asyncHandler(async (req: Request, res: Response) => {
  const productId = req.query.productId as string | undefined;
  const ledger = await posService.getStockLedger(productId);
  return ApiResponse.success(res, 'Stock movement ledger fetched successfully', ledger);
});

// POS Counter Sales Handlers
export const processPosSale = asyncHandler(async (req: Request, res: Response) => {
  const sale = await posService.processPosSale(req.user!.id, req.body);
  return ApiResponse.success(res, `POS Sale ${sale.invoiceNumber} processed successfully!`, sale, HTTP_STATUS.CREATED);
});

export const getPosSales = asyncHandler(async (_req: Request, res: Response) => {
  const sales = await posService.getPosSales();
  return ApiResponse.success(res, 'POS Sales list fetched successfully', sales);
});

export const getPosSaleByInvoice = asyncHandler(async (req: Request, res: Response) => {
  const sale = await posService.getPosSaleByInvoice(req.params.invoiceNumber);
  return ApiResponse.success(res, 'Invoice details fetched successfully', sale);
});

export const voidPosSale = asyncHandler(async (req: Request, res: Response) => {
  const sale = await posService.voidPosSale(req.user!.id, req.params.invoiceNumber, req.body.reason || 'Customer request');
  return ApiResponse.success(res, `Invoice ${sale.invoiceNumber} voided and stock restored successfully`, sale);
});

export const getTodayStats = asyncHandler(async (req: Request, res: Response) => {
  const staffId = req.user?.id;
  const stats = await posService.getTodayStats(staffId);
  return ApiResponse.success(res, "Today's sales statistics fetched successfully", stats);
});

export const getMyCustomerPurchases = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const user = (await UserModel.findById(userId).select('phone email').lean()) as any;
  const sales = await posService.getCustomerPurchases(userId, user?.phone, user?.email);
  return ApiResponse.success(res, 'Customer POS counter purchases fetched successfully', sales);
});

