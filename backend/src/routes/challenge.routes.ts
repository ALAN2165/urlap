import { Router } from 'express';
import { getChallenge, getChallengeSampleData, getLabs, getLab } from '../controllers/challenge.controller';
import { reveal } from '../controllers/hint.controller';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Progress and locking are per-user, so every endpoint must know who is asking.
// Without this, req.userId was undefined and everything after challenge #1 stayed locked.
router.use(requireAuth);

router.get('/labs', getLabs);
router.get('/labs/:labSlug', getLab);
router.get('/:slug/preview-data', getChallengeSampleData);
router.post('/hints/:hintId/reveal', reveal);
router.get('/:slug', getChallenge);

export default router;