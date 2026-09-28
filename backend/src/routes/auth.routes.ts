import { Router } from 'express';
import { register, login, me, stats } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();
router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, me);
router.get('/stats', requireAuth, stats);

export default router;