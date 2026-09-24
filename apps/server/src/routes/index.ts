import { Router } from 'express';
import authRoutes from './auth.routes';
import friendRoutes from './friend.routes';
import conversationRoutes from './conversation.routes';
import messageRoutes from './message.routes';
import attachmentRoutes from './attachment.routes';
import healthRoutes from './health.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/friends', friendRoutes);
router.use('/conversations', conversationRoutes);
router.use('/messages', messageRoutes);
router.use('/attachments', attachmentRoutes);

export default router;
