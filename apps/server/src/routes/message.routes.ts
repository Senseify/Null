import { Router } from 'express';
import {
  getMessages,
  sendMessage,
  deleteMessage,
  markAsRead,
} from '../controllers/message.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', getMessages);
router.post('/', sendMessage);
router.delete('/:messageId', deleteMessage);
router.post('/read/:conversationId', markAsRead);

export default router;
