import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@null/shared';

const getWsUrl = (): string => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('null_server_url');
    if (custom && custom.startsWith('http')) return custom;
  }
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  if (typeof window !== 'undefined' && window.location.origin.includes('localhost:5173')) {
    return window.location.origin;
  }
  return 'http://localhost:4000';
};
const WS_URL = getWsUrl();

type ConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED';

class SocketService {
  private socket: Socket | null = null;
  private pingInterval: any = null;
  private listeners: Map<string, Set<Function>> = new Map();
  public status: ConnectionStatus = 'DISCONNECTED';
  public latency: number = 0;

  connect(token: string) {
    if (this.socket) {
      this.disconnect();
    }

    this.status = 'CONNECTING';
    this.notifyStatusChange();

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on(SOCKET_EVENTS.CONNECT, () => {
      this.status = 'CONNECTED';
      this.notifyStatusChange();
      this.startPingMeasurement();
    });

    this.socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      this.status = 'DISCONNECTED';
      this.notifyStatusChange();
      this.stopPingMeasurement();
    });

    this.socket.on('connect_error', () => {
      this.status = 'DISCONNECTED';
      this.notifyStatusChange();
    });

    // Pong listener for latency calculation
    this.socket.on(SOCKET_EVENTS.PONG, (data: { clientTimestamp: number }) => {
      this.latency = Math.max(0, Date.now() - data.clientTimestamp);
      this.trigger('latency', this.latency);
    });

    // Forward all registered events to local listeners
    for (const [event, handlers] of this.listeners.entries()) {
      if (event === 'status' || event === 'latency') continue;
      this.socket.on(event, (data: any) => {
        handlers.forEach((fn) => fn(data));
      });
    }
  }

  private startPingMeasurement() {
    this.stopPingMeasurement();
    this.ping();
    this.pingInterval = setInterval(() => {
      this.ping();
    }, 10000);
  }

  private stopPingMeasurement() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private ping() {
    if (this.socket && this.socket.connected) {
      this.socket.emit(SOCKET_EVENTS.PING, { timestamp: Date.now() });
    }
  }

  disconnect() {
    this.stopPingMeasurement();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.status = 'DISCONNECTED';
    this.notifyStatusChange();
  }

  on(event: string, handler: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
      if (this.socket && event !== 'status' && event !== 'latency') {
        this.socket.on(event, (data: any) => {
          this.listeners.get(event)?.forEach((fn) => fn(data));
        });
      }
    }
    this.listeners.get(event)!.add(handler);

    return () => {
      this.off(event, handler);
    };
  }

  off(event: string, handler: Function) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private trigger(event: string, data: any) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((fn) => fn(data));
    }
  }

  private notifyStatusChange() {
    this.trigger('status', this.status);
  }

  emit(event: string, data?: any) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    }
  }

  sendTypingStart(conversationId: string) {
    this.emit(SOCKET_EVENTS.TYPING_START, { conversationId });
  }

  sendTypingStop(conversationId: string) {
    this.emit(SOCKET_EVENTS.TYPING_STOP, { conversationId });
  }
}

export const socketService = new SocketService();
