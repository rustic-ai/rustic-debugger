export interface Topic {
  name: string;
  guildId: string;
  type: 'direct' | 'broadcast' | 'queue';
  subscribers: string[]; // agent IDs
  publishers: string[]; // agent IDs
  metadata: {
    messageCount: number;
    bytesTransferred: number;
    avgMessageSize: number;
    lastPublished?: Date;
    createdAt: Date;
  };
  config: {
    maxMessageSize: number;
    ttl?: number; // time-to-live in seconds
    maxSubscribers?: number;
    persistMessages: boolean;
  };
}

export interface TopicStats {
  topicName: string;
  guildId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    messageCount: number;
    errorCount: number;
    throughput: number; // messages/second
    avgLatency: number; // milliseconds
    p95Latency: number;
    p99Latency: number;
  };
  topPublishers: Array<{
    agentId: string;
    messageCount: number;
  }>;
  topSubscribers: Array<{
    agentId: string;
    messageCount: number;
  }>;
}