import { Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../config/db';
import { redisConnection } from '../config/redis';
import { graderPool } from '../config/sqlGraderPool';

export async function getOverview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const sevenDaysAgo = new Date(startOfToday);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // 6 days back + today = 7 days total

    const [
      totalUsers,
      totalLabs,
      totalChallenges,
      submissionsToday,
      submissionsYesterday,
      acceptedGraded,
      totalGraded,
      trendRows,
      completions,
      recentSubmissions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.lab.count(),
      prisma.challenge.count(),
      prisma.submission.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.submission.count({ where: { createdAt: { gte: startOfYesterday, lt: startOfToday } } }),
      prisma.submission.count({ where: { status: 'ACCEPTED' } }),
      prisma.submission.count({ where: { status: { notIn: ['PENDING', 'RUNNING'] } } }),
      prisma.$queryRaw<{ day: Date; count: number }[]>(Prisma.sql`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::int AS count
        FROM submissions
        WHERE "createdAt" >= ${sevenDaysAgo}
        GROUP BY day
        ORDER BY day ASC
      `),
      prisma.challengeCompletion.findMany({
        select: { challenge: { select: { lab: { select: { id: true, titleEn: true } } } } },
      }),
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

    // Fill in any day with zero submissions — GROUP BY only returns days that have rows
    const dailyTrend: { date: string; count: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const match = trendRows.find((r) => r.day.toISOString().slice(0, 10) === dateStr);
      dailyTrend.push({ date: dateStr, count: match?.count ?? 0 });
    }

    const labCounts = new Map<string, { title: string; count: number }>();
    for (const c of completions) {
      const lab = c.challenge.lab;
      if (!lab) continue;
      const entry = labCounts.get(lab.id) ?? { title: lab.titleEn, count: 0 };
      entry.count += 1;
      labCounts.set(lab.id, entry);
    }
    const topLabs = [...labCounts.entries()]
      .map(([labId, v]) => ({ labId, title: v.title, count: v.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.json({
      totalUsers,
      totalLabs,
      totalChallenges,
      submissionsToday,
      submissionsYesterday,
      platformSuccessRate: totalGraded > 0 ? Math.round((acceptedGraded / totalGraded) * 100) : 0,
      dailyTrend,
      topLabs,
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