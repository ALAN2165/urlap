import { prisma } from '../config/db';
import { emitToUser, emitToAdmins } from '../realtime/socket';

const CONSECUTIVE_FAIL_THRESHOLD = 5;
const WINDOW_MINUTES = 15;

const FAILURE_STATUSES = new Set([
  'WRONG_ANSWER', 'RUNTIME_ERROR', 'COMPILE_ERROR', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED',
]);

/** Shared by the real detector AND the admin "Send Test Alert" button — so
 *  a successful test exercises the exact same DB-write + socket-emit path
 *  real struggle detection uses, making it a genuine end-to-end diagnostic. */
export async function raiseStruggleAlert(userId: string, challengeId: string, reason: string, failCount: number): Promise<void> {
  const [user, challenge] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { username: true } }),
    prisma.challenge.findUniqueOrThrow({ where: { id: challengeId }, select: { titleEn: true } }),
  ]);

  let conversation = await prisma.conversation.findFirst({ where: { userId, status: 'OPEN' } });
  if (!conversation) {
    conversation = await prisma.conversation.create({ data: { userId, challengeId, status: 'OPEN' } });
  } else if (conversation.challengeId !== challengeId) {
    conversation = await prisma.conversation.update({ where: { id: conversation.id }, data: { challengeId } });
  }

  const alert = await prisma.alert.create({
    data: { userId, challengeId, conversationId: conversation.id, reason, failCount, status: 'OPEN' },
  });

  console.log(`[alert] Alert ${alert.id} saved for ${user.username} on "${challenge.titleEn}" — emitting to admins.`);

  emitToAdmins('alert:new', {
    id: alert.id, userId, username: user.username, challengeId, challengeTitle: challenge.titleEn,
    conversationId: conversation.id, failCount: alert.failCount, createdAt: alert.createdAt,
  });

  emitToUser(userId, 'support:available', { conversationId: conversation.id, challengeId, challengeTitle: challenge.titleEn });
}

export async function checkForStruggleAlert(userId: string, challengeId: string, latestStatus: string): Promise<void> {
  if (!FAILURE_STATUSES.has(latestStatus)) return;

  console.log(`[alert-check] ${userId} just got ${latestStatus} on challenge ${challengeId} — checking for a struggle pattern...`);

  const existingOpenAlert = await prisma.alert.findFirst({
    where: { userId, challengeId, status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
  });
  if (existingOpenAlert) {
    console.log('[alert-check] An alert is already open for this user+challenge — not duplicating.');
    return;
  }

  const recent = await prisma.submission.findMany({
    where: { userId, challengeId },
    orderBy: { createdAt: 'desc' },
    take: CONSECUTIVE_FAIL_THRESHOLD,
    select: { status: true, createdAt: true },
  });

  if (recent.length < CONSECUTIVE_FAIL_THRESHOLD) {
    console.log(`[alert-check] Only ${recent.length}/${CONSECUTIVE_FAIL_THRESHOLD} submissions on this challenge so far — not enough yet.`);
    return;
  }
  if (recent.some((s) => !FAILURE_STATUSES.has(s.status))) {
    console.log('[alert-check] A success is mixed into the last 5 — streak broken, no alert.');
    return;
  }

  const oldestOfRecent = recent[recent.length - 1].createdAt;
  if (Date.now() - oldestOfRecent.getTime() > WINDOW_MINUTES * 60 * 1000) {
    console.log(`[alert-check] The last ${CONSECUTIVE_FAIL_THRESHOLD} failures span more than ${WINDOW_MINUTES} minutes — not a tight burst.`);
    return;
  }

  console.log('[alert-check] ✅ Struggle pattern confirmed — raising an alert.');
  await raiseStruggleAlert(userId, challengeId, `${CONSECUTIVE_FAIL_THRESHOLD} consecutive failed submissions within ${WINDOW_MINUTES} minutes`, CONSECUTIVE_FAIL_THRESHOLD);
}