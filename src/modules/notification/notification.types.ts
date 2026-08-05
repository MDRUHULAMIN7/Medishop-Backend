import { Types } from 'mongoose';

export type NotificationType =
  | 'order_created'
  | 'order_status_updated'
  | 'prescription_submitted'
  | 'prescription_approved'
  | 'prescription_rejected'
  | 'system_announcement';

export interface INotification {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface NotificationResponse {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
}

export interface NotificationQuery {
  isRead?: boolean;
  page?: number;
  limit?: number;
}
