import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../setup.js';
import { getRedisContainer, seedTestData } from '../helpers/redis.js';

describe('GET /guilds', () => {
  beforeEach(async () => {
    const container = await getRedisContainer();
    const redis = await container.getClient();
    
    await seedTestData(redis, {
      guilds: [
        { id: 'guild-1', name: 'Test Guild 1', namespace: 'test-guild-1' },
        { id: 'guild-2', name: 'Test Guild 2', namespace: 'test-guild-2' },
        { id: 'guild-3', name: 'Inactive Guild', namespace: 'inactive-guild' },
      ],
    });
    
    await redis.quit();
  });

  it('should return list of all guilds', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/guilds',
    });

    expect(response.statusCode).toBe(200);
    
    const data = JSON.parse(response.body);
    expect(data).toMatchObject({
      success: true,
      data: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(Object),
          name: expect.any(String),
          namespace: expect.any(String),
          status: expect.stringMatching(/^(active|idle|inactive)$/),
        }),
      ]),
      meta: {
        total: 3,
        limit: expect.any(Number),
        offset: 0,
        hasMore: false,
      },
    });
  });

  it('should support pagination', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/guilds?limit=2&offset=0',
    });

    expect(response.statusCode).toBe(200);
    
    const data = JSON.parse(response.body);
    expect(data.data).toHaveLength(2);
    expect(data.meta).toMatchObject({
      total: 3,
      limit: 2,
      offset: 0,
      hasMore: true,
    });
  });

  it('should filter by status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/guilds?status=active',
    });

    expect(response.statusCode).toBe(200);
    
    const data = JSON.parse(response.body);
    expect(data.data.every((guild: any) => guild.status === 'active')).toBe(true);
  });

  it('should sort guilds', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/guilds?sortBy=name&sortOrder=asc',
    });

    expect(response.statusCode).toBe(200);
    
    const data = JSON.parse(response.body);
    const names = data.data.map((g: any) => g.name);
    const sortedNames = [...names].sort();
    expect(names).toEqual(sortedNames);
  });

  it('should return empty array when no guilds exist', async () => {
    // Clear all data
    const container = await getRedisContainer();
    const redis = await container.getClient();
    await redis.flushall();
    await redis.quit();

    const response = await app.inject({
      method: 'GET',
      url: '/guilds',
    });

    expect(response.statusCode).toBe(200);
    
    const data = JSON.parse(response.body);
    expect(data.data).toEqual([]);
    expect(data.meta.total).toBe(0);
  });
});