import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../setup.js';
import { getRedisContainer, seedTestData } from '../helpers/redis.js';

describe('POST /replay', () => {
  beforeEach(async () => {
    // Set feature flag for replay
    process.env.ENABLE_REPLAY = 'true';
    
    const container = await getRedisContainer();
    const redis = await container.getClient();
    
    // Seed messages for replay
    await seedTestData(redis, {
      guilds: [
        { id: 'guild-1', name: 'Test Guild', namespace: 'test-guild' },
      ],
      messages: [
        { 
          id: '0123456789abcdef', 
          guildId: 'guild-1', 
          topicName: 'user.created',
          payload: { userId: '123', action: 'created' }
        },
        { 
          id: 'fedcba9876543210', 
          guildId: 'guild-1', 
          topicName: 'user.updated',
          payload: { userId: '123', action: 'updated' }
        },
      ],
    });
    
    await redis.quit();
  });

  it('should replay messages when feature flag is enabled', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/replay',
      payload: {
        messageIds: ['0123456789abcdef', 'fedcba9876543210'],
        targetTopics: ['replay.user.created', 'replay.user.updated'],
        delayMs: 100,
        preserveTimestamps: false,
      },
    });

    expect(response.statusCode).toBe(202);
    
    const data = JSON.parse(response.body);
    expect(data).toMatchObject({
      success: true,
      data: {
        replayId: expect.stringMatching(/^[a-f0-9-]+$/),
        status: 'queued',
        progress: {
          total: 2,
          processed: 0,
          succeeded: 0,
          failed: 0,
        },
      },
    });
  });

  it('should return 403 when replay feature is disabled', async () => {
    process.env.ENABLE_REPLAY = 'false';
    
    const response = await app.inject({
      method: 'POST',
      url: '/replay',
      payload: {
        messageIds: ['0123456789abcdef'],
      },
    });

    expect(response.statusCode).toBe(403);
    
    const data = JSON.parse(response.body);
    expect(data).toMatchObject({
      success: false,
      error: {
        code: 'FEATURE_DISABLED',
        message: expect.stringContaining('Replay feature is disabled'),
      },
    });
  });

  it('should validate request payload', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/replay',
      payload: {
        // Missing required messageIds
        targetTopics: ['some.topic'],
      },
    });

    expect(response.statusCode).toBe(400);
    
    const data = JSON.parse(response.body);
    expect(data).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
      },
    });
  });

  it('should limit number of messages in single replay', async () => {
    const tooManyIds = Array.from({ length: 1001 }, (_, i) => 
      i.toString(16).padStart(16, '0')
    );
    
    const response = await app.inject({
      method: 'POST',
      url: '/replay',
      payload: {
        messageIds: tooManyIds,
      },
    });

    expect(response.statusCode).toBe(400);
    
    const data = JSON.parse(response.body);
    expect(data).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.stringContaining('1000'),
      },
    });
  });

  it('should check message existence before replay', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/replay',
      payload: {
        messageIds: ['nonexistentmessage'],
      },
    });

    expect(response.statusCode).toBe(404);
    
    const data = JSON.parse(response.body);
    expect(data).toMatchObject({
      success: false,
      error: {
        code: 'MESSAGES_NOT_FOUND',
        message: expect.any(String),
        details: {
          notFound: ['nonexistentmessage'],
        },
      },
    });
  });

  it('should support delayed replay', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/replay',
      payload: {
        messageIds: ['0123456789abcdef'],
        delayMs: 5000,
      },
    });

    expect(response.statusCode).toBe(202);
    
    const data = JSON.parse(response.body);
    expect(data.data.status).toBe('queued');
  });
});