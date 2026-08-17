import { Request, Response } from 'express';
import { HTTP_STATUS } from '../../config/constants';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { orderService } from './order.service';
import { generateInvoice } from '../../utils/invoiceGenerator';

export const checkout = asyncHandler(async (req: Request, res: Response) => {
  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
  const result = await orderService.processCheckout(req.user!.id, req.body, idempotencyKey);
  const orders = Array.isArray((result as any).orders) ? (result as any).orders : [result];
  return ApiResponse.success(
    res,
    orders.length > 1
      ? `${orders.length} orders placed successfully!`
      : `Order ${orders[0].orderNumber} placed successfully!`,
    result,
    HTTP_STATUS.CREATED
  );
});

export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const orders = await orderService.getUserOrders(req.user!.id);
  return ApiResponse.success(res, 'My orders fetched successfully', orders);
});

export const getOrderById = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.getOrderById(req.params.id);
  return ApiResponse.success(res, 'Order details fetched successfully', order);
});

export const getAllOrders = asyncHandler(async (req: Request, res: Response) => {
  const result = await orderService.getAllOrders(req.query as any);
  return ApiResponse.success(
    res,
    'All orders fetched successfully',
    result.orders,
    HTTP_STATUS.OK,
    result.meta
  );
});

export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.updateOrderStatus(req.params.id, req.user!.id, req.body);
  return ApiResponse.success(
    res,
    `Order ${order.orderNumber} status updated to ${order.orderStatus}`,
    order
  );
});

import { settingsService } from '../settings/settings.service';

export const downloadInvoice = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.getOrderById(req.params.id);
  const siteSettings = await settingsService.getPublicSettings().catch(() => null);
  const pdfBuffer = await generateInvoice(order, siteSettings);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderNumber || order.id}.pdf`);
  return res.status(200).send(pdfBuffer);
});
