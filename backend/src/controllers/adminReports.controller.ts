import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../config/db';
import { emitToUser } from '../realtime/socket';

export async function adminGetReports(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const reports = await prisma.challengeReport.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true, reason: true, createdAt: true,
        user: { select: { username: true } },
        challenge: { select: { titleEn: true, slug: true } },
        _count: { select: { replies: true } },
      },
    });
    res.json(reports.map((r: any) => ({
      id: r.id, reason: r.reason, createdAt: r.createdAt,
      username: r.user.username, challengeTitle: r.challenge.titleEn, challengeSlug: r.challenge.slug,
      replied: r._count?.replies > 0,
    })));
  } catch (err) { next(err); }
}

export async function adminDeleteReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.challengeReport.delete({ where: { id: req.params.id as string } });
    res.status(204).send();
  } catch (err) { next(err); }
}

const replySchema = z.object({ message: z.string().min(1).max(2000) });

export async function adminReplyToReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { message } = replySchema.parse(req.body);
    const report = await prisma.challengeReport.findUniqueOrThrow({
      where: { id: req.params.id as string },
      include: { challenge: { select: { titleEn: true } } },
    });

    const challengeTitle = (report as any).challenge?.titleEn || 'Challenge';

    const inboxMessage = await prisma.inboxMessage.create({
      data: {
        userId: report.userId,
        senderLabel: 'Support Team', // intentionally never the admin's real username
        subject: `Re: your report on "${challengeTitle}"`,
        body: message,
        relatedReportId: report.id,
      },
    });

    emitToUser(report.userId, 'inbox:new', { id: inboxMessage.id, subject: inboxMessage.subject, createdAt: inboxMessage.createdAt });

    res.status(201).json({ message: 'Reply sent.' });
  } catch (err) { next(err); }
}