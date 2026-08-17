import { Schema, model, models, HydratedDocument, Types } from 'mongoose';

export type ChatConversationStatus = 'active' | 'closed' | 'archived';
export type ChatMessageType = 'text' | 'image';
export type ChatSenderRole = 'customer' | 'admin';

export interface IChatConversation {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  assignedAdmin?: Types.ObjectId | null;
  status: ChatConversationStatus;
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadCountCustomer: number;
  unreadCountAdmin: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IChatMessage {
  _id: Types.ObjectId;
  conversation: Types.ObjectId;
  sender: Types.ObjectId;
  senderName: string;
  senderRole: ChatSenderRole;
  message: string;
  messageType: ChatMessageType;
  isRead: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const chatConversationSchema = new Schema<IChatConversation>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userName: { type: String, required: true, trim: true },
    userEmail: { type: String, trim: true },
    userPhone: { type: String, trim: true },
    assignedAdmin: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    status: {
      type: String,
      enum: ['active', 'closed', 'archived'],
      default: 'active',
      index: true,
    },
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now },
    unreadCountCustomer: { type: Number, default: 0, min: 0 },
    unreadCountAdmin: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const chatMessageSchema = new Schema<IChatMessage>(
  {
    conversation: { type: Schema.Types.ObjectId, ref: 'ChatConversation', required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true, trim: true },
    senderRole: { type: String, enum: ['customer', 'admin'], required: true },
    message: { type: String, required: true, trim: true },
    messageType: { type: String, enum: ['text', 'image'], default: 'text' },
    isRead: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

chatConversationSchema.index({ user: 1, status: 1 });
chatMessageSchema.index({ conversation: 1, createdAt: 1 });

export type ChatConversationDocument = HydratedDocument<IChatConversation>;
export type ChatMessageDocument = HydratedDocument<IChatMessage>;

export const ChatConversationModel =
  models.ChatConversation || model<IChatConversation>('ChatConversation', chatConversationSchema);

export const ChatMessageModel =
  models.ChatMessage || model<IChatMessage>('ChatMessage', chatMessageSchema);
