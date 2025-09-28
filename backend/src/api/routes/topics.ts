import type { FastifyPluginAsync } from 'fastify';
import type { ApiResponse, Topic } from '@rustic-debug/types';
import { TopicModel } from '../../models/topic.js';
import { GuildDiscoveryService } from '../../services/guildDiscovery.js';

export const topicRoutes: FastifyPluginAsync = async (fastify) => {
  const topicModel = new TopicModel();
  const guildService = new GuildDiscoveryService();
  
  // GET /guilds/:guildId/topics
  fastify.get<{
    Params: { guildId: string };
    Querystring: { 
      type?: string;
      includeStats?: string;
    };
    Reply: ApiResponse<Topic[]>;
  }>('/:guildId/topics', async (request, reply) => {
    const { guildId } = request.params;
    const { type, includeStats } = request.query;
    
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
      });
    }
    
    const topics = await topicModel.findByGuild(guildId, {
      type,
      includeStats: includeStats === 'true',
    });
    
    return {
      success: true,
      data: topics,
    };
  });
};