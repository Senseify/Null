import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/security';
import { getDatabaseClient } from '@null/database';
import { SOCKET_EVENTS } from '@null/shared';
import { ENV } from '../config/env';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

class SocketManager {
  private io: SocketIOServer | null = null;
  // Map of userId -> Set of socket IDs (to support multiple connected devices)
  private userSockets: Map<string, Set<string>> = new Map();

  initialize(httpServer: HttpServer): SocketIOServer {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: ENV.CORS_ORIGIN,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 20000,
      pingInterval: 10000,
    });

    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
          socket.handshake.query?.token;

        if (!token || typeof token !== 'string') {
          return next(new Error('Authentication token required'));
        }

        const payload = verifyAccessToken(token);
        if (!payload) {
          return next(new Error('Invalid or expired authentication token'));
        }

        socket.userId = payload.userId;
        socket.username = payload.username;
        next();
      } catch (err) {
        next(new Error('Socket authentication failed'));
      }
    });

    this.io.on(SOCKET_EVENTS.CONNECT, (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });

    console.log('[Socket.IO] Manager initialized and listening for connections');
    return this.io;
  }

  private async handleConnection(socket: AuthenticatedSocket) {
    const userId = socket.userId!;
    const username = socket.username!;

    // Track active socket
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socket.id);

    console.log(`[Socket.IO] User connected: @${username} (${userId}) [socket ${socket.id}]`);

    // Join personal user room
    socket.join(`user:${userId}`);

    const db = getDatabaseClient();

    // Mark online in database
    await db.query('UPDATE users SET is_online = TRUE, last_seen_at = CURRENT_TIMESTAMP WHERE id = $1', [userId]);

    // Join all conversation rooms user belongs to
    try {
      const convs = await db.query<{ conversation_id: string }>(
        'SELECT conversation_id FROM conversation_members WHERE user_id = $1',
        [userId]
      );
      for (const row of convs.rows) {
        socket.join(`conv:${row.conversation_id}`);
      }
    } catch (err) {
      console.error('[Socket.IO] Error joining conversation rooms:', err);
    }

    // Broadcast presence ONLINE to all friends
    this.broadcastPresence(userId, 'ONLINE');

    // Ping / Pong for latency measurement
    socket.on(SOCKET_EVENTS.PING, (data: { timestamp: number }) => {
      socket.emit(SOCKET_EVENTS.PONG, {
        clientTimestamp: data.timestamp,
        serverTimestamp: Date.now(),
      });
    });

    // Typing start
    socket.on(SOCKET_EVENTS.TYPING_START, async (data: { conversationId: string }) => {
      if (!data?.conversationId) return;
      socket.join(`conv:${data.conversationId}`);
      const payload = {
        conversationId: data.conversationId,
        userId,
        username,
        isTyping: true,
      };
      socket.to(`conv:${data.conversationId}`).emit(SOCKET_EVENTS.TYPING_UPDATE, payload);

      try {
        const db = getDatabaseClient();
        const membersRes = await db.query<{ user_id: string }>(
          'SELECT user_id FROM conversation_members WHERE conversation_id = $1 AND user_id <> $2',
          [data.conversationId, userId]
        );
        for (const m of membersRes.rows) {
          this.joinConversationRoom(m.user_id, data.conversationId);
          this.io?.to(`user:${m.user_id}`).emit(SOCKET_EVENTS.TYPING_UPDATE, payload);
        }
      } catch (err) {}
    });

    // Typing stop
    socket.on(SOCKET_EVENTS.TYPING_STOP, async (data: { conversationId: string }) => {
      if (!data?.conversationId) return;
      const payload = {
        conversationId: data.conversationId,
        userId,
        username,
        isTyping: false,
      };
      socket.to(`conv:${data.conversationId}`).emit(SOCKET_EVENTS.TYPING_UPDATE, payload);

      try {
        const db = getDatabaseClient();
        const membersRes = await db.query<{ user_id: string }>(
          'SELECT user_id FROM conversation_members WHERE conversation_id = $1 AND user_id <> $2',
          [data.conversationId, userId]
        );
        for (const m of membersRes.rows) {
          this.io?.to(`user:${m.user_id}`).emit(SOCKET_EVENTS.TYPING_UPDATE, payload);
        }
      } catch (err) {}
    });

    // Disconnect handling
    socket.on(SOCKET_EVENTS.DISCONNECT, async (reason) => {
      console.log(`[Socket.IO] User disconnected: @${username} [${reason}]`);

      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(socket.id);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userId);

          // Mark offline in DB if no other connections
          const now = new Date().toISOString();
          await db.query('UPDATE users SET is_online = FALSE, last_seen_at = CURRENT_TIMESTAMP WHERE id = $1', [userId]);

          // Broadcast presence OFFLINE
          this.broadcastPresence(userId, 'OFFLINE', now);
        }
      }
    });
  }

  private async broadcastPresence(userId: string, status: 'ONLINE' | 'OFFLINE', lastSeenAt?: string) {
    try {
      const db = getDatabaseClient();
      const friendsRes = await db.query<{ friend_id: string }>(
        'SELECT friend_id FROM friendships WHERE user_id = $1',
        [userId]
      );

      const timestamp = lastSeenAt || new Date().toISOString();

      for (const row of friendsRes.rows) {
        this.emitToUser(row.friend_id, SOCKET_EVENTS.PRESENCE_UPDATE, {
          presence: {
            userId,
            status,
            lastSeenAt: timestamp,
          },
        });
      }
    } catch (err) {
      console.error('[Socket.IO] Error broadcasting presence:', err);
    }
  }

  emitToUser(userId: string, event: string, data: any) {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit(event, data);
  }

  async emitToConversation(conversationId: string, event: string, data: any) {
    if (!this.io) return;
    this.io.to(`conv:${conversationId}`).emit(event, data);

    try {
      const db = getDatabaseClient();
      const membersRes = await db.query<{ user_id: string }>(
        'SELECT user_id FROM conversation_members WHERE conversation_id = $1',
        [conversationId]
      );
      for (const m of membersRes.rows) {
        this.joinConversationRoom(m.user_id, conversationId);
        this.io.to(`user:${m.user_id}`).emit(event, data);
      }
    } catch (err) {}
  }

  joinConversationRoom(userId: string, conversationId: string) {
    if (!this.io) return;
    const socketIds = this.userSockets.get(userId);
    if (socketIds) {
      for (const socketId of socketIds) {
        const s = this.io.sockets.sockets.get(socketId);
        if (s) {
          s.join(`conv:${conversationId}`);
        }
      }
    }
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && (this.userSockets.get(userId)?.size ?? 0) > 0;
  }

  getOnlineCount(): number {
    return this.userSockets.size;
  }
}

const socketManagerInstance = new SocketManager();

export function getSocketManager(): SocketManager {
  return socketManagerInstance;
}
