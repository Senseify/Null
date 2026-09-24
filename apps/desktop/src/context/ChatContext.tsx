import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  Conversation,
  Message,
  Friend,
  FriendRequest,
  UserPresence,
  SOCKET_EVENTS,
  SocketTypingUpdatePayload,
} from '@null/shared';
import { ApiClient } from '../api/client';
import { socketService } from '../services/socket.service';
import { useAuth } from './AuthContext';

interface ChatContextType {
  conversations: Conversation[];
  activeConversationId: string | null;
  activeConversation: Conversation | null;
  messages: Message[];
  friends: Friend[];
  friendRequests: { incoming: FriendRequest[]; outgoing: FriendRequest[] };
  typingUsers: string[];
  activeTab: 'chats' | 'friends' | 'rooms' | 'settings';
  isContextDrawerOpen: boolean;
  searchQuery: string;
  isFetchingMessages: boolean;

  setActiveTab: (tab: 'chats' | 'friends' | 'rooms' | 'settings') => void;
  setSearchQuery: (query: string) => void;
  toggleContextDrawer: () => void;
  selectConversation: (conversationId: string | null) => Promise<void>;
  sendMessage: (content: string, attachment?: any) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  loadFriends: () => Promise<void>;
  loadFriendRequests: () => Promise<void>;
  sendFriendRequest: (username: string) => Promise<void>;
  respondFriendRequest: (requestId: string, action: 'ACCEPT' | 'REJECT') => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  startDirectChat: (targetUserId: string) => Promise<void>;
  createRoom: (title: string, description?: string, memberUsernames?: string[]) => Promise<void>;
  inviteToRoom: (conversationId: string, username: string) => Promise<void>;
  leaveRoom: (conversationId: string) => Promise<void>;
  sendTyping: (isTyping: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({});
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>({
    incoming: [],
    outgoing: [],
  });
  const [typingMap, setTypingMap] = useState<Record<string, Set<string>>>({});
  const [activeTab, setActiveTab] = useState<'chats' | 'friends' | 'rooms' | 'settings'>('chats');
  const [isContextDrawerOpen, setIsContextDrawerOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFetchingMessages, setIsFetchingMessages] = useState<boolean>(false);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;
  const currentMessages = activeConversationId ? messagesMap[activeConversationId] || [] : [];
  const currentTypingUsers = activeConversationId && typingMap[activeConversationId]
    ? Array.from(typingMap[activeConversationId])
    : [];

  // Fetch conversations
  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const list = await ApiClient.get<Conversation[]>('/api/conversations');
      setConversations(list);
    } catch (err) {
      console.error('[ChatContext] Failed to load conversations:', err);
    }
  }, [user]);

  // Fetch friends
  const loadFriends = useCallback(async () => {
    if (!user) return;
    try {
      const list = await ApiClient.get<Friend[]>('/api/friends/list');
      setFriends(list);
    } catch (err) {
      console.error('[ChatContext] Failed to load friends:', err);
    }
  }, [user]);

  // Fetch friend requests
  const loadFriendRequests = useCallback(async () => {
    if (!user) return;
    try {
      const data = await ApiClient.get<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>(
        '/api/friends/requests'
      );
      setFriendRequests(data);
    } catch (err) {
      console.error('[ChatContext] Failed to load friend requests:', err);
    }
  }, [user]);

  // Select conversation & load its messages
  const selectConversation = async (conversationId: string | null) => {
    setActiveConversationId(conversationId);
    if (!conversationId) return;

    // Reset unread count locally
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
    );

    setIsFetchingMessages(true);
    try {
      const msgList = await ApiClient.get<Message[]>(`/api/messages?conversationId=${conversationId}`);
      setMessagesMap((prev) => ({
        ...prev,
        [conversationId]: msgList,
      }));

      // Mark conversation as read on server
      await ApiClient.post(`/api/messages/read/${conversationId}`);
    } catch (err) {
      console.error('[ChatContext] Failed to load messages:', err);
    } finally {
      setIsFetchingMessages(false);
    }
  };

  // Send message
  const sendMessage = async (content: string, attachment?: any) => {
    if (!activeConversationId || (!content.trim() && !attachment)) return;

    try {
      const newMsg = await ApiClient.post<Message>('/api/messages', {
        conversationId: activeConversationId,
        content: content.trim(),
        type: attachment ? (attachment.isImage ? 'IMAGE' : 'FILE') : 'TEXT',
        attachment: attachment
          ? {
              url: attachment.url,
              name: attachment.name,
              size: attachment.size,
              mimeType: attachment.mimeType,
            }
          : null,
      });

      // Update message list
      setMessagesMap((prev) => {
        const existing = prev[activeConversationId] || [];
        if (existing.some((m) => m.id === newMsg.id)) return prev;
        return {
          ...prev,
          [activeConversationId]: [...existing, newMsg],
        };
      });

      // Update conversation snippet
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? { ...c, lastMessage: newMsg, updatedAt: newMsg.createdAt }
            : c
        )
      );
    } catch (err) {
      console.error('[ChatContext] Failed to send message:', err);
      throw err;
    }
  };

  // Delete message
  const deleteMessage = async (messageId: string) => {
    try {
      await ApiClient.delete(`/api/messages/${messageId}`);
      if (activeConversationId) {
        setMessagesMap((prev) => {
          const list = prev[activeConversationId] || [];
          return {
            ...prev,
            [activeConversationId]: list.map((m) =>
              m.id === messageId
                ? { ...m, isDeleted: true, content: 'This message was deleted', attachment: null }
                : m
            ),
          };
        });
      }
    } catch (err) {
      console.error('[ChatContext] Failed to delete message:', err);
    }
  };

  // Friend actions
  const sendFriendRequest = async (targetUsername: string) => {
    await ApiClient.post('/api/friends/request', { targetUsername });
    await loadFriendRequests();
  };

  const respondFriendRequest = async (requestId: string, action: 'ACCEPT' | 'REJECT') => {
    await ApiClient.post('/api/friends/respond', { requestId, action });
    await loadFriendRequests();
    await loadFriends();
    await loadConversations();
  };

  const removeFriend = async (friendId: string) => {
    await ApiClient.delete(`/api/friends/${friendId}`);
    await loadFriends();
    await loadConversations();
  };

  const startDirectChat = async (targetUserId: string) => {
    const conv = await ApiClient.post<Conversation>('/api/conversations/direct', { targetUserId });
    await loadConversations();
    setActiveTab('chats');
    await selectConversation(conv.id);
  };

  const createRoom = async (title: string, description?: string, memberUsernames?: string[]) => {
    const room = await ApiClient.post<Conversation>('/api/conversations/rooms', {
      title,
      description,
      memberUsernames,
    });
    await loadConversations();
    setActiveTab('chats');
    await selectConversation(room.id);
  };

  const inviteToRoom = async (conversationId: string, username: string) => {
    await ApiClient.post(`/api/conversations/${conversationId}/invite`, { username });
    await loadConversations();
    if (activeConversationId === conversationId) {
      const updated = await ApiClient.get<Conversation>(`/api/conversations/${conversationId}`);
      setConversations((prev) => prev.map((c) => (c.id === conversationId ? updated : c)));
    }
  };

  const leaveRoom = async (conversationId: string) => {
    await ApiClient.post(`/api/conversations/${conversationId}/leave`);
    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
    }
    await loadConversations();
  };

  const sendTyping = (isTyping: boolean) => {
    if (!activeConversationId) return;
    if (isTyping) {
      socketService.sendTypingStart(activeConversationId);
    } else {
      socketService.sendTypingStop(activeConversationId);
    }
  };

  const toggleContextDrawer = () => {
    setIsContextDrawerOpen((prev) => !prev);
  };

  // Socket event listeners
  useEffect(() => {
    if (!user) return;

    loadConversations();
    loadFriends();
    loadFriendRequests();

    // Listen for new messages
    const unsubMsg = socketService.on(SOCKET_EVENTS.MESSAGE_NEW, (data: { message: Message }) => {
      const msg = data.message;

      setMessagesMap((prev) => {
        const list = prev[msg.conversationId] || [];
        if (list.some((m) => m.id === msg.id)) return prev;
        return {
          ...prev,
          [msg.conversationId]: [...list, msg],
        };
      });

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === msg.conversationId) {
            const isCurrent = activeConversationId === msg.conversationId;
            return {
              ...c,
              lastMessage: msg,
              updatedAt: msg.createdAt,
              unreadCount: isCurrent ? 0 : (c.unreadCount || 0) + 1,
            };
          }
          return c;
        })
      );

      // If viewing active conversation, immediately mark read
      if (activeConversationId === msg.conversationId && msg.senderId !== user.id) {
        ApiClient.post(`/api/messages/read/${activeConversationId}`);
      }
    });

    // Listen for message deletion
    const unsubDelete = socketService.on(
      SOCKET_EVENTS.MESSAGE_DELETED,
      (data: { conversationId: string; messageId: string }) => {
        setMessagesMap((prev) => {
          const list = prev[data.conversationId] || [];
          return {
            ...prev,
            [data.conversationId]: list.map((m) =>
              m.id === data.messageId
                ? { ...m, isDeleted: true, content: 'This message was deleted', attachment: null }
                : m
            ),
          };
        });
      }
    );

    // Listen for typing updates
    const unsubTyping = socketService.on(
      SOCKET_EVENTS.TYPING_UPDATE,
      (data: SocketTypingUpdatePayload) => {
        if (data.userId === user.id) return;

        setTypingMap((prev) => {
          const currentSet = new Set(prev[data.conversationId] || []);
          if (data.isTyping) {
            currentSet.add(data.username);
          } else {
            currentSet.delete(data.username);
          }
          return {
            ...prev,
            [data.conversationId]: currentSet,
          };
        });
      }
    );

    // Listen for presence updates
    const unsubPresence = socketService.on(
      SOCKET_EVENTS.PRESENCE_UPDATE,
      (data: { presence: UserPresence }) => {
        const { userId, status, lastSeenAt } = data.presence;

        setFriends((prev) =>
          prev.map((f) =>
            f.user.id === userId
              ? {
                  ...f,
                  user: {
                    ...f.user,
                    isOnline: status === 'ONLINE',
                    presenceStatus: status,
                    lastSeenAt,
                  },
                }
              : f
          )
        );

        setConversations((prev) =>
          prev.map((c) => {
            if (c.recipient && c.recipient.id === userId) {
              return {
                ...c,
                recipient: {
                  ...c.recipient,
                  isOnline: status === 'ONLINE',
                  presenceStatus: status,
                  lastSeenAt,
                },
              };
            }
            return c;
          })
        );
      }
    );

    // Listen for friend request events
    const unsubFrReq = socketService.on(SOCKET_EVENTS.FRIEND_REQUEST_RECEIVED, () => {
      loadFriendRequests();
    });

    const unsubFrUpd = socketService.on(SOCKET_EVENTS.FRIEND_REQUEST_UPDATED, () => {
      loadFriendRequests();
      loadFriends();
      loadConversations();
    });

    const unsubFrRem = socketService.on(SOCKET_EVENTS.FRIEND_REMOVED, () => {
      loadFriends();
      loadConversations();
    });

    return () => {
      unsubMsg();
      unsubDelete();
      unsubTyping();
      unsubPresence();
      unsubFrReq();
      unsubFrUpd();
      unsubFrRem();
    };
  }, [user, activeConversationId, loadConversations, loadFriends, loadFriendRequests]);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversationId,
        activeConversation,
        messages: currentMessages,
        friends,
        friendRequests,
        typingUsers: currentTypingUsers,
        activeTab,
        isContextDrawerOpen,
        searchQuery,
        isFetchingMessages,
        setActiveTab,
        setSearchQuery,
        toggleContextDrawer,
        selectConversation,
        sendMessage,
        deleteMessage,
        loadConversations,
        loadFriends,
        loadFriendRequests,
        sendFriendRequest,
        respondFriendRequest,
        removeFriend,
        startDirectChat,
        createRoom,
        inviteToRoom,
        leaveRoom,
        sendTyping,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
