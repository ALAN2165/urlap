import { Server as IOServer } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { verifyToken } from '../utils/jwt';
import { prisma } from '../config/db';

let io: IOServer | null = null;

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export function initSocket(server: HttpServer): IOServer {
  io = new IOServer(server, {
    cors: { origin: allowedOrigins, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error('Missing auth token'));

      const { userId } = verifyToken(token);
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, role: true, isBanned: true },
      });
      if (!user || user.isBanned) return next(new Error('Unauthorized'));

      socket.data.userId = user.id;
      socket.data.username = user.username;
      socket.data.role = user.role;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, role, username } = socket.data as { userId: string; role: string; username: string };

    socket.join(`user:${userId}`);
    if (role === 'ADMIN') socket.join('admins');

    console.log(`[socket] ${username} (${role}) connected — socket ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`[socket] ${username} disconnected — socket ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): IOServer {
  if (!io) throw new Error('Socket.io has not been initialized yet — call initSocket(server) first.');
  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  if (!io) {
    console.warn(`[socket] emitToUser('${event}') skipped — Socket.io not initialized yet.`);
    return;
  }
  io.to(`user:${userId}`).emit(event, payload);
}

/** Logs how many admin sockets are actually in the room before emitting —
 *  the single most useful fact for diagnosing "the alert didn't show up":
 *  if this logs 0, the admin dashboard simply isn't connected right now. */
export function emitToAdmins(event: string, payload: unknown): void {
  if (!io) {
    console.warn(`[socket] emitToAdmins('${event}') skipped — Socket.io not initialized yet.`);
    return;
  }
  const roomSize = io.sockets.adapter.rooms.get('admins')?.size ?? 0;
  console.log(`[socket] emitToAdmins('${event}') → ${roomSize} admin connection(s) currently in the room.`);
  io.to('admins').emit(event, payload);
}