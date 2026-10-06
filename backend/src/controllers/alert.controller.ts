import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../config/db';
import { emitToUser, emitToAdmins } from '../realtime/socket';

export async function adminGetAlerts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const alerts = await prisma.alert.findMany({
      where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true } },
        challenge: { select: { id: true, titleEn: true, slug: true } },
        conversation: { select: { id: true, adminId: true, admin: { select: { username: true } } } },
      },
    });
    res.json(alerts.map((a) => ({
      id: a.id,
      userId: a.user.id,
      username: a.user.username,
      challengeId: a.challenge.id,
      challengeTitle: a.challenge.titleEn,
      challengeSlug: a.challenge.slug,
      conversationId: a.conversationId,
      claimedBy: a.conversation?.admin?.username ?? null,
      reason: a.reason,
      failCount: a.failCount,
      status: a.status,
      createdAt: a.createdAt,
    })));
  } catch (err) { next(err); }
}

export async function adminAcknowledgeAlert(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const alert = await prisma.alert.findUniqueOrThrow({ where: { id: req.params.id as string } });
    const updated = await prisma.alert.update({ where: { id: alert.id }, data: { status: 'ACKNOWLEDGED' } });

    if (alert.conversationId) {
      await prisma.conversation.update({ where: { id: alert.conversationId }, data: { adminId: req.userId! } });
      emitToUser(alert.userId, 'support:admin-joined', { conversationId: alert.conversationId });
    }

    emitToAdmins('alert:updated', { id: updated.id, status: updated.status });
    res.json(updated);
  } catch (err) { next(err); }
}

export async function adminResolveAlert(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const updated = await prisma.alert.update({
      where: { id: req.params.id as string },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });
    emitToAdmins('alert:updated', { id: updated.id, status: updated.status });
    res.json(updated);
  } catch (err) { next(err); }
}