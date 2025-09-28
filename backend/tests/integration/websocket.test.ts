import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import WebSocket from 'ws';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { build } from '../../src/app.js';
import type { WebSocketMessage, StreamSubscription } from '@rustic-debug/types';

describe('WebSocket Integration Tests', () => {
  let app: FastifyInstance;
  let redisContainer: StartedTestContainer;
  let wsUrl: string;
  
  beforeAll(async () => {
    // Start Redis container
    redisContainer = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .start();
    
    // Set Redis connection env vars
    process.env.REDIS_HOST = redisContainer.getHost();
    process.env.REDIS_PORT = redisContainer.getMappedPort(6379).toString();
    
    // Build and start the app
    app = await build();
    await app.listen({ port: 0 });
    
    // Get the WebSocket URL
    const address = app.server.address();
    const port = typeof address === 'object' ? address?.port : null;
    wsUrl = `ws://localhost:${port}/ws`;
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  }, 30000);
  
  afterAll(async () => {
    await app.close();
    await redisContainer.stop();
  });
  
  beforeEach(async () => {
    // Clear Redis data between tests
    const redis = (app as any).redis;
    if (redis) {
      await redis.flushdb();
    }
  });
  
  describe('Connection Lifecycle', () => {
    it('should establish WebSocket connection', async () => {
      const ws = new WebSocket(wsUrl);
      
      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve());
        ws.on('error', reject);
      });
      
      expect(ws.readyState).toBe(WebSocket.OPEN);
      
      ws.close();
    });
    
    it('should receive connected event on connection', async () => {
      const ws = new WebSocket(wsUrl);
      
      const connectedEvent = await new Promise<any>((resolve, reject) => {
        ws.on('message', (data) => {
          const event = JSON.parse(data.toString());
          if (event.type === 'connected') {
            resolve(event);
          }
        });
        ws.on('error', reject);
        setTimeout(() => reject(new Error('Timeout waiting for connected event')), 5000);
      });
      
      expect(connectedEvent.type).toBe('connected');
      expect(connectedEvent.data.connectionId).toBeDefined();
      
      ws.close();
    });
    
    it('should handle ping/pong heartbeat', async () => {
      const ws = new WebSocket(wsUrl);
      
      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve());
        ws.on('error', reject);
      });
      
      // Send ping
      const pingMessage: WebSocketMessage = {
        type: 'ping',
        data: { timestamp: Date.now() },
      };
      ws.send(JSON.stringify(pingMessage));
      
      // Wait for pong
      const pongEvent = await new Promise<any>((resolve, reject) => {
        ws.on('message', (data) => {
          const event = JSON.parse(data.toString());
          if (event.type === 'pong') {
            resolve(event);
          }
        });
        setTimeout(() => reject(new Error('Timeout waiting for pong')), 2000);
      });
      
      expect(pongEvent.type).toBe('pong');
      expect(pongEvent.data.timestamp).toBe(pingMessage.data.timestamp);
      
      ws.close();
    });
  });
  
  describe('Subscription Management', () => {
    beforeEach(async () => {
      // Seed test data
      const redis = (app as any).redis;
      await redis.hset('guild:test-guild', {
        name: 'Test Guild',
        status: 'active',
        namespace: 'test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      await redis.hset('topic:test-guild:general', {
        type: 'broadcast',
        retention: 86400,
        createdAt: new Date().toISOString(),
      });
    });
    
    it('should subscribe to guild messages', async () => {
      const ws = new WebSocket(wsUrl);
      
      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve());
        ws.on('error', reject);
      });
      
      // Subscribe to guild
      const subscription: StreamSubscription = {
        guildId: 'test-guild',
      };
      
      const subscribeMessage: WebSocketMessage = {
        type: 'subscribe',
        data: subscription,
      };
      
      ws.send(JSON.stringify(subscribeMessage));
      
      // Wait for subscription confirmation
      const confirmationEvent = await new Promise<any>((resolve, reject) => {
        ws.on('message', (data) => {
          const event = JSON.parse(data.toString());
          if (event.type === 'subscription_confirmed') {
            resolve(event);
          }
        });
        setTimeout(() => reject(new Error('Timeout waiting for subscription confirmation')), 5000);
      });
      
      expect(confirmationEvent.type).toBe('subscription_confirmed');
      expect(confirmationEvent.data.subscriptionId).toBeDefined();
      expect(confirmationEvent.data.guildId).toBe('test-guild');
      
      ws.close();
    });
    
    it('should subscribe to specific topics', async () => {
      const ws = new WebSocket(wsUrl);
      
      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve());
        ws.on('error', reject);
      });
      
      // Subscribe to specific topics
      const subscription: StreamSubscription = {
        guildId: 'test-guild',
        topicNames: ['general', 'notifications'],
      };
      
      const subscribeMessage: WebSocketMessage = {
        type: 'subscribe',
        data: subscription,
      };
      
      ws.send(JSON.stringify(subscribeMessage));
      
      // Wait for subscription confirmation
      const confirmationEvent = await new Promise<any>((resolve, reject) => {
        ws.on('message', (data) => {
          const event = JSON.parse(data.toString());
          if (event.type === 'subscription_confirmed') {
            resolve(event);
          }
        });
        setTimeout(() => reject(new Error('Timeout waiting for subscription confirmation')), 5000);
      });
      
      expect(confirmationEvent.type).toBe('subscription_confirmed');
      expect(confirmationEvent.data.topicNames).toEqual(['general', 'notifications']);
      
      ws.close();
    });
    
    it('should unsubscribe from messages', async () => {
      const ws = new WebSocket(wsUrl);
      
      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve());
        ws.on('error', reject);
      });
      
      // First subscribe
      const subscribeMessage: WebSocketMessage = {
        type: 'subscribe',
        data: { guildId: 'test-guild' },
      };
      ws.send(JSON.stringify(subscribeMessage));
      
      // Wait for subscription confirmation
      const confirmationEvent = await new Promise<any>((resolve, reject) => {
        ws.on('message', (data) => {
          const event = JSON.parse(data.toString());
          if (event.type === 'subscription_confirmed') {
            resolve(event);
          }
        });
      });
      
      // Now unsubscribe
      const unsubscribeMessage: WebSocketMessage = {
        type: 'unsubscribe',
        data: { subscriptionId: confirmationEvent.data.subscriptionId },
      };
      ws.send(JSON.stringify(unsubscribeMessage));
      
      // Wait for unsubscribe confirmation
      const unsubscribeEvent = await new Promise<any>((resolve, reject) => {
        ws.on('message', (data) => {
          const event = JSON.parse(data.toString());
          if (event.type === 'unsubscribe_confirmed') {
            resolve(event);
          }
        });
        setTimeout(() => reject(new Error('Timeout waiting for unsubscribe confirmation')), 5000);
      });
      
      expect(unsubscribeEvent.type).toBe('unsubscribe_confirmed');
      expect(unsubscribeEvent.data.subscriptionId).toBe(confirmationEvent.data.subscriptionId);
      
      ws.close();
    });
  });
  
  describe('Message Streaming', () => {
    it('should receive live messages for subscribed guild', async () => {
      const ws = new WebSocket(wsUrl);
      const redis = (app as any).redis;
      
      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve());
        ws.on('error', reject);
      });
      
      // Subscribe to guild
      ws.send(JSON.stringify({
        type: 'subscribe',
        data: { guildId: 'test-guild' },
      }));
      
      // Wait for subscription confirmation
      await new Promise<void>((resolve) => {
        ws.on('message', (data) => {
          const event = JSON.parse(data.toString());
          if (event.type === 'subscription_confirmed') {
            resolve();
          }
        });
      });
      
      // Simulate a message being published to Redis
      const messageId = `${Date.now().toString(36)}-test`;
      const messageData = {
        guildId: 'test-guild',
        topicName: 'general',
        payload: JSON.stringify({
          type: 'test',
          content: { message: 'Live test message' },
        }),
        metadata: JSON.stringify({
          sourceAgent: 'test-agent',
          timestamp: new Date().toISOString(),
          priority: 1,
          retryCount: 0,
          maxRetries: 3,
        }),
        status: JSON.stringify({
          current: 'pending',
          history: [],
        }),
        routing: JSON.stringify({
          source: 'test-agent',
          hops: [],
        }),
      };
      
      // Store message in Redis
      await redis.hset(`msg:test-guild:general:${messageId}`, messageData);
      
      // Publish message event
      await redis.publish('messages:test-guild:general', JSON.stringify({
        id: { id: messageId, timestamp: Date.now() },
        ...messageData,
        payload: JSON.parse(messageData.payload),
        metadata: JSON.parse(messageData.metadata),
        status: JSON.parse(messageData.status),
        routing: JSON.parse(messageData.routing),
      }));
      
      // Wait for message event
      const messageEvent = await new Promise<any>((resolve, reject) => {
        ws.on('message', (data) => {
          const event = JSON.parse(data.toString());
          if (event.type === 'message') {
            resolve(event);
          }
        });
        setTimeout(() => reject(new Error('Timeout waiting for message event')), 5000);
      });
      
      expect(messageEvent.type).toBe('message');
      expect(messageEvent.data.id.id).toBe(messageId);
      expect(messageEvent.data.payload.content.message).toBe('Live test message');
      
      ws.close();
    });
    
    it('should only receive messages for subscribed topics', async () => {
      const ws = new WebSocket(wsUrl);
      const redis = (app as any).redis;
      const receivedMessages: any[] = [];
      
      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve());
        ws.on('error', reject);
      });
      
      // Subscribe to specific topic
      ws.send(JSON.stringify({
        type: 'subscribe',
        data: { 
          guildId: 'test-guild',
          topicNames: ['general'],
        },
      }));
      
      // Wait for subscription confirmation
      await new Promise<void>((resolve) => {
        ws.on('message', (data) => {
          const event = JSON.parse(data.toString());
          if (event.type === 'subscription_confirmed') {
            resolve();
          }
        });
      });
      
      // Collect messages
      ws.on('message', (data) => {
        const event = JSON.parse(data.toString());
        if (event.type === 'message') {
          receivedMessages.push(event);
        }
      });
      
      // Publish to subscribed topic
      await redis.publish('messages:test-guild:general', JSON.stringify({
        id: { id: 'msg-1', timestamp: Date.now() },
        guildId: 'test-guild',
        topicName: 'general',
        payload: { type: 'test', content: {} },
      }));
      
      // Publish to unsubscribed topic
      await redis.publish('messages:test-guild:notifications', JSON.stringify({
        id: { id: 'msg-2', timestamp: Date.now() },
        guildId: 'test-guild',
        topicName: 'notifications',
        payload: { type: 'test', content: {} },
      }));
      
      // Wait a bit for messages
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Should only receive the message from 'general' topic
      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].data.id.id).toBe('msg-1');
      expect(receivedMessages[0].data.topicName).toBe('general');
      
      ws.close();
    });
  });
  
  describe('Connection Stats', () => {
    it('should retrieve connection statistics', async () => {
      const ws = new WebSocket(wsUrl);
      
      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve());
        ws.on('error', reject);
      });
      
      // Request stats
      ws.send(JSON.stringify({ type: 'get_stats' }));
      
      // Wait for stats response
      const statsEvent = await new Promise<any>((resolve, reject) => {
        ws.on('message', (data) => {
          const event = JSON.parse(data.toString());
          if (event.type === 'stats') {
            resolve(event);
          }
        });
        setTimeout(() => reject(new Error('Timeout waiting for stats')), 2000);
      });
      
      expect(statsEvent.type).toBe('stats');
      expect(statsEvent.data.connectedClients).toBeGreaterThanOrEqual(1);
      expect(statsEvent.data.activeSubscriptions).toBeGreaterThanOrEqual(0);
      expect(statsEvent.data.messagesPerMinute).toBeDefined();
      expect(statsEvent.data.averageLatency).toBeDefined();
      
      ws.close();
    });
  });
  
  describe('Error Handling', () => {
    it('should handle invalid message format', async () => {
      const ws = new WebSocket(wsUrl);
      
      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve());
        ws.on('error', reject);
      });
      
      // Send invalid JSON
      ws.send('invalid json');
      
      // Wait for error event
      const errorEvent = await new Promise<any>((resolve, reject) => {
        ws.on('message', (data) => {
          const event = JSON.parse(data.toString());
          if (event.type === 'error') {
            resolve(event);
          }
        });
        setTimeout(() => reject(new Error('Timeout waiting for error event')), 2000);
      });
      
      expect(errorEvent.type).toBe('error');
      expect(errorEvent.data.error.code).toBe('INVALID_MESSAGE');
      
      ws.close();
    });
    
    it('should handle unknown message type', async () => {
      const ws = new WebSocket(wsUrl);
      
      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve());
        ws.on('error', reject);
      });
      
      // Send unknown message type
      ws.send(JSON.stringify({ type: 'unknown_type', data: {} }));
      
      // Wait for error event
      const errorEvent = await new Promise<any>((resolve, reject) => {
        ws.on('message', (data) => {
          const event = JSON.parse(data.toString());
          if (event.type === 'error') {
            resolve(event);
          }
        });
        setTimeout(() => reject(new Error('Timeout waiting for error event')), 2000);
      });
      
      expect(errorEvent.type).toBe('error');
      expect(errorEvent.data.error.code).toBe('UNKNOWN_MESSAGE_TYPE');
      
      ws.close();
    });
  });
});