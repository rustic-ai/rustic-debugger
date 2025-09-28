import type { FastifyPluginAsync } from 'fastify';
import type { ApiResponse, PaginatedResponse, Message, ProcessStatus } from '@rustic-debug/types';
import { MessageHistoryService } from '../../services/messageHistory/index.js';
import { GuildDiscoveryService } from '../../services/guildDiscovery.js';
import { validateMessageId } from '../../utils/gemstoneId.js';

export const messageRoutes: FastifyPluginAsync = async (fastify) => {
  const messageService = new MessageHistoryService();
  const guildService = new GuildDiscoveryService();
  
  // GET /messages/:messageId
  fastify.get<{
    Params: { messageId: string };
    Reply: ApiResponse<Message>;
  }>('/:messageId', async (request, reply) => {
    const { messageId } = request.params;
    
    // Validate message ID format
    if (!validateMessageId(messageId)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_MESSAGE_ID',
          message: 'Invalid message ID format',
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    const message = await messageService.getMessageById(messageId);
    
    if (!message) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'MESSAGE_NOT_FOUND',
          message: `Message ${messageId} not found`,
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    return {
      success: true,
      data: message,
    };
  });
};

// Also register the topic messages endpoint
export const topicMessageRoutes: FastifyPluginAsync = async (fastify) => {
  const messageService = new MessageHistoryService();
  const guildService = new GuildDiscoveryService();
  
  // GET /guilds/:guildId/topics/:topicName/messages
  fastify.get<{
    Params: { 
      guildId: string;
      topicName: string;
    };
    Querystring: {
      start?: string;
      end?: string;
      status?: string;
      limit?: string;
      offset?: string;
    };
    Reply: PaginatedResponse<Message>;
  }>('/:guildId/topics/:topicName/messages', async (request, reply) => {
    const { guildId, topicName } = request.params;
    const { start, end, status } = request.query;
    const { limit, offset } = request.validated?.pagination || {};
    
    // Check if guild exists
    const guild = await guildService.getGuild(guildId);
    if (!guild) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'GUILD_NOT_FOUND',
          message: `Guild ${guildId} not found`,
          timestamp: new Date().toISOString(),
        },
        meta: { total: 0, limit: 0, offset: 0, hasMore: false },
      });
    }
    
    // Parse status array
    const statusArray = status ? status.split(',') as ProcessStatus[] : undefined;
    
    try {
      const result = await messageService.getTopicMessages(guildId, topicName, {
        start,
        end,
        status: statusArray,
        limit,
        offset,
      });
      
      return {
        success: true,
        data: result.messages,
        meta: {
          total: result.total,
          limit: limit || 100,
          offset: offset || 0,
          hasMore: result.hasMore,
        },
      };
    } catch (error) {
      // Re-throw to let error handler deal with it
      throw error;
    }
  });
};