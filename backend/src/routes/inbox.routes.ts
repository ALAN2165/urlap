import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { getMyInboxUnreadCount, markConversationRead } from '../controllers/inbox.controller';

const router = Router();
router.get('/unread-count', requireAuth, getMyInboxUnreadCount);
router.post('/conversations/:id/read', requireAuth, markConversationRead);

export default router;