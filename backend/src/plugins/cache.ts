import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyInstance } from 'fastify';
import { config } from '../config/index.js';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private hits = 0;
  private misses = 0;
  
  constructor(private maxSize: number) {}
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return null;
    }
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    
    this.hits++;
    return entry.data;
  }
  
  set<T>(key: string, data: T, ttl: number = config.cacheTtl): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }
  
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
  
  get size(): number {
    return this.cache.size;
  }
  
  get hitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }
  
  get stats() {
    return {
      size: this.size,
      hitRate: this.hitRate,
      hits: this.hits,
      misses: this.misses,
    };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    cache: SimpleCache;
  }
}

const cachePlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const cache = new SimpleCache(config.cacheSize);
  
  fastify.decorate('cache', cache);
  
  // Clear cache on close
  fastify.addHook('onClose', async () => {
    cache.clear();
  });
};

export default fp(cachePlugin, {
  name: 'cache',
  dependencies: [],
});