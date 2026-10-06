import { prisma } from '../config/db';
import { emitToUser, emitToAdmins } from '../realtime/socket';

const CONSECUTIVE_FAIL_THRESHOLD = 5;
const WINDOW_MINUTES = 15;

const FAILURE_STATUSES = new Set([
  'WRONG_ANSWER',
  'RUNTIME_ERROR',
  'COMPILE_ERROR',
  'TIME_LIMIT_EXCEEDED',
  'MEMORY_LIMIT_EXCEEDED',
]);

/**
 * Called right after a submission's final status is persisted. Looks at
 * this user's last N submissions for this exact challenge; if the most
 * recent CONSECUTIVE_FAIL_THRESHOLD are all failures (no ACCEPTED among
 * them) and they all happened within WINDOW_MINUTES of each other, raises
 * an Alert — unless one is already open for this user+challenge, so a
 * single struggle session doesn't spam a new alert on every retry after
 * the 5th.
 */
export async function checkForStruggleAlert(userId: string, challengeId: string, latestStatus: string): Promise<void> {
  if (!FAILURE_STATUSES.has(latestStatus)) return; // only worth re-checking right after a fresh failure

  const existingOpenAlert = await prisma.alert.findFirst({
    where: { userId, challengeId, status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
  });
  if (existingOpenAlert) return;

  const recent = await prisma.submission.findMany({
    where: { userId, challengeId },
    orderBy: { createdAt: 'desc' },
    take: CONSECUTIVE_FAIL_THRESHOLD,
    select: { status: true, createdAt: true },
  });

  if (recent.length < CONSECUTIVE_FAIL_THRESHOLD) return;
  if (recent.some((s) => !FAILURE_STATUSES.has(s.status))) return; // an ACCEPTED anywhere in there breaks the streak

  const oldestOfRecent = recent[recent.length - 1].createdAt;
  const windowMs = WINDOW_MINUTES * 60 * 1000;
  if (Date.now() - oldestOfRecent.getTime() > windowMs) return; // spread too far apart — not a tight struggle burst

  const [user, challenge] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { username: true } }),
    prisma.challenge.findUniqueOrThrow({ where: { id: challengeId }, select: { titleEn: true } }),
  ]);

  // Reuse an existing open conversation with this user if one exists
  // (e.g. carried over from an earlier struggle still being discussed),
  // otherwise start a fresh one.
  let conversation = await prisma.conversation.findFirst({ where: { userId, status: 'OPEN' } });
  if (!conversation) {
    conversation = await prisma.conversation.create({ data: { userId, challengeId, status: 'OPEN' } });
  } else if (conversation.challengeId !== challengeId) {
    conversation = await prisma.conversation.update({ where: { id: conversation.id }, data: { challengeId } });
  }

  const alert = await prisma.alert.create({
    data: {
      userId,
      challengeId,
      conversationId: conversation.id,
      reason: `${CONSECUTIVE_FAIL_THRESHOLD} consecutive failed submissions within ${WINDOW_MINUTES} minutes`,
      failCount: CONSECUTIVE_FAIL_THRESHOLD,
      status: 'OPEN',
    },
  });

  console.log(`[alert] Struggle alert raised for ${user.username} on "${challenge.titleEn}" (${alert.id})`);

  emitToAdmins('alert:new', {
    id: alert.id,
    userId,
    username: user.username,
    challengeId,
    challengeTitle: challenge.titleEn,
    conversationId: conversation.id,
    failCount: alert.failCount,
    createdAt: alert.createdAt,
  });

  // Lets the frontend proactively offer help before an admin has even
  // opened the chat. The toast UI and chat modal that consume this event
  // are built in a later step — this just fires it.
  emitToUser(userId, 'support:available', {
    conversationId: conversation.id,
    challengeId,
    challengeTitle: challenge.titleEn,
  });
}