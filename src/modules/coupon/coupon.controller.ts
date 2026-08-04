import { Request, Response } from 'express';
import { HTTP_STATUS } from '../../config/constants';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { couponService } from './coupon.service';

export const applyCoupon = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user ? req.user.id : undefined;
  const result = await couponService.validateAndApplyCoupon(req.body, userId);
  return ApiResponse.success(res, result.message, result);
});

export const getValidPublicCoupons = asyncHandler(async (_req: Request, res: Response) => {
  const coupons = await couponService.getValidPublicCoupons();
  return ApiResponse.success(res, 'Valid coupons fetched successfully', coupons);
});

export const getAllCoupons = asyncHandler(async (req: Request, res: Response) => {
  const includeInactive = req.query.includeInactive === 'true';
  const coupons = await couponService.getAllCoupons(includeInactive);
  return ApiResponse.success(res, 'All coupons fetched successfully', coupons);
});

export const getCouponById = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await couponService.getCouponById(req.params.id);
  return ApiResponse.success(res, 'Coupon details fetched successfully', coupon);
});

export const createCoupon = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await couponService.createCoupon(req.body);
  return ApiResponse.success(res, 'Coupon created successfully', coupon, HTTP_STATUS.CREATED);
});

export const updateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await couponService.updateCoupon(req.params.id, req.body);
  return ApiResponse.success(res, 'Coupon updated successfully', coupon);
});

export const deleteCoupon = asyncHandler(async (req: Request, res: Response) => {
  const result = await couponService.deleteCoupon(req.params.id);
  return ApiResponse.success(res, 'Coupon deleted successfully', result);
});
