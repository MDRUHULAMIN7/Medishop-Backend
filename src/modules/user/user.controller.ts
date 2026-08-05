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

export const updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateUserStatus(req.params.userId, req.body.status);
  const actionText = req.body.status === 'blocked' ? 'blocked' : 'unblocked';
  return ApiResponse.success(res, `User ${actionText} successfully`, user);
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 20;
  const search = req.query.search as string;
  const status = req.query.status as any;
  const role = req.query.role as any;

  const result = await userService.listUsers({ page, limit, search, status, role });
  return ApiResponse.success(res, 'Users fetched successfully', result.users, HTTP_STATUS.OK, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    pages: result.pages,
  });
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
