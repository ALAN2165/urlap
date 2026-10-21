import { prisma } from '../config/db';

export interface ChallengeAccess { hidden: boolean; locked: boolean; isBoss: boolean }
interface OrderedChallenge { id: string; isMaster: boolean }

/**
 * `ordered` = a lab's challenges sorted by orderIndex.
 *  - Regular challenges unlock one after another (masters don't take part in that chain).
 *  - A Master Challenge is HIDDEN until every regular challenge before it is solved.
 */
export function computeAccess(ordered: OrderedChallenge[], solved: Set<string>): Map<string, ChallengeAccess> {
  const regular = ordered.filter((c) => !c.isMaster);
  const map = new Map<string, ChallengeAccess>();

  ordered.forEach((c, i) => {
    if (c.isMaster) {
      const hidden = !ordered.slice(0, i).filter((p) => !p.isMaster).every((p) => solved.has(p.id));
      map.set(c.id, { hidden, locked: false, isBoss: true });
      return;
    }
    const pos = regular.findIndex((r) => r.id === c.id);
    map.set(c.id, { hidden: false, locked: pos > 0 && !solved.has(regular[pos - 1].id), isBoss: false });
  });
  return map;
}

export async function getChallengeAccess(challengeId: string, userId?: string): Promise<ChallengeAccess> {
  const ch = await prisma.challenge.findUniqueOrThrow({ where: { id: challengeId }, select: { labId: true } });
  if (!ch.labId) return { hidden: false, locked: false, isBoss: false };

  const ordered = await prisma.challenge.findMany({
    where: { labId: ch.labId },
    orderBy: { orderIndex: 'asc' },
    select: { id: true, isMaster: true },
  });
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
    prisma.challenge.findMany({ orderBy: [{ labId: 'asc' }, { orderIndex: 'asc' }], select: { id: true, labId: true, isMaster: true } }),
    prisma.challengeCompletion.findMany({ where: { userId }, select: { challengeId: true } }),
  ]);
  const solved = new Set(done.map((d) => d.challengeId));
  const byLab = new Map<string, OrderedChallenge[]>();
  let visible = 0;

  for (const c of all) {
    if (!c.labId) { visible++; continue; }
    const list = byLab.get(c.labId) || [];
    list.push({ id: c.id, isMaster: c.isMaster });
    byLab.set(c.labId, list);
  }
  byLab.forEach((list) => {
    const access = computeAccess(list, solved);
    list.forEach((c) => { if (!(access.get(c.id) as ChallengeAccess).hidden) visible++; });
  });
  return visible;
}