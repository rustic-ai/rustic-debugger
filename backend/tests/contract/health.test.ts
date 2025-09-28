import { describe, it, expect } from 'vitest';
import { app } from '../setup.js';

describe('GET /health', () => {
  it('should return health status when service is running', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    
    const data = JSON.parse(response.body);
    expect(data).toMatchObject({
      status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
      version: expect.any(String),
      uptime: expect.any(Number),
      services: {
        redis: {
          connected: expect.any(Boolean),
          latency: expect.any(Number),
        },
        cache: {
          size: expect.any(Number),
          hitRate: expect.any(Number),
        },
      },
    });
  });

  it('should return degraded status when Redis is disconnected', async () => {
    // Simulate Redis disconnection
    process.env.REDIS_HOST = 'invalid-host';
    
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    
    const data = JSON.parse(response.body);
    expect(data.status).toBe('degraded');
    expect(data.services.redis.connected).toBe(false);
  });

  it('should include cache statistics', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    const data = JSON.parse(response.body);
    expect(data.services.cache).toBeDefined();
    expect(data.services.cache.size).toBeGreaterThanOrEqual(0);
    expect(data.services.cache.hitRate).toBeGreaterThanOrEqual(0);
    expect(data.services.cache.hitRate).toBeLessThanOrEqual(1);
  });
});