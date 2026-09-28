import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { submissionSchema } from '../validators/submission.validator';
import { prisma } from '../config/db';
import { enqueueExecution } from '../queues/executionQueue';
import { isChallengeLocked } from '../services/challenge.service';

export async function createSubmission(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { challengeId, language, code } = submissionSchema.parse(req.body);

    const locked = await isChallengeLocked(challengeId, req.userId);
    if (locked) {
      return res.status(403).json({ error: 'This challenge is locked. Solve the previous challenge first.' });
    }

    const submission = await prisma.submission.create({
      data: { userId: req.userId!, challengeId, language, code, status: 'PENDING' },
    });

    await enqueueExecution({ submissionId: submission.id, challengeId, userId: req.userId!, language, code });

    res.status(202).json({ submissionId: submission.id, status: 'PENDING' });
  } catch (err) { next(err); }
}

interface StoredResult {
  columns?: string[];
  rows?: unknown[][];
  totalRows?: number;
  expectedRowCount?: number | null;
  failureReason?: string | null;
}

export async function getSubmission(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const submission = await prisma.submission.findUniqueOrThrow({ where: { id : req.params.id as string} });
    if (submission.userId !== req.userId) return res.status(403).json({ error: 'Forbidden' });

    const { resultJson , code, ...rest  } = submission ;
    let parsed: StoredResult = {};
    if (resultJson) {
      try { parsed = JSON.parse(resultJson); } catch { parsed = {}; }
    }

    res.json({
      ...rest,
      resultColumns: parsed.columns ?? [],
      resultRows: parsed.rows ?? [],
      totalRows: parsed.totalRows ?? 0,
      expectedRowCount: parsed.expectedRowCount ?? null,
      failureReason: parsed.failureReason ?? null,
    });
  } catch (err) { next(err); }
}