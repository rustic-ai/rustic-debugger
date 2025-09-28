import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../setup.js';
import { getRedisContainer, seedTestData } from '../helpers/redis.js';

describe('GET /messages/{messageId}', () => {
  beforeEach(async () => {
    const container = await getRedisContainer();
    const redis = await container.getClient();
    
    // Seed test data with detailed message
    await redis.hset('msg:guild-1:0123456789abcdef', {
      guildId: 'guild-1',
      topicName: 'user.created',
      threadId: 'thread-123',
      payload: JSON.stringify({
        type: 'UserCreatedEvent',
        content: { userId: '123', email: 'test@example.com' },
        encoding: 'json',
      }),
      metadata: JSON.stringify({
        sourceAgent: 'user-service',
        targetAgent: 'notification-service',
        timestamp: new Date().toISOString(),
        ttl: 3600,
        priority: 5,
        retryCount: 0,
        maxRetries: 3,
      }),
      routing: JSON.stringify({
        source: 'user-service',
        destination: 'notification-service',
        hops: [
          {
            agentId: 'user-service',
            timestamp: new Date().toISOString(),
            action: 'forwarded',
          },
        ],
      }),
      status: JSON.stringify({
        current: 'processing',
        history: [
          {
            status: 'pending',
            timestamp: new Date(Date.now() - 1000).toISOString(),
            agentId: 'user-service',
          },
          {
            status: 'processing',
            timestamp: new Date().toISOString(),
            agentId: 'notification-service',
          },
        ],
      }),
    });
    
    await redis.quit();
  });

  it('should return complete message details by ID', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/messages/0123456789abcdef',
    });

    expect(response.statusCode).toBe(200);
    
    const data = JSON.parse(response.body);
    expect(data).toMatchObject({
      success: true,
      data: {
        id: expect.objectContaining({
          id: '0123456789abcdef',
          timestamp: expect.any(Number),
          priority: expect.any(Number),
          counter: expect.any(Number),
        }),
        guildId: 'guild-1',
        topicName: 'user.created',
        threadId: 'thread-123',
        payload: {
          type: 'UserCreatedEvent',
          content: {
            userId: '123',
            email: 'test@example.com',
          },
          encoding: 'json',
        },
        metadata: expect.objectContaining({
          sourceAgent: 'user-service',
          targetAgent: 'notification-service',
          timestamp: expect.any(String),
          priority: 5,
          retryCount: 0,
          maxRetries: 3,
        }),
        routing: expect.objectContaining({
          source: 'user-service',
          destination: 'notification-service',
          hops: expect.arrayContaining([
            expect.objectContaining({
              agentId: 'user-service',
              timestamp: expect.any(String),
              action: 'forwarded',
            }),
          ]),
        }),
        status: expect.objectContaining({
          current: 'processing',
          history: expect.any(Array),
        }),
      },
    });
  });

  it('should return 404 for non-existent message', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/messages/nonexistentmsgid',
    });

    expect(response.statusCode).toBe(404);
    
    const data = JSON.parse(response.body);
    expect(data).toMatchObject({
      success: false,
      error: {
        code: 'MESSAGE_NOT_FOUND',
        message: expect.any(String),
        timestamp: expect.any(String),
      },
    });
  });

  it('should validate message ID format', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/messages/invalid-id-format',
    });

    expect(response.statusCode).toBe(400);
    
    const data = JSON.parse(response.body);
    expect(data).toMatchObject({
      success: false,
      error: {
        code: 'INVALID_MESSAGE_ID',
        message: expect.stringContaining('Invalid message ID format'),
      },
    });
  });

  it('should include error details when message has error status', async () => {
    const container = await getRedisContainer();
    const redis = await container.getClient();
    
    // Add message with error
    await redis.hset('msg:guild-1:fedcba9876543210', {
      guildId: 'guild-1',
      topicName: 'user.created',
      status: JSON.stringify({
        current: 'error',
        history: [],
      }),
      error: JSON.stringify({
        code: 'PROCESSING_FAILED',
        message: 'Failed to send notification',
        stack: 'Error: Failed to send notification\n    at notify(...)',
        timestamp: new Date().toISOString(),
      }),
      payload: JSON.stringify({ type: 'test', content: {} }),
      metadata: JSON.stringify({
        sourceAgent: 'test',
        timestamp: new Date().toISOString(),
        priority: 0,
        retryCount: 3,
        maxRetries: 3,
      }),
      routing: JSON.stringify({ source: 'test', hops: [] }),
    });
    
    await redis.quit();

    const response = await app.inject({
      method: 'GET',
      url: '/messages/fedcba9876543210',
    });

    expect(response.statusCode).toBe(200);
    
    const data = JSON.parse(response.body);
    expect(data.data.error).toBeDefined();
    expect(data.data.error).toMatchObject({
      code: 'PROCESSING_FAILED',
      message: 'Failed to send notification',
      stack: expect.any(String),
      timestamp: expect.any(String),
    });
  });
});