import type { GemstoneID } from './gemstoneId.js';
import type { AgentTag } from './agent.js';
import type { ProcessStatus, Priority, JsonDict } from './message.js';

/**
 * ForwardHeader - 1-1 mapping with RusticAI's ForwardHeader
 * Represents the header for a forwarded message.
 */
export interface ForwardHeader {
  origin_message_id: number;
  on_behalf_of: AgentTag;
}

/**
 * RoutingOrigin - 1-1 mapping with RusticAI's RoutingOrigin
 * Represents a filter for a message that triggered the current step in a routing slip.
 */
export interface RoutingOrigin {
  origin_sender?: AgentTag;
  origin_topic?: string;
  origin_message_format?: string;
}

/**
 * RoutingDestination - 1-1 mapping with RusticAI's RoutingDestination
 * Represents a destination for a message in a routing slip.
 */
export interface RoutingDestination {
  topics?: string | string[];
  recipient_list?: AgentTag[];
  priority?: Priority;
}

/**
 * TransformationType - Types of transformers
 */
export type TransformationType = 'simple' | 'content_based_router';

/**
 * StateUpdateFormat - Formats for state updates
 */
export type StateUpdateFormat = 'json_patch' | 'json_merge_patch';

/**
 * StateUpdate - State update payload
 */
export interface StateUpdate {
  update_format: StateUpdateFormat;
  state_update: JsonDict;
}

/**
 * Transformer base interface
 */
export interface Transformer {
  style: TransformationType;
}

/**
 * PayloadTransformer - Simple transformer for message payload
 */
export interface PayloadTransformer extends Transformer {
  style: 'simple';
  output_format?: string;
  expression?: string; // JSONata expression
}

/**
 * FunctionalTransformer - Content-based router transformer
 */
export interface FunctionalTransformer extends Transformer {
  style: 'content_based_router';
  handler: string; // JSONata expression
}

/**
 * StateTransformer - Transformer for agent/guild state
 */
export interface StateTransformer {
  update_format: StateUpdateFormat;
  state_update?: string; // JSONata expression
}

/**
 * RoutingRule - 1-1 mapping with RusticAI's RoutingRule
 * Represents an entry in a routing slip.
 */
export interface RoutingRule {
  // Agent identification
  agent?: AgentTag;
  agent_type?: string;
  method_name?: string;

  // Filtering
  origin_filter?: RoutingOrigin;
  message_format?: string;

  // Routing
  destination?: RoutingDestination;
  mark_forwarded?: boolean;
  route_times?: number; // -1 = route every time

  // Transformation
  transformer?: PayloadTransformer | FunctionalTransformer;

  // State updates
  agent_state_update?: StateTransformer;
  guild_state_update?: StateTransformer;

  // Status and metadata
  process_status?: ProcessStatus;
  reason?: string;
}

/**
 * RoutingSlip - 1-1 mapping with RusticAI's RoutingSlip
 * Represents a routing slip for a message.
 */
export interface RoutingSlip {
  steps: RoutingRule[];
}

/**
 * MessageRoutable - Fields that can be modified by a router
 */
export interface MessageRoutable {
  topics: string | string[];
  priority: Priority;
  recipient_list?: AgentTag[];
  payload: JsonDict;
  format: string;
  forward_header?: ForwardHeader;
  context?: JsonDict;
  enrich_with_history?: number;
  process_status?: ProcessStatus;
}

// ============= Debugger-specific routing types (for UI) =============

/**
 * DebuggerRoutingSlip - Enhanced routing slip for debugger UI
 */
export interface DebuggerRoutingSlip {
  id: string;
  messageId: string;
  guildId: string;
  steps: DebuggerRoutingStep[];
  currentStep: number;
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
    totalDuration?: number; // milliseconds
  };
}

export interface DebuggerRoutingStep {
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