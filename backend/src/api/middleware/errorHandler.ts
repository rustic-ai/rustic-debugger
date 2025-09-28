import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import type { ApiError } from '@rustic-debug/types';
import { ZodError } from 'zod';

export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Log error details
  request.log.error({
    err: error,
    request: {
      method: request.method,
      url: request.url,
      params: request.params,
      query: request.query,
    },
  });

  let statusCode = error.statusCode || 500;
  let errorResponse: ApiError = {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
  };

  // Handle specific error types
  if (error instanceof ZodError) {
    statusCode = 400;
    errorResponse = {
      code: 'VALIDATION_ERROR',
      message: 'Invalid request data',
      details: error.errors,
      timestamp: new Date().toISOString(),
    };
  } else if (error.code === 'FST_ERR_VALIDATION') {
    statusCode = 400;
    errorResponse = {
      code: 'VALIDATION_ERROR',
      message: error.message,
      timestamp: new Date().toISOString(),
    };
  } else if (error.code === 'RATE_LIMIT_EXCEEDED') {
    statusCode = 429;
    errorResponse = {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests',
      timestamp: new Date().toISOString(),
    };
  } else if (error.message.includes('exceeds 7 day retention')) {
    statusCode = 400;
    errorResponse = {
      code: 'INVALID_TIME_RANGE',
      message: error.message,
      timestamp: new Date().toISOString(),
    };
  } else if (error.message.includes('not found')) {
    statusCode = 404;
    const resourceType = error.message.includes('Guild') ? 'GUILD' : 
                        error.message.includes('Message') ? 'MESSAGE' : 
                        'RESOURCE';
    errorResponse = {
      code: `${resourceType}_NOT_FOUND`,
      message: error.message,
      timestamp: new Date().toISOString(),
    };
  } else if (statusCode < 500) {
    // Client error
    errorResponse = {
      code: error.code || 'CLIENT_ERROR',
      message: error.message,
      timestamp: new Date().toISOString(),
    };
  }

  // Send error response
  reply.status(statusCode).send({
    success: false,
    error: errorResponse,
  });
}