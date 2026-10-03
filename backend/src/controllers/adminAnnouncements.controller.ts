import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../config/db';
import { enqueueAnnouncementEmail } from '../queues/announcementEmailQueue';

const announcementSchema = z.object({
  titleEn: z.string().min(1),
  titleAr: z.string().min(1),
  contentEn: z.string().min(1),
  contentAr: z.string().min(1),
  type: z.enum(['INFO', 'NEW_LAB', 'FEATURE', 'MAINTENANCE']),
});

export async function adminGetAnnouncements(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(announcements);
  } catch (err) { next(err); }
}

export async function adminCreateAnnouncement(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = announcementSchema.parse(req.body);
    const announcement = await prisma.announcement.create({ data });

    // Queue emails (not send synchronously) so this request stays fast
    // regardless of how many users are opted in.
    const recipients = await prisma.user.findMany({
      where: { receiveAnnouncementEmails: true, isBanned: false },
      select: { email: true, username: true, preferredLang: true },
    });
    for (const r of recipients) {
      const locale: 'en' | 'ar' = r.preferredLang === 'ar' ? 'ar' : 'en';
      await enqueueAnnouncementEmail({
        to: r.email,
        username: r.username,
        locale,
        title: locale === 'ar' ? announcement.titleAr : announcement.titleEn,
        content: locale === 'ar' ? announcement.contentAr : announcement.contentEn,
        type: announcement.type,
      });
    }

    res.status(201).json(announcement);
  } catch (err) { next(err); }
}

export async function adminUpdateAnnouncement(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = announcementSchema.parse(req.body);
    const announcement = await prisma.announcement.update({ where: { id: req.params.id }, data });
    res.json(announcement);
  } catch (err) { next(err); }
}

export async function adminDeleteAnnouncement(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.announcement.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) { next(err); }
}