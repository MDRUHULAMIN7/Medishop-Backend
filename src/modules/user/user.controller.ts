import { Request, Response } from 'express';
import { HTTP_STATUS } from '../../config/constants';
import { ApiResponse } from '../../utils/ApiResponse';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import { ImageProcessor } from '../../utils/imageProcessor';
import { uploadToCloudinary } from '../../middlewares/upload';
import { userService } from './user.service';

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getProfile(req.user!.id);
  return ApiResponse.success(res, 'Profile fetched successfully', user);
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateProfile(req.user!.id, req.body);
  return ApiResponse.success(res, 'Profile updated successfully', user, HTTP_STATUS.OK);
});

export const uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    throw new AppError('No avatar image file provided', 400, 'NO_FILE_PROVIDED');
  }

  const processed = await ImageProcessor.processAvatarImage(file.buffer);
  const avatarUrl = await uploadToCloudinary(processed.mainBuffer, 'medishop/avatars', 'webp');
  const user = await userService.updateProfile(req.user!.id, { avatar: avatarUrl });

  return ApiResponse.success(res, 'Avatar updated successfully', { user, avatarUrl }, HTTP_STATUS.OK);
});

export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getUserById(req.params.userId);
  return ApiResponse.success(res, 'User details fetched successfully', user);
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

// Staff Invitation Handlers
export const sendStaffInvitation = asyncHandler(async (req: Request, res: Response) => {
  const invitation = await userService.sendStaffInvitation(req.user!.id, req.body);
  return ApiResponse.success(
    res,
    `Staff invitation sent successfully to ${invitation.recipientName || 'user'}`,
    invitation,
    HTTP_STATUS.CREATED
  );
});

export const getStaffInvitations = asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 50;
  const result = await userService.getStaffInvitations({ status, page, limit });
  return ApiResponse.success(res, 'Staff invitations fetched successfully', result.invitations, HTTP_STATUS.OK, {
    total: result.total,
    page: result.page,
    limit: result.limit,
    pages: result.pages,
  });
});

export const cancelStaffInvitation = asyncHandler(async (req: Request, res: Response) => {
  const invitation = await userService.cancelStaffInvitation(req.params.invitationId);
  return ApiResponse.success(res, 'Staff invitation cancelled successfully', invitation);
});

export const getMyStaffInvitations = asyncHandler(async (req: Request, res: Response) => {
  const invitations = await userService.getMyStaffInvitations(req.user!.id);
  return ApiResponse.success(res, 'Pending staff invitations fetched successfully', invitations);
});

export const acceptStaffInvitation = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.acceptStaffInvitation(req.user!.id, req.params.invitationId);
  return ApiResponse.success(res, result.message, result, HTTP_STATUS.OK);
});

export const declineStaffInvitation = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.declineStaffInvitation(req.user!.id, req.params.invitationId);
  return ApiResponse.success(res, 'Staff invitation declined', result);
});

export const searchCustomers = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query.q as string || '';
  const customers = await userService.searchCustomers(query);
  return ApiResponse.success(res, 'Customers fetched successfully', customers);
});

