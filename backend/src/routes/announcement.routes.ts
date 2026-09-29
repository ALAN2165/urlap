import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { getAnnouncements } from '../controllers/announcement.controller';

const router = Router();
router.get('/', requireAuth, getAnnouncements);

export default router;