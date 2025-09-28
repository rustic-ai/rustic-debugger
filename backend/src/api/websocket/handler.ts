import type { FastifyInstance, FastifyRequest } from 'fastify';
import { WebSocket } from 'ws';
import type { 
  WebSocketEvent, 
  StreamSubscription, 
  StreamStats 
} from '@rustic-debug/types';
import { config } from '../../config/index.js';
import { getRedisClients } from '../../services/redis/connection.js';

interface WebSocketConnection {
  socket: WebSocket;
  id: string;
  subscriptions: Map<string, StreamSubscription>;
  stats: StreamStats;
  lastActivity: number;
  messageCount: number;
  windowStart: number;
}

export class WebSocketHandler {
  private connections = new Map<string, WebSocketConnection>();
  private heartbeatInterval: NodeJS.Timeout;
  
  constructor(private fastify: FastifyInstance) {
    // Start heartbeat interval
    this.heartbeatInterval = setInterval(
      () => this.sendHeartbeats(),
      config.wsHeartbeatInterval
    );
  }
  
  async handleConnection(ws: WebSocket, req: FastifyRequest): Promise<void> {
    const connectionId = this.generateConnectionId();
    
    const connection: WebSocketConnection = {
      socket: ws,
      id: connectionId,
      subscriptions: new Map(),
      stats: {
        messagesReceived: 0,
        bytesReceived: 0,
        connectionDuration: 0,
        averageLatency: 0,
      },
      lastActivity: Date.now(),
      messageCount: 0,
      windowStart: Date.now(),
    };
    
    this.connections.set(connectionId, connection);
    
    // Set up event handlers
    ws.on('message', async (data) => {
      await this.handleMessage(connection, data);
    });
    
    ws.on('close', () => {
      this.handleDisconnect(connectionId);
    });
    
    ws.on('error', (error) => {
      this.fastify.log.error({ error, connectionId }, 'WebSocket error');
      this.handleDisconnect(connectionId);
    });
    
    // Send welcome message
    this.sendMessage(connection, {
      type: 'connected',
      data: { connectionId },
      timestamp: new Date().toISOString(),
    });
  }
  
  private async handleMessage(
    connection: WebSocketConnection,
    data: WebSocket.RawData
  ): Promise<void> {
    try {
      // Update stats
      connection.stats.messagesReceived++;
      connection.stats.bytesReceived += data.toString().length;
      connection.lastActivity = Date.now();
      
      // Rate limiting
      if (!this.checkRateLimit(connection)) {
        this.sendError(connection, 'RATE_LIMIT_EXCEEDED', 'Too many messages');
        return;
      }
      
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'subscribe':
          await this.handleSubscribe(connection, message.data);
          break;
          
        case 'unsubscribe':
          await this.handleUnsubscribe(connection, message.data);
          break;
          
        case 'ping':
          this.handlePing(connection, message.data);
          break;
          
        case 'get_stats':
          this.handleGetStats(connection);
          break;
          
        default:
          this.sendError(connection, 'UNKNOWN_MESSAGE_TYPE', 'Unknown message type');
      }
    } catch (error) {
      this.sendError(connection, 'INVALID_MESSAGE', 'Failed to process message');
    }
  }
  
  private async handleSubscribe(
    connection: WebSocketConnection,
    data: StreamSubscription
  ): Promise<void> {
    const subscriptionId = `sub-${Date.now().toString(36)}`;
    
    // Store subscription
    connection.subscriptions.set(subscriptionId, data);
    
    // Set up Redis subscription
    if (data.guildId) {
      const { pubsub } = await getRedisClients();
      
      const channels = data.topicNames?.map(topic => 
        `guild:${data.guildId}:topic:${topic}`
      ) || [`guild:${data.guildId}:*`];
      
      // Subscribe to channels
      for (const channel of channels) {
        await pubsub.psubscribe(channel);
      }
      
      // Set up message handler
      pubsub.on('pmessage', (pattern, channel, message) => {
        if (connection.subscriptions.has(subscriptionId)) {
          this.handleRedisMessage(connection, channel, message);
        }
      });
    }
    
    // Send confirmation
    this.sendMessage(connection, {
      type: 'subscription_confirmed',
      data: {
        subscriptionId,
        guildId: data.guildId,
      },
      timestamp: new Date().toISOString(),
    });
  }
  
  private async handleUnsubscribe(
    connection: WebSocketConnection,
    data: { subscriptionId: string }
  ): Promise<void> {
    connection.subscriptions.delete(data.subscriptionId);
    
    // Send confirmation
    this.sendMessage(connection, {
      type: 'unsubscribe_confirmed',
      data: { subscriptionId: data.subscriptionId },
      timestamp: new Date().toISOString(),
    });
  }
  
  private handlePing(connection: WebSocketConnection, data: any): void {
    this.sendMessage(connection, {
      type: 'pong',
      data: { ...data, serverTime: Date.now() },
      timestamp: new Date().toISOString(),
    });
  }
  
  private handleGetStats(connection: WebSocketConnection): void {
    const duration = Date.now() - (connection.stats.connectionDuration || Date.now());
    
    this.sendMessage(connection, {
      type: 'stats',
      data: {
        ...connection.stats,
        connectionDuration: Math.floor(duration / 1000),
      },
      timestamp: new Date().toISOString(),
    });
  }
  
  private handleRedisMessage(
    connection: WebSocketConnection,
    channel: string,
    message: string
  ): void {
    try {
      const parsedMessage = JSON.parse(message);
      
      // Check if this message matches subscription filters
      const shouldSend = Array.from(connection.subscriptions.values()).some(sub => {
        if (sub.messageTypes && !sub.messageTypes.includes(parsedMessage.type)) {
          return false;
        }
        
        if (!sub.includeErrors && parsedMessage.status === 'error') {
          return false;
        }
        
        return true;
      });
      
      if (shouldSend) {
        this.sendMessage(connection, {
          type: 'message',
          guildId: parsedMessage.guildId,
          topicName: parsedMessage.topicName,
          data: parsedMessage,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.fastify.log.error({ error, channel }, 'Failed to process Redis message');
    }
  }
  
  private checkRateLimit(connection: WebSocketConnection): boolean {
    const now = Date.now();
    const windowDuration = 1000; // 1 second window
    
    // Reset window if needed
    if (now - connection.windowStart >= windowDuration) {
      connection.messageCount = 0;
      connection.windowStart = now;
    }
    
    connection.messageCount++;
    
    return connection.messageCount <= config.wsMessageRateLimit;
  }
  
  private sendHeartbeats(): void {
    for (const [id, connection] of this.connections) {
      if (connection.socket.readyState === WebSocket.OPEN) {
        this.sendMessage(connection, {
          type: 'heartbeat',
          data: { ping: Date.now() },
          timestamp: new Date().toISOString(),
        });
      }
    }
  }
  
  private handleDisconnect(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;
    
    // Clean up subscriptions
    // In production, would unsubscribe from Redis channels
    
    this.connections.delete(connectionId);
  }
  
  private sendMessage(connection: WebSocketConnection, event: WebSocketEvent): void {
    if (connection.socket.readyState === WebSocket.OPEN) {
      connection.socket.send(JSON.stringify(event));
    }
  }
  
  private sendError(connection: WebSocketConnection, code: string, message: string): void {
    this.sendMessage(connection, {
      type: 'error',
      data: { code, message },
      timestamp: new Date().toISOString(),
    });
  }
  
  private generateConnectionId(): string {
    return `ws-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  close(): void {
    clearInterval(this.heartbeatInterval);
    
    // Close all connections
    for (const [id, connection] of this.connections) {
      connection.socket.close();
    }
    
    this.connections.clear();
  }
}