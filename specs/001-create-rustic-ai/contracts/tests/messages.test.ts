import { describe, it, expect, beforeAll } from 'vitest';
import { z } from 'zod';
import type { Message, ProcessStatus } from '@rustic-dev/types';

// Contract schemas
const ProcessStatusSchema = z.enum([
  'PENDING', 'PROCESSING', 'SUCCESS', 'ERROR', 'TIMEOUT', 'SKIPPED', 'RETRY'
]);

const AgentIdentifierSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string()
});

const RoutingEntrySchema = z.object({
  agentId: z.string(),
  topicId: z.string(),
  timestamp: z.string().datetime(),
  duration: z.number().optional(),
  status: ProcessStatusSchema,
  error: z.string().optional()
});

const RoutingSlipSchema = z.object({
  entries: z.array(RoutingEntrySchema),
  currentIndex: z.number().int().min(0)
});

const MessageSchema = z.object({
  id: z.string(),
  guildId: z.string(),
  topicId: z.string(),
  threadId: z.string().optional(),
  timestamp: z.string().datetime(),
  type: z.string(),
  payload: z.record(z.unknown()),
  sender: AgentIdentifierSchema,
  routing: RoutingSlipSchema,
  status: ProcessStatusSchema,
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean()
  }).optional(),
  ttl: z.number().optional(),
  tags: z.array(z.string()).optional(),
  version: z.string()
});

describe('GET /guilds/{guildId}/topics/{topicName}/messages - Contract Tests', () => {
  let apiClient: any;

  beforeAll(() => {
    // This test should fail until implementation exists
    apiClient = null; // TODO: Initialize API client
  });

  it('should return paginated messages with valid schema', async () => {
    const response = await apiClient.get('/guilds/test-guild/topics/test-topic/messages');
    
    expect(response.status).toBe(200);
    expect(response.data.data).toBeDefined();
    expect(response.data.pagination).toBeDefined();
    expect(response.data.timestamp).toBeDefined();
  });

  it('should respect limit parameter', async () => {
    const limit = 50;
    const response = await apiClient.get(
      `/guilds/test-guild/topics/test-topic/messages?limit=${limit}`
    );
    
    expect(response.data.data.length).toBeLessThanOrEqual(limit);
    expect(response.data.pagination.pageSize).toBe(limit);
  });

  it('should filter by time window (max 7 days)', async () => {
    const minutes = 1440; // 1 day
    const response = await apiClient.get(
      `/guilds/test-guild/topics/test-topic/messages?minutes=${minutes}`
    );
    
    const now = Date.now();
    response.data.data.forEach((msg: Message) => {
      const msgTime = new Date(msg.timestamp).getTime();
      const age = now - msgTime;
      expect(age).toBeLessThanOrEqual(minutes * 60 * 1000);
    });
  });

  it('should reject time window > 7 days', async () => {
    const minutes = 10081; // > 7 days
    const response = await apiClient.get(
      `/guilds/test-guild/topics/test-topic/messages?minutes=${minutes}`
    );
    
    expect(response.status).toBe(400);
  });

  it('should support pagination with sinceId', async () => {
    const firstPage = await apiClient.get(
      '/guilds/test-guild/topics/test-topic/messages?limit=10'
    );
    
    if (firstPage.data.data.length > 0) {
      const lastId = firstPage.data.data[firstPage.data.data.length - 1].id;
      const nextPage = await apiClient.get(
        `/guilds/test-guild/topics/test-topic/messages?sinceId=${lastId}&limit=10`
      );
      
      // Messages should be after the sinceId
      expect(nextPage.data.data[0]?.id).not.toBe(lastId);
    }
  });

  it('should validate message structure', async () => {
    const response = await apiClient.get(
      '/guilds/test-guild/topics/test-topic/messages?limit=1'
    );
    
    if (response.data.data.length > 0) {
      const message = response.data.data[0];
      const result = MessageSchema.safeParse(message);
      expect(result.success).toBe(true);
      
      // Validate nested structures
      expect(message.sender).toHaveProperty('id');
      expect(message.routing).toHaveProperty('entries');
      expect(Array.isArray(message.routing.entries)).toBe(true);
    }
  });

  it('should return 404 for non-existent guild', async () => {
    const response = await apiClient.get(
      '/guilds/non-existent/topics/test-topic/messages'
    );
    
    expect(response.status).toBe(404);
  });
});

describe('GET /messages/{messageId} - Contract Tests', () => {
  let apiClient: any;

  beforeAll(() => {
    apiClient = null; // TODO: Initialize API client
  });

  it('should return single message by ID', async () => {
    const messageId = 'test-gemstone-id';
    const response = await apiClient.get(`/messages/${messageId}`);
    
    expect(response.status).toBe(200);
    const result = MessageSchema.safeParse(response.data);
    expect(result.success).toBe(true);
    expect(response.data.id).toBe(messageId);
  });

  it('should return 404 for non-existent message', async () => {
    const response = await apiClient.get('/messages/non-existent-id');
    expect(response.status).toBe(404);
  });

  it('should include full routing history', async () => {
    const response = await apiClient.get('/messages/test-id');
    
    expect(response.data.routing).toBeDefined();
    expect(response.data.routing.entries).toBeDefined();
    
    // Each routing entry should have required fields
    response.data.routing.entries.forEach((entry: any) => {
      expect(entry.agentId).toBeDefined();
      expect(entry.topicId).toBeDefined();
      expect(entry.timestamp).toBeDefined();
      expect(entry.status).toBeDefined();
    });
  });
});