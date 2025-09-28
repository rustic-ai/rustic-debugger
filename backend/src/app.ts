import Fastify from 'fastify';
import type { FastifyServerOptions } from 'fastify';
import { healthRoutes } from './api/routes/health.js';
import { guildRoutes } from './api/routes/guilds.js';
import { topicRoutes } from './api/routes/topics.js';
import { messageRoutes, topicMessageRoutes } from './api/routes/messages.js';
import { replayRoutes } from './api/routes/replay.js';
import { exportRoutes } from './api/routes/export.js';
import { cacheRoutes } from './api/routes/cache.js';
import { websocketPlugin } from './api/websocket/plugin.js';
import { errorHandler } from './api/middleware/errorHandler.js';
import { requestValidation } from './api/middleware/validation.js';
import redisPlugin from './plugins/redis.js';
import cachePlugin from './plugins/cache.js';
import { config } from './config/index.js';

export async function build(opts: FastifyServerOptions = {}) {
  const app = Fastify({
    ...opts,
    logger: opts.logger || {
      level: config.logLevel,
    },
  });

  // Register plugins
  await app.register(redisPlugin);
  await app.register(cachePlugin);
  await app.register(requestValidation);
  
  // Register WebSocket support
  await app.register(websocketPlugin);
  
  // Register error handler
  app.setErrorHandler(errorHandler);
  
  // Register routes
  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(guildRoutes, { prefix: '/guilds' });
  await app.register(topicRoutes, { prefix: '/guilds' });
  await app.register(topicMessageRoutes, { prefix: '/guilds' });
  await app.register(messageRoutes, { prefix: '/messages' });
  await app.register(replayRoutes, { prefix: '/replay' });
  await app.register(exportRoutes, { prefix: '/export' });
  await app.register(cacheRoutes, { prefix: '/cache' });
  
  return app;
}