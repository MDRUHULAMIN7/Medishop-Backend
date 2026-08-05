import { Request, Response } from 'express';
import { HTTP_STATUS } from '../../config/constants';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { orderService } from './order.service';

export const checkout = asyncHandler(async (req: Request, res: Response) => {
  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
  const order = await orderService.processCheckout(req.user!.id, req.body, idempotencyKey);
  return ApiResponse.success(
    res,
    `Order ${order.orderNumber} placed successfully!`,
    order,
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
