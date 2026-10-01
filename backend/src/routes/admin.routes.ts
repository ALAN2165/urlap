import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/adminMiddleware';
import { getOverview, getHealth } from '../controllers/admin.controller';

const router = Router();
router.use(requireAuth, requireAdmin);
router.get('/overview', getOverview);
router.get('/health', getHealth);

export default router;