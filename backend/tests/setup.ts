import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { build } from '../src/app.js';
import { getRedisContainer, type StartedRedisContainer } from './helpers/redis.js';

let app: FastifyInstance;
let redisContainer: StartedRedisContainer;

beforeAll(async () => {
  // Start Redis container for all tests
  redisContainer = await getRedisContainer();
  process.env.REDIS_HOST = redisContainer.getHost();
  process.env.REDIS_PORT = redisContainer.getPort().toString();
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
});

afterAll(async () => {
  // Stop Redis container
  if (redisContainer) {
    await redisContainer.stop();
  }
});

beforeEach(async () => {
  // Build fresh app instance for each test
  app = await build({
    logger: false, // Disable logging in tests
  });
  
  // Clear Redis data
  if (redisContainer) {
    const redis = await redisContainer.getClient();
    await redis.flushall();
    await redis.quit();
  }
});

afterEach(async () => {
  // Close app after each test
  if (app) {
    await app.close();
  }
});

export { app };

// Test utilities
export async function createTestGuild(guildName: string) {
  // This will be used to seed test data
  // Implementation will come in Phase 3.4
  return {
    id: { id: '0000000000000001', timestamp: Date.now(), priority: 0, counter: 1 },
    name: guildName,
    namespace: guildName.toLowerCase().replace(/ /g, '-'),
    status: 'active' as const,
    metadata: {
      topicCount: 0,
      agentCount: 0,
      messageRate: 0,
      lastActivity: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    config: {
      retentionDays: 7,
      maxTopics: 100,
      maxAgents: 50,
      maxMessageRate: 1000,
    },
  };
}

export async function createTestMessage(guildId: string, topicName: string) {
  return {
    id: { id: '0000000000000002', timestamp: Date.now(), priority: 0, counter: 2 },
    guildId,
    topicName,
    payload: {
      type: 'test',
      content: { message: 'Test message' },
      encoding: 'json' as const,
    },
    metadata: {
      sourceAgent: 'test-agent',
      timestamp: new Date(),
      priority: 0,
      retryCount: 0,
      maxRetries: 3,
    },
    routing: {
      source: 'test-agent',
      hops: [],
    },
    status: {
      current: 'pending' as const,
      history: [],
    },
  };
}