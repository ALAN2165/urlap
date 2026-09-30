import { Router } from 'express';
import { register, login, me, stats, updateProfile } from '../controllers/auth.controller';
import { uploadAvatarHandler } from '../controllers/avatar.controller';
import { uploadAvatar } from '../middleware/uploadAvatar';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();
router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, me);
router.get('/stats', requireAuth, stats);
router.put('/profile', requireAuth, updateProfile);
router.post('/avatar', requireAuth, uploadAvatar, uploadAvatarHandler);

export default router;