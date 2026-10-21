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

/** Marks every Support Team message in one of the user's own conversations as read. */
export async function markConversationRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const conversation = await prisma.conversation.findUniqueOrThrow({ where: { id }, select: { userId: true } });
    if (conversation.userId !== req.userId) return res.status(403).json({ error: 'Forbidden' });
    const result = await prisma.message.updateMany({
      where: { conversationId: id, readAt: null, sender: { role: 'ADMIN' } },
      data: { readAt: new Date() },
    });
    res.json({ marked: result.count });
  } catch (err) { next(err); }
}