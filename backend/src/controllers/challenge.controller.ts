import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../config/db';
import { computeAccess, getChallengeAccess } from '../services/labProgress.service';
import { testSqlQuery } from '../services/sqlGrader.service';

const SAFE_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

async function solvedSet(userId: string): Promise<Set<string>> {
  const rows = await prisma.challengeCompletion.findMany({ where: { userId }, select: { challengeId: true } });
  return new Set(rows.map((r) => r.challengeId));
}

export async function getLabs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const labs = await prisma.lab.findMany({
      orderBy: { orderIndex: 'asc' },
      include: { challenges: { orderBy: { orderIndex: 'asc' }, select: { id: true, isMaster: true } } },
    });
    const solved = await solvedSet(req.userId!);

    res.json(labs.map((lab) => {
      const access = computeAccess(lab.challenges, solved);
      const visible = lab.challenges.filter((c) => !(access.get(c.id)!).hidden);
      return {
        id: lab.id, slug: lab.slug, titleEn: lab.titleEn, titleAr: lab.titleAr, orderIndex: lab.orderIndex,
        totalChallenges: visible.length,
        solvedChallenges: visible.filter((c) => solved.has(c.id)).length,
      };
    }));
  } catch (err) { next(err); }
}

export async function getLab(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const lab = await prisma.lab.findUniqueOrThrow({
      where: { slug: req.params.slug as string },
      include: {
        challenges: {
          orderBy: { orderIndex: 'asc' },
          select: { id: true, slug: true, titleEn: true, titleAr: true, difficulty: true, points: true, orderIndex: true, isMaster: true },
        },
      },
    });
    const solved = await solvedSet(req.userId!);
    const access = computeAccess(lab.challenges, solved);

    const challenges = lab.challenges
      .filter((c) => !(access.get(c.id)!).hidden)
      .map(({ isMaster, ...c }) => ({ ...c, solved: solved.has(c.id), locked: access.get(c.id)!.locked, isBoss: access.get(c.id)!.isBoss }));

    res.json({ id: lab.id, slug: lab.slug, titleEn: lab.titleEn, titleAr: lab.titleAr, challenges });
  } catch (err) { next(err); }
}

export async function getChallenge(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const challenge = await prisma.challenge.findUniqueOrThrow({
      where: { slug: req.params.slug as string },
      include: { starterCodes: true, hints: { orderBy: { order: 'asc' } } },
    });

    const access = await getChallengeAccess(challenge.id, req.userId);
    if (access.hidden) return res.status(404).json({ error: 'Challenge not found.' });

    if (access.locked) {
      return res.json({
        id: challenge.id, slug: challenge.slug, titleEn: challenge.titleEn, titleAr: challenge.titleAr,
        descriptionEn: '', descriptionAr: '', difficulty: challenge.difficulty, points: challenge.points,
        schemaJson: null, starterCodes: [], hints: [], locked: true, isBoss: false,
      });
    }

    const usages = await prisma.hintUsage.findMany({
      where: { userId: req.userId!, hintId: { in: challenge.hints.map((h) => h.id) } },
      select: { hintId: true },
    });
    const revealedIds = new Set(usages.map((u) => u.hintId));

    // SECURITY: the answer and the hidden fixture SQL must never reach the browser.
    const { referenceAnswer, verificationQuery, setupSql, isMaster, hints, starterCodes, ...safeChallenge } = challenge;

    res.json({
      ...safeChallenge,
      starterCodes,
      hints: hints.map((h) =>
        revealedIds.has(h.id)
          ? { id: h.id, order: h.order, pointPenalty: h.pointPenalty, revealed: true, contentEn: h.contentEn, contentAr: h.contentAr }
          : { id: h.id, order: h.order, pointPenalty: h.pointPenalty, revealed: false }
      ),
      locked: false,
      isBoss: access.isBoss,
    });
  } catch (err) { next(err); }
}

export async function revealHint(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const hint = await prisma.hint.findUniqueOrThrow({ where: { id: req.params.hintId as string } });
    const access = await getChallengeAccess(hint.challengeId, req.userId);
    if (access.hidden || access.locked) return res.status(403).json({ error: 'This challenge is locked.' });

    await prisma.hintUsage.upsert({
      where: { userId_hintId: { userId: req.userId!, hintId: hint.id } },
      update: {},
      create: { userId: req.userId!, hintId: hint.id },
    });

    res.json({ id: hint.id, order: hint.order, pointPenalty: hint.pointPenalty, contentEn: hint.contentEn, contentAr: hint.contentAr });
  } catch (err) { next(err); }
}

export async function getChallengeSampleData(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const challenge = await prisma.challenge.findUniqueOrThrow({ where: { slug: req.params.slug as string } });
    const access = await getChallengeAccess(challenge.id, req.userId);
    if (access.hidden || access.locked) return res.status(403).json({ error: 'This challenge is locked.' });
    if (!challenge.schemaJson) return res.json({ tables: [] });

    let schema: { tables: { name: string; columns: { name: string }[] }[] };
    try { schema = JSON.parse(challenge.schemaJson); } catch { return res.json({ tables: [] }); }

    const results = [];
    for (const table of schema.tables || []) {
      if (!SAFE_IDENTIFIER.test(table.name)) continue;
      const result = await testSqlQuery(`SELECT * FROM ${table.name} LIMIT 5`, challenge.setupSql);
      // A table the student is supposed to CREATE doesn't exist yet: show its columns, not an error.
      const notCreatedYet = !result.ok && /doesn't exist/i.test(result.message);
      results.push({
        name: table.name,
        columns: result.ok ? result.columns : table.columns.map((c) => c.name),
        rows: result.ok ? result.rows : [],
        error: result.ok || notCreatedYet ? null : result.message,
      });
    }
    res.json({ tables: results });
  } catch (err) { next(err); }
}