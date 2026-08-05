import { Schema, model, models, HydratedDocument } from 'mongoose';
import { INotification } from './notification.types';

const notificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'order_created',
        'order_status_updated',
        'prescription_submitted',
        'prescription_approved',
        'prescription_rejected',
        'system_announcement',
      ],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    data: { type: Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

export type NotificationDocument = HydratedDocument<INotification>;

export const NotificationModel =
  models.Notification || model<INotification>('Notification', notificationSchema);
