import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../config/db';
import { redisConnection } from '../config/redis';
import { graderPool } from '../config/sqlGraderPool';

export async function getOverview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalUsers, totalLabs, totalChallenges, submissionsToday, acceptedGraded, totalGraded, recentSubmissions] = await Promise.all([
      prisma.user.count(),
      prisma.lab.count(),
      prisma.challenge.count(),
      prisma.submission.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.submission.count({ where: { status: 'ACCEPTED' } }),
      prisma.submission.count({ where: { status: { notIn: ['PENDING', 'RUNNING'] } } }),
      prisma.submission.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true, status: true, createdAt: true, pointsAwarded: true,
          user: { select: { username: true } },
          challenge: { select: { titleEn: true, slug: true } },
        },
      }),
    ]);

    res.json({
      totalUsers,
      totalLabs,
      totalChallenges,
      submissionsToday,
      platformSuccessRate: totalGraded > 0 ? Math.round((acceptedGraded / totalGraded) * 100) : 0,
      recentSubmissions: recentSubmissions.map((s) => ({
        id: s.id,
        status: s.status,
        createdAt: s.createdAt,
        pointsAwarded: s.pointsAwarded,
        username: s.user.username,
        challengeTitle: s.challenge.titleEn,
        challengeSlug: s.challenge.slug,
      })),
    });
  } catch (err) { next(err); }
}

export async function getHealth(req: AuthRequest, res: Response, next: NextFunction) {
  const checks: Record<string, { ok: boolean; detail: string }> = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { ok: true, detail: 'Connected' };
  } catch (err: any) {
    checks.database = { ok: false, detail: err.message };
  }

  try {
    await redisConnection.ping();
    checks.redis = { ok: true, detail: 'Connected — the submission queue can process jobs' };
  } catch (err: any) {
    checks.redis = { ok: false, detail: `${err.message} — submissions will hang in PENDING until this is fixed` };
  }

  try {
    const client = await graderPool.connect();
    try {
      const result = await client.query('SELECT count(*)::int AS count FROM playground.employees');
      checks.sqlGrader = { ok: true, detail: `playground.employees has ${result.rows[0].count} rows` };
    } finally {
      client.release();
    }
  } catch (err: any) {
    checks.sqlGrader = { ok: false, detail: `${err.message} — run setupSqlPlayground.ts against this database` };
  }

  res.json(checks);
}