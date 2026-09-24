import React, { useState } from 'react';
import { Trash2, FileText, Download, Check, CheckCheck } from 'lucide-react';
import { Message } from '@null/shared';
import { useAuth } from '../../context/AuthContext';

interface MessageItemProps {
  message: Message;
  onDelete: (messageId: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, onDelete }) => {
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const isSelf = user?.id === message.senderId;

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleDelete = () => {
    if (confirm('Delete this message? This action cannot be undone.')) {
      setIsDeleting(true);
      onDelete(message.id);
    }
  };

  return (
    <div
      className={`group relative flex space-x-3 px-4 py-2 hover:bg-null-charcoal/40 null-transition ${
        message.isDeleted ? 'opacity-50' : ''
      }`}
    >
      {/* Sender Avatar */}
      <div className="w-8 h-8 rounded-lg bg-null-surface border border-null-border flex items-center justify-center overflow-hidden flex-shrink-0 mt-0.5">
        {message.sender?.avatarUrl ? (
          <img src={message.sender.avatarUrl} alt={message.sender.username} className="w-full h-full object-cover" />
        ) : (
          <span className="text-[11px] font-mono font-bold text-null-muted uppercase">
            {message.sender?.username?.slice(0, 2) || '??'}
          </span>
        )}
      </div>

      {/* Message Content & Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline space-x-2">
          <span className="text-xs font-semibold text-null-text font-sans">
            {message.sender?.displayName || message.sender?.username || 'Unknown'}
          </span>
          <span className="text-[10px] font-mono text-null-ash">
            @{message.sender?.username}
          </span>
          <span className="text-[10px] font-mono text-null-ash flex items-center space-x-1">
            <span>{formatTime(message.createdAt)}</span>
            {isSelf && !message.isDeleted && (
              <span title={message.readBy && message.readBy.length > 1 ? 'Read by recipient' : 'Transmitted'}>
                {message.readBy && message.readBy.length > 1 ? (
                  <CheckCheck size={12} className="text-null-online" />
                ) : (
                  <Check size={12} className="text-null-ash" />
                )}
              </span>
            )}
          </span>
        </div>

        {/* Text Body */}
        {message.isDeleted ? (
          <p className="text-xs italic text-null-muted mt-1">This message was deleted</p>
        ) : (
          <>
            {message.content && (
              <p className="text-xs text-null-text/90 mt-1 whitespace-pre-wrap break-words leading-relaxed select-text font-sans">
                {message.content}
              </p>
            )}

            {/* Attachment Display */}
            {message.attachment && (
              <div className="mt-2">
                {message.attachment.mimeType?.startsWith('image/') ? (
                  <div className="max-w-sm rounded-lg overflow-hidden border border-null-border bg-null-surface">
                    <img
                      src={message.attachment.url}
                      alt={message.attachment.name}
                      className="max-h-64 object-contain w-full cursor-pointer hover:opacity-95 null-transition"
                      onClick={() => window.open(message.attachment?.url, '_blank')}
                    />
                    <div className="px-2.5 py-1 text-[10px] text-null-muted flex justify-between border-t border-null-border">
                      <span className="truncate max-w-[200px]">{message.attachment.name}</span>
                      <span>{formatBytes(message.attachment.size)}</span>
                    </div>
                  </div>
                ) : (
                  <a
                    href={message.attachment.url}
                    download={message.attachment.name}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-3 px-3 py-2 rounded-lg bg-null-surface border border-null-border hover:border-null-borderLight null-transition max-w-sm"
                  >
                    <FileText size={20} className="text-null-muted flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-null-text truncate font-medium">{message.attachment.name}</p>
                      <p className="text-[10px] font-mono text-null-ash">{formatBytes(message.attachment.size)}</p>
                    </div>
                    <Download size={14} className="text-null-muted hover:text-null-text flex-shrink-0" />
                  </a>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Action Hover Strip */}
      {isSelf && !message.isDeleted && (
        <div className="absolute right-4 top-2 opacity-0 group-hover:opacity-100 null-transition flex items-center space-x-1 bg-null-surface/90 px-1.5 py-1 rounded border border-null-border shadow-sm">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1 rounded text-null-muted hover:text-null-danger hover:bg-null-panel null-transition"
            title="Delete Message"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
};
