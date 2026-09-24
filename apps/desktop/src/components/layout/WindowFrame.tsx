import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Shield, Activity } from 'lucide-react';
import { socketService } from '../../services/socket.service';

export const WindowFrame: React.FC = () => {
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

  const handleMinimize = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('minimize_window');
    } catch {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().minimize();
      } catch (e) {
        console.warn('Minimize not available', e);
      }
    }
  };

  const handleMaximize = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('toggle_maximize_window');
    } catch {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().toggleMaximize();
      } catch (e) {
        console.warn('Maximize not available', e);
      }
    }
  };

  const handleClose = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('close_window');
    } catch {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().close();
      } catch (e) {
        console.warn('Close not available', e);
      }
    }
  };

  return (
    <div className="h-9 w-full bg-null-bg border-b border-null-border flex items-center justify-between px-3 select-none flex-shrink-0 z-50">
      {/* Draggable Title Area */}
      <div data-tauri-drag-region className="flex items-center space-x-2 h-full cursor-default">
        <img
          src="/logo.png"
          alt="NULL Logo"
          className="w-4 h-4 object-contain rounded-xs shadow-sm pointer-events-none"
        />
        <span className="text-xs font-mono tracking-widest text-null-text font-bold pointer-events-none">
          NULL
        </span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-null-charcoal text-null-muted border border-null-border pointer-events-none">
          ENCRYPTED LINK
        </span>
      </div>

      {/* Draggable Center Area with Live Connectivity Pill */}
      <div data-tauri-drag-region className="flex-1 flex items-center justify-center h-full cursor-default px-4">
        <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-null-charcoal/80 border border-null-border text-[11px] font-mono pointer-events-none">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              connStatus === 'CONNECTED'
                ? 'bg-null-online shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                : connStatus === 'CONNECTING'
                ? 'bg-yellow-500 animate-pulse'
                : 'bg-null-ash'
            }`}
          />
          <span className="text-null-muted text-[10px] tracking-wide">
            {connStatus === 'CONNECTED' ? `LIVE • ${latency}ms` : connStatus}
          </span>
        </div>
      </div>

      {/* Non-draggable Window Control Buttons */}
      <div className="flex items-center space-x-1 flex-shrink-0 z-50">
        <button
          type="button"
          onClick={handleMinimize}
          className="w-7 h-6 flex items-center justify-center rounded text-null-muted hover:text-null-text hover:bg-null-surface active:bg-null-border null-transition cursor-pointer"
          title="Minimize"
        >
          <Minus size={12} />
        </button>
        <button
          type="button"
          onClick={handleMaximize}
          className="w-7 h-6 flex items-center justify-center rounded text-null-muted hover:text-null-text hover:bg-null-surface active:bg-null-border null-transition cursor-pointer"
          title="Maximize"
        >
          <Square size={11} />
        </button>
        <button
          type="button"
          onClick={handleClose}
          className="w-7 h-6 flex items-center justify-center rounded text-null-muted hover:text-white hover:bg-null-danger active:bg-red-700 null-transition cursor-pointer"
          title="Close"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
};
