import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Send, X, FileText, Loader2 } from 'lucide-react';
import { ApiClient } from '../../api/client';
import { useChat } from '../../context/ChatContext';

interface MessageComposerProps {
  conversationId: string;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({ conversationId }) => {
  const { sendMessage, sendTyping } = useChat();
  const [content, setContent] = useState('');
  const [attachment, setAttachment] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Focus textarea when conversation changes
  useEffect(() => {
    setContent('');
    setAttachment(null);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [conversationId]);

  const handleTyping = (text: string) => {
    setContent(text);

    // Typing state management
    sendTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false);
    }, 2500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    e.target.value = '';

    setIsUploading(true);
    try {
      const uploaded = await ApiClient.uploadFile(file);
      setAttachment(uploaded);
    } catch (err: any) {
      alert(err.message || 'Failed to upload attachment');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = async () => {
    if ((!content.trim() && !attachment) || isSending || isUploading) return;

    setIsSending(true);
    sendTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    const messageContent = content;
    const currentAttachment = attachment;

    setContent('');
    setAttachment(null);

    try {
      await sendMessage(messageContent, currentAttachment);
    } catch (err) {
      // Restore on failure
      setContent(messageContent);
      setAttachment(currentAttachment);
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  return (
    <div className="p-3 bg-null-charcoal border-t border-null-border select-none">
      {/* Attachment Preview Box */}
      {attachment && (
        <div className="mb-2 p-2 bg-null-surface border border-null-borderLight rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            {attachment.isImage ? (
              <img src={attachment.url} alt="upload" className="w-10 h-10 object-cover rounded" />
            ) : (
              <FileText size={20} className="text-null-muted" />
            )}
            <div className="min-w-0">
              <p className="text-xs text-null-text truncate font-medium">{attachment.name}</p>
              <p className="text-[10px] font-mono text-null-ash">
                {(attachment.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button
            onClick={() => setAttachment(null)}
            className="p-1 text-null-muted hover:text-null-text rounded hover:bg-null-panel null-transition"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input Row */}
      <div className="flex items-end space-x-2 bg-null-surface border border-null-border rounded-lg p-2 focus-within:border-null-borderLight null-transition">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.json"
        />

        {/* Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || isSending}
          className="p-1.5 rounded text-null-muted hover:text-null-text hover:bg-null-panel null-transition flex-shrink-0 disabled:opacity-50"
          title="Attach file or image"
        >
          {isUploading ? <Loader2 size={16} className="animate-spin text-null-accent" /> : <Paperclip size={16} />}
        </button>

        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Transmit message... (Enter to send, Shift+Enter for newline)"
          rows={1}
          className="flex-1 bg-transparent border-0 resize-none text-xs text-null-text placeholder-null-ash focus:outline-none max-h-32 py-1 leading-relaxed select-text font-sans"
        />

        {/* Send Action */}
        <button
          type="button"
          onClick={handleSend}
          disabled={(!content.trim() && !attachment) || isSending || isUploading}
          className="p-1.5 rounded bg-null-text text-null-bg hover:opacity-90 disabled:opacity-30 null-transition flex-shrink-0"
          title="Send"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
};
