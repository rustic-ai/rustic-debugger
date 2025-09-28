import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyInstance } from 'fastify';
import { createRedisClients, closeRedisClients, type RedisClients } from '../services/redis/connection.js';

declare module 'fastify' {
  interface FastifyInstance {
    redis: RedisClients;
  }
}

const redisPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const clients = await createRedisClients();
  
  fastify.decorate('redis', clients);
  
  fastify.addHook('onClose', async () => {
    await closeRedisClients();
  });
};

export default fp(redisPlugin, {
  name: 'redis',
  dependencies: [],
});