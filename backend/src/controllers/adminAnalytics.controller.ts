import { Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../config/db';

const FAILURE_STATUSES = ['WRONG_ANSWER', 'RUNTIME_ERROR', 'COMPILE_ERROR', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED'] as const;

export async function adminGetAnalytics(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const [failedGroups, totalGroups, hintGroups, overallAvgRows, perChallengeAttemptsRows] = await Promise.all([
      prisma.submission.groupBy({
        by: ['challengeId'],
        where: { status: { in: [...FAILURE_STATUSES] } },
        _count: { challengeId: true },
        orderBy: { _count: { challengeId: 'desc' } },
        take: 8,
      }),
      prisma.submission.groupBy({
        by: ['challengeId'],
        where: { status: { notIn: ['PENDING', 'RUNNING'] } },
        _count: { challengeId: true },
      }),
      prisma.hintUsage.groupBy({
        by: ['hintId'],
        _count: { hintId: true },
        orderBy: { _count: { hintId: 'desc' } },
        take: 8,
      }),
      // Overall average, over ALL completions (not just the top 8) —
      // kept as its own query so the chart's LIMIT 8 below never biases it.
      prisma.$queryRaw<{ avgAttempts: number | null }[]>(Prisma.sql`
        SELECT AVG(sub_count)::float AS "avgAttempts" FROM (
          SELECT cc."userId", cc."challengeId", COUNT(s.id) AS sub_count
          FROM challenge_completions cc
          JOIN submissions s ON s."userId" = cc."userId" AND s."challengeId" = cc."challengeId"
          GROUP BY cc."userId", cc."challengeId"
        ) sub
      `),
      // Per-challenge breakdown for the chart — which challenges take the
      // most tries on average, i.e. the real "hardest" ones in practice.
      prisma.$queryRaw<{ challengeId: string; title: string; avgAttempts: number; solveCount: number }[]>(Prisma.sql`
        SELECT c.id AS "challengeId", c."titleEn" AS title, AVG(sub_count)::float AS "avgAttempts", COUNT(*)::int AS "solveCount"
        FROM (
          SELECT cc."userId", cc."challengeId", COUNT(s.id) AS sub_count
          FROM challenge_completions cc
          JOIN submissions s ON s."userId" = cc."userId" AND s."challengeId" = cc."challengeId"
          GROUP BY cc."userId", cc."challengeId"
        ) per_user
        JOIN challenges c ON c.id = per_user."challengeId"
        GROUP BY c.id, c."titleEn"
        ORDER BY "avgAttempts" DESC
        LIMIT 8
      `),
    ]);

    const totalByChallenge = new Map(totalGroups.map((g) => [g.challengeId, g._count.challengeId]));
    const failedChallengeIds = failedGroups.map((g) => g.challengeId);
    const challenges = await prisma.challenge.findMany({
      where: { id: { in: failedChallengeIds } },
      select: { id: true, titleEn: true },
    });
    const challengeTitleMap = new Map(challenges.map((c) => [c.id, c.titleEn]));

    const mostFailedChallenges = failedGroups.map((g) => {
      const total = totalByChallenge.get(g.challengeId) ?? g._count.challengeId;
      return {
        challengeId: g.challengeId,
        title: challengeTitleMap.get(g.challengeId) ?? 'Unknown challenge',
        failedCount: g._count.challengeId,
        totalAttempts: total,
        failureRatePct: total > 0 ? Math.round((g._count.challengeId / total) * 100) : 0,
      };
    });

    const hintIds = hintGroups.map((g) => g.hintId);
    const hints = await prisma.hint.findMany({
      where: { id: { in: hintIds } },
      select: { id: true, order: true, challenge: { select: { titleEn: true } } },
    });
    const hintMap = new Map(hints.map((h) => [h.id, h]));

    const mostUsedHints = hintGroups.map((g) => {
      const hint = hintMap.get(g.hintId);
      return {
        hintId: g.hintId,
        challengeTitle: hint?.challenge.titleEn ?? 'Unknown challenge',
        hintOrder: hint?.order ?? 0,
        studentCount: g._count.hintId, // distinct students — see HintUsage's unique constraint
      };
    });

    res.json({
      mostFailedChallenges,
      mostUsedHints,
      overallAvgAttempts: overallAvgRows[0]?.avgAttempts ?? 0,
      hardestChallengesByAttempts: perChallengeAttemptsRows.map((r) => ({
        challengeId: r.challengeId,
        title: r.title,
        avgAttempts: Math.round(r.avgAttempts * 10) / 10,
        solveCount: r.solveCount,
      })),
    });
  } catch (err) { next(err); }
}
