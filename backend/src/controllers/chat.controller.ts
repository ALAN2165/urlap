import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../config/db';
import { sendMessageSchema, closeByChallengeSchema, adminMessageUserSchema } from '../validators/chat.validator';
import { getConversationMessages, postMessage } from '../services/chat.service';
import { findOrCreateOpenConversation } from '../services/conversation.service';
import { emitToAdmins } from '../realtime/socket';

// ---------------------------------------------------------------------------
// User-facing
// ---------------------------------------------------------------------------

export async function getMyActiveConversation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { userId: req.userId, status: 'OPEN' },
      include: { challenge: { select: { titleEn: true, slug: true } }, admin: { select: { username: true } } },
    });
    if (!conversation) return res.json(null);
    const messages = await getConversationMessages(conversation.id);
    res.json({
      id: conversation.id,
      challengeTitle: conversation.challenge?.titleEn ?? null,
      adminUsername: conversation.admin ? 'Support Team' : null, // never leak the real admin identity
      status: conversation.status,
      messages,
    });
  } catch (err) { next(err); }
}

export async function getMyConversations(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId: req.userId },
      orderBy: { updatedAt: 'desc' },
      include: { challenge: { select: { titleEn: true } }, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    res.json(conversations.map((c) => ({
      id: c.id, challengeTitle: c.challenge?.titleEn ?? null, status: c.status, updatedAt: c.updatedAt,
      lastMessage: c.messages[0]?.content ?? null, lastMessageAt: c.messages[0]?.createdAt ?? c.createdAt,
    })));
  } catch (err) { next(err); }
}

export async function getMyConversationById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const conversation = await prisma.conversation.findUniqueOrThrow({ 
      where: { id: req.params.id as string }, 
      include: { challenge: { select: { titleEn: true } } } 
    });
    if (conversation.userId !== req.userId) return res.status(403).json({ error: 'Forbidden' });

    const messages = await getConversationMessages(conversation.id);

    await prisma.message.updateMany({
      where: { conversationId: conversation.id, readAt: null, sender: { role: 'ADMIN' } },
      data: { readAt: new Date() },
    });

    res.json({ id: conversation.id, challengeTitle: conversation.challenge?.titleEn ?? null, status: conversation.status, messages });
  } catch (err) { next(err); }
}

export async function postMyMessage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const conversation = await prisma.conversation.findUniqueOrThrow({ 
      where: { id: req.params.id as string } 
    });
    if (conversation.userId !== req.userId) return res.status(403).json({ error: 'Forbidden' });
    const { content } = sendMessageSchema.parse(req.body);

    // Replying to an old, closed thread reopens it — a two-way inbox
    // should feel like email, not a chat that permanently dies once resolved.
    if (conversation.status === 'CLOSED') {
      await prisma.conversation.update({ where: { id: conversation.id }, data: { status: 'OPEN' } });
    }

    const message = await postMessage(conversation.id, req.userId!, content);
    res.status(201).json(message);
  } catch (err) { next(err); }
}

/** Closes the user's own open conversation for a specific challenge — the
 *  mechanism behind "support chat closes when you leave the challenge page."
 *  Idempotent: no-op if nothing is open for that challenge. */
export async function closeMyConversationForChallenge(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { challengeId } = closeByChallengeSchema.parse(req.body);
    const conversation = await prisma.conversation.findFirst({ where: { userId: req.userId, challengeId, status: 'OPEN' } });
    if (!conversation) return res.json({ closed: false });

    await prisma.conversation.update({ where: { id: conversation.id }, data: { status: 'CLOSED' } });

    const openAlerts = await prisma.alert.findMany({ where: { conversationId: conversation.id, status: { in: ['OPEN', 'ACKNOWLEDGED'] } } });
    if (openAlerts.length > 0) {
      await prisma.alert.updateMany({ where: { id: { in: openAlerts.map((a) => a.id) } }, data: { status: 'RESOLVED', resolvedAt: new Date() } });
      for (const a of openAlerts) emitToAdmins('alert:updated', { id: a.id, status: 'RESOLVED' });
    }
    emitToAdmins('conversation:closed', { conversationId: conversation.id });

    res.json({ closed: true });
  } catch (err) { next(err); }
}

// ---------------------------------------------------------------------------
// Admin-facing
// ---------------------------------------------------------------------------

export async function adminGetConversationMessages(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const conversation = await prisma.conversation.findUniqueOrThrow({ 
      where: { id: req.params.id as string }, 
      include: { user: { select: { username: true } }, challenge: { select: { titleEn: true } } } 
    });
    const messages = await getConversationMessages(conversation.id);
    res.json({ id: conversation.id, username: conversation.user.username, challengeTitle: conversation.challenge?.titleEn ?? null, status: conversation.status, messages });
  } catch (err) { next(err); }
}

export async function adminPostMessage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { content } = sendMessageSchema.parse(req.body);
    const message = await postMessage(req.params.id as string, req.userId!, content);
    await prisma.alert.updateMany({ where: { conversationId: req.params.id as string, status: 'OPEN' }, data: { status: 'ACKNOWLEDGED' } });
    await prisma.conversation.update({ where: { id: req.params.id as string }, data: { adminId: req.userId!, status: 'OPEN' } });
    res.status(201).json(message);
  } catch (err) { next(err); }
}

export async function adminCloseConversation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const conversation = await prisma.conversation.update({ 
      where: { id: req.params.id as string }, 
      data: { status: 'CLOSED' } 
    });
    await prisma.alert.updateMany({ where: { conversationId: conversation.id, status: { in: ['OPEN', 'ACKNOWLEDGED'] } }, data: { status: 'RESOLVED', resolvedAt: new Date() } });
    emitToAdmins('conversation:closed', { conversationId: conversation.id });
    res.json(conversation);
  } catch (err) { next(err); }
}

/** OPEN conversations with no active struggle alert — proactive
 *  admin-initiated threads and reopened report-reply threads. */
export async function adminGetOpenConversations(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { status: 'OPEN', alerts: { none: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } } } },
      orderBy: { updatedAt: 'desc' },
      include: { user: { select: { username: true } }, admin: { select: { username: true } }, challenge: { select: { titleEn: true } }, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    res.json(conversations.map((c) => ({
      id: c.id, username: c.user.username, challengeTitle: c.challenge?.titleEn ?? null,
      claimedBy: c.admin?.username ?? null, lastMessage: c.messages[0]?.content ?? null, updatedAt: c.updatedAt,
    })));
  } catch (err) { next(err); }
}

/** Admin proactively starts (or continues) a conversation with any user. */
export async function adminMessageUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { message } = adminMessageUserSchema.parse(req.body);
    const targetUserId = req.params.id as string;
    if (targetUserId === req.userId) return res.status(400).json({ error: 'You cannot message yourself.' });

    const conversation = await findOrCreateOpenConversation(targetUserId, { adminId: req.userId! });
    const posted = await postMessage(conversation.id, req.userId!, message);
    res.status(201).json({ conversationId: conversation.id, message: posted });
  } catch (err) { next(err); }
}