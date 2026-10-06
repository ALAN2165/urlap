import { prisma } from '../config/db';
import { emitToUser, emitToAdmins } from '../realtime/socket';

export async function getConversationMessages(conversationId: string) {
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    include: { sender: { select: { id: true, username: true, role: true } } },
  });
}

export async function postMessage(conversationId: string, senderId: string, content: string) {
  const conversation = await prisma.conversation.findUniqueOrThrow({ where: { id: conversationId } });

  const message = await prisma.message.create({
    data: { conversationId, senderId, content },
    include: { sender: { select: { id: true, username: true, role: true } } },
  });

  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

  const payload = {
    id: message.id,
    conversationId,
    content: message.content,
    createdAt: message.createdAt,
    sender: message.sender,
  };

  // Route to whichever side didn't just send it. A claimed admin is also a
  // member of the 'admins' room, so this correctly reaches them too — no
  // need to additionally target them by personal room.
  if (message.sender.role === 'ADMIN') {
    emitToUser(conversation.userId, 'message:new', payload);
  } else {
    emitToAdmins('message:new', payload);
  }

  return payload;
}