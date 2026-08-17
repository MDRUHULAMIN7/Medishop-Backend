import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyJwt } from '../utils/jwt';
import { config } from '../config/env';
import { AuthUser } from '../modules/auth/auth.types';

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

  // Socket Middleware: JWT Authenticate Connection
  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const decoded = verifyJwt<AuthUser>(token, config.JWT_ACCESS_SECRET);
      socket.data.user = decoded;
      return next();
    } catch {
      return next(new Error('Invalid or expired socket token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as AuthUser;
    const isAdmin = Boolean(user?.role && user.role !== 'customer');

    if (user?.id) {
      // Auto-join user to their user room
      socket.join(`user:${user.id}`);

      // Auto-join admins to admins room
      if (isAdmin) {
        socket.join('admins');
      }
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
