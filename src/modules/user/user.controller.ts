import { Request, Response } from 'express';
import { HTTP_STATUS } from '../../config/constants';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { userService } from './user.service';

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getProfile(req.user!.id);
  return ApiResponse.success(res, 'Profile fetched successfully', user);
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateProfile(req.user!.id, req.body);
  return ApiResponse.success(res, 'Profile updated successfully', user, HTTP_STATUS.OK);
});

export const getAddresses = asyncHandler(async (req: Request, res: Response) => {
  const addresses = await userService.getAddresses(req.user!.id);
  return ApiResponse.success(res, 'Addresses fetched successfully', addresses);
});

export const addAddress = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.addAddress(req.user!.id, req.body);
  return ApiResponse.success(res, 'Address added successfully', user, HTTP_STATUS.CREATED);
});

export const updateAddress = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateAddress(req.user!.id, req.params.addressId, req.body);
  return ApiResponse.success(res, 'Address updated successfully', user);
});

export const removeAddress = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.removeAddress(req.user!.id, req.params.addressId);
  return ApiResponse.success(res, 'Address removed successfully', user);
});

export const setDefaultAddress = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.setDefaultAddress(req.user!.id, req.params.addressId);
  return ApiResponse.success(res, 'Default address set successfully', user);
});
