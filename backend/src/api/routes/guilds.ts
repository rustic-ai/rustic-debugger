import type { FastifyPluginAsync } from 'fastify';
import type { PaginatedResponse, Guild } from '@rustic-debug/types';
import { GuildDiscoveryService } from '../../services/guildDiscovery.js';

export const guildRoutes: FastifyPluginAsync = async (fastify) => {
  const guildService = new GuildDiscoveryService();
  
  // GET /guilds
  fastify.get<{
    Querystring: {
      limit?: string;
      offset?: string;
      status?: string;
      sortBy?: string;
      sortOrder?: string;
    };
    Reply: PaginatedResponse<Guild>;
  }>('/', async (request, reply) => {
    const { limit, offset, sortBy, sortOrder } = request.validated?.pagination || {};
    const { status } = request.query;
    
    const result = await guildService.discoverGuilds({
      limit: limit || 20,
      offset: offset || 0,
      status,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc',
    });
    
    const response: PaginatedResponse<Guild> = {
      success: true,
      data: result.guilds,
      meta: {
        total: result.total,
        limit: limit || 20,
        offset: offset || 0,
        hasMore: result.hasMore,
      },
    };
    
    return response;
  });
  
  // GET /guilds/:guildId
  fastify.get<{
    Params: { guildId: string };
    Reply: Guild | { success: false; error: any };
  }>('/:guildId', async (request, reply) => {
    const { guildId } = request.params;
    
    const guild = await guildService.getGuild(guildId);
    
    if (!guild) {
      reply.status(404);
      return reply.send({
        success: false,
        error: {
          code: 'GUILD_NOT_FOUND',
          message: `Guild ${guildId} not found`,
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    return guild;
  });
};