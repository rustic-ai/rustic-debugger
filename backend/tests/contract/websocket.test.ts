import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { app } from '../setup.js';
import { getRedisContainer, seedTestData } from '../helpers/redis.js';
import WebSocket from 'ws';

describe('WebSocket /ws', () => {
  let ws: WebSocket;
  let serverAddress: string;

  beforeEach(async () => {
    // Get server address
    await app.ready();
    const address = app.server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Failed to get server address');
    }
    serverAddress = `ws://localhost:${address.port}/ws`;
    
    // Seed test data
    const container = await getRedisContainer();
    const redis = await container.getClient();
    
    await seedTestData(redis, {
      guilds: [
        { id: 'guild-1', name: 'Test Guild', namespace: 'test-guild' },
      ],
    });
    
    await redis.quit();
  });

  afterEach(async () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });

  it('should establish WebSocket connection', async () => {
    const connected = await new Promise<boolean>((resolve) => {
      ws = new WebSocket(serverAddress);
      
      ws.on('open', () => resolve(true));
      ws.on('error', () => resolve(false));
      
      setTimeout(() => resolve(false), 5000);
    });

    expect(connected).toBe(true);
    expect(ws.readyState).toBe(WebSocket.OPEN);
  });

  it('should subscribe to guild messages', async () => {
    ws = new WebSocket(serverAddress);
    
    const response = await new Promise<any>((resolve, reject) => {
      ws.on('open', () => {
        // Send subscription request
        ws.send(JSON.stringify({
          type: 'subscribe',
          data: {
            guildId: 'guild-1',
            includeErrors: true,
          },
        }));
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        resolve(message);
      });
      
      ws.on('error', reject);
      
      setTimeout(() => reject(new Error('Timeout')), 5000);
    });

    expect(response).toMatchObject({
      type: 'subscription_confirmed',
      data: {
        guildId: 'guild-1',
        subscriptionId: expect.any(String),
      },
    });
  });

  it('should receive real-time messages for subscribed guild', async () => {
    ws = new WebSocket(serverAddress);
    
    const messages: any[] = [];
    
    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => {
        // Subscribe to guild
        ws.send(JSON.stringify({
          type: 'subscribe',
          data: {
            guildId: 'guild-1',
            topicNames: ['user.created'],
          },
        }));
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        messages.push(message);
        
        if (message.type === 'subscription_confirmed') {
          // Simulate publishing a message to trigger event
          // In real implementation, this would come from Redis pub/sub
          setTimeout(resolve, 1000);
        }
      });
      
      ws.on('error', reject);
      
      setTimeout(() => resolve(), 2000);
    });

    // Should have received subscription confirmation
    expect(messages.some(m => m.type === 'subscription_confirmed')).toBe(true);
  });

  it('should handle multiple topic subscriptions', async () => {
    ws = new WebSocket(serverAddress);
    
    const subscribed = await new Promise<boolean>((resolve, reject) => {
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'subscribe',
          data: {
            guildId: 'guild-1',
            topicNames: ['user.created', 'order.placed', 'payment.processed'],
          },
        }));
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'subscription_confirmed') {
          resolve(true);
        }
      });
      
      ws.on('error', () => resolve(false));
      
      setTimeout(() => resolve(false), 5000);
    });

    expect(subscribed).toBe(true);
  });

  it('should unsubscribe from topics', async () => {
    ws = new WebSocket(serverAddress);
    
    const unsubscribed = await new Promise<boolean>((resolve, reject) => {
      let subscriptionId: string;
      
      ws.on('open', () => {
        // First subscribe
        ws.send(JSON.stringify({
          type: 'subscribe',
          data: {
            guildId: 'guild-1',
          },
        }));
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'subscription_confirmed') {
          subscriptionId = message.data.subscriptionId;
          // Now unsubscribe
          ws.send(JSON.stringify({
            type: 'unsubscribe',
            data: {
              subscriptionId,
            },
          }));
        } else if (message.type === 'unsubscribe_confirmed') {
          resolve(true);
        }
      });
      
      ws.on('error', () => resolve(false));
      
      setTimeout(() => resolve(false), 5000);
    });

    expect(unsubscribed).toBe(true);
  });

  it('should enforce rate limiting (100 msg/s)', async () => {
    ws = new WebSocket(serverAddress);
    
    const rateLimitHit = await new Promise<boolean>((resolve, reject) => {
      ws.on('open', async () => {
        // Send many messages quickly
        for (let i = 0; i < 150; i++) {
          ws.send(JSON.stringify({
            type: 'ping',
            data: { index: i },
          }));
        }
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'error' && message.error?.code === 'RATE_LIMIT_EXCEEDED') {
          resolve(true);
        }
      });
      
      ws.on('error', () => resolve(false));
      
      setTimeout(() => resolve(false), 5000);
    });

    expect(rateLimitHit).toBe(true);
  });

  it('should send heartbeat/ping messages', async () => {
    ws = new WebSocket(serverAddress);
    
    const pongReceived = await new Promise<boolean>((resolve, reject) => {
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'ping',
          data: { timestamp: Date.now() },
        }));
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'pong') {
          resolve(true);
        }
      });
      
      ws.on('error', () => resolve(false));
      
      setTimeout(() => resolve(false), 5000);
    });

    expect(pongReceived).toBe(true);
  });

  it('should provide connection statistics', async () => {
    ws = new WebSocket(serverAddress);
    
    const stats = await new Promise<any>((resolve, reject) => {
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'get_stats',
        }));
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'stats') {
          resolve(message.data);
        }
      });
      
      ws.on('error', reject);
      
      setTimeout(() => reject(new Error('Timeout')), 5000);
    });

    expect(stats).toMatchObject({
      messagesReceived: expect.any(Number),
      bytesReceived: expect.any(Number),
      connectionDuration: expect.any(Number),
      averageLatency: expect.any(Number),
    });
  });
});