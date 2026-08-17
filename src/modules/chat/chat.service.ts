import { Types } from 'mongoose';
import { ChatConversationModel, ChatMessageModel, ChatSenderRole } from './chat.model';
import { UserModel } from '../user/user.model';
import { emitToAdmins, emitToUser } from '../../socket';
import { AppError } from '../../utils/AppError';
import { HTTP_STATUS, ROLES } from '../../config/constants';
import { notificationService } from '../notification/notification.service';

const WELCOME_MESSAGE =
  'হ্যালো! মেডিশপ লাইভ ফার্মাসিস্ট সাপোর্টে আপনাকে স্বাগতম। প্রেসক্রিপশন, ওষুধের ডোজ বা অর্ডার সম্পর্কিত যেকোনো তথ্য জানতে নিচে আপনার প্রশ্নটি লিখুন।';

export class ChatService {
  async getOrCreateConversation(userId: string) {
    const user: any = await UserModel.findById(userId).lean();
    if (!user) throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);

    let conversation: any = await ChatConversationModel.findOne({
      user: new Types.ObjectId(userId),
      status: 'active',
    }).lean();

    if (!conversation) {
      const created = await ChatConversationModel.create({
        user: new Types.ObjectId(userId),
        userName: user.name || 'Customer',
        userEmail: user.email || '',
        userPhone: user.phone || '',
        status: 'active',
        lastMessage: WELCOME_MESSAGE,
        lastMessageAt: new Date(),
      });
      conversation = created.toObject();

      // Auto-create initial welcome message from Support Pharmacist
      await ChatMessageModel.create({
        conversation: created._id,
        sender: new Types.ObjectId(userId),
        senderName: 'MediShop Pharmacist',
        senderRole: 'admin',
        message: WELCOME_MESSAGE,
        messageType: 'text',
        isRead: true,
      });
    } else if (
      (user.name && conversation.userName === 'Customer') ||
      (user.phone && !conversation.userPhone) ||
      (user.email && !conversation.userEmail)
    ) {
      await ChatConversationModel.findByIdAndUpdate(conversation._id, {
        userName: user.name || conversation.userName,
        userEmail: user.email || conversation.userEmail,
        userPhone: user.phone || conversation.userPhone,
      });
    }

    return {
      ...conversation,
      id: conversation._id.toString(),
      userName: user.name || conversation.userName || 'Customer',
      userEmail: user.email || conversation.userEmail || '',
      userPhone: user.phone || conversation.userPhone || '',
    };
  }

  async getMessages(conversationId: string, userId: string, isAdmin: boolean = false) {
    const conversation: any = await ChatConversationModel.findById(conversationId).lean();
    if (!conversation) throw new AppError('Conversation not found', HTTP_STATUS.NOT_FOUND);

    if (!isAdmin && conversation.user.toString() !== userId) {
      throw new AppError('Access denied', HTTP_STATUS.FORBIDDEN);
    }

    // Reset unread count for reader
    if (isAdmin) {
      await ChatConversationModel.findByIdAndUpdate(conversationId, { unreadCountAdmin: 0 });
    } else {
      await ChatConversationModel.findByIdAndUpdate(conversationId, { unreadCountCustomer: 0 });
    }

    let messages = await ChatMessageModel.find({
      conversation: new Types.ObjectId(conversationId),
    })
      .sort({ createdAt: 1 })
      .lean();

    // If conversation exists but has 0 messages, auto-seed the welcome message
    if (messages.length === 0) {
      const welcome = await ChatMessageModel.create({
        conversation: new Types.ObjectId(conversationId),
        sender: conversation.user,
        senderName: 'MediShop Pharmacist',
        senderRole: 'admin',
        message: WELCOME_MESSAGE,
        messageType: 'text',
        isRead: true,
      });
      await ChatConversationModel.findByIdAndUpdate(conversationId, {
        lastMessage: WELCOME_MESSAGE,
        lastMessageAt: new Date(),
      });
      messages = [welcome.toObject()];
    }

    return messages.map((m: any) => ({
      id: m._id.toString(),
      conversationId: m.conversation.toString(),
      senderId: m.sender.toString(),
      senderName: m.senderName,
      senderRole: m.senderRole,
      message: m.message,
      messageType: m.messageType,
      isRead: m.isRead,
      createdAt: m.createdAt,
    }));
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    senderRole: ChatSenderRole,
    message: string
  ) {
    const conversation: any = await ChatConversationModel.findById(conversationId);
    if (!conversation) throw new AppError('Conversation not found', HTTP_STATUS.NOT_FOUND);

    const user: any = await UserModel.findById(senderId).lean();
    const senderName = user?.name
      ? user.name
      : senderRole === 'admin'
      ? 'Pharmacist Support'
      : 'Customer';

    const createdMsg = await ChatMessageModel.create({
      conversation: conversation._id,
      sender: new Types.ObjectId(senderId),
      senderName,
      senderRole,
      message: message.trim(),
      messageType: 'text',
      isRead: false,
    });

    const updateFields: any = {
      lastMessage: message.trim(),
      lastMessageAt: new Date(),
    };

    if (senderRole === 'customer') {
      updateFields.$inc = { unreadCountAdmin: 1 };
      if (user?.name && (!conversation.userName || conversation.userName === 'Customer')) {
        updateFields.userName = user.name;
      }
      if (user?.email && !conversation.userEmail) updateFields.userEmail = user.email;
      if (user?.phone && !conversation.userPhone) updateFields.userPhone = user.phone;
    } else {
      updateFields.$inc = { unreadCountCustomer: 1 };
    }

    await ChatConversationModel.findByIdAndUpdate(conversationId, updateFields);

    const formattedMsg = {
      id: createdMsg._id.toString(),
      conversationId: conversation._id.toString(),
      senderId,
      senderName,
      senderRole,
      message: message.trim(),
      messageType: 'text',
      createdAt: createdMsg.createdAt,
    };

    // Emit real-time Socket.IO events and notifications
    if (senderRole === 'customer') {
      emitToAdmins('chat:new_message', formattedMsg);

      const snippet =
        message.trim().length > 60 ? `${message.trim().slice(0, 60)}...` : message.trim();
      const notifTitle = `নতুন চ্যাট মেসেজ: ${senderName}`;
      const notifMessage = `${senderName}: "${snippet}"`;

      // 1. Emit instant live notification event to admins room
      emitToAdmins('notification:received', {
        type: 'live_chat_message',
        title: notifTitle,
        message: notifMessage,
        data: {
          conversationId: conversation._id.toString(),
          userId: senderId,
          senderName,
          lastMessage: message.trim(),
        },
        createdAt: new Date(),
      });

      // 2. Persist notification in DB for all active staff and admin users
      UserModel.find({
        role: {
          $in: [
            ROLES.ADMIN,
            ROLES.SUPER_ADMIN,
            ROLES.PHARMACIST,
            ROLES.PHARMACIST_VERIFIER,
            ROLES.SALES_STAFF,
            ROLES.ORDER_MANAGER,
            ROLES.INVENTORY_MANAGER,
            ROLES.MARKETING_EDITOR,
          ],
        },
        status: 'active',
      })
        .select('_id')
        .lean()
        .then((staffUsers: any[]) => {
          for (const staff of staffUsers) {
            notificationService
              .createAndSendNotification({
                userId: staff._id.toString(),
                type: 'live_chat_message',
                title: notifTitle,
                message: notifMessage,
                data: {
                  conversationId: conversation._id.toString(),
                  userId: senderId,
                  senderName,
                },
              })
              .catch(() => {});
          }
        })
        .catch(() => {});
    } else {
      emitToUser(conversation.user.toString(), 'chat:new_message', formattedMsg);
    }

    return formattedMsg;
  }

  async getAdminConversations() {
    const conversations = await ChatConversationModel.find()
      .populate('user', 'name email phone avatar')
      .sort({ lastMessageAt: -1 })
      .lean();

    return conversations.map((c: any) => ({
      id: c._id.toString(),
      userId: c.user?._id ? c.user._id.toString() : c.user?.toString() || '',
      userName: (c.user as any)?.name || c.userName || 'Customer',
      userEmail: (c.user as any)?.email || c.userEmail || '',
      userPhone: (c.user as any)?.phone || c.userPhone || '',
      userAvatar: (c.user as any)?.avatar || '',
      status: c.status,
      lastMessage: c.lastMessage,
      lastMessageAt: c.lastMessageAt,
      unreadCountAdmin: c.unreadCountAdmin,
      unreadCountCustomer: c.unreadCountCustomer,
    }));
  }
}

export const chatService = new ChatService();

