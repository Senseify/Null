import { UserProfile } from './user';
import { Message } from './message';

export type ConversationType = 'DIRECT' | 'ROOM';

export type ConversationRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface ConversationMember {
  id: string;
  conversationId: string;
  userId: string;
  role: ConversationRole;
  joinedAt: string;
  lastReadAt: string;
  user?: UserProfile;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  title: string | null;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  members: ConversationMember[];
  lastMessage?: Message | null;
  unreadCount?: number;
  // Computed helper for DIRECT chat partner
  recipient?: UserProfile;
}

export interface CreateRoomDTO {
  title: string;
  description?: string;
  memberUsernames?: string[];
}

export interface UpdateRoomDTO {
  title?: string;
  description?: string;
}

export interface InviteMemberDTO {
  username: string;
}
