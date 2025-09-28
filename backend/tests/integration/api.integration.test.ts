import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { build } from '../../src/app.js';
import type { Guild, Topic, Message } from '@rustic-debug/types';

describe('Backend API Integration Tests', () => {
  let app: FastifyInstance;
  
  beforeAll(async () => {
    // Build the app
    app = await build({ logger: false });
  });
  
  afterAll(async () => {
    await app.close();
  });
  
  beforeEach(async () => {
    // Clear Redis data between tests
    const redis = app.redis;
    if (redis?.command) {
      await redis.command.flushdb();
    }
  });
  
  describe('Guild Operations', () => {
    it('should discover guilds from Redis patterns', async () => {
      // Seed Redis with guild data
      const redis = app.redis.command;
      
      await redis.hset('guild:test-guild-1', 
        'name', 'Test Guild 1',
        'status', 'active',
        'description', 'Test guild description',
        'namespace', 'test',
        'createdAt', new Date().toISOString(),
        'updatedAt', new Date().toISOString()
      );
      
      // Add guild ID to the guilds set
      await redis.sadd('guilds', 'test-guild-1');
      
      // Test guild discovery
      const response = await app.inject({
        method: 'GET',
        url: '/guilds',
      });
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toBe('Test Guild 1');
    });
    
    it('should get guild by ID', async () => {
      // Seed Redis with guild data
      const redis = app.redis.command;
      const guildId = 'test-guild-123';
      
      await redis.hset(`guild:${guildId}`,
        'name', 'Specific Guild',
        'status', 'active',
        'namespace', 'test',
        'createdAt', new Date().toISOString(),
        'updatedAt', new Date().toISOString()
      );
      
      // Test get guild by ID
      const response = await app.inject({
        method: 'GET',
        url: `/guilds/${guildId}`,
      });
      
      expect(response.statusCode).toBe(200);
      const guild: Guild = JSON.parse(response.body);
      expect(guild.name).toBe('Specific Guild');
      expect(guild.id.id).toBe(guildId);
    });
    
    it('should return 404 for non-existent guild', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/guilds/non-existent-guild',
      });
      
      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('GUILD_NOT_FOUND');
    });
  });
  
  describe('Topic Operations', () => {
    beforeEach(async () => {
      // Seed guild for topic tests
      const redis = app.redis.command;
      
      await redis.hset('guild:test-guild',
        'name', 'Test Guild',
        'status', 'active',
        'namespace', 'test',
        'createdAt', new Date().toISOString(),
        'updatedAt', new Date().toISOString()
      );
    });
    
    it('should list topics for a guild', async () => {
      const redis = app.redis.command;
      const guildId = 'test-guild';
      
      // Create the topic sorted set with a dummy message
      const dummyMessageId = 'dummy-message-id';
      await redis.zadd(`topic:${guildId}:general`, Date.now(), dummyMessageId);
      
      // Create message metadata so the topic model can discover publishers/subscribers
      await redis.hset(`msg:${guildId}:${dummyMessageId}`,
        'metadata', JSON.stringify({
          sourceAgent: 'agent1',
          targetAgent: 'agent2',
          timestamp: new Date().toISOString(),
          priority: 1,
          retryCount: 0,
          maxRetries: 3,
        })
      );
      
      // Add publishers and subscribers sets (not used by TopicModel, but kept for consistency)
      await redis.sadd(`topic:${guildId}:general:publishers`, 'agent1');
      await redis.sadd(`topic:${guildId}:general:subscribers`, 'agent2', 'agent3');
      
      
      const response = await app.inject({
        method: 'GET',
        url: `/guilds/${guildId}/topics`,
      });
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toBe('general');
      expect(body.data[0].publishers).toContain('agent1');
      expect(body.data[0].subscribers).toContain('agent2');
    });
  });
  
  describe('Message Operations', () => {
    const guildId = 'test-guild';
    const topicName = 'general';
    
    beforeEach(async () => {
      // Seed guild and topic
      const redis = app.redis.command;
      
      await redis.hset(`guild:${guildId}`,
        'name', 'Test Guild',
        'status', 'active',
        'namespace', 'test',
        'createdAt', new Date().toISOString(),
        'updatedAt', new Date().toISOString()
      );
      
      // Create topic as a sorted set (topics are represented as sorted sets, not hashes)
      await redis.zadd(`topic:${guildId}:${topicName}`, Date.now(), 'init-message');
    });
    
    it('should retrieve messages for a topic', async () => {
      const redis = app.redis.command;
      const messageId = `${Date.now().toString(36)}-test`;
      
      // Seed message data using multiple field-value pairs
      await redis.hset(`msg:${guildId}:${messageId}`,
        'guildId', guildId,
        'topicName', topicName,
        'payload', JSON.stringify({
          type: 'test',
          content: { message: 'Hello World' },
        }),
        'metadata', JSON.stringify({
          sourceAgent: 'agent1',
          timestamp: new Date().toISOString(),
          priority: 1,
          retryCount: 0,
          maxRetries: 3,
        }),
        'status', JSON.stringify({
          current: 'success',
          history: [],
        }),
        'routing', JSON.stringify({
          source: 'agent1',
          destination: 'agent2',
          hops: [],
        })
      );
      
      // Add to topic messages set
      await redis.zadd(
        `topic:${guildId}:${topicName}`,
        Date.now(),
        messageId
      );
      
      const response = await app.inject({
        method: 'GET',
        url: `/guilds/${guildId}/topics/${topicName}/messages`,
      });
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].payload.content.message).toBe('Hello World');
    });
    
    it('should filter messages by status', async () => {
      const redis = app.redis.command;
      
      // Seed messages with different statuses
      const successId = `${Date.now().toString(36)}-success`;
      const errorId = `${Date.now().toString(36)}-error`;
      
      await redis.hset(`msg:${guildId}:${successId}`,
        'guildId', guildId,
        'topicName', topicName,
        'payload', JSON.stringify({ type: 'test', content: {} }),
        'metadata', JSON.stringify({
          sourceAgent: 'agent1',
          timestamp: new Date().toISOString(),
          priority: 1,
          retryCount: 0,
          maxRetries: 3,
        }),
        'status', JSON.stringify({ current: 'success', history: [] }),
        'routing', JSON.stringify({ source: 'agent1', hops: [] })
      );
      
      await redis.hset(`msg:${guildId}:${errorId}`,
        'guildId', guildId,
        'topicName', topicName,
        'payload', JSON.stringify({ type: 'test', content: {} }),
        'metadata', JSON.stringify({
          sourceAgent: 'agent2',
          timestamp: new Date().toISOString(),
          priority: 1,
          retryCount: 3,
          maxRetries: 3,
        }),
        'status', JSON.stringify({ current: 'error', history: [] }),
        'routing', JSON.stringify({ source: 'agent2', hops: [] }),
        'error', JSON.stringify({
          code: 'TEST_ERROR',
          message: 'Test error',
          timestamp: new Date().toISOString(),
        })
      );
      
      await redis.zadd(`topic:${guildId}:${topicName}`, 
        Date.now() - 1000, successId,
        Date.now(), errorId
      );
      
      // Test filtering by error status
      const response = await app.inject({
        method: 'GET',
        url: `/guilds/${guildId}/topics/${topicName}/messages?status=error`,
      });
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].status.current).toBe('error');
      expect(body.data[0].error).toBeDefined();
    });
  });
  
  describe('Health Check', () => {
    it('should return healthy status with Redis connected', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('healthy');
      expect(body.services.redis.connected).toBe(true);
      expect(body.version).toBeDefined();
    });
  });
  
  describe('Export Operations', () => {
    beforeEach(async () => {
      // Seed test data
      const redis = app.redis.command;
      const guildId = 'export-guild';
      
      await redis.hset(`guild:${guildId}`,
        'name', 'Export Guild',
        'status', 'active',
        'namespace', 'test',
        'createdAt', new Date().toISOString(),
        'updatedAt', new Date().toISOString()
      );
      
      // Add multiple messages
      for (let i = 0; i < 5; i++) {
        const messageId = `${Date.now().toString(36)}-${i}`;
        await redis.hset(`msg:${guildId}:${messageId}`,
          'guildId', guildId,
          'topicName', 'general',
          'payload', JSON.stringify({
            type: 'test',
            content: { index: i },
          }),
          'metadata', JSON.stringify({
            sourceAgent: `agent${i % 2}`,
            timestamp: new Date().toISOString(),
            priority: 1,
            retryCount: 0,
            maxRetries: 3,
          }),
          'status', JSON.stringify({
            current: i % 3 === 0 ? 'error' : 'success',
            history: [],
          }),
          'routing', JSON.stringify({
            source: `agent${i % 2}`,
            hops: [],
          })
        );
        
        await redis.zadd(`topic:${guildId}:general`, Date.now() + i, messageId);
      }
    });
    
    it('should export messages in JSON format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/export',
        payload: {
          filter: {
            guildId: 'export-guild',
          },
          format: 'json',
          includeMetadata: true,
        },
      });
      
      expect(response.statusCode).toBe(202);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.exportId).toBeDefined();
      expect(body.data.status).toBe('processing');
      expect(body.data.metadata.messageCount).toBeDefined();
    });
  });
});