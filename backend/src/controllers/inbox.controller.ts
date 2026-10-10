import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../config/db';

export async function getMyInboxUnreadCount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const count = await prisma.message.count({
      where: { readAt: null, sender: { role: 'ADMIN' }, conversation: { userId: req.userId } },
    });
    res.json({ count });
  } catch (err) { next(err); }
}