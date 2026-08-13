import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { notificationService } from './notification.service';

export const getMyNotifications = asyncHandler(async (req: Request, res: Response) => {
  const isRead = req.query.isRead === undefined ? undefined : req.query.isRead === 'true';
  const result = await notificationService.getUserNotifications(req.user!.id, {
    isRead,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  });

  return ApiResponse.success(
    res,
    'Notifications fetched successfully',
    result.notifications,
    200,
    result.meta
  );
});

export const markNotificationAsRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await notificationService.markNotificationAsRead(req.params.id, req.user!.id);
  return ApiResponse.success(res, 'Notification marked as read', notification);
});

export const markAllNotificationsAsRead = asyncHandler(async (req: Request, res: Response) => {
  const result = await notificationService.markAllNotificationsAsRead(req.user!.id);
  return ApiResponse.success(res, 'All notifications marked as read', result);
});

export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const result = await notificationService.getUnreadCount(req.user!.id);
  return ApiResponse.success(res, 'Unread notification count fetched', result);
});
