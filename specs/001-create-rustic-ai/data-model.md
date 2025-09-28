# Data Model: Rustic AI Message Debugger

## Overview
This document defines the data structures used throughout the Redis Messaging Debugger, derived from the functional requirements and RusticAI message format.

## Core Entities

### GemstoneID
A 64-bit unique identifier with embedded timestamp and priority (matching RusticAI format).

```typescript
type GemstoneID = string; // Branded type for 64-bit ID

interface GemstoneIDComponents {
  timestamp: number;      // Unix timestamp in milliseconds
  priority: number;       // Message priority (0-255)
  sequence: number;       // Sequence number for uniqueness
}
```

### Guild
A namespace that groups related topics and agents.

```typescript
interface Guild {
  id: string;                    // Guild namespace identifier
  name: string;                  // Human-readable name
  description?: string;          // Optional description
  topicCount: number;           // Number of topics in guild
  messageRate: number;          // Messages per second (current)
  lastActivity: Date;           // Last message timestamp
  status: 'active' | 'idle' | 'inactive';
}
```

### Topic
A channel within a guild where messages are published and subscribed.

```typescript
interface Topic {
  id: string;                    // Full topic identifier (guild:topic)
  guildId: string;              // Parent guild ID
  name: string;                 // Topic name within guild
  subscriberCount: number;      // Active subscribers
  messageCount: number;         // Total messages in window
  messageRate: number;          // Messages per second
  errorRate: number;            // Errors per second
  lastMessage?: Date;           // Last message timestamp
}
```

### Message
A unit of communication with payload, routing, and metadata.

```typescript
interface Message {
  id: GemstoneID;               // Unique message identifier
  guildId: string;              // Guild namespace
  topicId: string;              // Full topic identifier
  threadId?: GemstoneID;        // Parent message for threading
  timestamp: Date;              // Message creation time
  
  // Payload
  type: string;                 // Message type/schema
  payload: Record<string, unknown>; // Message content
  
  // Routing
  sender: AgentIdentifier;      // Originating agent
  routing: RoutingSlip;         // Routing history
  
  // Status
  status: ProcessStatus;        // Processing status
  error?: ErrorInfo;           // Error details if failed
  
  // Metadata
  ttl?: number;                // Time to live in seconds
  tags?: string[];             // Searchable tags
  version: string;             // Message format version
}
```

### Agent
An entity that processes messages from topics.

```typescript
interface Agent {
  id: string;                   // Agent identifier
  name: string;                 // Human-readable name
  type: string;                 // Agent type/class
  topics: string[];            // Subscribed topics
  status: 'online' | 'offline' | 'error';
  lastSeen: Date;              // Last activity timestamp
  processedCount: number;      // Messages processed
  errorCount: number;          // Processing errors
}

interface AgentIdentifier {
  id: string;
  name: string;
  type: string;
}
```

### ProcessStatus
Execution state of a message.

```typescript
enum ProcessStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  TIMEOUT = 'TIMEOUT',
  SKIPPED = 'SKIPPED',
  RETRY = 'RETRY'
}
```

### RoutingSlip
The path a message has taken through different agents and topics.

```typescript
interface RoutingSlip {
  entries: RoutingEntry[];      // Ordered list of routing steps
  currentIndex: number;         // Current position in route
}

interface RoutingEntry {
  agentId: string;              // Processing agent
  topicId: string;              // Topic received from
  timestamp: Date;              // Processing time
  duration?: number;            // Processing duration in ms
  status: ProcessStatus;        // Processing result
  error?: string;               // Error message if failed
}
```

### Thread
A linked sequence of related messages forming a conversation.

```typescript
interface Thread {
  id: GemstoneID;               // Root message ID
  messages: Message[];          // Ordered thread messages
  participants: AgentIdentifier[]; // Agents in conversation
  startTime: Date;              // Thread start
  endTime?: Date;               // Thread end (if closed)
  status: 'active' | 'completed' | 'error';
  summary?: string;             // AI-generated summary
}
```

### ErrorInfo
Detailed error information for failed messages.

```typescript
interface ErrorInfo {
  code: string;                 // Error code
  message: string;              // Error description
  stack?: string;               // Stack trace
  context?: Record<string, unknown>; // Additional context
  timestamp: Date;              // When error occurred
  retryable: boolean;           // Can be retried
  retryCount?: number;          // Retry attempts
}
```

## View Models

### MessageFlowNode
Node in the message flow visualization graph.

```typescript
interface MessageFlowNode {
  id: string;                   // Node identifier
  type: 'topic' | 'agent';     // Node type
  label: string;               // Display label
  messageCount: number;        // Messages processed
  errorCount: number;          // Errors encountered
  avgDuration?: number;        // Avg processing time
  position?: { x: number; y: number }; // Graph position
}

interface MessageFlowEdge {
  id: string;                  // Edge identifier
  source: string;              // Source node ID
  target: string;              // Target node ID
  messageCount: number;        // Messages on edge
  animated: boolean;           // Show animation
  status: 'normal' | 'error' | 'warning';
}
```

### FilterCriteria
Search and filter parameters.

```typescript
interface FilterCriteria {
  guildId?: string;
  topicIds?: string[];
  agentIds?: string[];
  status?: ProcessStatus[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  searchText?: string;
  threadId?: GemstoneID;
  tags?: string[];
  limit?: number;
}
```

### ExportRequest
Message export configuration.

```typescript
interface ExportRequest {
  filters: FilterCriteria;
  format: 'json';              // Only JSON supported
  fields?: string[];           // Fields to include
  includeRouting?: boolean;    // Include routing slip
  includeThreads?: boolean;    // Group by threads
  filename?: string;           // Export filename
}
```

## API Response Models

### PaginatedResponse
Standard paginated response wrapper.

```typescript
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  timestamp: Date;
}
```

### StreamUpdate
WebSocket/SSE update message.

```typescript
interface StreamUpdate {
  type: 'message' | 'stats' | 'error';
  guildId: string;
  data: Message | TopicStats | ErrorInfo;
  timestamp: Date;
  resumeToken?: string;        // For reconnection
}

interface TopicStats {
  topicId: string;
  messageRate: number;
  errorRate: number;
  subscriberCount: number;
}
```

## Validation Rules

1. **GemstoneID**: Must be valid 64-bit format with extractable timestamp
2. **Guild/Topic IDs**: Alphanumeric with hyphens, no spaces
3. **Message payload**: Maximum 1MB size
4. **Time ranges**: Maximum 7 days (per FR-007)
5. **Export size**: Maximum 10,000 messages per export
6. **Tag length**: Maximum 50 characters per tag
7. **Search text**: Maximum 200 characters

## State Transitions

### Message Status Flow
```
PENDING → PROCESSING → SUCCESS
                   ↓
                   → ERROR → RETRY → SUCCESS/ERROR
                   ↓
                   → TIMEOUT
                   ↓
                   → SKIPPED
```

### Guild Status Determination
- **active**: Messages in last 1 minute
- **idle**: Messages in last 1 hour but not last minute  
- **inactive**: No messages in last hour