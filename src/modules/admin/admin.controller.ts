import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { adminService } from './admin.service';

export const getDashboardSummary = asyncHandler(async (_req: Request, res: Response) => {
  const summary = await adminService.getDashboardSummary();
  return ApiResponse.success(res, 'Admin dashboard summary fetched successfully', summary);
});

export const getSalesSummary = asyncHandler(async (_req: Request, res: Response) => {
  const sales = await adminService.getSalesSummary();
  return ApiResponse.success(res, 'Sales summary analytics fetched successfully', sales);
});

export const getAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const analytics = await adminService.getAnalytics({
    dateFrom: typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined,
    dateTo: typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined,
    channel: req.query.channel === 'online' || req.query.channel === 'pos' ? req.query.channel : 'all',
    productId: typeof req.query.productId === 'string' ? req.query.productId : undefined,
    categoryId: typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined,
    staffId: typeof req.query.staffId === 'string' ? req.query.staffId : undefined,
    includeRows: req.query.includeRows === 'true',
  });
  return ApiResponse.success(res, 'Admin analytics fetched successfully', analytics);
});

export const getProductInsights = asyncHandler(async (req: Request, res: Response) => {
  const insights = await adminService.getProductInsights(req.params.productId);
  return ApiResponse.success(res, 'Product insights fetched successfully', insights);
});

export const getOrderStatusBreakdown = asyncHandler(async (_req: Request, res: Response) => {
  const breakdown = await adminService.getOrderStatusBreakdown();
  return ApiResponse.success(res, 'Order status breakdown fetched successfully', breakdown);
});

export const getLowStockReport = asyncHandler(async (req: Request, res: Response) => {
  const threshold = req.query.threshold ? Number(req.query.threshold) : 10;
  const report = await adminService.getLowStockReport(threshold);
  return ApiResponse.success(res, 'Low-stock inventory report fetched successfully', report);
});
