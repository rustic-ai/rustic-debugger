import type { Topic, TopicStats } from '@rustic-debug/types';
import { getRedisClients } from '../services/redis/connection.js';

export class TopicModel {
  async findByGuild(guildId: string, options: {
    type?: string;
    includeStats?: boolean;
  } = {}): Promise<Topic[]> {
    const { command: redis } = await getRedisClients();
    const { type, includeStats } = options;
    
    // Get all topics for the guild - actual pattern is {guildId}:{topic_name}
    const topicKeys = await redis.keys(`${guildId}:*`);

    if (!topicKeys.length) {
      return [];
    }

    // Extract topic names from keys
    const topicNames = topicKeys.map(key => {
      // Pattern is {guildId}:{topic_name}
      const parts = key.split(':');
      return parts.slice(1).join(':'); // Everything after guild ID
    });
    
    // Build topic objects
    const topics: Topic[] = [];
    
    for (const topicName of topicNames) {
      const topic = await this.buildTopic(guildId, topicName);
      
      // Filter by type if specified
      if (!type || topic.type === type) {
        if (includeStats) {
          // Add stats to topic object
          const stats = await this.getTopicStats(guildId, topicName);
          (topic as any).stats = stats;
        }
        topics.push(topic);
      }
    }
    
    return topics;
  }

  async getTopicStats(guildId: string, topicName: string): Promise<TopicStats> {
    const { command: redis } = await getRedisClients();
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // Get message count for the last hour
    const messageCount = await redis.zcount(
      `${guildId}:${topicName}`,
      hourAgo.getTime(),
      now.getTime()
    );
    
    // Get all messages to calculate stats (simplified)
    const messages = await redis.zrangebyscore(
      `${guildId}:${topicName}`,
      hourAgo.getTime(),
      now.getTime(),
      'LIMIT',
      0,
      100
    );

    let errorCount = 0;
    const latencies: number[] = [];
    const publishers = new Map<string, number>();
    const subscribers = new Map<string, number>();

    // Analyze messages for stats
    for (const messageJson of messages) {
      try {
        const message = JSON.parse(messageJson);

        if (message.is_error_message) {
          errorCount++;
        }

        if (message.sender?.id) {
          publishers.set(message.sender.id, (publishers.get(message.sender.id) || 0) + 1);
        }

        if (message.recipient_list?.length) {
          for (const recipient of message.recipient_list) {
            if (recipient.id) {
              subscribers.set(recipient.id, (subscribers.get(recipient.id) || 0) + 1);
            }
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
      
      // Calculate latency (simplified - would use actual processing times)
      latencies.push(Math.random() * 100); // Mock latency
    }
    
    // Calculate percentiles
    latencies.sort((a, b) => a - b);
    const p95Index = Math.floor(latencies.length * 0.95);
    const p99Index = Math.floor(latencies.length * 0.99);
    
    return {
      topicName,
      guildId,
      period: {
        start: hourAgo,
        end: now,
      },
      metrics: {
        messageCount,
        errorCount,
        throughput: messageCount / 3600, // messages per second
        avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length || 0,
        p95Latency: latencies[p95Index] || 0,
        p99Latency: latencies[p99Index] || 0,
      },
      topPublishers: Array.from(publishers.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([agentId, count]) => ({ agentId, messageCount: count })),
      topSubscribers: Array.from(subscribers.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([agentId, count]) => ({ agentId, messageCount: count })),
    };
  }

  private async buildTopic(guildId: string, topicName: string): Promise<Topic> {
    const { command: redis } = await getRedisClients();
    
    // Get topic metadata
    const topicKey = `${guildId}:${topicName}`;
    const messageCount = await redis.zcard(topicKey);

    // Get recent messages to determine publishers/subscribers
    const recentMessages = await redis.zrevrange(topicKey, 0, 10);
    const publishers = new Set<string>();
    const subscribers = new Set<string>();
    
    for (const messageJson of recentMessages) {
      try {
        const message = JSON.parse(messageJson);

        if (message.sender?.id) {
          publishers.add(message.sender.id);
        }

        if (message.recipient_list?.length) {
          for (const recipient of message.recipient_list) {
            if (recipient.id) {
              subscribers.add(recipient.id);
            }
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    // Determine topic type based on subscribers
    let type: Topic['type'] = 'direct';
    if (subscribers.size > 1) {
      type = 'broadcast';
    } else if (subscribers.size === 0) {
      type = 'queue';
    }
    
    return {
      name: topicName,
      guildId,
      type,
      subscribers: Array.from(subscribers),
      publishers: Array.from(publishers),
      metadata: {
        messageCount,
        bytesTransferred: messageCount * 256, // Estimate
        avgMessageSize: 256, // Estimate
        createdAt: new Date(), // Would track this properly
      },
      config: {
        maxMessageSize: 1024 * 1024, // 1MB
        persistMessages: true,
      },
    };
  }
}