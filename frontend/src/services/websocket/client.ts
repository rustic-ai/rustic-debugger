import type { WebSocketEvent, StreamSubscription } from '@rustic-debug/types';
import { useWebSocketStore } from '@stores/webSocketStore';
import { useMessageStore } from '@stores/messageStore';

type WebSocketMessage = 
  | { type: 'subscribe'; data: StreamSubscription }
  | { type: 'unsubscribe'; data: { subscriptionId: string } }
  | { type: 'ping'; data: { timestamp: number } }
  | { type: 'get_stats' };

// Simple EventEmitter implementation for browser
export class EventEmitter {
  private events: Map<string, Set<Function>> = new Map();
  
  on(event: string, handler: Function): this {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(handler);
    return this;
  }
  
  off(event: string, handler: Function): this {
    this.events.get(event)?.delete(handler);
    return this;
  }
  
  emit(event: string, ...args: any[]): boolean {
    const handlers = this.events.get(event);
    if (!handlers) return false;
    handlers.forEach(handler => handler(...args));
    return true;
  }
}

export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Connect to backend server on port 3000, not the Vite dev server
    const host = window.location.hostname;
    const url = `${protocol}//${host}:3000/ws`;

    this.ws = new WebSocket(url);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
    };
    
    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketEvent = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      useWebSocketStore.getState().setConnected(false);
      this.stopHeartbeat();
      this.attemptReconnect();
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }
  
  disconnect(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    useWebSocketStore.getState().reset();
  }
  
  send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected');
    }
  }
  
  subscribe(subscription: StreamSubscription): void {
    this.send({ type: 'subscribe', data: subscription });
  }
  
  unsubscribe(subscriptionId: string): void {
    this.send({ type: 'unsubscribe', data: { subscriptionId } });
  }
  
  getStats(): void {
    this.send({ type: 'get_stats' });
  }
  
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
  
  subscribeToGuild(guildId: string): void {
    this.subscribe({ guildId });
  }
  
  subscribeToTopic(guildId: string, topicName: string): void {
    this.subscribe({ guildId, topicNames: [topicName] });
  }
  
  unsubscribeFromGuild(guildId: string): void {
    const state = useWebSocketStore.getState();
    const subscriptionId = [...state.subscriptions.entries()].find(
      ([_, id]) => id === guildId
    )?.[0];
    
    if (subscriptionId) {
      this.unsubscribe(subscriptionId);
    }
  }
  
  unsubscribeFromTopic(_guildId: string, _topicName: string): void {
    // For topic-specific unsubscription, we'd need to track topic subscriptions
    // For now, this is a no-op
  }
  
  private handleMessage(event: WebSocketEvent): void {
    const { type, data } = event;
    
    switch (type) {
      case 'connected':
        useWebSocketStore.getState().setConnected(true, (data as any).connectionId);
        this.emit('connected', data);
        break;
        
      case 'subscription_confirmed':
        useWebSocketStore.getState().addSubscription(
          (data as any).subscriptionId,
          (data as any).guildId
        );
        this.emit('subscribed', data);
        break;
        
      case 'unsubscribe_confirmed':
        useWebSocketStore.getState().removeSubscription((data as any).subscriptionId);
        this.emit('unsubscribed', data);
        break;
        
      case 'message':
        useMessageStore.getState().addLiveMessage(data as any);
        this.emit('message', data);
        break;
        
      case 'stats':
        useWebSocketStore.getState().updateStats(data as any);
        this.emit('stats', data);
        break;
        
      case 'pong':
        const latency = Date.now() - (data as any).timestamp;
        useWebSocketStore.getState().updateStats({ averageLatency: latency });
        break;
        
      case 'error':
        console.error('WebSocket error:', (data as any).error);
        this.emit('error', (data as any).error);
        break;
    }
  }
  
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }
  
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'ping', data: { timestamp: Date.now() } });
    }, 30000);
  }
  
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

export const wsClient: WebSocketClient = new WebSocketClient();