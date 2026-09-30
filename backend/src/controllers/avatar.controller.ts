import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../config/db';

export async function uploadAvatarHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file received.' });

    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: { avatarUrl: dataUri },
      select: {
        id: true, username: true, email: true, avatarUrl: true,
        totalPoints: true, preferredLang: true, showInLeaderboard: true, createdAt: true,
      },
    });
    res.json(updated);
  } catch (err) { next(err); }
}