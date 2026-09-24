import { UserProfile } from './user';

export type FriendRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: FriendRequestStatus;
  createdAt: string;
  updatedAt: string;
  sender?: UserProfile;
  receiver?: UserProfile;
}

export interface Friend {
  id: string; // friendship id
  user: UserProfile;
  since: string;
}

export interface SendFriendRequestDTO {
  targetUsername: string;
}

export interface RespondFriendRequestDTO {
  requestId: string;
  action: 'ACCEPT' | 'REJECT';
}
