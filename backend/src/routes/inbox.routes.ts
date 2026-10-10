import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { getMyInboxUnreadCount } from '../controllers/inbox.controller';

const router = Router();
router.get('/unread-count', requireAuth, getMyInboxUnreadCount);

export default router;