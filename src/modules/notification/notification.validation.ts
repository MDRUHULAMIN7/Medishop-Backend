import { z } from 'zod';

export const notificationIdSchema = z.object({
  id: z.string().min(1, 'Notification ID is required'),
});

export const notificationQuerySchema = z.object({
  isRead: z.enum(['true', 'false']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});
