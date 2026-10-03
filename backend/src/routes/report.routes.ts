import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { createReport } from '../controllers/report.controller';

const router = Router();
router.post('/', requireAuth, createReport);

export default router;