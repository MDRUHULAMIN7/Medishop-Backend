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

export const getOrderStatusBreakdown = asyncHandler(async (_req: Request, res: Response) => {
  const breakdown = await adminService.getOrderStatusBreakdown();
  return ApiResponse.success(res, 'Order status breakdown fetched successfully', breakdown);
});

export const getLowStockReport = asyncHandler(async (req: Request, res: Response) => {
  const threshold = req.query.threshold ? Number(req.query.threshold) : 10;
  const report = await adminService.getLowStockReport(threshold);
  return ApiResponse.success(res, 'Low-stock inventory report fetched successfully', report);
});
