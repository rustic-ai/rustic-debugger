import type { Message, MessageFilter } from '@rustic-debug/types';
import { MessageModel } from '../../models/message.js';
import { TopicModel } from '../../models/topic.js';
import { MessageOrdering } from './ordering.js';
import { config } from '../../config/index.js';

export class MessageHistoryService {
  private messageModel = new MessageModel();
  private topicModel = new TopicModel();
  private messageOrdering = new MessageOrdering();
  
  async getMessageById(messageId: string): Promise<Message | null> {
    return this.messageModel.findById(messageId);
  }
  
  async getMessageHistory(filter: MessageFilter): Promise<{
    messages: Message[];
    total: number;
    hasMore: boolean;
  }> {
    // Validate retention window
    this.validateRetentionWindow(filter.timeRange);
    
    // Get messages
    const result = await this.messageModel.findByFilter(filter);
    
    // Apply ordering
    result.messages = this.messageOrdering.orderMessages(result.messages);
    
    return result;
  }
  
  async getTopicMessages(
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
    // Validate time range
    if (options.start) {
      this.validateRetentionWindow({
        start: new Date(options.start),
        end: options.end ? new Date(options.end) : new Date(),
      });
    }
    
    const result = await this.messageModel.findByTopic(guildId, topicName, options);
    
    // Apply ordering
    result.messages = this.messageOrdering.orderMessages(result.messages);
    
    return result;
  }
  
  async getThreadMessages(threadId: string): Promise<Message[]> {
    const filter: MessageFilter = {
      threadId,
      limit: 1000, // Thread view shows all messages
    };
    
    const result = await this.messageModel.findByFilter(filter);
    
    // Order by thread hierarchy
    return this.messageOrdering.orderThreadMessages(result.messages);
  }
  
  async searchMessages(
    guildId: string,
    searchText: string,
    options: {
      topicName?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    messages: Message[];
    total: number;
    hasMore: boolean;
  }> {
    const filter: MessageFilter = {
      guildId,
      topicName: options.topicName,
      searchText,
      limit: options.limit,
      offset: options.offset,
    };
    
    const result = await this.messageModel.findByFilter(filter);
    
    // Apply ordering
    result.messages = this.messageOrdering.orderMessages(result.messages);
    
    return result;
  }
  
  private validateRetentionWindow(timeRange?: { start: Date; end: Date }): void {
    if (!timeRange?.start) {
      return;
    }
    
    const retentionDays = config.messageRetentionDays;
    const oldestAllowed = new Date();
    oldestAllowed.setDate(oldestAllowed.getDate() - retentionDays);
    
    if (timeRange.start < oldestAllowed) {
      throw new Error(
        `Time range exceeds ${retentionDays} day retention window. ` +
        `Oldest available date is ${oldestAllowed.toISOString()}`
      );
    }
  }
}