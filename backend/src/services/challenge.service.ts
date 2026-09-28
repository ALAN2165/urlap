import { prisma } from '../config/db';

export async function isChallengeLocked(challengeId: string, userId?: string): Promise<boolean> {
  const challenge = await prisma.challenge.findUniqueOrThrow({ where: { id: challengeId } });
  if (!challenge.labId) return false;

  const siblings = await prisma.challenge.findMany({
    where: { labId: challenge.labId },
    orderBy: { orderIndex: 'asc' },
    select: { id: true },
  });
  const idx = siblings.findIndex((s) => s.id === challengeId);
  if (idx <= 0) return false;
  if (!userId) return true;

  const prevSolved = await prisma.challengeCompletion.findUnique({
    where: { userId_challengeId: { userId, challengeId: siblings[idx - 1].id } },
  });
  return !prevSolved;
}

export async function listLabs(userId?: string) {
  const labs = await prisma.lab.findMany({
    include: { challenges: { select: { id: true } } },
    orderBy: { orderIndex: 'asc' },
  });

  let solvedIds = new Set<string>();
  if (userId) {
    const completions = await prisma.challengeCompletion.findMany({ where: { userId } });
    solvedIds = new Set(completions.map((c) => c.challengeId));
  }

  return labs.map((lab) => ({
    id: lab.id,
    slug: lab.slug,
    titleEn: lab.titleEn,
    titleAr: lab.titleAr,
    orderIndex: lab.orderIndex,
    totalChallenges: lab.challenges.length,
    solvedChallenges: lab.challenges.filter((c) => solvedIds.has(c.id)).length,
  }));
}

export async function getLabBySlug(slug: string, userId?: string) {
  const lab = await prisma.lab.findUniqueOrThrow({
    where: { slug },
    include: { challenges: { orderBy: { orderIndex: 'asc' } } },
  });

  let solvedIds = new Set<string>();
  if (userId) {
    const completions = await prisma.challengeCompletion.findMany({
      where: { userId, challengeId: { in: lab.challenges.map((c) => c.id) } },
    });
    solvedIds = new Set(completions.map((c) => c.challengeId));
  }

  const challenges = lab.challenges.map((c, i) => ({
    id: c.id,
    slug: c.slug,
    titleEn: c.titleEn,
    titleAr: c.titleAr,
    difficulty: c.difficulty,
    points: c.points,
    orderIndex: c.orderIndex,
    solved: solvedIds.has(c.id),
    locked: i === 0 ? false : !solvedIds.has(lab.challenges[i - 1].id),
  }));

  return { id: lab.id, slug: lab.slug, titleEn: lab.titleEn, titleAr: lab.titleAr, challenges };
}

export async function getChallengeBySlug(slug: string, userId?: string) {
  const challenge = await prisma.challenge.findUniqueOrThrow({
    where: { slug },
    include: {
      lab: true,
      starterCodes: true,
      testCases: { where: { isHidden: false } },
      hints: { select: { id: true, order: true, pointPenalty: true } },
    },
  });

  const locked = await isChallengeLocked(challenge.id, userId);
  return { ...challenge, locked };
}

export async function revealHint(userId: string, hintId: string) {
  const hint = await prisma.hint.findUniqueOrThrow({ where: { id: hintId } });
  const locked = await isChallengeLocked(hint.challengeId, userId);
  if (locked) {
    const err: any = new Error('This challenge is locked — solve the previous one first.');
    err.status = 403;
    throw err;
  }
  await prisma.hintUsage.upsert({
    where: { userId_hintId: { userId, hintId } },
    create: { userId, hintId },
    update: {},
  });
  return hint;
}