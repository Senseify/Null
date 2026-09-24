import { UserProfile } from './user';

export type MessageType = 'TEXT' | 'FILE' | 'IMAGE' | 'SYSTEM';

export type MessageDeliveryStatus = 'SENDING' | 'SENT' | 'DELIVERED' | 'READ';

export interface AttachmentMetadata {
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  attachment?: AttachmentMetadata | null;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sender?: UserProfile;
  deliveryStatus?: MessageDeliveryStatus;
  readBy?: string[]; // user IDs who have read this message
}

export interface SendMessageDTO {
  conversationId: string;
  content: string;
  type?: MessageType;
  attachment?: AttachmentMetadata | null;
  clientTempId?: string;
}

export interface DeleteMessageDTO {
  messageId: string;
}
