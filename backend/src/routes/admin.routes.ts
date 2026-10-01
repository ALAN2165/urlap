import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/adminMiddleware';
import { getOverview, getHealth } from '../controllers/admin.controller';
import {
  adminGetLabs, adminCreateLab, adminUpdateLab,
  adminGetChallenge, adminCreateChallenge, adminUpdateChallenge, adminDeleteChallenge, adminReorderChallenges,
} from '../controllers/adminChallenges.controller';
import { adminTestSql } from '../controllers/adminSql.controller';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/overview', getOverview);
router.get('/health', getHealth);

router.get('/labs', adminGetLabs);
router.post('/labs', adminCreateLab);
router.put('/labs/:id', adminUpdateLab);
router.put('/labs/:labId/reorder', adminReorderChallenges);

router.get('/challenges/:id', adminGetChallenge);
router.post('/challenges', adminCreateChallenge);
router.put('/challenges/:id', adminUpdateChallenge);
router.delete('/challenges/:id', adminDeleteChallenge);

router.post('/sql-test', adminTestSql);

export default router;