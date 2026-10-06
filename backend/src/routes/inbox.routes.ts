import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { getMyInbox, getMyInboxUnreadCount, markInboxMessageRead } from '../controllers/inbox.controller';

const router = Router();
router.get('/', requireAuth, getMyInbox);
router.get('/unread-count', requireAuth, getMyInboxUnreadCount);
router.put('/:id/read', requireAuth, markInboxMessageRead);

export default router;