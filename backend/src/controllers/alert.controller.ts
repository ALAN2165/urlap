import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../config/db';
import { emitToUser, emitToAdmins } from '../realtime/socket';
import { raiseStruggleAlert } from '../services/alertDetection.service';

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
      id: a.id, userId: a.user.id, username: a.user.username,
      challengeId: a.challenge.id, challengeTitle: a.challenge.titleEn, challengeSlug: a.challenge.slug,
      conversationId: a.conversationId, claimedBy: a.conversation?.admin?.username ?? null,
      reason: a.reason, failCount: a.failCount, status: a.status, createdAt: a.createdAt,
    })));
  } catch (err) { next(err); }
}

export async function adminAcknowledgeAlert(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const alert = await prisma.alert.findUniqueOrThrow({ where: { id: req.params.id as string} });
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
    const updated = await prisma.alert.update({ where: { id: req.params.id as string}, data: { status: 'RESOLVED', resolvedAt: new Date() } });
    emitToAdmins('alert:updated', { id: updated.id, status: updated.status });
    res.json(updated);
  } catch (err) { next(err); }
}

/** End-to-end diagnostic: writes a real Alert row for the calling admin's
 *  own account against any existing challenge, and pushes it over the
 *  socket exactly like a real struggle alert. Lets you confirm the DB and
 *  socket layers both work without needing 5 real failed submissions. */
export async function adminTriggerTestAlert(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const challenge = await prisma.challenge.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!challenge) return res.status(400).json({ error: 'No challenges exist yet to attach a test alert to.' });

    await raiseStruggleAlert(req.userId!, challenge.id, 'Manual test alert — triggered by an admin to verify the pipeline.', 0);
    res.json({ message: 'Test alert raised. Check the alerts list below and your server logs.' });
  } catch (err) { next(err); }
}