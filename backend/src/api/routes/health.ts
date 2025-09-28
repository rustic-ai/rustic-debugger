import type { FastifyPluginAsync } from 'fastify';
import type { HealthResponse } from '@rustic-debug/types';
import { checkRedisConnection } from '../../services/redis/connection.js';

const startTime = Date.now();

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{
    Reply: HealthResponse;
  }>('/', async (request, reply) => {
    const redisHealth = await checkRedisConnection();
    const cacheStats = fastify.cache.stats;
    
    let overallStatus: HealthResponse['status'] = 'healthy';
    
    // Determine overall health status
    if (!redisHealth.connected) {
      overallStatus = 'degraded';
    }
    
    const response: HealthResponse = {
      status: overallStatus,
      version: '0.0.1',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      services: {
        redis: {
          connected: redisHealth.connected,
          latency: redisHealth.latency > 0 ? redisHealth.latency : undefined,
        },
        cache: {
          size: cacheStats.size,
          hitRate: cacheStats.hitRate,
        },
      },
    };
    
    return response;
  });
};