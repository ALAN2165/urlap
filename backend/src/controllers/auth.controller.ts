import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { registerSchema, loginSchema } from '../validators/auth.validator';
import { updateProfileSchema } from '../validators/profile.validator';
import { registerUser, loginUser } from '../services/auth.service';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

const PROFILE_SELECT = {
  id: true, username: true, email: true, avatarUrl: true,
  totalPoints: true, preferredLang: true, showInLeaderboard: true,
  receiveAnnouncementEmails: true, role: true, createdAt: true,
};

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
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId }, select: PROFILE_SELECT });
    res.json(user);
  } catch (err) { next(err); }
}

export async function stats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const mine = await prisma.user.findUniqueOrThrow({ where: { id: req.userId }, select: { totalPoints: true } });
    const [higherRanked, totalUsers, solvedChallenges, totalChallenges, acceptedSubmissions, gradedSubmissions] = await Promise.all([
      prisma.user.count({ where: { totalPoints: { gt: mine.totalPoints } } }),
      prisma.user.count(),
      prisma.challengeCompletion.count({ where: { userId: req.userId } }),
      prisma.challenge.count(),
      prisma.submission.count({ where: { userId: req.userId, status: 'ACCEPTED' } }),
      prisma.submission.count({ where: { userId: req.userId, status: { notIn: ['PENDING', 'RUNNING'] } } }),
    ]);

    res.json({
      totalPoints: mine.totalPoints, rank: higherRanked + 1, totalUsers,
      solvedChallenges, totalChallenges, totalSubmissions: gradedSubmissions,
      successRate: gradedSubmissions > 0 ? Math.round((acceptedSubmissions / gradedSubmissions) * 100) : 0,
    });
  } catch (err) { next(err); }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { username, password, showInLeaderboard, receiveAnnouncementEmails } = updateProfileSchema.parse(req.body);
    const data: {
      username?: string; passwordHash?: string;
      showInLeaderboard?: boolean; receiveAnnouncementEmails?: boolean;
    } = {};

    if (username !== undefined) {
      const existing = await prisma.user.findFirst({ where: { username, NOT: { id: req.userId } } });
      if (existing) return res.status(409).json({ error: 'That username is already taken.' });
      data.username = username;
    }
    if (password !== undefined) data.passwordHash = await bcrypt.hash(password, 12);
    if (showInLeaderboard !== undefined) data.showInLeaderboard = showInLeaderboard;
    if (receiveAnnouncementEmails !== undefined) data.receiveAnnouncementEmails = receiveAnnouncementEmails;

    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'Nothing to update.' });

    const updated = await prisma.user.update({ where: { id: req.userId }, data, select: PROFILE_SELECT });
    res.json(updated);
  } catch (err) { next(err); }
}