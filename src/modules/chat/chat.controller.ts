import { Request, Response } from 'express';
import { chatService } from './chat.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { HTTP_STATUS } from '../../config/constants';

export const getMyConversation = async (req: Request, res: Response) => {
  const conversation = await chatService.getOrCreateConversation(req.user!.id);
  return ApiResponse.success(res, 'Conversation fetched', conversation);
};

export const getMessages = async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const userRole = req.user?.role || '';
  const isAdmin = ['admin', 'super_admin', 'pharmacist', 'pharmacist_verifier'].includes(userRole);
  const messages = await chatService.getMessages(conversationId, req.user!.id, isAdmin);
  return ApiResponse.success(res, 'Messages fetched', messages);
};

export const sendMessage = async (req: Request, res: Response) => {
  const { conversationId, message } = req.body;
  const userRole = req.user?.role || '';
  const isAdmin = ['admin', 'super_admin', 'pharmacist', 'pharmacist_verifier'].includes(userRole);
  const senderRole = isAdmin ? 'admin' : 'customer';

  const msg = await chatService.sendMessage(
    conversationId,
    req.user!.id,
    senderRole,
    message
  );
  return ApiResponse.success(res, 'Message sent', msg, HTTP_STATUS.CREATED);
};

export const getAdminConversations = async (_req: Request, res: Response) => {
  const conversations = await chatService.getAdminConversations();
  return ApiResponse.success(res, 'Conversations fetched', conversations);
};
