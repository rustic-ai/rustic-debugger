export type ProcessStatus = 
  | 'initializing'
  | 'ready'
  | 'busy'
  | 'error'
  | 'stopped';

export interface Agent {
  id: string;
  guildId: string;
  name: string;
  type: 'producer' | 'consumer' | 'processor' | 'router';
  status: ProcessStatus;
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
  status: ProcessStatus;
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