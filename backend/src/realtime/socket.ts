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
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  // Every connecting client must present the same JWT issued by the REST
  // login/register endpoints — one auth system, not two.
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

    // Personal room per user — lets us target "this user" (across every
    // tab/device they have open) without tracking raw socket IDs anywhere
    // else in the app. Admins additionally join a shared "admins" room so
    // a broadcast like a new alert reaches every admin on duty at once.
    socket.join(`user:${userId}`);
    if (role === 'ADMIN') {
      socket.join('admins');
    }

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

/** Emits an event to every connection a specific user currently has open. */
export function emitToUser(userId: string, event: string, payload: unknown): void {
  if (!io) return; // never crash a caller just because the socket layer isn't up yet
  io.to(`user:${userId}`).emit(event, payload);
}

/** Emits an event to every currently-connected admin. */
export function emitToAdmins(event: string, payload: unknown): void {
  if (!io) return;
  io.to('admins').emit(event, payload);
}