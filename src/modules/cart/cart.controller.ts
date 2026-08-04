import { Request, Response } from 'express';
import { HTTP_STATUS } from '../../config/constants';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { cartService } from './cart.service';

export const getCart = asyncHandler(async (req: Request, res: Response) => {
  const cart = await cartService.getCart(req.user!.id);
  return ApiResponse.success(res, 'Cart fetched successfully', cart);
});

export const addCartItem = asyncHandler(async (req: Request, res: Response) => {
  const cart = await cartService.addItem(req.user!.id, req.body);
  return ApiResponse.success(res, 'Item added to cart successfully', cart, HTTP_STATUS.OK);
});

export const updateCartItem = asyncHandler(async (req: Request, res: Response) => {
  const cart = await cartService.updateItem(req.user!.id, req.params.productId, req.body);
  return ApiResponse.success(res, 'Cart item quantity updated successfully', cart);
});

export const removeCartItem = asyncHandler(async (req: Request, res: Response) => {
  const cart = await cartService.removeItem(req.user!.id, req.params.productId);
  return ApiResponse.success(res, 'Item removed from cart successfully', cart);
});

export const clearCart = asyncHandler(async (req: Request, res: Response) => {
  const cart = await cartService.clearCart(req.user!.id);
  return ApiResponse.success(res, 'Cart cleared successfully', cart);
});
