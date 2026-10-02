import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { runPlaygroundQuery } from '../controllers/playground.controller';

const router = Router();
router.post('/run', requireAuth, runPlaygroundQuery);

export default router;