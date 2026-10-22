import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { submissionSchema } from '../validators/submission.validator';
import { prisma } from '../config/db';
import { isChallengeLocked } from '../services/labProgress.service';
import { gradeSubmissionById } from '../services/submissionGrading.service';

export async function createSubmission(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { challengeId, language, code, isPasted, timeSpentSeconds, tabSwitches } = submissionSchema.parse(req.body);

    const locked = await isChallengeLocked(challengeId, req.userId);
    if (locked) return res.status(403).json({ error: 'This challenge is locked. Solve the previous challenge first.' });

    const submission = await prisma.submission.create({
      data: {
        userId: req.userId!, challengeId, language, code, status: 'PENDING',
        isPasted: isPasted ?? false, timeSpentSeconds: timeSpentSeconds ?? null, tabSwitches: tabSwitches ?? 0,
      },
    });

    if (language === 'SQL') {
      // Graded right here by the transactional sandbox engine: no Redis, no queue, no worker, no Docker.
      await gradeSubmissionById(submission.id);
      const done = await prisma.submission.findUniqueOrThrow({ where: { id: submission.id }, select: { status: true } });
      return res.status(200).json({ submissionId: submission.id, status: done.status });
    }

    const { enqueueExecution } = await import('../queues/executionQueue');
    await enqueueExecution({ submissionId: submission.id, challengeId, userId: req.userId!, language, code });
    res.status(202).json({ submissionId: submission.id, status: 'PENDING' });
  } catch (err) { next(err); }
}

interface StoredResult {
  columns?: string[]; rows?: unknown[][]; totalRows?: number; expectedRowCount?: number | null;
  failureReason?: string | null; panels?: unknown[];
}

export async function getSubmission(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const submission = await prisma.submission.findUniqueOrThrow({ where: { id: req.params.id as string } });
    if (submission.userId !== req.userId) return res.status(403).json({ error: 'Forbidden' });

    const { resultJson, code, ...rest } = submission;
    let parsed: StoredResult = {};
    if (resultJson) { try { parsed = JSON.parse(resultJson); } catch { parsed = {}; } }

    res.json({
      ...rest,
      resultColumns: parsed.columns ?? [],
      resultRows: parsed.rows ?? [],
      totalRows: parsed.totalRows ?? 0,
      expectedRowCount: parsed.expectedRowCount ?? null,
      failureReason: parsed.failureReason ?? null,
      comparison: submission.status === 'WRONG_ANSWER' ? parsed.panels ?? [] : [],
    });
  } catch (err) { next(err); }
}