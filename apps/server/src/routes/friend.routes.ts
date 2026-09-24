import { Router } from 'express';
import {
  searchUsers,
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  respondFriendRequest,
  removeFriend,
} from '../controllers/friend.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/search', searchUsers);
router.get('/list', getFriends);
router.get('/requests', getFriendRequests);
router.post('/request', sendFriendRequest);
router.post('/respond', respondFriendRequest);
router.delete('/:friendId', removeFriend);

export default router;
