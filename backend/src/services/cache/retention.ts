import { config } from '../../config/index.js';
import { getRedisClients } from '../redis/connection.js';

export class CacheRetentionService {
  private retentionDays = config.messageRetentionDays;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  /**
   * Start automatic cache cleanup process
   */
  startRetentionPolicy(): void {
    // Run cleanup daily
    this.cleanupInterval = setInterval(
      () => this.cleanupOldData(),
      24 * 60 * 60 * 1000 // 24 hours
    );
    
    // Run initial cleanup
    this.cleanupOldData();
  }
  
  /**
   * Stop automatic cleanup
   */
  stopRetentionPolicy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
  
  /**
   * Clean up data older than retention window
   */
  async cleanupOldData(): Promise<{
    deletedMessages: number;
    deletedTopics: number;
    freedBytes: number;
  }> {
    const { command: redis } = await getRedisClients();
    const cutoffTime = Date.now() - (this.retentionDays * 24 * 60 * 60 * 1000);
    
    let deletedMessages = 0;
    let deletedTopics = 0;
    let freedBytes = 0;
    
    try {
      // Get all guild topic keys
      const topicKeys = await redis.keys('topic:*');
      
      for (const topicKey of topicKeys) {
        // Remove old messages from sorted sets
        const removed = await redis.zremrangebyscore(topicKey, '-inf', cutoffTime);
        deletedMessages += removed;
        
        // Check if topic is now empty
        const remaining = await redis.zcard(topicKey);
        if (remaining === 0) {
          await redis.del(topicKey);
          deletedTopics++;
        }
      }
      
      // Clean up old message data
      const messageKeys = await redis.keys('msg:*');
      const pipeline = redis.pipeline();
      
      for (const msgKey of messageKeys) {
        // Get message timestamp
        const timestamp = await redis.hget(msgKey, 'timestamp');
        if (timestamp) {
          const msgTime = new Date(timestamp).getTime();
          if (msgTime < cutoffTime) {
            pipeline.del(msgKey);
            deletedMessages++;
          }
        }
      }
      
      await pipeline.exec();
      
      // Estimate freed space (rough estimate)
      freedBytes = deletedMessages * 1024; // Assume ~1KB per message
      
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
    
    return {
      deletedMessages,
      deletedTopics,
      freedBytes,
    };
  }
  
  /**
   * Clear all cached data (user-initiated)
   */
  async clearAllCache(): Promise<{
    success: boolean;
    clearedKeys: number;
  }> {
    const { command: redis } = await getRedisClients();
    
    try {
      // Get all our keys (using prefix)
      const keys = await redis.keys(`${config.redisKeyPrefix}*`);
      
      if (keys.length > 0) {
        // Delete in batches to avoid blocking
        const batchSize = 1000;
        for (let i = 0; i < keys.length; i += batchSize) {
          const batch = keys.slice(i, i + batchSize);
          await redis.del(...batch);
        }
      }
      
      return {
        success: true,
        clearedKeys: keys.length,
      };
    } catch (error) {
      console.error('Cache clear error:', error);
      return {
        success: false,
        clearedKeys: 0,
      };
    }
  }
  
  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalKeys: number;
    totalSize: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  }> {
    const { command: redis } = await getRedisClients();
    
    const keys = await redis.keys(`${config.redisKeyPrefix}*`);
    const info = await redis.info('memory');
    
    // Parse memory usage from INFO command
    const memMatch = info.match(/used_memory:(\d+)/);
    const totalSize = memMatch ? parseInt(memMatch[1], 10) : 0;
    
    // Get date range (simplified - would scan samples in production)
    let oldestEntry: Date | null = null;
    let newestEntry: Date | null = null;
    
    return {
      totalKeys: keys.length,
      totalSize,
      oldestEntry,
      newestEntry,
    };
  }
}