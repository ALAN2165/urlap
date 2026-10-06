import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../config/db';

export async function getMyInbox(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const messages = await prisma.inboxMessage.findMany({ where: { userId: req.userId }, orderBy: { createdAt: 'desc' }, take: 100 });
    res.json(messages);
  } catch (err) { next(err); }
}

export async function getMyInboxUnreadCount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const count = await prisma.inboxMessage.count({ where: { userId: req.userId, read: false } });
    res.json({ count });
  } catch (err) { next(err); }
}

export async function markInboxMessageRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const message = await prisma.inboxMessage.findUniqueOrThrow({ where: { id: req.params.id as string } });
    if (message.userId !== req.userId) return res.status(403).json({ error: 'Forbidden' });
    const updated = await prisma.inboxMessage.update({ where: { id: req.params.id as string}, data: { read: true } });
    res.json(updated);
  } catch (err) { next(err); }
}