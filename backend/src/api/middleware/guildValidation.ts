import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { GuildDiscoveryService } from '../../services/guildDiscovery.js';

const guildService = new GuildDiscoveryService();

export async function validateGuildExists(
  request: FastifyRequest<{ Params: { guildId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { guildId } = request.params;
  
  if (!guildId) {
    return;
  }
  
  const guild = await guildService.getGuild(guildId);
  
  if (!guild) {
    reply.status(404).send({
      success: false,
      error: {
        code: 'GUILD_NOT_FOUND',
        message: `Guild ${guildId} not found. The guild may have been deleted. Please select another guild.`,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }
}