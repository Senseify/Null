export type PresenceStatus = 'ONLINE' | 'IDLE' | 'OFFLINE';

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  statusMessage: string | null;
  isOnline: boolean;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  statusMessage: string | null;
  isOnline: boolean;
  presenceStatus: PresenceStatus;
  lastSeenAt: string;
  createdAt: string;
}

export interface UserPresence {
  userId: string;
  status: PresenceStatus;
  lastSeenAt: string;
}
