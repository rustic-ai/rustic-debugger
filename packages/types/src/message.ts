import type { GemstoneID } from './gemstoneId.js';

export type MessageStatus = 
  | 'pending'
  | 'processing'
  | 'success'
  | 'error'
  | 'timeout'
  | 'rejected';

export interface Message {
  id: GemstoneID;
  guildId: string;
  topicName: string;
  threadId?: string;
  parentMessageId?: string;
  payload: {
    type: string;
    content: unknown;
    encoding?: 'json' | 'base64' | 'plain';
  };
  metadata: {
    sourceAgent: string;
    targetAgent?: string;
    timestamp: Date;
    ttl?: number;
    priority: number;
    retryCount: number;
    maxRetries: number;
  };
  routing: {
    source: string;
    destination?: string;
    hops: Array<{
      agentId: string;
      timestamp: Date;
      action: 'received' | 'processed' | 'forwarded' | 'rejected';
    }>;
  };
  status: {
    current: MessageStatus;
    history: Array<{
      status: MessageStatus;
      timestamp: Date;
      reason?: string;
      agentId?: string;
    }>;
  };
  error?: {
    code: string;
    message: string;
    stack?: string;
    timestamp: Date;
  };
}

export interface MessageFilter {
  guildId?: string;
  topicName?: string;
  threadId?: string;
  status?: MessageStatus[];
  agentId?: string;
  timeRange?: {
    start: Date;
    end: Date;
  };
  searchText?: string;
  limit?: number;
  offset?: number;
}