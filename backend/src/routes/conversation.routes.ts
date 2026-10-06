import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { getMyActiveConversation, postMyMessage } from '../controllers/chat.controller';

const router = Router();
router.get('/active', requireAuth, getMyActiveConversation);
router.post('/:id/messages', requireAuth, postMyMessage);

export default router;