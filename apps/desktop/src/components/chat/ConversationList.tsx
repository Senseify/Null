import React from 'react';
import { Search, Plus, Hash, User as UserIcon, MessageSquare } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { Conversation } from '@null/shared';

interface ConversationListProps {
  onOpenCreateRoom: () => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({ onOpenCreateRoom }) => {
  const {
    conversations,
    activeConversationId,
    selectConversation,
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
  } = useChat();

  const isRoomsTab = activeTab === 'rooms';

  // Filter conversations by activeTab and search query
  const filteredConversations = conversations.filter((c) => {
    // Tab filter
    if (isRoomsTab && c.type !== 'ROOM') return false;
    if (!isRoomsTab && c.type !== 'DIRECT') return false;

    // Search query filter
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    if (c.type === 'ROOM') {
      return (c.title || '').toLowerCase().includes(query);
    }
    const name = (c.recipient?.displayName || '').toLowerCase();
    const username = (c.recipient?.username || '').toLowerCase();
    return name.includes(query) || username.includes(query);
  });

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-72 bg-null-charcoal/60 border-r border-null-border flex flex-col h-full flex-shrink-0 select-none">
      {/* Top Header & Actions */}
      <div className="p-3 border-b border-null-border flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-semibold tracking-wider text-null-muted uppercase">
            {isRoomsTab ? 'Private Rooms' : 'Direct Transmissions'}
          </span>
          <button
            onClick={isRoomsTab ? onOpenCreateRoom : () => setActiveTab('friends')}
            className="p-1 rounded hover:bg-null-surface text-null-muted hover:text-null-text null-transition"
            title={isRoomsTab ? 'Create Private Room' : 'Start Transmission with Friend'}
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-null-ash" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRoomsTab ? 'Search rooms...' : 'Search operators...'}
            className="w-full bg-null-surface border border-null-border rounded-md pl-8 pr-3 py-1.5 text-xs text-null-text placeholder-null-ash focus:outline-none focus:border-null-borderLight null-transition font-sans"
          />
        </div>
      </div>

      {/* Conversations Stream */}
      <div className="flex-1 overflow-y-auto null-scrollbar p-2 space-y-1">
        {filteredConversations.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4">
            {isRoomsTab ? <Hash size={24} className="text-null-ash mb-2" /> : <MessageSquare size={24} className="text-null-ash mb-2" />}
            <p className="text-xs text-null-muted">
              {isRoomsTab ? 'No private rooms established' : 'No direct transmissions'}
            </p>
            <button
              onClick={isRoomsTab ? onOpenCreateRoom : () => setActiveTab('friends')}
              className="mt-3 px-3 py-1 bg-null-surface hover:bg-null-panel text-null-text text-xs rounded border border-null-border null-transition"
            >
              {isRoomsTab ? 'Establish Room' : 'Find Friends'}
            </button>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            const isRoom = conv.type === 'ROOM';
            const title = isRoom ? conv.title : (conv.recipient?.displayName || conv.recipient?.username || 'Unknown User');
            const subTitle = isRoom ? `${conv.members.length} members` : `@${conv.recipient?.username}`;
            const isOnline = !isRoom && conv.recipient?.isOnline;

            return (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`w-full p-2.5 rounded-lg flex items-center space-x-3 cursor-pointer null-transition border ${
                  isActive
                    ? 'bg-null-surface text-null-text border-null-borderLight shadow-sm'
                    : 'text-null-muted hover:bg-null-panel hover:text-null-text border-transparent'
                }`}
              >
                {/* Avatar / Icon with Presence */}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-lg bg-null-surface border border-null-border flex items-center justify-center overflow-hidden">
                    {isRoom ? (
                      <Hash size={18} className="text-null-muted" />
                    ) : conv.recipient?.avatarUrl ? (
                      <img src={conv.recipient.avatarUrl} alt={title || ''} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-mono font-bold uppercase text-null-text">
                        {conv.recipient?.username?.slice(0, 2) || 'DM'}
                      </span>
                    )}
                  </div>
                  {/* Presence indicator */}
                  {!isRoom && (
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-null-charcoal ${
                        isOnline ? 'bg-null-online' : 'bg-null-ash'
                      }`}
                    />
                  )}
                </div>

                {/* Metadata */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-null-text truncate font-sans">
                      {title}
                    </span>
                    <span className="text-[10px] font-mono text-null-ash flex-shrink-0 ml-1">
                      {formatTime(conv.lastMessage?.createdAt || conv.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-null-muted truncate pr-1">
                      {conv.lastMessage
                        ? conv.lastMessage.isDeleted
                          ? 'This message was deleted'
                          : conv.lastMessage.content || (conv.lastMessage.attachment ? 'Shared an attachment' : '')
                        : subTitle}
                    </p>

                    {/* Unread badge */}
                    {conv.unreadCount && conv.unreadCount > 0 ? (
                      <span className="min-w-[16px] h-4 px-1 bg-null-text text-null-bg text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                        {conv.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
