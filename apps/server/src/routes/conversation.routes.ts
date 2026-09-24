import { Router } from 'express';
import {
  listConversations,
  getOrCreateDirect,
  createRoom,
  getConversation,
  inviteMember,
  leaveRoom,
} from '../controllers/conversation.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', listConversations);
router.post('/direct', getOrCreateDirect);
router.post('/rooms', createRoom);
router.get('/:conversationId', getConversation);
router.post('/:conversationId/invite', inviteMember);
router.post('/:conversationId/leave', leaveRoom);

export default router;
