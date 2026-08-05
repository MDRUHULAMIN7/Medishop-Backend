import { FilterQuery, Types } from 'mongoose';
import { NotificationModel } from './notification.model';
import { CreateNotificationInput, NotificationQuery, NotificationResponse } from './notification.types';

const toResponse = (notification: any): NotificationResponse => ({
  id: notification._id.toString(),
  userId: notification.user ? (typeof notification.user === 'object' ? notification.user._id.toString() : notification.user.toString()) : '',
  type: notification.type,
  title: notification.title,
  message: notification.message,
  data: notification.data,
  isRead: Boolean(notification.isRead),
  readAt: notification.readAt ? new Date(notification.readAt) : null,
  createdAt: notification.createdAt,
  updatedAt: notification.updatedAt,
});

export class NotificationRepository {
  async create(input: CreateNotificationInput) {
    const created = await NotificationModel.create({
      user: new Types.ObjectId(input.userId),
      type: input.type,
      title: input.title,
      message: input.message,
      data: input.data || {},
      isRead: false,
    });
    return toResponse(created.toObject());
  }

  async findByUserId(userId: string, query: NotificationQuery = {}) {
    const page = Math.max(Number(query.page || 1), 1);
    const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
    const skip = (page - 1) * limit;

    const filter: FilterQuery<any> = { user: new Types.ObjectId(userId) };
    if (query.isRead !== undefined) {
      filter.isRead = query.isRead;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      NotificationModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      NotificationModel.countDocuments(filter),
      NotificationModel.countDocuments({ user: new Types.ObjectId(userId), isRead: false }),
    ]);

    return {
      notifications: notifications.map(toResponse),
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        unreadCount,
      },
    };
  }

  async markAsRead(id: string, userId: string) {
    const updated = await NotificationModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), user: new Types.ObjectId(userId) },
      { isRead: true, readAt: new Date() },
      { new: true }
    ).lean();

    return updated ? toResponse(updated) : null;
  }

  async markAllAsRead(userId: string) {
    await NotificationModel.updateMany(
      { user: new Types.ObjectId(userId), isRead: false },
      { isRead: true, readAt: new Date() }
    );
    return { success: true };
  }
}

export const notificationRepository = new NotificationRepository();
