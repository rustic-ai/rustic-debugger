import type { Message, MessageFilter, MessageStatus } from '@rustic-debug/types';
import { getRedisClients } from '../services/redis/connection.js';
import { gemstoneId } from '../utils/gemstoneId.js';
import { config } from '../config/index.js';

export class MessageModel {
  async findById(messageId: string): Promise<Message | null> {
    const { command: redis } = await getRedisClients();
    
    // Search for message across all guilds
    const keys = await redis.keys(`msg:*:${messageId}`);
    
    if (!keys.length) {
      return null;
    }
    
    const data = await redis.hgetall(keys[0]);
    if (!Object.keys(data).length) {
      return null;
    }
    
    return this.deserialize(messageId, data);
  }

  async findByFilter(filter: MessageFilter): Promise<{
    messages: Message[];
    total: number;
    hasMore: boolean;
  }> {
    const { command: redis } = await getRedisClients();
    const {
      guildId,
      topicName,
      threadId,
      status,
      agentId,
      timeRange,
      searchText,
      limit = 100,
      offset = 0,
    } = filter;
    
    // Validate time range (7-day retention)
    if (timeRange?.start) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - config.messageRetentionDays);
      
      if (timeRange.start < sevenDaysAgo) {
        throw new Error(`Time range exceeds ${config.messageRetentionDays} day retention window`);
      }
    }
    
    let messageIds: string[] = [];
    
    // If we have guildId and topicName, use the sorted set
    if (guildId && topicName) {
      const topicKey = `${guildId}:${topicName}`;
      const min = timeRange?.start?.getTime() || '-inf';
      const max = timeRange?.end?.getTime() || '+inf';

      // The sorted set contains full JSON messages, not IDs
      const messages = await redis.zrangebyscore(
        topicKey,
        min,
        max,
        'LIMIT',
        offset,
        limit + 1 // Get one extra to check hasMore
      );

      // Parse messages directly and return
      const hasMore = messages.length > limit;
      const resultMessages = messages.slice(0, limit).map(msgJson => {
        try {
          const rawMessage = JSON.parse(msgJson);
          // Transform RusticAI message to our Message type
          return this.transformRusticMessage(rawMessage, guildId, topicName);
        } catch (e) {
          return null;
        }
      }).filter(Boolean) as Message[];

      return {
        messages: resultMessages,
        total: await redis.zcard(topicKey),
        hasMore,
      };
    } else if (guildId) {
      // Get all topics for the guild and search
      const topicKeys = await redis.keys(`${guildId}:*`);
      
      for (const topicKey of topicKeys) {
        const min = timeRange?.start?.getTime() || '-inf';
        const max = timeRange?.end?.getTime() || '+inf';
        
        const ids = await redis.zrangebyscore(topicKey, min, max);
        messageIds.push(...ids);
      }
      
      // Sort and paginate
      messageIds = messageIds.slice(offset, offset + limit + 1);
    } else {
      // No efficient way to search without guildId
      // In production, we'd use a search index
      throw new Error('guildId is required for message search');
    }
    
    const hasMore = messageIds.length > limit;
    const paginatedIds = messageIds.slice(0, limit);
    const messages: Message[] = [];
    
    // Fetch message details
    for (const messageId of paginatedIds) {
      const msgKey = guildId ? `msg:${guildId}:${messageId}` : '';
      const data = await redis.hgetall(msgKey);
      
      if (Object.keys(data).length) {
        const message = this.deserialize(messageId, data);
        
        // Apply filters
        let include = true;
        
        if (status && status.length && !status.includes(message.status.current)) {
          include = false;
        }
        
        if (agentId && message.metadata.sourceAgent !== agentId && 
            message.metadata.targetAgent !== agentId) {
          include = false;
        }
        
        if (threadId && message.threadId !== threadId) {
          include = false;
        }
        
        if (searchText) {
          const searchLower = searchText.toLowerCase();
          const payloadStr = JSON.stringify(message.payload.content).toLowerCase();
          if (!payloadStr.includes(searchLower)) {
            include = false;
          }
        }
        
        if (include) {
          messages.push(message);
        }
      }
    }
    
    return {
      messages,
      total: messages.length + (hasMore ? 1 : 0),
      hasMore,
    };
  }

  async findByTopic(
    guildId: string,
    topicName: string,
    options: {
      start?: string;
      end?: string;
      status?: string[];
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    messages: Message[];
    total: number;
    hasMore: boolean;
  }> {
    const timeRange = {
      start: options.start ? new Date(options.start) : undefined,
      end: options.end ? new Date(options.end) : undefined,
    };
    
    return this.findByFilter({
      guildId,
      topicName,
      status: options.status as MessageStatus[],
      timeRange: timeRange.start && timeRange.end ? timeRange as { start: Date; end: Date } : undefined,
      limit: options.limit,
      offset: options.offset,
    });
  }

  private transformRusticMessage(rawMessage: any, guildId: string, topicName: string): Message {
    // Transform RusticAI message format to our Message type
    return {
      id: {
        id: String(rawMessage.id || gemstoneId.generate()),
        timestamp: rawMessage.timestamp || Date.now(),
        priority: rawMessage.priority || 0,
        counter: 0
      },
      guildId,
      topicName,
      threadId: rawMessage.thread?.[0] ? String(rawMessage.thread[0]) : undefined,
      parentMessageId: rawMessage.in_response_to ? String(rawMessage.in_response_to) : undefined,
      payload: rawMessage.payload || { content: '' },
      metadata: {
        sourceAgent: rawMessage.sender?.id || 'unknown',
        targetAgent: rawMessage.recipient_list?.[0]?.id,
        timestamp: new Date(rawMessage.timestamp || Date.now()),
        priority: rawMessage.priority || 0,
        retryCount: 0,
        maxRetries: 3
      },
      routing: {
        source: rawMessage.sender?.id || 'unknown',
        destination: rawMessage.recipient_list?.[0]?.id,
        hops: []
      },
      status: {
        current: rawMessage.is_error_message ? 'error' : 'success',
        history: [{
          status: rawMessage.is_error_message ? 'error' : 'success',
          timestamp: new Date(rawMessage.timestamp || Date.now())
        }]
      },
      error: rawMessage.is_error_message ? {
        code: 'MESSAGE_ERROR',
        message: 'Message marked as error',
        timestamp: new Date(rawMessage.timestamp || Date.now())
      } : undefined
    };
  }

  private deserialize(messageId: string, data: Record<string, string>): Message {
    const payload = JSON.parse(data.payload || '{}');
    const metadata = JSON.parse(data.metadata || '{}');
    const routing = JSON.parse(data.routing || '{}');
    const status = JSON.parse(data.status || '{}');
    const error = data.error ? JSON.parse(data.error) : undefined;
    
    return {
      id: gemstoneId.parse(messageId),
      guildId: data.guildId,
      topicName: data.topicName,
      threadId: data.threadId,
      parentMessageId: data.parentMessageId,
      payload,
      metadata: {
        ...metadata,
        timestamp: new Date(metadata.timestamp),
      },
      routing: {
        ...routing,
        hops: routing.hops.map((hop: any) => ({
          ...hop,
          timestamp: new Date(hop.timestamp),
        })),
      },
      status: {
        ...status,
        history: status.history.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        })),
      },
      error: error ? {
        ...error,
        timestamp: new Date(error.timestamp),
      } : undefined,
    };
  }
}