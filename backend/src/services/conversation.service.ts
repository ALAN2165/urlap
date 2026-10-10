import { prisma } from '../config/db';

interface ConversationOptions { challengeId?: string | null; adminId?: string | null; }

/** Finds the user's current OPEN conversation, or creates one. Shared by
 *  struggle-alert detection, report replies, and proactive admin messaging
 *  so there's exactly one "find-or-open a thread" implementation. */
export async function findOrCreateOpenConversation(userId: string, opts: ConversationOptions = {}) {
  let conversation = await prisma.conversation.findFirst({ where: { userId, status: 'OPEN' } });

  if (!conversation) {
    return prisma.conversation.create({ data: { userId, challengeId: opts.challengeId ?? null, adminId: opts.adminId ?? null } });
  }

  const data: { challengeId?: string | null; adminId?: string } = {};
  if (opts.challengeId !== undefined && opts.challengeId !== conversation.challengeId) data.challengeId = opts.challengeId;
  if (opts.adminId && !conversation.adminId) data.adminId = opts.adminId;

  if (Object.keys(data).length > 0) conversation = await prisma.conversation.update({ where: { id: conversation.id }, data });
  return conversation;
}