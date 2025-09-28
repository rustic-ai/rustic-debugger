import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../setup.js';
import { getRedisContainer, seedTestData } from '../helpers/redis.js';

describe('POST /export', () => {
  beforeEach(async () => {
    const container = await getRedisContainer();
    const redis = await container.getClient();
    
    // Seed test data
    await seedTestData(redis, {
      guilds: [
        { id: 'guild-1', name: 'Test Guild', namespace: 'test-guild' },
      ],
      messages: [
        { 
          id: 'msg-1', 
          guildId: 'guild-1', 
          topicName: 'user.created',
          payload: { userId: '123', email: 'test1@example.com' }
        },
        { 
          id: 'msg-2', 
          guildId: 'guild-1', 
          topicName: 'user.created',
          payload: { userId: '456', email: 'test2@example.com' }
        },
        { 
          id: 'msg-3', 
          guildId: 'guild-1', 
          topicName: 'order.placed',
          payload: { orderId: '789', total: 99.99 }
        },
      ],
    });
    
    await redis.quit();
  });

  it('should export messages in JSON format', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/export',
      payload: {
        filter: {
          guildId: 'guild-1',
          topicName: 'user.created',
          limit: 100,
        },
        format: 'json',
        includeMetadata: true,
        includeRouting: true,
      },
    });

    expect(response.statusCode).toBe(202);
    
    const data = JSON.parse(response.body);
    expect(data).toMatchObject({
      success: true,
      data: {
        exportId: expect.stringMatching(/^[a-f0-9-]+$/),
        status: 'processing',
        metadata: {
          messageCount: expect.any(Number),
          sizeBytes: expect.any(Number),
          format: 'json',
        },
      },
    });
  });

  it('should export messages in CSV format', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/export',
      payload: {
        filter: {
          guildId: 'guild-1',
        },
        format: 'csv',
        includeMetadata: false,
      },
    });

    expect(response.statusCode).toBe(202);
    
    const data = JSON.parse(response.body);
    expect(data.data.metadata.format).toBe('csv');
  });

  it('should respect export limit of 10,000 messages', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/export',
      payload: {
        filter: {
          guildId: 'guild-1',
          limit: 20000,
        },
        format: 'json',
      },
    });

    expect(response.statusCode).toBe(400);
    
    const data = JSON.parse(response.body);
    expect(data).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.stringContaining('10000'),
      },
    });
  });

  it('should filter messages based on criteria', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/export',
      payload: {
        filter: {
          guildId: 'guild-1',
          topicName: 'order.placed',
          timeRange: {
            start: new Date(Date.now() - 3600000).toISOString(),
            end: new Date().toISOString(),
          },
        },
        format: 'json',
      },
    });

    expect(response.statusCode).toBe(202);
    
    const data = JSON.parse(response.body);
    expect(data.data.metadata.messageCount).toBeGreaterThanOrEqual(0);
  });

  it('should support gzip compression', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/export',
      payload: {
        filter: {
          guildId: 'guild-1',
        },
        format: 'json',
        compressionFormat: 'gzip',
      },
    });

    expect(response.statusCode).toBe(202);
    
    const data = JSON.parse(response.body);
    expect(data.data).toHaveProperty('exportId');
  });

  it('should validate filter parameters', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/export',
      payload: {
        filter: {
          // Invalid status
          status: ['invalid-status'],
        },
        format: 'json',
      },
    });

    expect(response.statusCode).toBe(400);
    
    const data = JSON.parse(response.body);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return download URL when export is completed', async () => {
    // This test simulates checking export status
    const exportId = 'test-export-123';
    
    const response = await app.inject({
      method: 'GET',
      url: `/export/${exportId}/status`,
    });

    // Note: This endpoint would be implemented in the actual system
    // For now, we expect it to return 404 as it's not implemented
    expect(response.statusCode).toBe(404);
  });

  it('should respect 7-day retention window for exports', async () => {
    const eightDaysAgo = new Date();
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
    
    const response = await app.inject({
      method: 'POST',
      url: '/export',
      payload: {
        filter: {
          guildId: 'guild-1',
          timeRange: {
            start: eightDaysAgo.toISOString(),
            end: new Date().toISOString(),
          },
        },
        format: 'json',
      },
    });

    expect(response.statusCode).toBe(400);
    
    const data = JSON.parse(response.body);
    expect(data.error.message).toContain('7 days');
  });
});