import { z } from 'zod';
import type { ProcessStatus } from './message.js';

// GemstoneID schema
export const gemstoneIdSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{16}$/),
  timestamp: z.number().positive(),
  priority: z.number().int().min(0).max(15),
  counter: z.number().int().min(0).max(4095),
});

// Guild schemas
export const guildStatusSchema = z.enum(['active', 'idle', 'inactive']);

export const guildSchema = z.object({
  id: gemstoneIdSchema,
  name: z.string().min(1).max(255),
  namespace: z.string().regex(/^[a-z0-9-]+$/),
  status: guildStatusSchema,
  description: z.string().optional(),
  metadata: z.object({
    topicCount: z.number().int().nonnegative(),
    agentCount: z.number().int().nonnegative(),
    messageRate: z.number().nonnegative(),
    lastActivity: z.date(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
  config: z.object({
    retentionDays: z.number().int().positive().max(365),
    maxTopics: z.number().int().positive(),
    maxAgents: z.number().int().positive(),
    maxMessageRate: z.number().positive(),
  }),
});

// Topic schemas
export const topicTypeSchema = z.enum(['direct', 'broadcast', 'queue']);

export const topicSchema = z.object({
  name: z.string().min(1).max(255),
  guildId: z.string(),
  type: topicTypeSchema,
  subscribers: z.array(z.string()),
  publishers: z.array(z.string()),
  metadata: z.object({
    messageCount: z.number().int().nonnegative(),
    bytesTransferred: z.number().nonnegative(),
    avgMessageSize: z.number().nonnegative(),
    lastPublished: z.date().optional(),
    createdAt: z.date(),
  }),
  config: z.object({
    maxMessageSize: z.number().positive(),
    ttl: z.number().positive().optional(),
    maxSubscribers: z.number().positive().optional(),
    persistMessages: z.boolean(),
  }),
});

// Message schemas
export const messageStatusSchema = z.enum([
  'pending',
  'processing', 
  'success',
  'error',
  'timeout',
  'rejected'
]);

export const messageSchema = z.object({
  id: gemstoneIdSchema,
  guildId: z.string(),
  topicName: z.string(),
  threadId: z.string().optional(),
  parentMessageId: z.string().optional(),
  payload: z.object({
    type: z.string(),
    content: z.unknown(),
    encoding: z.enum(['json', 'base64', 'plain']).optional(),
  }),
  metadata: z.object({
    sourceAgent: z.string(),
    targetAgent: z.string().optional(),
    timestamp: z.date(),
    ttl: z.number().positive().optional(),
    priority: z.number().int().min(0).max(15),
    retryCount: z.number().int().nonnegative(),
    maxRetries: z.number().int().nonnegative(),
  }),
  routing: z.object({
    source: z.string(),
    destination: z.string().optional(),
    hops: z.array(z.object({
      agentId: z.string(),
      timestamp: z.date(),
      action: z.enum(['received', 'processed', 'forwarded', 'rejected']),
    })),
  }),
  status: z.object({
    current: messageStatusSchema,
    history: z.array(z.object({
      status: messageStatusSchema,
      timestamp: z.date(),
      reason: z.string().optional(),
      agentId: z.string().optional(),
    })),
  }),
  error: z.object({
    code: z.string(),
    message: z.string(),
    stack: z.string().optional(),
    timestamp: z.date(),
  }).optional(),
});

// Agent schemas
export const agentStatusSchema = z.enum([
  'initializing',
  'ready',
  'busy',
  'error',
  'stopped'
]);

export const agentSchema = z.object({
  id: z.string(),
  guildId: z.string(),
  name: z.string(),
  type: z.enum(['producer', 'consumer', 'processor', 'router']),
  status: agentStatusSchema,
  subscriptions: z.array(z.string()),
  publications: z.array(z.string()),
  metadata: z.object({
    version: z.string(),
    startTime: z.date(),
    lastHeartbeat: z.date(),
    processedCount: z.number().int().nonnegative(),
    errorCount: z.number().int().nonnegative(),
    avgProcessingTime: z.number().nonnegative(),
  }),
  config: z.object({
    maxConcurrency: z.number().int().positive(),
    timeout: z.number().positive(),
    retryPolicy: z.object({
      maxRetries: z.number().int().nonnegative(),
      backoff: z.enum(['linear', 'exponential']),
      initialDelay: z.number().positive(),
      maxDelay: z.number().positive(),
    }),
  }),
  resources: z.object({
    cpuUsage: z.number().min(0).max(100),
    memoryUsage: z.number().nonnegative(),
    activeConnections: z.number().int().nonnegative(),
  }),
});

// API request schemas
export const paginationSchema = z.object({
  limit: z.number().int().positive().max(1000).optional(),
  offset: z.number().int().nonnegative().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const timeRangeSchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
});

// ProcessStatus values for filtering
const processStatusSchema = z.enum(['running', 'error', 'completed']);

export const messageFilterSchema = z.object({
  guildId: z.string().optional(),
  topicName: z.string().optional(),
  threadId: z.string().optional(),
  status: z.array(processStatusSchema).optional(),
  agentId: z.string().optional(),
  timeRange: z.object({
    start: z.date(),
    end: z.date(),
  }).optional(),
  searchText: z.string().optional(),
  limit: z.number().int().positive().max(10000).optional(),
  offset: z.number().int().nonnegative().optional(),
});

export const exportRequestSchema = z.object({
  filter: messageFilterSchema,
  format: z.enum(['json', 'csv']),
  includeMetadata: z.boolean().optional(),
  includeRouting: z.boolean().optional(),
  compressionFormat: z.enum(['gzip', 'none']).optional(),
});

export const replayRequestSchema = z.object({
  messageIds: z.array(z.string()).min(1).max(1000),
  targetTopics: z.array(z.string()).optional(),
  delayMs: z.number().int().nonnegative().optional(),
  preserveTimestamps: z.boolean().optional(),
});