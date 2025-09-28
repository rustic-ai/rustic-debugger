import type { Message, MessageFilter, ProcessStatus, Priority } from '@rustic-debug/types';
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

    const data = await redis.get(keys[0]);
    if (!data) {
      return null;
    }

    try {
      const rawMessage = JSON.parse(data);
      // Parse the message as RusticAI format
      return this.transformRusticMessage(rawMessage);
    } catch (e) {
      console.error('Error parsing message:', e);
      return null;
    }
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

    let allMessages: Message[] = [];

    // If we have topicName, use the sorted set
    if (topicName) {
      const min = timeRange?.start?.getTime() || '-inf';
      const max = timeRange?.end?.getTime() || '+inf';

      // Build the full topic key (guildId:topicName in RusticAI)
      const topicKey = guildId ? `${guildId}:${topicName}` : topicName;

      // The sorted set contains full JSON messages
      const rawMessages = await redis.zrangebyscore(
        topicKey,
        min,
        max
      );

      // Parse messages
      for (const msgJson of rawMessages) {
        try {
          const rawMessage = JSON.parse(msgJson);
          const message = this.transformRusticMessage(rawMessage);
          if (message) {
            allMessages.push(message);
          }
        } catch (e) {
          console.error('Error parsing message from topic:', e);
        }
      }
    } else if (guildId) {
      // Get all topics for the guild and search
      // In RusticAI, topics are just keys in Redis
      // We need to scan for all topic keys
      const topicKeys = await redis.keys('*'); // This should be optimized in production

      for (const topicKey of topicKeys) {
        // Skip non-topic keys (like msg:* keys)
        if (topicKey.startsWith('msg:')) continue;

        const min = timeRange?.start?.getTime() || '-inf';
        const max = timeRange?.end?.getTime() || '+inf';

        try {
          const rawMessages = await redis.zrangebyscore(topicKey, min, max);
          for (const msgJson of rawMessages) {
            try {
              const rawMessage = JSON.parse(msgJson);
              const message = this.transformRusticMessage(rawMessage);
              if (message) {
                allMessages.push(message);
              }
            } catch (e) {
              // Skip invalid messages
            }
          }
        } catch (e) {
          // Skip if not a sorted set
        }
      }
    }

    // Apply filters
    let filteredMessages = allMessages;

    if (status && status.length) {
      filteredMessages = filteredMessages.filter(msg => {
        const msgStatus = msg.process_status || (msg.is_error_message ? 'error' : 'completed');
        return status.includes(msgStatus as ProcessStatus);
      });
    }

    if (agentId) {
      filteredMessages = filteredMessages.filter(msg =>
        msg.sender.id === agentId ||
        msg.sender.name === agentId ||
        msg.recipient_list?.some(r => r.id === agentId || r.name === agentId)
      );
    }

    if (threadId) {
      const threadIdNum = parseInt(threadId);
      filteredMessages = filteredMessages.filter(msg =>
        msg.thread?.includes(threadIdNum) ||
        msg.current_thread_id === threadIdNum ||
        msg.root_thread_id === threadIdNum
      );
    }

    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filteredMessages = filteredMessages.filter(msg => {
        const payloadStr = JSON.stringify(msg.payload).toLowerCase();
        const formatStr = msg.format?.toLowerCase() || '';
        return payloadStr.includes(searchLower) || formatStr.includes(searchLower);
      });
    }

    // Sort by timestamp (newest first)
    filteredMessages.sort((a, b) => b.timestamp - a.timestamp);

    // Paginate
    const total = filteredMessages.length;
    const hasMore = (offset + limit) < total;
    const paginatedMessages = filteredMessages.slice(offset, offset + limit);

    return {
      messages: paginatedMessages,
      total,
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
      status: options.status as ProcessStatus[],
      timeRange: timeRange.start && timeRange.end ? timeRange as { start: Date; end: Date } : undefined,
      limit: options.limit,
      offset: options.offset,
    });
  }

  /**
   * Transform a RusticAI message to our TypeScript Message type
   * This maps 1-1 with the Python Message class structure
   */
  private transformRusticMessage(rawMessage: any): Message | null {
    try {
      // Handle both raw message and already parsed format
      if (typeof rawMessage === 'string') {
        rawMessage = JSON.parse(rawMessage);
      }

      // Build thread array from current_thread_id if not present
      const thread = rawMessage.thread ||
        (rawMessage.current_thread_id ? [rawMessage.current_thread_id] :
         (rawMessage.id ? [rawMessage.id] : []));

      // Map to our Message type (1-1 with Python)
      const message: Message = {
        // Core identification
        id: rawMessage.id,
        priority: (rawMessage.priority ?? 4) as Priority,
        timestamp: rawMessage.timestamp || Date.now(),

        // Sender
        sender: rawMessage.sender || { name: 'unknown' },

        // Topics
        topics: rawMessage.topics || rawMessage.topic || '',
        topic_published_to: rawMessage.topic_published_to,

        // Recipients
        recipient_list: rawMessage.recipient_list || [],

        // Payload and format
        payload: rawMessage.payload || {},
        format: rawMessage.format ||
          rawMessage.payload?.message_format ||
          'generic_json',

        // Threading
        in_response_to: rawMessage.in_response_to,
        thread: thread,
        conversation_id: rawMessage.conversation_id,

        // Computed thread properties
        current_thread_id: thread[thread.length - 1],
        root_thread_id: thread[0],

        // Forwarding
        forward_header: rawMessage.forward_header,

        // Routing
        routing_slip: rawMessage.routing_slip,

        // History
        message_history: rawMessage.message_history || [],

        // TTL and enrichment
        ttl: rawMessage.ttl,
        enrich_with_history: rawMessage.enrich_with_history,

        // Status
        is_error_message: rawMessage.is_error_message || false,
        process_status: rawMessage.process_status,

        // Tracing
        traceparent: rawMessage.traceparent,

        // Session
        session_state: rawMessage.session_state,
      };

      return message;
    } catch (e) {
      console.error('Error transforming RusticAI message:', e);
      return null;
    }
  }
}