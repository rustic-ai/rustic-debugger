import type { Guild, GuildActivity } from '@rustic-debug/types';
import { GuildModel } from '../models/guild.js';

export class GuildDiscoveryService {
  private guildModel = new GuildModel();
  
  async discoverGuilds(options: {
    limit?: number;
    offset?: number;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{
    guilds: Guild[];
    total: number;
    hasMore: boolean;
  }> {
    const { guilds, total } = await this.guildModel.findAll(options);
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    
    return {
      guilds,
      total,
      hasMore: offset + guilds.length < total,
    };
  }
  
  async getGuild(guildId: string): Promise<Guild | null> {
    return this.guildModel.findById(guildId);
  }
  
  async getGuildActivity(guildId: string, period?: { start: Date; end: Date }): Promise<GuildActivity | null> {
    return this.guildModel.getActivity(guildId, period);
  }
  
  async isGuildActive(guildId: string): Promise<boolean> {
    const guild = await this.guildModel.findById(guildId);
    return guild?.status === 'active' || false;
  }
}