import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../config/db';

export async function adminGetReports(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const reports = await prisma.challengeReport.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true, reason: true, createdAt: true,
        user: { select: { username: true } },
        challenge: { select: { titleEn: true, slug: true } },
      },
    });
    res.json(reports.map((r) => ({
      id: r.id, reason: r.reason, createdAt: r.createdAt,
      username: r.user.username, challengeTitle: r.challenge.titleEn, challengeSlug: r.challenge.slug,
    })));
  } catch (err) { next(err); }
}

export async function adminDeleteReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.challengeReport.delete({ where: { id: req.params.id as string } });
    res.status(204).send();
  } catch (err) { next(err); }
}