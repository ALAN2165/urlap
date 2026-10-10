import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { getLabs, getLab, getChallenge, revealHint, getChallengeSampleData } from '../controllers/challenge.controller';

const router = Router();
router.use(requireAuth);

router.get('/labs', getLabs);
router.get('/labs/:slug', getLab);
router.post('/hints/:hintId/reveal', revealHint);
router.get('/:slug/preview-data', getChallengeSampleData);
router.get('/:slug', getChallenge);

export default router;