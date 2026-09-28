import { Request, Response, NextFunction } from 'express';
import { registerSchema, loginSchema } from '../validators/auth.validator';
import { registerUser, loginUser } from '../services/auth.service';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, email, password } = registerSchema.parse(req.body);
    const result = await registerUser(username, email, password);
    res.status(201).json(result);
  } catch (err) { next(err); }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await loginUser(email, password);
    res.json(result);
  } catch (err) { next(err); }
}

export async function me(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.userId },
      select: { id: true, username: true, email: true, avatarUrl: true, totalPoints: true, preferredLang: true, createdAt: true },
    });
    res.json(user);
  } catch (err) { next(err); }
}

export async function stats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const mine = await prisma.user.findUniqueOrThrow({ where: { id: req.userId }, select: { totalPoints: true } });
    const [higherRanked, totalUsers, solvedChallenges, totalChallenges] = await Promise.all([
      prisma.user.count({ where: { totalPoints: { gt: mine.totalPoints } } }),
      prisma.user.count(),
      prisma.challengeCompletion.count({ where: { userId: req.userId } }),
      prisma.challenge.count(),
    ]);
    res.json({
      totalPoints: mine.totalPoints,
      rank: higherRanked + 1, // ties share a rank
      totalUsers,
      solvedChallenges,
      totalChallenges,
    });
  } catch (err) { next(err); }
}