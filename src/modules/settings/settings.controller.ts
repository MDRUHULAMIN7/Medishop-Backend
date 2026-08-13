import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { settingsService } from './settings.service';

export const getPublicSettings = asyncHandler(async (_req: Request, res: Response) => {
  const publicSettings = await settingsService.getPublicSettings();
  return ApiResponse.success(res, 'Public settings fetched successfully', publicSettings);
});

export const getFullSettings = asyncHandler(async (_req: Request, res: Response) => {
  const fullSettings = await settingsService.getFullSettings();
  return ApiResponse.success(res, 'Admin full settings fetched successfully', fullSettings);
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const adminId = req.user?.id;
  const result = await settingsService.updateSettings(req.body, adminId);
  return ApiResponse.success(
    res,
    result.cacheWarning
      ? 'Settings saved successfully (Redis cache invalidation warning)'
      : 'Site settings updated successfully',
    result.settings
  );
});
