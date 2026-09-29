import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { getLeaderboard } from '../controllers/leaderboard.controller';

const router = Router();
router.get('/', requireAuth, getLeaderboard);

export default router;