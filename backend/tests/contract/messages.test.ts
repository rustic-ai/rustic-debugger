import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../setup.js';
import { getRedisContainer, seedTestData } from '../helpers/redis.js';

describe('GET /guilds/{guildId}/topics/{topicName}/messages', () => {
  beforeEach(async () => {
    const container = await getRedisContainer();
    const redis = await container.getClient();
    
    // Seed test messages
    const now = Date.now();
    await seedTestData(redis, {
      guilds: [
        { id: 'guild-1', name: 'Test Guild', namespace: 'test-guild' },
      ],
      messages: [
        { 
          id: 'msg-1', 
          guildId: 'guild-1', 
          topicName: 'user.created',
          payload: { userId: '123', email: 'test@example.com' }
        },
        { 
          id: 'msg-2', 
          guildId: 'guild-1', 
          topicName: 'user.created',
          payload: { userId: '456', email: 'another@example.com' }
        },
        { 
          id: 'msg-3', 
          guildId: 'guild-1', 
          topicName: 'user.updated',
          payload: { userId: '123', changes: { name: 'New Name' } }
        },
      ],
    });
    
    await redis.quit();
  });

  it('should return messages for a specific topic', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/guilds/guild-1/topics/user.created/messages',
    });

    expect(response.statusCode).toBe(200);
    
    const data = JSON.parse(response.body);
    expect(data).toMatchObject({
      success: true,
      data: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(Object),
          guildId: 'guild-1',
          topicName: 'user.created',
          payload: expect.objectContaining({
            type: expect.any(String),
            content: expect.any(Object),
          }),
          metadata: expect.objectContaining({
            sourceAgent: expect.any(String),
            timestamp: expect.any(String),
            priority: expect.any(Number),
          }),
          status: expect.objectContaining({
            current: expect.any(String),
            history: expect.any(Array),
          }),
        }),
      ]),
      meta: {
        total: expect.any(Number),
        limit: expect.any(Number),
        offset: 0,
        hasMore: expect.any(Boolean),
      },
    });
  });

  it('should filter messages by time range', async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const response = await app.inject({
      method: 'GET',
      url: `/guilds/guild-1/topics/user.created/messages?start=${yesterday.toISOString()}&end=${now.toISOString()}`,
    });

    expect(response.statusCode).toBe(200);
    
    const data = JSON.parse(response.body);
    expect(data.data.length).toBeGreaterThanOrEqual(0);
    
    // All messages should be within time range
    data.data.forEach((msg: any) => {
      const msgTime = new Date(msg.metadata.timestamp);
      expect(msgTime >= yesterday).toBe(true);
      expect(msgTime <= now).toBe(true);
    });
  });

  it('should filter messages by status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/guilds/guild-1/topics/user.created/messages?status=success,error',
    });

    expect(response.statusCode).toBe(200);
    
    const data = JSON.parse(response.body);
    const validStatuses = ['success', 'error'];
    const allValidStatus = data.data.every((msg: any) => 
      validStatuses.includes(msg.status.current)
    );
    expect(allValidStatus).toBe(true);
  });

  it('should support pagination with limit and offset', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/guilds/guild-1/topics/user.created/messages?limit=1&offset=0',
    });

    expect(response.statusCode).toBe(200);
    
    const data = JSON.parse(response.body);
    expect(data.data).toHaveLength(1);
    expect(data.meta).toMatchObject({
      limit: 1,
      offset: 0,
      hasMore: true,
    });
  });

  it('should return 404 when guild does not exist', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/guilds/non-existent/topics/user.created/messages',
    });

    expect(response.statusCode).toBe(404);
    
    const data = JSON.parse(response.body);
    expect(data).toMatchObject({
      success: false,
      error: {
        code: 'GUILD_NOT_FOUND',
        message: expect.any(String),
      },
    });
  });

  it('should return empty array when topic has no messages', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/guilds/guild-1/topics/non.existent.topic/messages',
    });

    expect(response.statusCode).toBe(200);
    
    const data = JSON.parse(response.body);
    expect(data.data).toEqual([]);
    expect(data.meta.total).toBe(0);
  });

  it('should respect 7-day retention window', async () => {
    const eightDaysAgo = new Date();
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
    
    const response = await app.inject({
      method: 'GET',
      url: `/guilds/guild-1/topics/user.created/messages?start=${eightDaysAgo.toISOString()}`,
    });

    expect(response.statusCode).toBe(400);
    
    const data = JSON.parse(response.body);
    expect(data).toMatchObject({
      success: false,
      error: {
        code: 'INVALID_TIME_RANGE',
        message: expect.stringContaining('7 days'),
      },
    });
  });
});