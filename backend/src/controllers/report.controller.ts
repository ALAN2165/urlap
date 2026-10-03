import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../config/db';
import { reportSchema } from '../validators/report.validator';

export async function createReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { challengeId, reason } = reportSchema.parse(req.body);
    await prisma.challengeReport.create({ data: { userId: req.userId!, challengeId, reason } });
    res.status(201).json({ message: 'Report submitted. Thank you for the feedback.' });
  } catch (err) { next(err); }
}