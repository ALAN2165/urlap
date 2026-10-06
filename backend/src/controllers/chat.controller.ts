import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../config/db';
import { sendMessageSchema } from '../validators/chat.validator';
import { getConversationMessages, postMessage } from '../services/chat.service';

// GET /conversations/active — a regular user's own open conversation, if any
export async function getMyActiveConversation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { userId: req.userId, status: 'OPEN' },
      include: {
        challenge: { select: { titleEn: true, slug: true } },
        admin: { select: { username: true } },
      },
    });
    if (!conversation) return res.json(null);

    const messages = await getConversationMessages(conversation.id);
    res.json({
      id: conversation.id,
      challengeTitle: conversation.challenge?.titleEn ?? null,
      adminUsername: conversation.admin?.username ?? null,
      status: conversation.status,
      messages,
    });
  } catch (err) { next(err); }
}

// POST /conversations/:id/messages — used by a regular user on their own conversation
export async function postMyMessage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const conversation = await prisma.conversation.findUniqueOrThrow({ 
      where: { id: req.params.id as string } 
    });
    if (conversation.userId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { content } = sendMessageSchema.parse(req.body);
    const message = await postMessage(conversation.id, req.userId!, content);
    res.status(201).json(message);
  } catch (err) { next(err); }
}

// Admin: GET /admin/conversations/:id/messages
export async function adminGetConversationMessages(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const conversation = await prisma.conversation.findUniqueOrThrow({
      where: { id: req.params.id as string },
      include: { user: { select: { username: true } }, challenge: { select: { titleEn: true } } },
    });
    const messages = await getConversationMessages(conversation.id);
    res.json({
      id: conversation.id,
      username: conversation.user.username,
      challengeTitle: conversation.challenge?.titleEn ?? null,
      status: conversation.status,
      messages,
    });
  } catch (err) { next(err); }
}

// Admin: POST /admin/conversations/:id/messages — also implicitly claims the alert
export async function adminPostMessage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { content } = sendMessageSchema.parse(req.body);
    const message = await postMessage(req.params.id as string, req.userId!, content);

    await prisma.alert.updateMany({
      where: { conversationId: req.params.id as string, status: 'OPEN' },
      data: { status: 'ACKNOWLEDGED' },
    });
    await prisma.conversation.update({ 
      where: { id: req.params.id as string }, 
      data: { adminId: req.userId! } 
    });

    res.status(201).json(message);
  } catch (err) { next(err); }
}

// Admin: PUT /admin/conversations/:id/close
export async function adminCloseConversation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const conversation = await prisma.conversation.update({
      where: { id: req.params.id as string },
      data: { status: 'CLOSED' },
    });
    await prisma.alert.updateMany({
      where: { conversationId: conversation.id, status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });
    res.json(conversation);
  } catch (err) { next(err); }
}