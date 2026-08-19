import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyJwt } from '../utils/jwt';
import { config } from '../config/env';
import { AuthUser } from '../modules/auth/auth.types';
import { UserModel } from '../modules/user/user.model';
import { scannerSessionService } from '../modules/pos/scanner/scanner.service';

let io: SocketIOServer | null = null;

const activeChatUsers = new Set<string>();
const activeAdmins = new Set<string>();

export const initSocket = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    },
  });

  // Socket Middleware: JWT for staff/desktop sockets, short-lived scanner token for paired phones.
  io.use(async (socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

    try {
      if (token) {
        const decoded = verifyJwt<AuthUser>(token, config.JWT_ACCESS_SECRET);
        const user: any = await UserModel.findById(decoded.id).select('status role').lean();
        if (!user || user.status === 'blocked') return next(new Error('POS account is unavailable'));
        socket.data.user = { ...decoded, role: user.role || decoded.role };
        return next();
      }

      const scannerSessionId = socket.handshake.auth?.scannerSessionId;
      const scannerToken = socket.handshake.auth?.scannerToken;
      if (!scannerSessionId || !scannerToken) return next(new Error('Authentication token required'));

      const session = await scannerSessionService.authorize(scannerSessionId, scannerToken);
      const user: any = await UserModel.findById(session.posUserId).select('status role').lean();
      if (!user || user.status === 'blocked') return next(new Error('POS account is unavailable'));

      socket.data.user = {
        id: session.posUserId.toString(),
        role: user.role,
        sessionId: `scanner:${session.sessionId}`,
      } as AuthUser;
      socket.data.scannerSession = session;
      socket.data.scannerToken = scannerToken;
      return next();
    } catch {
      return next(new Error('Invalid or expired socket token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as AuthUser;
    const scannerSession = socket.data.scannerSession as { sessionId: string } | undefined;
    const isRemoteScanner = Boolean(scannerSession);
    const isAdmin = Boolean(!isRemoteScanner && user?.role && user.role !== 'customer');

    if (user?.id && !isRemoteScanner) {
      // Auto-join user to their user room
      socket.join(`user:${user.id}`);

      // Auto-join admins to admins room
      if (isAdmin) {
        socket.join('admins');
      }
    }

    socket.on('pos:scanner:join', async (data: { sessionId?: string; role?: 'desktop' | 'phone' }) => {
      const sessionId = data?.sessionId;
      if (!sessionId) return socket.emit('pos:scanner:error', { message: 'Scanner session ID is required' });

      try {
        if (scannerSession) {
          if (scannerSession.sessionId !== sessionId) throw new Error('Scanner session mismatch');
          await scannerSessionService.authorize(sessionId, socket.data.scannerToken);
        } else {
          await scannerSessionService.authorize(sessionId, undefined, user.id);
        }

        socket.join(`pos-scanner:${sessionId}`);
        await scannerSessionService.markConnected(sessionId);
        io?.to(`pos-scanner:${sessionId}`).emit('pos:scanner:connected', {
          sessionId,
          role: data?.role || (scannerSession ? 'phone' : 'desktop'),
        });
      } catch {
        socket.emit('pos:scanner:error', { sessionId, message: 'Unable to join scanner session' });
      }
    });

    socket.on('pos:scanner:captured', async (data: { sessionId?: string }) => {
      const sessionId = data?.sessionId;
      if (!sessionId || !scannerSession || scannerSession.sessionId !== sessionId) return;
      try {
        await scannerSessionService.authorize(sessionId, socket.data.scannerToken);
        await scannerSessionService.touch(sessionId);
        io?.to(`pos-scanner:${sessionId}`).emit('pos:scanner:captured', { sessionId });
      } catch {
        socket.emit('pos:scanner:error', { sessionId, message: 'Scanner session expired' });
      }
    });

    socket.on('pos:scanner:leave', (data: { sessionId?: string }) => {
      const sessionId = data?.sessionId;
      if (!sessionId) return;
      socket.leave(`pos-scanner:${sessionId}`);
      io?.to(`pos-scanner:${sessionId}`).emit('pos:scanner:disconnect', { sessionId });
    });

    // A paired phone may only use scanner events. It must not inherit staff/admin chat rooms.
    if (isRemoteScanner) {
      socket.on('disconnect', () => {
        io?.to(`pos-scanner:${scannerSession!.sessionId}`).emit('pos:scanner:disconnect', {
          sessionId: scannerSession!.sessionId,
        });
      });
      return;
    }

    socket.on('join:admins', () => {
      if (isAdmin) {
        socket.join('admins');
      }
    });

    socket.on('join:user', (userId: string) => {
      if (user?.id === userId || isAdmin) {
        socket.join(`user:${userId}`);
      }
    });

    // Real-time Active / Online presence tracking
    socket.on('chat:join_active', () => {
      if (user?.id) {
        activeChatUsers.add(user.id);
        io?.to('admins').emit('chat:active_users', Array.from(activeChatUsers));
        socket.emit('chat:active_admins', Array.from(activeAdmins));
      }
    });

    socket.on('chat:leave_active', () => {
      if (user?.id) {
        activeChatUsers.delete(user.id);
        io?.to('admins').emit('chat:active_users', Array.from(activeChatUsers));
      }
    });

    socket.on('chat:admin_join', () => {
      if (isAdmin && user?.id) {
        activeAdmins.add(user.id);
        io?.emit('chat:active_admins', Array.from(activeAdmins));
        socket.emit('chat:active_users', Array.from(activeChatUsers));
      }
    });

    socket.on('chat:admin_leave', () => {
      if (isAdmin && user?.id) {
        activeAdmins.delete(user.id);
        io?.emit('chat:active_admins', Array.from(activeAdmins));
      }
    });

    // Real-time typing indicators
    socket.on('chat:typing', (data: { conversationId: string; targetUserId?: string; isTyping?: boolean }) => {
      if (isAdmin && data?.targetUserId) {
        io?.to(`user:${data.targetUserId}`).emit('chat:typing', {
          conversationId: data.conversationId,
          senderRole: 'admin',
          isTyping: true,
        });
      } else {
        io?.to('admins').emit('chat:typing', {
          conversationId: data.conversationId,
          userId: user?.id,
          userName: (user as any)?.name || 'Customer',
          senderRole: 'customer',
          isTyping: true,
        });
      }
    });

    socket.on('chat:stop_typing', (data: { conversationId: string; targetUserId?: string }) => {
      if (isAdmin && data?.targetUserId) {
        io?.to(`user:${data.targetUserId}`).emit('chat:stop_typing', {
          conversationId: data.conversationId,
          senderRole: 'admin',
          isTyping: false,
        });
      } else {
        io?.to('admins').emit('chat:stop_typing', {
          conversationId: data.conversationId,
          userId: user?.id,
          senderRole: 'customer',
          isTyping: false,
        });
      }
    });

    socket.on('disconnect', () => {
      if (user?.id) {
        activeChatUsers.delete(user.id);
        activeAdmins.delete(user.id);
        io?.to('admins').emit('chat:active_users', Array.from(activeChatUsers));
        io?.emit('chat:active_admins', Array.from(activeAdmins));
      }
    });
  });

  return io;
};

export const getIO = (): SocketIOServer | null => {
  return io;
};

export const emitToAdmins = (event: string, data: unknown) => {
  if (io) {
    io.to('admins').emit(event, data);
  }
};

export const emitToUser = (userId: string, event: string, data: unknown) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};
