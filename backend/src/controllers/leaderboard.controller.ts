import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../config/db';

export async function getLeaderboard(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const users = await prisma.user.findMany({
      where: { showInLeaderboard: true },
      orderBy: { totalPoints: 'desc' },
      select: { id: true, username: true, totalPoints: true, avatarUrl: true },
      take: 100,
    });
    res.json(users.map((u, i) => ({ rank: i + 1, ...u })));
  } catch (err) { next(err); }
}