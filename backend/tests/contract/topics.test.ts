import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../setup.js';
import { getRedisContainer, seedTestData } from '../helpers/redis.js';

describe('GET /guilds/{guildId}/topics', () => {
  beforeEach(async () => {
    const container = await getRedisContainer();
    const redis = await container.getClient();
    
    // Seed test data
    await seedTestData(redis, {
      guilds: [
        { id: 'guild-1', name: 'Test Guild', namespace: 'test-guild' },
      ],
      messages: [
        { id: 'msg-1', guildId: 'guild-1', topicName: 'user.created', payload: {} },
        { id: 'msg-2', guildId: 'guild-1', topicName: 'user.created', payload: {} },
        { id: 'msg-3', guildId: 'guild-1', topicName: 'order.placed', payload: {} },
        { id: 'msg-4', guildId: 'guild-1', topicName: 'payment.processed', payload: {} },
      ],
    });
    
    await redis.quit();
  });

  it('should return list of topics for a guild', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/guilds/guild-1/topics',
    });

    expect(response.statusCode).toBe(200);
    
    const data = JSON.parse(response.body);
    expect(data).toMatchObject({
      success: true,
      data: expect.arrayContaining([
        expect.objectContaining({
          name: expect.any(String),
          guildId: 'guild-1',
          type: expect.stringMatching(/^(direct|broadcast|queue)$/),
          subscribers: expect.any(Array),
          publishers: expect.any(Array),
          metadata: expect.objectContaining({
            messageCount: expect.any(Number),
            bytesTransferred: expect.any(Number),
            avgMessageSize: expect.any(Number),
            createdAt: expect.any(String),
          }),
          config: expect.any(Object),
        }),
      ]),
    });
  });

  it('should return 404 for non-existent guild', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/guilds/non-existent/topics',
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

  it('should include topic statistics when requested', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/guilds/guild-1/topics?includeStats=true',
    });

    expect(response.statusCode).toBe(200);
    
    const data = JSON.parse(response.body);
    const topics = data.data;
    
    expect(topics[0]).toHaveProperty('stats');
    expect(topics[0].stats).toMatchObject({
      topicName: expect.any(String),
      guildId: 'guild-1',
      period: {
        start: expect.any(String),
        end: expect.any(String),
      },
      metrics: {
        messageCount: expect.any(Number),
        errorCount: expect.any(Number),
        throughput: expect.any(Number),
        avgLatency: expect.any(Number),
        p95Latency: expect.any(Number),
        p99Latency: expect.any(Number),
      },
    });
  });

  it('should filter topics by type', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/guilds/guild-1/topics?type=broadcast',
    });

    expect(response.statusCode).toBe(200);
    
    const data = JSON.parse(response.body);
    const allBroadcast = data.data.every((topic: any) => topic.type === 'broadcast');
    expect(allBroadcast).toBe(true);
  });

  it('should return empty array when guild has no topics', async () => {
    // Create guild with no topics
    const container = await getRedisContainer();
    const redis = await container.getClient();
    await redis.flushall();
    await seedTestData(redis, {
      guilds: [{ id: 'empty-guild', name: 'Empty Guild', namespace: 'empty-guild' }],
    });
    await redis.quit();

    const response = await app.inject({
      method: 'GET',
      url: '/guilds/empty-guild/topics',
    });

    expect(response.statusCode).toBe(200);
    
    const data = JSON.parse(response.body);
    expect(data.data).toEqual([]);
  });
});