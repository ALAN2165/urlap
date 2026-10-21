import { prisma } from '../config/db';

/** The 6th challenge of a lab (index 5) is its hidden Master Challenge. */
export const MASTER_INDEX = 5;

export interface ChallengeAccess { hidden: boolean; locked: boolean; isBoss: boolean }

/** `ordered` = a lab's challenges sorted by orderIndex. Challenges before the master one unlock one by one;
 *  the master one (and anything after it) stays HIDDEN until everything before it is solved. */
export function computeAccess(ordered: { id: string }[], solved: Set<string>): Map<string, ChallengeAccess> {
  const map = new Map<string, ChallengeAccess>();
  ordered.forEach((c, i) => {
    const allPreviousSolved = ordered.slice(0, i).every((p) => solved.has(p.id));
    const hidden = i >= MASTER_INDEX && !allPreviousSolved;
    const locked = !hidden && i > 0 && i < MASTER_INDEX && !solved.has(ordered[i - 1].id);
    map.set(c.id, { hidden, locked, isBoss: i === MASTER_INDEX });
  });
  return map;
}

export async function getChallengeAccess(challengeId: string, userId?: string): Promise<ChallengeAccess> {
  const ch = await prisma.challenge.findUniqueOrThrow({ where: { id: challengeId }, select: { labId: true } });
  if (!ch.labId) return { hidden: false, locked: false, isBoss: false };
  const ordered = await prisma.challenge.findMany({ where: { labId: ch.labId }, orderBy: { orderIndex: 'asc' }, select: { id: true } });
  const done = userId
    ? await prisma.challengeCompletion.findMany({ where: { userId, challengeId: { in: ordered.map((o) => o.id) } }, select: { challengeId: true } })
    : [];
  return computeAccess(ordered, new Set(done.map((d) => d.challengeId))).get(challengeId) as ChallengeAccess;
}

/** True when the challenge is locked OR still hidden (a hidden Master Challenge can't be submitted to). */
export async function isChallengeLocked(challengeId: string, userId?: string): Promise<boolean> {
  const a = await getChallengeAccess(challengeId, userId);
  return a.hidden || a.locked;
}

/** Number of challenges a student can currently see (hidden Master Challenges aren't counted). */
export async function countVisibleChallenges(userId: string): Promise<number> {
  const [all, done] = await Promise.all([
    prisma.challenge.findMany({ orderBy: [{ labId: 'asc' }, { orderIndex: 'asc' }], select: { id: true, labId: true } }),
    prisma.challengeCompletion.findMany({ where: { userId }, select: { challengeId: true } }),
  ]);
  const solved = new Set(done.map((d) => d.challengeId));
  const byLab = new Map<string, { id: string }[]>();
  let visible = 0;
  for (const c of all) {
    if (!c.labId) { visible++; continue; }
    const list = byLab.get(c.labId) || [];
    list.push({ id: c.id });
    byLab.set(c.labId, list);
  }
  byLab.forEach((list) => {
    const access = computeAccess(list, solved);
    list.forEach((c) => { if (!(access.get(c.id) as ChallengeAccess).hidden) visible++; });
  });
  return visible;
}