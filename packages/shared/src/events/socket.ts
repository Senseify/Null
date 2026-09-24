import { Message, MessageDeliveryStatus } from '../types/message';
import { UserPresence, UserProfile } from '../types/user';
import { FriendRequest } from '../types/friend';
import { Conversation } from '../types/conversation';

export const SOCKET_EVENTS = {
  // Connection & Handshake
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  AUTHENTICATE: 'authenticate',
  AUTHENTICATED: 'authenticated',
  UNAUTHORIZED: 'unauthorized',
  PING: 'ping',
  PONG: 'pong',

  // Presence
  PRESENCE_UPDATE: 'presence:update',
  PRESENCE_REQUEST: 'presence:request',

  // Messaging
  MESSAGE_SEND: 'message:send',
  MESSAGE_NEW: 'message:new',
  MESSAGE_DELIVERED: 'message:delivered',
  MESSAGE_READ: 'message:read',
  MESSAGE_DELETE: 'message:delete',
  MESSAGE_DELETED: 'message:deleted',

  // Typing
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  TYPING_UPDATE: 'typing:update',

  // Friends
  FRIEND_REQUEST_SENT: 'friend:request_sent',
  FRIEND_REQUEST_RECEIVED: 'friend:request_received',
  FRIEND_REQUEST_UPDATED: 'friend:request_updated',
  FRIEND_REMOVED: 'friend:removed',

  // Rooms & Conversations
  CONVERSATION_NEW: 'conversation:new',
  CONVERSATION_UPDATED: 'conversation:updated',
  ROOM_MEMBER_JOINED: 'room:member_joined',
  ROOM_MEMBER_LEFT: 'room:member_left',
} as const;

export interface SocketAuthPayload {
  token: string;
}

export interface SocketMessageSendPayload {
  conversationId: string;
  content: string;
  type?: 'TEXT' | 'FILE' | 'IMAGE';
  attachment?: {
    url: string;
    name: string;
    size: number;
    mimeType: string;
  } | null;
  clientTempId?: string;
}

export interface SocketMessageNewPayload {
  message: Message;
  clientTempId?: string;
}

export interface SocketMessageDeliveredPayload {
  messageId: string;
  conversationId: string;
  userId: string;
  deliveredAt: string;
}

export interface SocketMessageReadPayload {
  conversationId: string;
  messageId?: string;
}

export interface SocketMessageReadReceiptPayload {
  conversationId: string;
  messageId: string;
  userId: string;
  readAt: string;
}

export interface SocketMessageDeletePayload {
  conversationId: string;
  messageId: string;
}

export interface SocketMessageDeletedPayload {
  conversationId: string;
  messageId: string;
  deletedAt: string;
}

export interface SocketTypingPayload {
  conversationId: string;
}

export interface SocketTypingUpdatePayload {
  conversationId: string;
  userId: string;
  username: string;
  isTyping: boolean;
}

export interface SocketPresenceUpdatePayload {
  presence: UserPresence;
}
