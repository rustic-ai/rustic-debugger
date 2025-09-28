import type { GemstoneID } from './gemstoneId.js';

export interface RoutingSlip {
  id: string;
  messageId: string;
  guildId: string;
  steps: RoutingStep[];
  currentStep: number;
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
    totalDuration?: number; // milliseconds
  };
}

export interface RoutingStep {
  index: number;
  agentId: string;
  topicName?: string;
  action: 'process' | 'transform' | 'filter' | 'route' | 'store';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  input?: unknown;
  output?: unknown;
  error?: {
    code: string;
    message: string;
  };
  timing: {
    startedAt?: Date;
    completedAt?: Date;
    duration?: number; // milliseconds
  };
}

export interface Thread {
  id: GemstoneID;
  guildId: string;
  rootMessageId: string;
  messages: ThreadMessage[];
  participants: string[]; // agent IDs
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    messageCount: number;
    status: 'active' | 'resolved' | 'abandoned';
  };
  tags?: string[];
}

export interface ThreadMessage {
  messageId: string;
  parentId?: string;
  agentId: string;
  timestamp: Date;
  depth: number;
  children: string[]; // message IDs
}