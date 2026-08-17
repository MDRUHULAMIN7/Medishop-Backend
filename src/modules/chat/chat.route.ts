import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  getMyConversation,
  getMessages,
  sendMessage,
  getAdminConversations,
} from './chat.controller';

const router = Router();

router.use(authenticate);

router.get('/conversation', asyncHandler(getMyConversation));
router.get('/messages/:conversationId', asyncHandler(getMessages));
router.post('/messages', asyncHandler(sendMessage));

// Admin & Pharmacist routes
router.get(
  '/admin/conversations',
  authorize('admin', 'super_admin', 'pharmacist', 'pharmacist_verifier'),
  asyncHandler(getAdminConversations)
);

export default router;
