import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../config/db';
import {
  adminCreateChallengeSchema,
  adminUpdateChallengeSchema,
  adminLabSchema,
  adminReorderSchema,
} from '../validators/adminChallenge.validator';

function slugify(text: string): string {
  return (
    text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'item'
  );
}

export async function adminGetLabs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const labs = await prisma.lab.findMany({
      orderBy: { orderIndex: 'asc' },
      include: {
        challenges: {
          orderBy: { orderIndex: 'asc' },
          select: { id: true, slug: true, titleEn: true, titleAr: true, difficulty: true, points: true, orderIndex: true },
        },
      },
    });
    res.json(labs);
  } catch (err) { next(err); }
}

export async function adminCreateLab(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = adminLabSchema.parse(req.body);
    const maxOrder = await prisma.lab.aggregate({ _max: { orderIndex: true } });
    const orderIndex = (maxOrder._max.orderIndex ?? -1) + 1;
    const slug = `lab-${orderIndex + 1}-${slugify(data.titleEn)}`;
    const lab = await prisma.lab.create({ data: { slug, titleEn: data.titleEn, titleAr: data.titleAr, orderIndex } });
    res.status(201).json(lab);
  } catch (err) { next(err); }
}

export async function adminUpdateLab(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = adminLabSchema.parse(req.body);
    const lab = await prisma.lab.update({ where: { id: req.params.id as string }, data: { titleEn: data.titleEn, titleAr: data.titleAr } });
    res.json(lab);
  } catch (err) { next(err); }
}

export async function adminGetChallenge(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const challenge = await prisma.challenge.findUniqueOrThrow({
      where: { id: req.params.id as string},
      include: { hints: { orderBy: { order: 'asc' } } },
    });
    res.json(challenge);
  } catch (err) { next(err); }
}

export async function adminCreateChallenge(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = adminCreateChallengeSchema.parse(req.body);

    if (data.schemaJson) {
      try { JSON.parse(data.schemaJson); } catch { return res.status(400).json({ error: 'Schema JSON is not valid JSON.' }); }
    }

    const lab = await prisma.lab.findUniqueOrThrow({ where: { id: data.labId } });
    const maxOrder = await prisma.challenge.aggregate({ where: { labId: data.labId }, _max: { orderIndex: true } });
    const orderIndex = (maxOrder._max.orderIndex ?? -1) + 1;
    const slug = `${lab.slug}-${slugify(data.titleEn)}-${Math.random().toString(36).slice(2, 7)}`;

    const challenge = await prisma.challenge.create({
      data: {
        slug,
        titleEn: data.titleEn,
        titleAr: data.titleAr,
        descriptionEn: data.descriptionEn,
        descriptionAr: data.descriptionAr,
        difficulty: data.difficulty,
        points: data.points,
        orderIndex,
        labId: data.labId,
        schemaJson: data.schemaJson || null,
        referenceAnswer: data.referenceAnswer,
        starterCodes: { create: [{ language: 'SQL', code: '-- write your SQL query here\n' }] },
        hints: {
          create: data.hints.map((h, i) => ({ order: i + 1, contentEn: h.contentEn, contentAr: h.contentAr, pointPenalty: h.pointPenalty })),
        },
      },
    });
    res.status(201).json(challenge);
  } catch (err) { next(err); }
}

export async function adminUpdateChallenge(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = adminUpdateChallengeSchema.parse(req.body);

    if (data.schemaJson) {
      try { JSON.parse(data.schemaJson); } catch { return res.status(400).json({ error: 'Schema JSON is not valid JSON.' }); }
    }

    await prisma.$transaction([
      prisma.hint.deleteMany({ where: { challengeId: req.params.id as string} }),
      prisma.challenge.update({
        where: { id: req.params.id as string },
        data: {
          titleEn: data.titleEn,
          titleAr: data.titleAr,
          descriptionEn: data.descriptionEn,
          descriptionAr: data.descriptionAr,
          difficulty: data.difficulty,
          points: data.points,
          schemaJson: data.schemaJson || null,
          referenceAnswer: data.referenceAnswer,
          hints: {
            create: data.hints.map((h, i) => ({ order: i + 1, contentEn: h.contentEn, contentAr: h.contentAr, pointPenalty: h.pointPenalty })),
          },
        },
      }),
    ]);

    const updated = await prisma.challenge.findUniqueOrThrow({
      where: { id: req.params.id as string },
      include: { hints: { orderBy: { order: 'asc' } } },
    });
    res.json(updated);
  } catch (err) { next(err); }
}

export async function adminDeleteChallenge(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.challenge.delete({ where: { id: req.params.id as string} });
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function adminReorderChallenges(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { challengeIds } = adminReorderSchema.parse(req.body);
    await prisma.$transaction(
      challengeIds.map((id, index) => prisma.challenge.update({ where: { id }, data: { orderIndex: index } }))
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
}