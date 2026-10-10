import { prisma } from '../config/db';
import { emitToUser, emitToAdmins } from '../realtime/socket';
import { findOrCreateOpenConversation } from './conversation.service';

const CONSECUTIVE_FAIL_THRESHOLD = 5;
const WINDOW_MINUTES = 15;
const FAILURE_STATUSES = new Set(['WRONG_ANSWER', 'RUNTIME_ERROR', 'COMPILE_ERROR', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED']);

export async function raiseStruggleAlert(userId: string, challengeId: string, reason: string, failCount: number): Promise<void> {
  const [user, challenge] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { username: true } }),
    prisma.challenge.findUniqueOrThrow({ where: { id: challengeId }, select: { titleEn: true } }),
  ]);

  const conversation = await findOrCreateOpenConversation(userId, { challengeId });

  const alert = await prisma.alert.create({ data: { userId, challengeId, conversationId: conversation.id, reason, failCount, status: 'OPEN' } });
  console.log(`[alert] Alert ${alert.id} saved for ${user.username} on "${challenge.titleEn}" — emitting to admins.`);

  emitToAdmins('alert:new', { id: alert.id, userId, username: user.username, challengeId, challengeTitle: challenge.titleEn, conversationId: conversation.id, failCount: alert.failCount, createdAt: alert.createdAt });
  emitToUser(userId, 'support:available', { conversationId: conversation.id, challengeId, challengeTitle: challenge.titleEn });
}

export async function checkForStruggleAlert(userId: string, challengeId: string, latestStatus: string): Promise<void> {
  if (!FAILURE_STATUSES.has(latestStatus)) return;

  const existingOpenAlert = await prisma.alert.findFirst({ where: { userId, challengeId, status: { in: ['OPEN', 'ACKNOWLEDGED'] } } });
  if (existingOpenAlert) return;

  const recent = await prisma.submission.findMany({ where: { userId, challengeId }, orderBy: { createdAt: 'desc' }, take: CONSECUTIVE_FAIL_THRESHOLD, select: { status: true, createdAt: true } });
  if (recent.length < CONSECUTIVE_FAIL_THRESHOLD) return;
  if (recent.some((s) => !FAILURE_STATUSES.has(s.status))) return;

  const oldestOfRecent = recent[recent.length - 1].createdAt;
  if (Date.now() - oldestOfRecent.getTime() > WINDOW_MINUTES * 60 * 1000) return;

  await raiseStruggleAlert(userId, challengeId, `${CONSECUTIVE_FAIL_THRESHOLD} consecutive failed submissions within ${WINDOW_MINUTES} minutes`, CONSECUTIVE_FAIL_THRESHOLD);
}