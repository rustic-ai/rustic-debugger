import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import websocket from '@fastify/websocket';
import { WebSocketHandler } from './handler.js';

const websocketPlugin: FastifyPluginAsync = async (fastify) => {
  // Register the websocket plugin
  await fastify.register(websocket, {
    options: {
      maxPayload: 1048576, // 1MB
      clientTracking: true,
    },
  });
  
  // Create handler instance
  const wsHandler = new WebSocketHandler(fastify);
  
  // Register WebSocket route
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    wsHandler.handleConnection(connection.socket as any, req);
  });
};

const plugin = fp(websocketPlugin, {
  name: 'websocket',
  dependencies: ['redis', 'cache'],
});

export { plugin as websocketPlugin };