import type { MessageFilter } from './message.js';

// Export types
export type ExportFormat = 'json' | 'csv' | 'ndjson';

// Request types
export interface PaginationParams {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TimeRangeParams {
  start?: string; // ISO date string
  end?: string; // ISO date string
}

export interface ExportRequest {
  filter: MessageFilter;
  format: ExportFormat;
  includeMetadata?: boolean;
  includeRouting?: boolean;
  compressionFormat?: 'gzip' | 'none';
}

export interface ReplayRequest {
  messageIds: string[];
  targetTopics?: string[];
  delayMs?: number;
  preserveTimestamps?: boolean;
}

// Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
}

export interface ResponseMeta {
  total?: number;
  limit?: number;
  offset?: number;
  hasMore?: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: ResponseMeta & {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Endpoint-specific responses
export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  services: {
    redis: {
      connected: boolean;
      latency?: number;
    };
    cache: {
      size: number;
      hitRate: number;
    };
  };
}

export interface ExportResponse {
  exportId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: string;
  metadata: {
    messageCount: number;
    sizeBytes: number;
    format: string;
  };
}

export interface ReplayResponse {
  replayId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: {
    total: number;
    processed: number;
    succeeded: number;
    failed: number;
  };
  errors?: Array<{
    messageId: string;
    error: string;
  }>;
}

// WebSocket event types
export interface WebSocketEvent<T = unknown> {
  type: string;
  guildId?: string;
  topicName?: string;
  data: T;
  timestamp: string;
}

export interface StreamSubscription {
  guildId?: string;
  topicNames?: string[];
  messageTypes?: string[];
  includeErrors?: boolean;
}

export interface StreamStats {
  messagesReceived: number;
  bytesReceived: number;
  connectionDuration: number;
  averageLatency: number;
}