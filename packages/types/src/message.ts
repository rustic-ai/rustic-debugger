import type { GemstoneID } from './gemstoneId.js';
import type { AgentTag, ProcessEntry } from './agent.js';
import type { RoutingSlip, ForwardHeader } from './routing.js';

// Process status enum
export type ProcessStatus = 'running' | 'error' | 'completed';

// Priority levels (matching RusticAI's Priority enum)
export type Priority = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

// JSON dictionary type
export type JsonDict = Record<string, any>;

/**
 * Main Message type - 1-1 mapping with RusticAI's Message class
 */
export interface Message {
  // Core identification (computed from GemstoneID)
  id: number;
  priority: Priority;
  timestamp: number;

  // Sender information
  sender: AgentTag;

  // Topic information
  topics: string | string[];
  topic_published_to?: string;

  // Recipients
  recipient_list: AgentTag[];

  // Message content
  payload: JsonDict;
  format: string;

  // Threading information
  in_response_to?: number;
  thread: number[];
  conversation_id?: number;

  // Forwarding
  forward_header?: ForwardHeader;

  // Routing
  routing_slip?: RoutingSlip;

  // Message history
  message_history: ProcessEntry[];

  // TTL and enrichment
  ttl?: number;
  enrich_with_history?: number;

  // Error and status
  is_error_message: boolean;
  process_status?: ProcessStatus;

  // Tracing
  traceparent?: string;

  // Session state
  session_state?: JsonDict;

  // Computed properties (from thread array)
  current_thread_id?: number; // thread[-1]
  root_thread_id?: number; // thread[0]
}

/**
 * MessageFilter for searching messages
 */
export interface MessageFilter {
  guildId?: string;
  topicName?: string;
  threadId?: string;
  status?: ProcessStatus[];
  agentId?: string;
  timeRange?: {
    start: Date;
    end: Date;
  };
  searchText?: string;
  limit?: number;
  offset?: number;
}

/**
 * Message constants
 */
export const MessageConstants = {
  RAW_JSON_FORMAT: 'generic_json'
} as const;