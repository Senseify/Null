import React, { useState, useEffect } from 'react';
import { ShieldCheck, Wifi } from 'lucide-react';
import { socketService } from '../../services/socket.service';
import { useChat } from '../../context/ChatContext';

export const StatusBar: React.FC = () => {
  const { activeConversation } = useChat();
  const [connStatus, setConnStatus] = useState<string>(socketService.status);
  const [latency, setLatency] = useState<number>(socketService.latency);

  useEffect(() => {
    const unsubStatus = socketService.on('status', (s: string) => setConnStatus(s));
    const unsubLatency = socketService.on('latency', (l: number) => setLatency(l));
    return () => {
      unsubStatus();
      unsubLatency();
    };
  }, []);

  return (
    <div className="h-6 w-full bg-null-charcoal border-t border-null-border px-3 flex items-center justify-between text-[10px] font-mono text-null-ash select-none flex-shrink-0">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              connStatus === 'CONNECTED'
                ? 'bg-null-online'
                : connStatus === 'CONNECTING'
                ? 'bg-yellow-500 animate-pulse'
                : 'bg-null-ash'
            }`}
          />
          <span className="text-null-muted font-mono">{connStatus}</span>
        </div>

        {connStatus === 'CONNECTED' && (
          <span className="text-null-ash">LATENCY: {latency}ms</span>
        )}

        {activeConversation && (
          <span className="text-null-muted truncate max-w-xs">
            CHANNEL: {activeConversation.title || activeConversation.recipient?.username}
          </span>
        )}
      </div>

      <div className="flex items-center space-x-3">
        <span className="flex items-center space-x-1 text-null-ash">
          <ShieldCheck size={11} className="text-null-online" />
          <span>ZERO-TRACK PROTOCOL</span>
        </span>
        <span className="text-null-ash">NULL v1.0.0</span>
      </div>
    </div>
  );
};
