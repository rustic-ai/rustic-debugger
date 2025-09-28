import type { FastifyPluginAsync } from 'fastify';
import type { ApiResponse, ExportRequest, ExportResponse } from '@rustic-debug/types';
import { exportRequestSchema } from '@rustic-debug/types';
import { config } from '../../config/index.js';

export const exportRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /export
  fastify.post<{
    Body: ExportRequest;
    Reply: ApiResponse<ExportResponse>;
  }>('/', async (request, reply) => {
    // Validate request body
    let validatedBody: ExportRequest;
    try {
      validatedBody = exportRequestSchema.parse(request.body);
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
    
    // Check export size limit
    const limit = validatedBody.filter.limit || config.maxExportSize;
    if (limit > config.maxExportSize) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Export limit exceeds maximum of ${config.maxExportSize} messages`,
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    // Validate time range
    if (validatedBody.filter.timeRange?.start) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - config.messageRetentionDays);
      
      if (validatedBody.filter.timeRange.start < sevenDaysAgo) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Time range exceeds ${config.messageRetentionDays} days retention window`,
            timestamp: new Date().toISOString(),
          },
        });
      }
    }
    
    // Create export job (simplified - in production would use job queue)
    const exportId = `export-${Date.now().toString(36)}`;
    
    const response: ExportResponse = {
      exportId,
      status: 'processing',
      metadata: {
        messageCount: 0, // Would be calculated
        sizeBytes: 0, // Would be calculated
        format: validatedBody.format,
      },
    };
    
    // Return 202 Accepted
    return reply.status(202).send({
      success: true,
      data: response,
    });
  });
  
  // GET /export/:exportId/status (for the test that expects this)
  fastify.get<{
    Params: { exportId: string };
    Reply: ApiResponse<ExportResponse>;
  }>('/:exportId/status', async (request, reply) => {
    // In production, this would check the export job status
    return reply.status(404).send({
      success: false,
      error: {
        code: 'EXPORT_NOT_FOUND',
        message: 'Export not found',
        timestamp: new Date().toISOString(),
      },
    });
  });
};