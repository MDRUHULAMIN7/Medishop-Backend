import { emitToUser } from '../../socket';
import { NotFoundError } from '../../utils/AppError';
import { notificationRepository } from './notification.repository';
import { CreateNotificationInput, NotificationQuery } from './notification.types';

export class NotificationService {
  async createAndSendNotification(input: CreateNotificationInput) {
    const notification = await notificationRepository.create(input);

    // Push real-time Socket.io event to user room
    emitToUser(input.userId, 'notification:received', {
      event: 'notification:received',
      notification,
    });

    return notification;
  }

  async getUserNotifications(userId: string, query: NotificationQuery) {
    return notificationRepository.findByUserId(userId, query);
  }

  async markNotificationAsRead(id: string, userId: string) {
    const notification = await notificationRepository.markAsRead(id, userId);
    if (!notification) {
      throw new NotFoundError('Notification not found or access denied', 'NOTIFICATION_NOT_FOUND');
    }
    return notification;
  }

  async markAllNotificationsAsRead(userId: string) {
    return notificationRepository.markAllAsRead(userId);
  }

  async getUnreadCount(userId: string) {
    return notificationRepository.getUnreadCount(userId);
  }
}

export const notificationService = new NotificationService();
