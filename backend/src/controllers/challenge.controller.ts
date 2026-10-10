import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../config/db';
import { isChallengeLocked } from '../services/challenge.service';
import { testSqlQuery } from '../services/sqlGrader.service';

const SAFE_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export async function getLabs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const labs = await prisma.lab.findMany({
      orderBy: { orderIndex: 'asc' },
      include: { challenges: { select: { id: true } } },
    });
    const completions = await prisma.challengeCompletion.findMany({
      where: { userId: req.userId! },
      select: { challengeId: true },
    });
    const solved = new Set(completions.map((c) => c.challengeId));

    res.json(
      labs.map((lab) => ({
        id: lab.id,
        slug: lab.slug,
        titleEn: lab.titleEn,
        titleAr: lab.titleAr,
        orderIndex: lab.orderIndex,
        totalChallenges: lab.challenges.length,
        solvedChallenges: lab.challenges.filter((c) => solved.has(c.id)).length,
      }))
    );
  } catch (err) { next(err); }
}

export async function getLab(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const lab = await prisma.lab.findUniqueOrThrow({
      where: { slug: req.params.slug as string },
      include: {
        challenges: {
          orderBy: { orderIndex: 'asc' },
          select: { id: true, slug: true, titleEn: true, titleAr: true, difficulty: true, points: true, orderIndex: true },
        },
      },
    });

    const completions = await prisma.challengeCompletion.findMany({
      where: { userId: req.userId!, challengeId: { in: lab.challenges.map((c) => c.id) } },
      select: { challengeId: true },
    });
    const solved = new Set(completions.map((c) => c.challengeId));

    const challenges = lab.challenges.map((c, i) => ({
      ...c,
      solved: solved.has(c.id),
      locked: i > 0 && !solved.has(lab.challenges[i - 1].id),
    }));

    res.json({ id: lab.id, slug: lab.slug, titleEn: lab.titleEn, titleAr: lab.titleAr, challenges });
  } catch (err) { next(err); }
}

export async function getChallenge(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const challenge = await prisma.challenge.findUniqueOrThrow({
      where: { slug: req.params.slug as string },
      include: { starterCodes: true, hints: { orderBy: { order: 'asc' } } },
    });

    const locked = await isChallengeLocked(challenge.id, req.userId);
    if (locked) {
      // A locked challenge never leaks its description, schema, hints or code.
      return res.json({
        id: challenge.id,
        slug: challenge.slug,
        titleEn: challenge.titleEn,
        titleAr: challenge.titleAr,
        descriptionEn: '',
        descriptionAr: '',
        difficulty: challenge.difficulty,
        points: challenge.points,
        schemaJson: null,
        starterCodes: [],
        hints: [],
        locked: true,
      });
    }

    const usages = await prisma.hintUsage.findMany({
      where: { userId: req.userId!, hintId: { in: challenge.hints.map((h) => h.id) } },
      select: { hintId: true },
    });
    const revealedIds = new Set(usages.map((u) => u.hintId));

    // SECURITY: the answer and the DML verification query must never reach the browser.
    // (The intersection type keeps this compiling even before the verificationQuery migration.)
    const { referenceAnswer, verificationQuery, hints, starterCodes, ...safeChallenge } =
      challenge as typeof challenge & { verificationQuery?: string | null };

    res.json({
      ...safeChallenge,
      starterCodes,
      hints: hints.map((h) =>
        revealedIds.has(h.id)
          ? { id: h.id, order: h.order, pointPenalty: h.pointPenalty, revealed: true, contentEn: h.contentEn, contentAr: h.contentAr }
          : { id: h.id, order: h.order, pointPenalty: h.pointPenalty, revealed: false }
      ),
      locked: false,
    });
  } catch (err) { next(err); }
}

export async function revealHint(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const hint = await prisma.hint.findUniqueOrThrow({ where: { id: req.params.hintId as string } });

    const locked = await isChallengeLocked(hint.challengeId, req.userId);
    if (locked) return res.status(403).json({ error: 'This challenge is locked.' });

    await prisma.hintUsage.upsert({
      where: { userId_hintId: { userId: req.userId!, hintId: hint.id } },
      update: {},
      create: { userId: req.userId!, hintId: hint.id },
    });

    res.json({
      id: hint.id,
      order: hint.order,
      pointPenalty: hint.pointPenalty,
      contentEn: hint.contentEn,
      contentAr: hint.contentAr,
    });
  } catch (err) { next(err); }
}

export async function getChallengeSampleData(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const challenge = await prisma.challenge.findUniqueOrThrow({ where: { slug: req.params.slug as string } });

    const locked = await isChallengeLocked(challenge.id, req.userId);
    if (locked) return res.status(403).json({ error: 'This challenge is locked.' });
    if (!challenge.schemaJson) return res.json({ tables: [] });

    let schema: { tables: { name: string; columns: { name: string }[] }[] };
    try { schema = JSON.parse(challenge.schemaJson); } catch { return res.json({ tables: [] }); }

    const results = [];
    for (const table of schema.tables ?? []) {
      if (!SAFE_IDENTIFIER.test(table.name)) continue; // table names come from admin-authored JSON
      const result = await testSqlQuery(`SELECT * FROM ${table.name} LIMIT 5`);
      results.push({
        name: table.name,
        columns: result.ok ? result.columns : table.columns.map((c) => c.name),
        rows: result.ok ? result.rows : [],
        error: result.ok ? null : result.message,
      });
    }
    res.json({ tables: results });
  } catch (err) { next(err); }
}