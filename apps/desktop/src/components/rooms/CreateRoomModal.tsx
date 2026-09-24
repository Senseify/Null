import React, { useState } from 'react';
import { X, Hash, Plus, Check } from 'lucide-react';
import { useChat } from '../../context/ChatContext';

interface CreateRoomModalProps {
  onClose: () => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ onClose }) => {
  const { createRoom, friends } = useChat();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedUsernames, setSelectedUsernames] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const toggleUser = (username: string) => {
    setSelectedUsernames((prev) =>
      prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isCreating) return;

    setIsCreating(true);
    try {
      await createRoom(title.trim(), description.trim() || undefined, selectedUsernames);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to create room');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-null-charcoal border border-null-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b border-null-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Hash size={18} className="text-null-text" />
            <h3 className="text-xs font-mono font-bold tracking-wider text-null-text uppercase">
              Establish Private Room
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-null-muted hover:text-null-text hover:bg-null-surface null-transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="text-[10px] font-mono text-null-muted uppercase tracking-wider block mb-1">
              Room Identifier / Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Core Operators"
              required
              className="w-full bg-null-surface border border-null-border rounded-lg px-3 py-2 text-xs text-null-text placeholder-null-ash focus:outline-none focus:border-null-borderLight"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono text-null-muted uppercase tracking-wider block mb-1">
              Description / Clearance
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Encrypted coordination channel"
              className="w-full bg-null-surface border border-null-border rounded-lg px-3 py-2 text-xs text-null-text placeholder-null-ash focus:outline-none focus:border-null-borderLight"
            />
          </div>

          {/* Initial Member Invites */}
          <div>
            <label className="text-[10px] font-mono text-null-muted uppercase tracking-wider block mb-1">
              Initial Roster ({selectedUsernames.length} selected)
            </label>
            <div className="max-h-40 overflow-y-auto null-scrollbar border border-null-border rounded-lg bg-null-surface/50 p-2 space-y-1">
              {friends.length === 0 ? (
                <p className="text-[11px] text-null-ash italic p-2">No connected friends available to invite.</p>
              ) : (
                friends.map((f) => {
                  const isChecked = selectedUsernames.includes(f.user.username);
                  return (
                    <div
                      key={f.id}
                      onClick={() => toggleUser(f.user.username)}
                      className="flex items-center justify-between p-1.5 rounded hover:bg-null-surface cursor-pointer null-transition"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-null-text font-medium">{f.user.displayName}</span>
                        <span className="text-[10px] font-mono text-null-ash">@{f.user.username}</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          isChecked
                            ? 'bg-null-text border-null-text text-null-bg'
                            : 'border-null-border bg-null-panel'
                        }`}
                      >
                        {isChecked && <Check size={11} strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-null-muted hover:text-null-text hover:bg-null-surface null-transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isCreating}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-null-text text-null-bg hover:opacity-90 disabled:opacity-30 null-transition"
            >
              {isCreating ? 'Establishing...' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
