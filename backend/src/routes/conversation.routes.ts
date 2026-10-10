import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { getMyActiveConversation, getMyConversations, getMyConversationById, postMyMessage, closeMyConversationForChallenge } from '../controllers/chat.controller';

const router = Router();
router.get('/active', requireAuth, getMyActiveConversation);
router.post('/close-for-challenge', requireAuth, closeMyConversationForChallenge);
router.get('/', requireAuth, getMyConversations);
router.get('/:id', requireAuth, getMyConversationById);
router.post('/:id/messages', requireAuth, postMyMessage);

export default router;