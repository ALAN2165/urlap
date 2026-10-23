import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../config/db';

/** Unread = a message in one of MY conversations, not sent by me, with no readAt yet. */
export async function getMyInboxUnreadCount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const groups = await prisma.message.groupBy({
      by: ['conversationId'],
      where: { readAt: null, senderId: { not: userId }, conversation: { userId } },
      _count: { _all: true },
    });

    const byConversation: Record<string, number> = {};
    let count = 0;
    for (const g of groups) {
      byConversation[g.conversationId] = g._count._all;
      count += g._count._all;
    }

    res.setHeader('Cache-Control', 'no-store');
    res.json({ count, byConversation });
  } catch (err) { next(err); }
}

/** Marks every message in one of the user's own conversations (not sent by them) as read. */
export async function markConversationRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const userId = req.userId!;
    const conversation = await prisma.conversation.findUniqueOrThrow({ where: { id }, select: { userId: true } });
    if (conversation.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

    const result = await prisma.message.updateMany({
      where: { conversationId: id, readAt: null, senderId: { not: userId } },
      data: { readAt: new Date() },
    });
    res.setHeader('Cache-Control', 'no-store');
    res.json({ marked: result.count });
  } catch (err) { next(err); }
}