/**
 * AgentTag - 1-1 mapping with RusticAI's AgentTag class
 * Represents a tag that can be assigned to an agent.
 */
export interface AgentTag {
  id?: string;
  name?: string;
}

/**
 * ProcessEntry - 1-1 mapping with RusticAI's ProcessEntry class
 * Represents an entry for agent and previous message in the message history.
 */
export interface ProcessEntry {
  agent: AgentTag;
  origin: number; // ID of the previous message
  result: number; // ID of the current message
  processor: string; // The processor that handled the message
  from_topic?: string;
  to_topics: string[];
  reason?: string[];
}

// Agent status for debugger UI (different from message ProcessStatus)
export type AgentStatus =
  | 'initializing'
  | 'ready'
  | 'busy'
  | 'error'
  | 'stopped';

// Agent type for debugger UI (extends basic AgentTag with debug info)
export interface Agent {
  id: string;
  guildId: string;
  name: string;
  type: 'producer' | 'consumer' | 'processor' | 'router';
  status: AgentStatus;
  subscriptions: string[]; // topic names
  publications: string[]; // topic names
  metadata: {
    version: string;
    startTime: Date;
    lastHeartbeat: Date;
    processedCount: number;
    errorCount: number;
    avgProcessingTime: number; // milliseconds
  };
  config: {
    maxConcurrency: number;
    timeout: number; // milliseconds
    retryPolicy: {
      maxRetries: number;
      backoff: 'linear' | 'exponential';
      initialDelay: number;
      maxDelay: number;
    };
  };
  resources: {
    cpuUsage: number; // percentage
    memoryUsage: number; // bytes
    activeConnections: number;
  };
}

export interface AgentHealth {
  agentId: string;
  status: AgentStatus;
  uptime: number; // seconds
  metrics: {
    throughput: number; // messages/second
    errorRate: number; // errors/minute
    latency: {
      p50: number;
      p95: number;
      p99: number;
    };
  };
  issues: Array<{
    severity: 'warning' | 'error' | 'critical';
    message: string;
    timestamp: Date;
  }>;
}