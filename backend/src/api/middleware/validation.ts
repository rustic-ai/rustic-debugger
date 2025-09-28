import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { validateMessageId } from '../../utils/gemstoneId.js';
import { 
  paginationSchema, 
  timeRangeSchema,
  exportRequestSchema,
  replayRequestSchema 
} from '@rustic-debug/types';

declare module 'fastify' {
  interface FastifyRequest {
    validated?: {
      pagination?: {
        limit: number;
        offset: number;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
      };
      timeRange?: {
        start?: Date;
        end?: Date;
      };
    };
  }
}

const requestValidation: FastifyPluginAsync = async (fastify) => {
  // Add request validation hooks
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    request.validated = {};
    
    // Validate pagination params if present
    if (request.query && typeof request.query === 'object') {
      const query = request.query as Record<string, any>;
      
      if (query.limit !== undefined || query.offset !== undefined) {
        try {
          const pagination = paginationSchema.parse({
            limit: query.limit ? parseInt(query.limit, 10) : undefined,
            offset: query.offset ? parseInt(query.offset, 10) : undefined,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder,
          });
          request.validated.pagination = {
            limit: pagination.limit || 20,
            offset: pagination.offset || 0,
            sortBy: pagination.sortBy,
            sortOrder: pagination.sortOrder,
          };
        } catch (error) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'INVALID_PAGINATION',
              message: 'Invalid pagination parameters',
              timestamp: new Date().toISOString(),
            },
          });
        }
      }
      
      // Validate time range params if present
      if (query.start !== undefined || query.end !== undefined) {
        try {
          const timeRange = timeRangeSchema.parse({
            start: query.start,
            end: query.end,
          });
          request.validated.timeRange = {
            start: timeRange.start ? new Date(timeRange.start) : undefined,
            end: timeRange.end ? new Date(timeRange.end) : undefined,
          };
        } catch (error) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'INVALID_TIME_RANGE',
              message: 'Invalid time range parameters',
              timestamp: new Date().toISOString(),
            },
          });
        }
      }
    }
  });
  
  // Add message ID validation helper
  fastify.decorate('validateMessageId', (messageId: string): boolean => {
    return validateMessageId(messageId);
  });
};

export default fp(requestValidation, {
  name: 'request-validation',
});

// Export for use in app.ts
export { requestValidation };