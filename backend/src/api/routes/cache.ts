import type { FastifyPluginAsync } from 'fastify';
import type { ApiResponse } from '@rustic-debug/types';
import { CacheRetentionService } from '../../services/cache/retention.js';

export const cacheRoutes: FastifyPluginAsync = async (fastify) => {
  const retentionService = new CacheRetentionService();
  
  // DELETE /cache/clear
  fastify.delete<{
    Reply: ApiResponse<{ clearedKeys: number }>;
  }>('/clear', async (request, reply) => {
    const result = await retentionService.clearAllCache();
    
    if (!result.success) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'CACHE_CLEAR_FAILED',
          message: 'Failed to clear cache',
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    return {
      success: true,
      data: {
        clearedKeys: result.clearedKeys,
      },
    };
  });
  
  // GET /cache/stats
  fastify.get<{
    Reply: ApiResponse<{
      totalKeys: number;
      totalSize: number;
      retentionDays: number;
      oldestEntry: string | null;
      newestEntry: string | null;
    }>;
  }>('/stats', async (request, reply) => {
    const stats = await retentionService.getCacheStats();
    
    return {
      success: true,
      data: {
        totalKeys: stats.totalKeys,
        totalSize: stats.totalSize,
        retentionDays: 7,
        oldestEntry: stats.oldestEntry?.toISOString() || null,
        newestEntry: stats.newestEntry?.toISOString() || null,
      },
    };
  });
  
  // POST /cache/cleanup
  fastify.post<{
    Reply: ApiResponse<{
      deletedMessages: number;
      deletedTopics: number;
      freedBytes: number;
    }>;
  }>('/cleanup', async (request, reply) => {
    const result = await retentionService.cleanupOldData();
    
    return {
      success: true,
      data: result,
    };
  });
};