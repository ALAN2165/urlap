import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import { prisma } from '../config/db';

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true } });
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
  } catch (err) {
    next(err);
  }
}