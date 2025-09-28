import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import WebSocket from 'ws';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { build } from '../../src/app.js';
import type { Message, Guild, Topic } from '@rustic-debug/types';

describe('End-to-End Data Flow Tests', () => {
  let app: FastifyInstance;
  let redisContainer: StartedTestContainer;
  let wsUrl: string;
  let apiUrl: string;
  
  beforeAll(async () => {
    // Start Redis container
    redisContainer = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .start();
    
    // Set Redis connection env vars
    process.env.REDIS_HOST = redisContainer.getHost();
    process.env.REDIS_PORT = redisContainer.getMappedPort(6379).toString();
    
    // Build and start the app
    app = await build();
    await app.listen({ port: 0 });
    
    // Get URLs
    const address = app.server.address();
    const port = typeof address === 'object' ? address?.port : null;
    apiUrl = `http://localhost:${port}`;
    wsUrl = `ws://localhost:${port}/ws`;
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  }, 30000);
  
  afterAll(async () => {
    await app.close();
    await redisContainer.stop();
  });
  
  beforeEach(async () => {
    // Clear Redis data between tests
    const redis = (app as any).redis;
    if (redis) {
      await redis.flushdb();
    }
  });
  
  describe('Complete Message Flow', () => {
    it('should handle full message lifecycle from creation to retrieval', async () => {
      const redis = (app as any).redis;
      
      // 1. Create guild and topic
      const guildId = 'flow-test-guild';
      await redis.hset(`guild:${guildId}`, {
        name: 'Flow Test Guild',
        status: 'active',
        namespace: 'test',
        description: 'Guild for data flow testing',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      await redis.hset(`topic:${guildId}:general`, {
        type: 'broadcast',
        retention: 86400,
        createdAt: new Date().toISOString(),
      });
      await redis.sadd(`topic:${guildId}:general:publishers`, 'agent1');
      await redis.sadd(`topic:${guildId}:general:subscribers`, 'agent2', 'agent3');
      
      // 2. Connect WebSocket and subscribe
      const ws = new WebSocket(wsUrl);
      const receivedMessages: any[] = [];
      
      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve());
        ws.on('error', reject);
      });
      
      ws.on('message', (data) => {
        const event = JSON.parse(data.toString());
        if (event.type === 'message') {
          receivedMessages.push(event);
        }
      });
      
      // Subscribe to guild
      ws.send(JSON.stringify({
        type: 'subscribe',
        data: { guildId },
      }));
      
      // Wait for subscription confirmation
      await new Promise<void>((resolve) => {
        ws.on('message', (data) => {
          const event = JSON.parse(data.toString());
          if (event.type === 'subscription_confirmed') {
            resolve();
          }
        });
      });
      
      // 3. Create a message in Redis
      const messageId = `${Date.now().toString(36)}-flow-test`;
      const message = {
        id: { id: messageId, timestamp: Date.now() },
        guildId,
        topicName: 'general',
        threadId: null,
        payload: {
          type: 'action',
          content: { 
            action: 'test',
            data: { value: 'flow test data' },
          },
        },
        metadata: {
          sourceAgent: 'agent1',
          timestamp: new Date().toISOString(),
          priority: 1,
          retryCount: 0,
          maxRetries: 3,
        },
        status: {
          current: 'pending' as const,
          history: [{
            status: 'pending' as const,
            timestamp: new Date().toISOString(),
            message: 'Message created',
          }],
        },
        routing: {
          source: 'agent1',
          destination: 'agent2',
          hops: [],
        },
      };
      
      // Store message
      await redis.hset(`msg:${guildId}:general:${messageId}`, {
        guildId: message.guildId,
        topicName: message.topicName,
        payload: JSON.stringify(message.payload),
        metadata: JSON.stringify(message.metadata),
        status: JSON.stringify(message.status),
        routing: JSON.stringify(message.routing),
      });
      
      // Add to sorted set
      await redis.zadd(`messages:${guildId}:general`, Date.now(), messageId);
      
      // 4. Publish message event
      await redis.publish(`messages:${guildId}:general`, JSON.stringify(message));
      
      // 5. Wait for WebSocket to receive the message
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].data.id.id).toBe(messageId);
      expect(receivedMessages[0].data.payload.content.data.value).toBe('flow test data');
      
      // 6. Retrieve via REST API
      const response = await app.inject({
        method: 'GET',
        url: `/guilds/${guildId}/topics/general/messages`,
      });
      
      expect(response.statusCode).toBe(200);
      const apiData = JSON.parse(response.body);
      expect(apiData.success).toBe(true);
      expect(apiData.data).toHaveLength(1);
      expect(apiData.data[0].id.id).toBe(messageId);
      
      // 7. Update message status
      const updatedStatus = {
        current: 'success' as const,
        history: [
          ...message.status.history,
          {
            status: 'processing' as const,
            timestamp: new Date().toISOString(),
            message: 'Processing started',
          },
          {
            status: 'success' as const,
            timestamp: new Date().toISOString(),
            message: 'Processing completed',
          },
        ],
      };
      
      await redis.hset(`msg:${guildId}:general:${messageId}`, {
        status: JSON.stringify(updatedStatus),
      });
      
      // Publish status update
      await redis.publish(`messages:${guildId}:general`, JSON.stringify({
        ...message,
        status: updatedStatus,
      }));
      
      // 8. Verify status update received via WebSocket
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(receivedMessages).toHaveLength(2);
      expect(receivedMessages[1].data.status.current).toBe('success');
      expect(receivedMessages[1].data.status.history).toHaveLength(3);
      
      ws.close();
    });
  });
  
  describe('Message Threading', () => {
    it('should handle threaded messages correctly', async () => {
      const redis = (app as any).redis;
      const guildId = 'thread-test-guild';
      const threadId = 'thread-123';
      
      // Setup guild and topic
      await redis.hset(`guild:${guildId}`, {
        name: 'Thread Test Guild',
        status: 'active',
        namespace: 'test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      await redis.hset(`topic:${guildId}:general`, {
        type: 'broadcast',
        retention: 86400,
        createdAt: new Date().toISOString(),
      });
      
      // Create parent message
      const parentId = 'parent-msg';
      await redis.hset(`msg:${guildId}:general:${parentId}`, {
        guildId,
        topicName: 'general',
        threadId: null,
        payload: JSON.stringify({
          type: 'question',
          content: { text: 'Parent message' },
        }),
        metadata: JSON.stringify({
          sourceAgent: 'agent1',
          timestamp: new Date(Date.now() - 60000).toISOString(),
          priority: 1,
          retryCount: 0,
          maxRetries: 3,
        }),
        status: JSON.stringify({
          current: 'success',
          history: [],
        }),
        routing: JSON.stringify({
          source: 'agent1',
          hops: [],
        }),
      });
      await redis.zadd(`messages:${guildId}:general`, Date.now() - 60000, parentId);
      
      // Create thread replies
      const replyIds = ['reply-1', 'reply-2', 'reply-3'];
      for (let i = 0; i < replyIds.length; i++) {
        const replyId = replyIds[i];
        const timestamp = Date.now() - (50000 - i * 10000);
        
        await redis.hset(`msg:${guildId}:general:${replyId}`, {
          guildId,
          topicName: 'general',
          threadId,
          payload: JSON.stringify({
            type: 'answer',
            content: { text: `Reply ${i + 1}` },
          }),
          metadata: JSON.stringify({
            sourceAgent: `agent${i + 2}`,
            timestamp: new Date(timestamp).toISOString(),
            priority: 1,
            retryCount: 0,
            maxRetries: 3,
          }),
          status: JSON.stringify({
            current: 'success',
            history: [],
          }),
          routing: JSON.stringify({
            source: `agent${i + 2}`,
            hops: [],
          }),
        });
        
        await redis.zadd(`messages:${guildId}:general`, timestamp, replyId);
        await redis.zadd(`thread:${threadId}`, timestamp, replyId);
      }
      
      // Retrieve thread messages via API
      const response = await app.inject({
        method: 'GET',
        url: `/guilds/${guildId}/topics/general/messages?threadId=${threadId}`,
      });
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(3);
      
      // Verify thread messages are in order
      const threadMessages = body.data;
      expect(threadMessages[0].payload.content.text).toBe('Reply 1');
      expect(threadMessages[1].payload.content.text).toBe('Reply 2');
      expect(threadMessages[2].payload.content.text).toBe('Reply 3');
      
      // All should have the same threadId
      threadMessages.forEach((msg: Message) => {
        expect(msg.threadId).toBe(threadId);
      });
    });
  });
  
  describe('Message Filtering and Search', () => {
    it('should filter messages by status and time range', async () => {
      const redis = (app as any).redis;
      const guildId = 'filter-test-guild';
      
      // Setup guild and topic
      await redis.hset(`guild:${guildId}`, {
        name: 'Filter Test Guild',
        status: 'active',
        namespace: 'test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      await redis.hset(`topic:${guildId}:general`, {
        type: 'broadcast',
        retention: 86400,
        createdAt: new Date().toISOString(),
      });
      
      // Create messages with different statuses and timestamps
      const now = Date.now();
      const messages = [
        { id: 'msg-1', status: 'success', timestamp: now - 3600000 }, // 1 hour ago
        { id: 'msg-2', status: 'error', timestamp: now - 1800000 },  // 30 min ago
        { id: 'msg-3', status: 'success', timestamp: now - 900000 },  // 15 min ago
        { id: 'msg-4', status: 'retry', timestamp: now - 300000 },    // 5 min ago
        { id: 'msg-5', status: 'error', timestamp: now - 60000 },     // 1 min ago
      ];
      
      for (const msg of messages) {
        await redis.hset(`msg:${guildId}:general:${msg.id}`, {
          guildId,
          topicName: 'general',
          payload: JSON.stringify({
            type: 'test',
            content: { id: msg.id },
          }),
          metadata: JSON.stringify({
            sourceAgent: 'agent1',
            timestamp: new Date(msg.timestamp).toISOString(),
            priority: 1,
            retryCount: msg.status === 'retry' ? 1 : 0,
            maxRetries: 3,
          }),
          status: JSON.stringify({
            current: msg.status,
            history: [],
          }),
          routing: JSON.stringify({
            source: 'agent1',
            hops: [],
          }),
          ...(msg.status === 'error' ? {
            error: JSON.stringify({
              code: 'TEST_ERROR',
              message: 'Test error',
              timestamp: new Date(msg.timestamp).toISOString(),
            }),
          } : {}),
        });
        
        await redis.zadd(`messages:${guildId}:general`, msg.timestamp, msg.id);
      }
      
      // Test 1: Filter by error status
      const errorResponse = await app.inject({
        method: 'GET',
        url: `/guilds/${guildId}/topics/general/messages?status=error`,
      });
      
      const errorData = JSON.parse(errorResponse.body);
      expect(errorData.data).toHaveLength(2);
      expect(errorData.data.every((m: Message) => m.status.current === 'error')).toBe(true);
      
      // Test 2: Filter by time range (last 20 minutes)
      const timeRangeResponse = await app.inject({
        method: 'GET',
        url: `/guilds/${guildId}/topics/general/messages?start=${new Date(now - 1200000).toISOString()}`,
      });
      
      const timeRangeData = JSON.parse(timeRangeResponse.body);
      expect(timeRangeData.data).toHaveLength(3); // msg-3, msg-4, msg-5
      
      // Test 3: Combined filters
      const combinedResponse = await app.inject({
        method: 'GET',
        url: `/guilds/${guildId}/topics/general/messages?status=error&start=${new Date(now - 1200000).toISOString()}`,
      });
      
      const combinedData = JSON.parse(combinedResponse.body);
      expect(combinedData.data).toHaveLength(1); // Only msg-5
      expect(combinedData.data[0].id.id).toBe('msg-5');
    });
  });
  
  describe('Export Functionality', () => {
    it('should export messages in different formats', async () => {
      const redis = (app as any).redis;
      const guildId = 'export-test-guild';
      
      // Setup test data
      await redis.hset(`guild:${guildId}`, {
        name: 'Export Test Guild',
        status: 'active',
        namespace: 'test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      await redis.hset(`topic:${guildId}:general`, {
        type: 'broadcast',
        retention: 86400,
        createdAt: new Date().toISOString(),
      });
      
      // Create test messages
      for (let i = 0; i < 3; i++) {
        const messageId = `export-msg-${i}`;
        await redis.hset(`msg:${guildId}:general:${messageId}`, {
          guildId,
          topicName: 'general',
          payload: JSON.stringify({
            type: 'test',
            content: { index: i, data: `Export test ${i}` },
          }),
          metadata: JSON.stringify({
            sourceAgent: `agent${i}`,
            timestamp: new Date().toISOString(),
            priority: 1,
            retryCount: 0,
            maxRetries: 3,
          }),
          status: JSON.stringify({
            current: 'success',
            history: [],
          }),
          routing: JSON.stringify({
            source: `agent${i}`,
            hops: [],
          }),
        });
        
        await redis.zadd(`messages:${guildId}:general`, Date.now() + i, messageId);
      }
      
      // Test JSON export
      const jsonExportResponse = await app.inject({
        method: 'POST',
        url: '/export',
        payload: {
          filter: { guildId },
          format: 'json',
          includeMetadata: true,
        },
      });
      
      expect(jsonExportResponse.statusCode).toBe(200);
      const jsonExport = JSON.parse(jsonExportResponse.body);
      expect(jsonExport.success).toBe(true);
      expect(jsonExport.data.status).toBe('completed');
      expect(jsonExport.data.metadata.messageCount).toBe(3);
      expect(jsonExport.data.metadata.format).toBe('json');
      
      // Test CSV export
      const csvExportResponse = await app.inject({
        method: 'POST',
        url: '/export',
        payload: {
          filter: { guildId },
          format: 'csv',
          includeMetadata: false,
        },
      });
      
      expect(csvExportResponse.statusCode).toBe(200);
      const csvExport = JSON.parse(csvExportResponse.body);
      expect(csvExport.success).toBe(true);
      expect(csvExport.data.metadata.format).toBe('csv');
    });
  });
  
  describe('Guild Discovery and Management', () => {
    it('should discover guilds dynamically from Redis patterns', async () => {
      const redis = (app as any).redis;
      
      // Create multiple guilds with different namespaces
      const guilds = [
        { id: 'prod-guild-1', namespace: 'production', name: 'Production Guild 1' },
        { id: 'prod-guild-2', namespace: 'production', name: 'Production Guild 2' },
        { id: 'test-guild-1', namespace: 'testing', name: 'Test Guild 1' },
        { id: 'dev-guild-1', namespace: 'development', name: 'Dev Guild 1' },
      ];
      
      for (const guild of guilds) {
        await redis.hset(`guild:${guild.id}`, {
          name: guild.name,
          status: 'active',
          namespace: guild.namespace,
          description: `${guild.namespace} environment guild`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      
      // Test guild discovery
      const response = await app.inject({
        method: 'GET',
        url: '/guilds',
      });
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(4);
      
      // Verify all guilds are discovered
      const discoveredIds = body.data.map((g: Guild) => g.id.id);
      expect(discoveredIds).toContain('prod-guild-1');
      expect(discoveredIds).toContain('prod-guild-2');
      expect(discoveredIds).toContain('test-guild-1');
      expect(discoveredIds).toContain('dev-guild-1');
      
      // Test filtering by namespace
      const namespaces = body.data.map((g: Guild) => g.namespace);
      expect(namespaces).toContain('production');
      expect(namespaces).toContain('testing');
      expect(namespaces).toContain('development');
    });
  });
});