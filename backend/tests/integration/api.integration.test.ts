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
      // Seed Redis with topic data (guilds are discovered from topics in RusticAI)
      const redis = app.redis.command;
      const timestamp = Date.now();

      // Create a topic sorted set with a message (RusticAI pattern)
      const message = {
        id: 111,
        priority: 4,
        timestamp: timestamp,
        sender: { name: 'system' },
        topics: 'test_guild_1:general',
        recipient_list: [],
        payload: { type: 'init' },
        format: 'init_message',
        thread: [111],
        message_history: [],
        is_error_message: false
      };

      // Topics are named as "guildId:topicName" in RusticAI
      await redis.zadd('test_guild_1:general', timestamp, JSON.stringify(message));

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
      // Seed Redis with topic for the guild
      const redis = app.redis.command;
      const guildId = 'test_guild_123';
      const timestamp = Date.now();

      // Create topics for this guild
      const message = {
        id: 112,
        priority: 4,
        timestamp: timestamp,
        sender: { name: 'system' },
        topics: `${guildId}:announcements`,
        recipient_list: [],
        payload: { type: 'init' },
        format: 'init_message',
        thread: [112],
        message_history: [],
        is_error_message: false
      };

      await redis.zadd(`${guildId}:announcements`, timestamp, JSON.stringify(message));

      // Test get guild by ID
      const response = await app.inject({
        method: 'GET',
        url: `/guilds/${guildId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Test Guild 123');
      expect(body.data.namespace).toBe(guildId);
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
      // No need to seed guild hashes - guilds are discovered from topics
    });
    
    it('should list topics for a guild', async () => {
      const redis = app.redis.command;
      const guildId = 'test_guild';
      const timestamp = Date.now();

      // Create topics as sorted sets with messages (RusticAI style)
      const message = {
        id: 113,
        priority: 4,
        timestamp: timestamp,
        sender: { name: 'agent1' },
        topics: `${guildId}:general`,
        recipient_list: [{ name: 'agent2' }, { name: 'agent3' }],
        payload: { type: 'test' },
        format: 'test_message',
        thread: [113],
        message_history: [],
        is_error_message: false
      };

      await redis.zadd(`${guildId}:general`, timestamp, JSON.stringify(message));

      const response = await app.inject({
        method: 'GET',
        url: `/guilds/${guildId}/topics`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toBe('general');
    });
  });
  
  describe('Message Operations', () => {
    const guildId = 'test_guild';
    const topicName = `${guildId}:general`; // Full topic name in RusticAI format

    beforeEach(async () => {
      // No need to seed anything - topics are created when messages are added
    });
    
    it('should retrieve messages for a topic', async () => {
      const redis = app.redis.command;
      const timestamp = Date.now();
      const messageId = 123456; // RusticAI uses numeric IDs

      // Create a RusticAI-format message
      const message = {
        id: messageId,
        priority: 4,
        timestamp: timestamp,
        sender: { name: 'agent1' },
        topics: topicName,
        topic_published_to: topicName,
        recipient_list: [{ name: 'agent2' }],
        payload: {
          type: 'test',
          content: { message: 'Hello World' }
        },
        format: 'test_message',
        thread: [messageId],
        message_history: [],
        is_error_message: false,
        process_status: 'completed'
      };

      // Store message in Redis (RusticAI style)
      await redis.set(`msg:${guildId}:${messageId}`, JSON.stringify(message));

      // Add to topic sorted set (RusticAI stores full JSON in sorted set)
      await redis.zadd(
        topicName, // RusticAI uses topic name as key
        timestamp,
        JSON.stringify(message)
      );
      
      const response = await app.inject({
        method: 'GET',
        url: `/guilds/${guildId}/topics/general/messages`, // API expects just the topic name, not full key
      });
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].payload.content.message).toBe('Hello World');
    });
    
    it('should filter messages by status', async () => {
      const redis = app.redis.command;
      const timestamp = Date.now();

      // Seed messages with different statuses
      const completedId = 123457;
      const errorId = 123458;

      // Create completed message
      const completedMessage = {
        id: completedId,
        priority: 4,
        timestamp: timestamp - 1000,
        sender: { name: 'agent1' },
        topics: topicName,
        recipient_list: [],
        payload: { type: 'test', content: {} },
        format: 'test_message',
        thread: [completedId],
        message_history: [],
        is_error_message: false,
        process_status: 'completed'
      };

      // Create error message
      const errorMessage = {
        id: errorId,
        priority: 4,
        timestamp: timestamp,
        sender: { name: 'agent2' },
        topics: topicName,
        recipient_list: [],
        payload: { type: 'test', content: {} },
        format: 'test_message',
        thread: [errorId],
        message_history: [],
        is_error_message: true,
        process_status: 'error'
      };

      // Store messages
      await redis.set(`msg:${guildId}:${completedId}`, JSON.stringify(completedMessage));
      await redis.set(`msg:${guildId}:${errorId}`, JSON.stringify(errorMessage));

      // Add to topic sorted set
      await redis.zadd(topicName,
        completedMessage.timestamp, JSON.stringify(completedMessage),
        errorMessage.timestamp, JSON.stringify(errorMessage)
      );

      // Test filtering by error status
      const response = await app.inject({
        method: 'GET',
        url: `/guilds/${guildId}/topics/general/messages?status=error`, // API expects just the topic name
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].process_status).toBe('error');
      expect(body.data[0].is_error_message).toBe(true);
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