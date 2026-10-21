import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../config/db';
import { countVisibleChallenges } from '../services/labProgress.service';

export async function stats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const mine = await prisma.user.findUniqueOrThrow({ where: { id: req.userId }, select: { totalPoints: true } });
    const [higherRanked, totalUsers, solvedChallenges, totalChallenges, accepted, graded] = await Promise.all([
      prisma.user.count({ where: { totalPoints: { gt: mine.totalPoints } } }),
      prisma.user.count(),
      prisma.challengeCompletion.count({ where: { userId: req.userId } }),
      countVisibleChallenges(req.userId!),
      prisma.submission.count({ where: { userId: req.userId, status: 'ACCEPTED' } }),
      prisma.submission.count({ where: { userId: req.userId, status: { notIn: ['PENDING', 'RUNNING'] } } }),
    ]);

    res.json({
      totalPoints: mine.totalPoints, rank: higherRanked + 1, totalUsers,
      solvedChallenges, totalChallenges, totalSubmissions: graded,
      successRate: graded > 0 ? Math.round((accepted / graded) * 100) : 0,
    });
  } catch (err) { next(err); }
}