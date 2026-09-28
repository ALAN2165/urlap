// backend/src/routes/submission.routes.ts
import { Router } from 'express';
import { createSubmission, getSubmission } from '../controllers/submission.controller';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();
router.post('/', requireAuth, createSubmission);
router.get('/:id', requireAuth, getSubmission);

export default router;