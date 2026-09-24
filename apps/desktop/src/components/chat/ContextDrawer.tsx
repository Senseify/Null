import React, { useState } from 'react';
import { X, UserPlus, LogOut, Shield, User, Hash } from 'lucide-react';
import { Conversation, UserProfile } from '@null/shared';
import { useChat } from '../../context/ChatContext';

interface ContextDrawerProps {
  conversation: Conversation;
  onClose: () => void;
}

export const ContextDrawer: React.FC<ContextDrawerProps> = ({ conversation, onClose }) => {
  const { inviteToRoom, leaveRoom, removeFriend } = useChat();
  const [inviteUsername, setInviteUsername] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const isRoom = conversation.type === 'ROOM';
  const recipient = conversation.recipient;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUsername.trim() || isInviting) return;
    setIsInviting(true);
    try {
      await inviteToRoom(conversation.id, inviteUsername.trim());
      setInviteUsername('');
    } catch (err: any) {
      alert(err.message || 'Failed to invite user');
    } finally {
      setIsInviting(false);
    }
  };

  const handleLeave = async () => {
    if (confirm('Leave this private room?')) {
      await leaveRoom(conversation.id);
      onClose();
    }
  };

  return (
    <div className="w-64 bg-null-charcoal border-l border-null-border flex flex-col h-full flex-shrink-0 select-none">
      {/* Header */}
      <div className="p-3 border-b border-null-border flex items-center justify-between">
        <span className="text-xs font-mono font-semibold tracking-wider text-null-muted uppercase">
          {isRoom ? 'Room Details' : 'Contact Intel'}
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded text-null-muted hover:text-null-text hover:bg-null-surface null-transition"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto null-scrollbar p-3 space-y-4">
        {isRoom ? (
          <>
            {/* Room Info */}
            <div className="text-center p-3 bg-null-surface rounded-lg border border-null-border">
              <div className="w-12 h-12 mx-auto rounded-lg bg-null-panel border border-null-border flex items-center justify-center mb-2">
                <Hash size={24} className="text-null-text" />
              </div>
              <h3 className="text-sm font-bold text-null-text">{conversation.title}</h3>
              {conversation.description && (
                <p className="text-xs text-null-muted mt-1 leading-relaxed">{conversation.description}</p>
              )}
              <p className="text-[10px] font-mono text-null-ash mt-2">
                {conversation.members.length} MEMBERS
              </p>
            </div>

            {/* Invite Form */}
            <form onSubmit={handleInvite} className="space-y-1.5">
              <label className="text-[10px] font-mono text-null-muted uppercase tracking-wider block">
                Invite Member
              </label>
              <div className="flex items-center space-x-1">
                <input
                  type="text"
                  value={inviteUsername}
                  onChange={(e) => setInviteUsername(e.target.value)}
                  placeholder="Username..."
                  className="flex-1 bg-null-surface border border-null-border rounded px-2 py-1 text-xs text-null-text placeholder-null-ash focus:outline-none focus:border-null-borderLight"
                />
                <button
                  type="submit"
                  disabled={!inviteUsername.trim() || isInviting}
                  className="p-1.5 bg-null-text text-null-bg rounded hover:opacity-90 disabled:opacity-30 null-transition"
                  title="Invite"
                >
                  <UserPlus size={14} />
                </button>
              </div>
            </form>

            {/* Members List */}
            <div>
              <label className="text-[10px] font-mono text-null-muted uppercase tracking-wider block mb-2">
                Roster ({conversation.members.length})
              </label>
              <div className="space-y-1">
                {conversation.members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-1.5 rounded hover:bg-null-surface null-transition"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <div className="relative w-6 h-6 rounded bg-null-panel border border-null-border flex items-center justify-center overflow-hidden flex-shrink-0">
                        {m.user?.avatarUrl ? (
                          <img src={m.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[9px] font-mono font-bold text-null-muted uppercase">
                            {m.user?.username?.slice(0, 2) || '??'}
                          </span>
                        )}
                        <span
                          className={`absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full ${
                            m.user?.isOnline ? 'bg-null-online' : 'bg-null-ash'
                          }`}
                        />
                      </div>
                      <span className="text-xs text-null-text truncate font-sans">
                        @{m.user?.username}
                      </span>
                    </div>

                    <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-null-panel text-null-ash border border-null-border">
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Leave Room Button */}
            <div className="pt-2">
              <button
                onClick={handleLeave}
                className="w-full py-1.5 px-3 rounded bg-null-surface hover:bg-null-panel text-null-danger border border-null-border flex items-center justify-center space-x-2 text-xs null-transition"
              >
                <LogOut size={13} />
                <span>Leave Room</span>
              </button>
            </div>
          </>
        ) : recipient ? (
          <>
            {/* Direct Contact Profile */}
            <div className="text-center p-4 bg-null-surface rounded-lg border border-null-border">
              <div className="relative w-16 h-16 mx-auto rounded-lg bg-null-panel border border-null-border flex items-center justify-center overflow-hidden mb-3">
                {recipient.avatarUrl ? (
                  <img src={recipient.avatarUrl} alt={recipient.username} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-base font-mono font-bold text-null-text uppercase">
                    {recipient.username.slice(0, 2)}
                  </span>
                )}
                <span
                  className={`absolute bottom-1 right-1 w-3 h-3 rounded-full border-2 border-null-charcoal ${
                    recipient.isOnline ? 'bg-null-online' : 'bg-null-ash'
                  }`}
                />
              </div>

              <h3 className="text-sm font-bold text-null-text">{recipient.displayName}</h3>
              <p className="text-xs font-mono text-null-ash mt-0.5">@{recipient.username}</p>

              {recipient.statusMessage && (
                <p className="text-xs text-null-muted italic mt-2 bg-null-panel p-2 rounded border border-null-border">
                  "{recipient.statusMessage}"
                </p>
              )}
            </div>

            {/* Intel details */}
            <div className="space-y-2 p-3 bg-null-surface rounded-lg border border-null-border text-xs">
              <div className="flex justify-between text-null-muted">
                <span className="text-null-ash font-mono text-[10px]">STATUS</span>
                <span className="font-mono text-[11px] text-null-text">
                  {recipient.isOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <div className="flex justify-between text-null-muted">
                <span className="text-null-ash font-mono text-[10px]">NETWORK SINCE</span>
                <span className="font-mono text-[11px] text-null-text">
                  {new Date(recipient.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Remove Friend Action */}
            <div className="pt-2">
              <button
                onClick={() => {
                  if (confirm(`Remove @${recipient.username} from friends?`)) {
                    removeFriend(recipient.id);
                  }
                }}
                className="w-full py-1.5 px-3 rounded bg-null-surface hover:bg-null-panel text-null-danger border border-null-border flex items-center justify-center space-x-2 text-xs null-transition"
              >
                <span>Remove Friend</span>
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
