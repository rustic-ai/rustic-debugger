import type { Redis } from 'ioredis';
import { getRedisClients } from '../redis/connection.js';
import { EventEmitter } from 'events';

export interface StreamMessage {
  guildId: string;
  topicName: string;
  messageId: string;
  payload: unknown;
  timestamp: Date;
}

export class StreamingService extends EventEmitter {
  private subscriptions = new Map<string, Set<string>>();
  private pubsubClient: Redis | null = null;
  
  async subscribe(guildId: string, topics?: string[]): Promise<void> {
    if (!this.pubsubClient) {
      const { pubsub } = await getRedisClients();
      this.pubsubClient = pubsub;
      
      // Set up message handler
      this.pubsubClient.on('pmessage', (pattern, channel, message) => {
        this.handleMessage(pattern, channel, message);
      });
    }
    
    const channels = topics 
      ? topics.map(topic => `guild:${guildId}:topic:${topic}`)
      : [`guild:${guildId}:*`];
    
    // Track subscriptions
    if (!this.subscriptions.has(guildId)) {
      this.subscriptions.set(guildId, new Set());
    }
    
    const guildSubs = this.subscriptions.get(guildId)!;
    
    // Subscribe to channels
    for (const channel of channels) {
      await this.pubsubClient.psubscribe(channel);
      guildSubs.add(channel);
    }
  }
  
  async unsubscribe(guildId: string, topics?: string[]): Promise<void> {
    if (!this.pubsubClient) {
      return;
    }
    
    const guildSubs = this.subscriptions.get(guildId);
    if (!guildSubs) {
      return;
    }
    
    const channels = topics
      ? topics.map(topic => `guild:${guildId}:topic:${topic}`)
      : Array.from(guildSubs);
    
    // Unsubscribe from channels
    for (const channel of channels) {
      if (guildSubs.has(channel)) {
        await this.pubsubClient.punsubscribe(channel);
        guildSubs.delete(channel);
      }
    }
    
    // Clean up empty subscription sets
    if (guildSubs.size === 0) {
      this.subscriptions.delete(guildId);
    }
  }
  
  private handleMessage(pattern: string, channel: string, message: string): void {
    try {
      // Parse channel to extract guild and topic
      const parts = channel.split(':');
      if (parts.length >= 4 && parts[0] === 'guild' && parts[2] === 'topic') {
        const guildId = parts[1];
        const topicName = parts.slice(3).join(':'); // Handle topics with ':' in name
        
        const streamMessage: StreamMessage = {
          guildId,
          topicName,
          messageId: '', // Would be parsed from message
          payload: JSON.parse(message),
          timestamp: new Date(),
        };
        
        // Emit events
        this.emit('message', streamMessage);
        this.emit(`guild:${guildId}`, streamMessage);
        this.emit(`topic:${guildId}:${topicName}`, streamMessage);
      }
    } catch (error) {
      this.emit('error', error);
    }
  }
  
  async close(): Promise<void> {
    if (this.pubsubClient) {
      // Unsubscribe from all channels
      for (const [guildId, channels] of this.subscriptions) {
        for (const channel of channels) {
          await this.pubsubClient.punsubscribe(channel);
        }
      }
      
      this.subscriptions.clear();
      this.pubsubClient = null;
    }
    
    this.removeAllListeners();
  }
}