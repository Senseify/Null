import React, { useEffect, useRef } from 'react';
import { PanelRightClose, PanelRightOpen, Hash, Shield, MessageSquare, Loader2 } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { MessageItem } from './MessageItem';
import { MessageComposer } from './MessageComposer';
import { ContextDrawer } from './ContextDrawer';

export const ChatViewport: React.FC = () => {
  const {
    activeConversation,
    messages,
    typingUsers,
    isContextDrawerOpen,
    toggleContextDrawer,
    deleteMessage,
    isFetchingMessages,
  } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  if (!activeConversation) {
    return (
      <div className="flex-1 bg-null-bg flex flex-col items-center justify-center text-center p-6 select-none">
        <div className="w-16 h-16 rounded-2xl bg-null-charcoal border border-null-border flex items-center justify-center mb-4 shadow-sm">
          <div className="relative w-8 h-8 flex items-center justify-center">
            <div className="absolute inset-0 border border-null-text/40 rounded-sm transform rotate-45" />
            <div className="w-2 h-2 bg-null-text rounded-xs" />
          </div>
        </div>
        <h2 className="text-base font-mono font-bold tracking-widest text-null-text">
          NULL PROTOCOL
        </h2>
        <p className="text-xs text-null-muted max-w-sm mt-2 leading-relaxed">
          Select an active channel from the roster or initiate a direct transmission with a verified peer.
        </p>
      </div>
    );
  }

  const isRoom = activeConversation.type === 'ROOM';
  const title = isRoom
    ? activeConversation.title
    : (activeConversation.recipient?.displayName || activeConversation.recipient?.username);
  const isOnline = !isRoom && activeConversation.recipient?.isOnline;

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-null-bg">
      {/* Main Conversation Column */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Chat Header */}
        <div className="h-14 px-4 bg-null-charcoal border-b border-null-border flex items-center justify-between flex-shrink-0 select-none">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="relative w-8 h-8 rounded-lg bg-null-surface border border-null-border flex items-center justify-center overflow-hidden flex-shrink-0">
              {isRoom ? (
                <Hash size={16} className="text-null-muted" />
              ) : activeConversation.recipient?.avatarUrl ? (
                <img src={activeConversation.recipient.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-mono font-bold uppercase text-null-text">
                  {activeConversation.recipient?.username?.slice(0, 2) || 'DM'}
                </span>
              )}
              {!isRoom && (
                <span
                  className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-null-charcoal ${
                    isOnline ? 'bg-null-online' : 'bg-null-ash'
                  }`}
                />
              )}
            </div>

            <div className="min-w-0">
              <h2 className="text-xs font-semibold text-null-text truncate font-sans">{title}</h2>
              <p className="text-[10px] font-mono text-null-ash">
                {isRoom
                  ? `${activeConversation.members.length} MEMBERS`
                  : isOnline
                  ? 'ONLINE'
                  : 'OFFLINE'}
              </p>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleContextDrawer}
              className={`p-1.5 rounded text-null-muted hover:text-null-text hover:bg-null-surface null-transition ${
                isContextDrawerOpen ? 'bg-null-surface text-null-text' : ''
              }`}
              title="Toggle Details"
            >
              {isContextDrawerOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
            </button>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto null-scrollbar py-4 space-y-1">
          {isFetchingMessages ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-null-muted" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-null-ash select-none">
              <MessageSquare size={28} className="mb-2 opacity-40" />
              <p className="text-xs text-null-muted">Direct transmission channel established.</p>
              <p className="text-[10px] text-null-ash mt-1">Send a message to begin communication.</p>
            </div>
          ) : (
            messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                onDelete={deleteMessage}
              />
            ))
          )}

          {/* Typing Indicator Display */}
          {typingUsers.length > 0 && (
            <div className="px-4 py-1 text-[11px] font-mono text-null-muted flex items-center space-x-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-null-accent" />
              <span>
                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} transmitting...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Bar */}
        <MessageComposer conversationId={activeConversation.id} />
      </div>

      {/* Collapsible Context Drawer */}
      {isContextDrawerOpen && (
        <ContextDrawer
          conversation={activeConversation}
          onClose={toggleContextDrawer}
        />
      )}
    </div>
  );
};
