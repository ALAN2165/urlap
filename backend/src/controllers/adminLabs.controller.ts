import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../config/db';

const reorderSchema = z.object({ labIds: z.array(z.string()).min(1) });

export async function adminReorderLabs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { labIds } = reorderSchema.parse(req.body);
    const existing = await prisma.lab.findMany({ select: { id: true } });
    const complete = existing.length === labIds.length && new Set(labIds).size === labIds.length && existing.every((l) => labIds.indexOf(l.id) !== -1);
    if (!complete) return res.status(400).json({ error: 'The new order must list every lab exactly once.' });

    await prisma.$transaction(labIds.map((id, index) => prisma.lab.update({ where: { id }, data: { orderIndex: index } })));
    res.json({ ok: true });
  } catch (err) { next(err); }
}