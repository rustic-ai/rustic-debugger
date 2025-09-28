import type { FastifyPluginAsync } from 'fastify';
import type { ApiResponse, ReplayRequest, ReplayResponse } from '@rustic-debug/types';
import { replayRequestSchema } from '@rustic-debug/types';
import { config } from '../../config/index.js';
import { MessageHistoryService } from '../../services/messageHistory/index.js';
import { validateMessageId } from '../../utils/gemstoneId.js';

export const replayRoutes: FastifyPluginAsync = async (fastify) => {
  const messageService = new MessageHistoryService();
  
  // POST /replay
  fastify.post<{
    Body: ReplayRequest;
    Reply: ApiResponse<ReplayResponse>;
  }>('/', async (request, reply) => {
    // Check if replay feature is enabled
    if (!config.enableReplay) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FEATURE_DISABLED',
          message: 'Replay feature is disabled',
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    // Validate request body
    let validatedBody: ReplayRequest;
    try {
      validatedBody = replayRequestSchema.parse(request.body);
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    // Validate message IDs
    const invalidIds = validatedBody.messageIds.filter(id => !validateMessageId(id));
    if (invalidIds.length > 0) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_MESSAGE_ID',
          message: 'Invalid message ID format',
          details: { invalidIds },
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    // Check if all messages exist
    const notFoundIds: string[] = [];
    for (const messageId of validatedBody.messageIds) {
      const message = await messageService.getMessageById(messageId);
      if (!message) {
        notFoundIds.push(messageId);
      }
    }
    
    if (notFoundIds.length > 0) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'MESSAGES_NOT_FOUND',
          message: 'Some messages were not found',
          details: { notFound: notFoundIds },
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    // Create replay job (simplified - in production would use job queue)
    const replayId = `replay-${Date.now().toString(36)}`;
    
    const response: ReplayResponse = {
      replayId,
      status: 'queued',
      progress: {
        total: validatedBody.messageIds.length,
        processed: 0,
        succeeded: 0,
        failed: 0,
      },
    };
    
    // Return 202 Accepted
    return reply.status(202).send({
      success: true,
      data: response,
    });
  });
};