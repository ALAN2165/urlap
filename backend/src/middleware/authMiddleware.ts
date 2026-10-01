import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { prisma } from '../config/db';

export interface AuthRequest extends Request {
  userId?: string;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  try {
    const { userId } = verifyToken(header.split(' ')[1]);

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { isBanned: true } });
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' });
    if (user.isBanned) return res.status(403).json({ error: 'Your account has been suspended.' });

    req.userId = userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}