import type { GemstoneID } from './gemstoneId.js';

export type GuildStatus = 'active' | 'idle' | 'inactive';

export interface Guild {
  id: GemstoneID;
  name: string;
  namespace: string;
  status: GuildStatus;
  description?: string;
  metadata: {
    topicCount: number;
    agentCount: number;
    messageRate: number; // messages per second
    lastActivity: Date;
    createdAt: Date;
    updatedAt: Date;
  };
  config: {
    retentionDays: number;
    maxTopics: number;
    maxAgents: number;
    maxMessageRate: number;
  };
}

export interface GuildActivity {
  guildId: string;
  messageCount: number;
  errorCount: number;
  avgProcessingTime: number; // milliseconds
  activeAgents: string[];
  activeTopics: string[];
  period: {
    start: Date;
    end: Date;
  };
}

export function getGuildStatus(lastActivity: Date): GuildStatus {
  const now = Date.now();
  const diff = now - lastActivity.getTime();
  
  if (diff < 60 * 1000) { // < 1 minute
    return 'active';
  } else if (diff < 60 * 60 * 1000) { // < 1 hour
    return 'idle';
  } else {
    return 'inactive';
  }
}