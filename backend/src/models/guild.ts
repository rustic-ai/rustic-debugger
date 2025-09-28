import type { Guild, GuildActivity } from '@rustic-debug/types';
import { getRedisClients } from '../services/redis/connection.js';
import { gemstoneId } from '../utils/gemstoneId.js';
import { getGuildStatus } from '@rustic-debug/types';

export class GuildModel {
  // Pattern to identify guild-related keys
  // Guilds have topics like: guild_id:topic_name
  private guildTopicPattern = /^([^:]+):(.+)$/;

  async findById(id: string): Promise<Guild | null> {
    const { command: redis } = await getRedisClients();

    // Check if this guild has any topics
    const keys = await redis.keys(`${id}:*`);

    if (!keys.length) {
      return null;
    }

    // Extract topic names
    const topics = keys.map(key => {
      const match = key.match(this.guildTopicPattern);
      return match ? match[2] : null;
    }).filter(Boolean);

    // Count messages across all topics
    let messageCount = 0;
    for (const key of keys) {
      const count = await redis.zcard(key);
      messageCount += count;
    }

    // Get the most recent message timestamp
    let lastActivity = new Date();
    for (const key of keys) {
      const messages = await redis.zrange(key, -1, -1);
      if (messages.length > 0) {
        try {
          const msg = JSON.parse(messages[0]);
          if (msg.timestamp) {
            const msgTime = new Date(msg.timestamp);
            if (msgTime > lastActivity) {
              lastActivity = msgTime;
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }

    return {
      id: gemstoneId.parse(id),
      name: this.formatGuildName(id),
      namespace: id,
      status: getGuildStatus(lastActivity),
      description: `Guild ${id}`,
      metadata: {
        topicCount: topics.length,
        agentCount: 0, // Will be calculated from actual agents
        messageRate: 0, // Will be calculated from message timestamps
        lastActivity,
        createdAt: lastActivity, // Use last activity as approximation
        updatedAt: lastActivity,
      },
      config: {
        retentionDays: 7,
        maxTopics: 100,
        maxAgents: 50,
        maxMessageRate: 1000,
      },
    };
  }

  async findAll(options: {
    limit?: number;
    offset?: number;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{ guilds: Guild[]; total: number }> {
    const { command: redis } = await getRedisClients();
    const { limit = 20, offset = 0, status, sortBy = 'name', sortOrder = 'asc' } = options;

    // Get all keys to discover guilds
    const allKeys = await redis.keys('*');

    // Extract unique guild IDs from keys
    const guildSet = new Set<string>();

    for (const key of allKeys) {
      // Skip message keys
      if (key.startsWith('msg:')) continue;
      if (key.startsWith('managed_state:')) continue;

      // Extract guild ID from patterns like "guild_id:topic_name"
      const match = key.match(this.guildTopicPattern);
      if (match) {
        const guildId = match[1];
        // Only add if it looks like a guild ID (has underscore or is alphanumeric)
        if (guildId && (guildId.includes('_') || guildId.match(/^[A-Za-z0-9]+$/))) {
          guildSet.add(guildId);
        }
      }
    }

    const guildIds = Array.from(guildSet);

    if (!guildIds.length) {
      return { guilds: [], total: 0 };
    }

    // Fetch guild details
    const guilds: Guild[] = [];

    for (const id of guildIds) {
      const guild = await this.findById(id);
      if (guild) {
        // Filter by status if specified
        if (!status || guild.status === status) {
          guilds.push(guild);
        }
      }
    }

    // Sort guilds
    guilds.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'namespace':
          comparison = a.namespace.localeCompare(b.namespace);
          break;
        case 'lastActivity':
          comparison = a.metadata.lastActivity.getTime() - b.metadata.lastActivity.getTime();
          break;
        default:
          comparison = a.name.localeCompare(b.name);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Apply pagination
    const paginatedGuilds = guilds.slice(offset, offset + limit);

    return {
      guilds: paginatedGuilds,
      total: guilds.length,
    };
  }

  async getActivity(guildId: string, period?: { start: Date; end: Date }): Promise<GuildActivity | null> {
    const guild = await this.findById(guildId);
    if (!guild) {
      return null;
    }
    
    const { command: redis } = await getRedisClients();
    const now = new Date();
    const start = period?.start || new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
    const end = period?.end || now;
    
    // Get topic list for the guild from actual keys
    const keys = await redis.keys(`${guildId}:*`);
    const topics = keys.map(key => {
      const match = key.match(this.guildTopicPattern);
      return match ? match[2] : null;
    }).filter(Boolean) as string[];
    
    // Calculate metrics (simplified for now)
    const activity: GuildActivity = {
      guildId,
      messageCount: 0,
      errorCount: 0,
      avgProcessingTime: 0,
      activeAgents: [],
      activeTopics: topics,
      period: { start, end },
    };
    
    // In a real implementation, we would aggregate metrics from time-series data
    for (const topic of topics) {
      const count = await redis.zcount(
        `${guildId}:${topic}`,
        start.getTime(),
        end.getTime()
      );
      activity.messageCount += count;
    }
    
    return activity;
  }

  private formatGuildName(id: string): string {
    // Format guild ID for display
    if (id.startsWith('scheduler_guild_')) {
      return 'Scheduler Guild';
    }
    if (id.startsWith('state_guild_')) {
      return 'State Guild ' + id.split('_')[2];
    }
    if (id === 'test_guild_id') {
      return 'Test Guild';
    }
    // For other guilds, try to make it readable
    return id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}