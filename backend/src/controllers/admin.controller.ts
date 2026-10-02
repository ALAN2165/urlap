import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../config/db';

export async function adminGetUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const search = (req.query.search as string | undefined)?.trim();
    const users = await prisma.user.findMany({
      where: search
        ? { OR: [{ username: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, username: true, totalPoints: true, role: true, isBanned: true, createdAt: true,
        _count: { select: { solvedChallenges: true } },
      },
    });
    res.json(users.map(({ _count, ...u }) => ({ ...u, solvedCount: _count.solvedChallenges })));
  } catch (err) { next(err); }
}

const roleSchema = z.object({ role: z.enum(['STUDENT', 'ADMIN']) });
export async function adminSetUserRole(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (req.params.id === req.userId) return res.status(400).json({ error: 'You cannot change your own role.' });
    const { role } = roleSchema.parse(req.body);
    const user = await prisma.user.update({ where: { id: req.params.id as string}, data: { role }, select: { id: true, username: true, role: true } });
    res.json(user);
  } catch (err) { next(err); }
}

const banSchema = z.object({ isBanned: z.boolean() });
export async function adminSetUserBan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (req.params.id === req.userId) return res.status(400).json({ error: 'You cannot ban your own account.' });
    const { isBanned } = banSchema.parse(req.body);
    const user = await prisma.user.update({ where: { id: req.params.id as string}, data: { isBanned }, select: { id: true, username: true, isBanned: true } });
    res.json(user);
  } catch (err) { next(err); }
}
export async function getHealth(req: AuthRequest, res: Response) {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
}

export async function getOverview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const totalUsers = await prisma.user.count();
    // لو عندك models تانية زي الـ challenges أو الـ submissions ممكن تزودهم هنا بعدين
    res.json({ totalUsers });
  } catch (err) { 
    next(err); 
  }
}