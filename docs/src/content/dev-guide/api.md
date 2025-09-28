---
title: API Reference
description: Complete API reference for Rustic Debug
tags: [api, reference, endpoints]
---

# API Reference

Comprehensive API documentation for integrating with Rustic Debug.

## REST API Endpoints

### Guild Management

#### GET /api/guilds
Returns a list of all available guilds.

**Response:**
```json
{
  "guilds": [
    {
      "id": "rustic-debug-guild-001",
      "name": "Debug Guild",
      "status": "active",
      "topics": 5,
      "agents": 12
    }
  ]
}
```

#### GET /api/guilds/:guildId
Get detailed information about a specific guild.

**Parameters:**
- `guildId` (string): The unique guild identifier

**Response:**
```json
{
  "id": "rustic-debug-guild-001",
  "name": "Debug Guild",
  "status": "active",
  "created": "2024-01-15T10:00:00Z",
  "topics": [...],
  "agents": [...],
  "metadata": {...}
}
```

### Topic Management

#### GET /api/guilds/:guildId/topics
List all topics within a guild.

**Parameters:**
- `guildId` (string): The guild identifier
- `limit` (number, optional): Maximum number of topics to return
- `offset` (number, optional): Pagination offset

**Response:**
```json
{
  "topics": [
    {
      "name": "user-interactions",
      "messageCount": 1542,
      "agents": ["chat-handler", "response-generator"],
      "lastActivity": "2024-01-15T14:30:00Z"
    }
  ],
  "total": 5,
  "limit": 10,
  "offset": 0
}
```

### Message Operations

#### GET /api/guilds/:guildId/topics/:topic/messages
Retrieve message history for a specific topic.

**Parameters:**
- `guildId` (string): The guild identifier
- `topic` (string): The topic name
- `limit` (number, optional): Maximum messages to return (default: 100)
- `since` (timestamp, optional): Get messages after this timestamp
- `before` (timestamp, optional): Get messages before this timestamp

**Response:**
```json
{
  "messages": [
    {
      "id": "VGF6sLGdatx3gPeGEDQxHb",
      "topic": "user-interactions",
      "guild_id": "rustic-debug-guild-001",
      "agent_tag": {
        "name": "chat-handler",
        "version": "1.0.0"
      },
      "content": {...},
      "metadata": {...},
      "timestamp": "2024-01-15T14:30:00Z"
    }
  ],
  "hasMore": true,
  "nextCursor": "abc123"
}
```

#### GET /api/messages/:messageId
Get detailed information about a specific message.

**Parameters:**
- `messageId` (string): The GemstoneID of the message

**Response:**
```json
{
  "id": "VGF6sLGdatx3gPeGEDQxHb",
  "topic": "user-interactions",
  "guild_id": "rustic-debug-guild-001",
  "agent_tag": {
    "name": "chat-handler",
    "version": "1.0.0",
    "instance_id": "handler-001"
  },
  "content": {
    "type": "text",
    "body": "User query processed successfully",
    "attachments": []
  },
  "metadata": {
    "thread_id": "thread-456",
    "parent_id": "VGF6sLGdatx3gPeGEDQxHa",
    "processing_time_ms": 42,
    "retry_count": 0
  },
  "routing_rules": [
    {
      "target_topic": "response-generation",
      "condition": "status == 'success'"
    }
  ],
  "timestamp": "2024-01-15T14:30:00Z",
  "gemstone_id": {
    "timestamp": 1705325400000,
    "priority": 5,
    "sequence": 1234
  }
}
```

## WebSocket API

### Connection

**Endpoint:** `ws://localhost:3001/stream/:guildId`

**Connection Example:**
```javascript
const ws = new WebSocket('ws://localhost:3001/stream/rustic-debug-guild-001');

ws.onopen = () => {
  console.log('Connected to message stream');
  
  // Subscribe to specific topics
  ws.send(JSON.stringify({
    type: 'subscribe',
    topics: ['user-interactions', 'system-events']
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('New message:', message);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};
```

### Message Types

#### Subscribe to Topics
```json
{
  "type": "subscribe",
  "topics": ["topic1", "topic2"]
}
```

#### Unsubscribe from Topics
```json
{
  "type": "unsubscribe",
  "topics": ["topic1"]
}
```

#### Incoming Message
```json
{
  "type": "message",
  "data": {
    "id": "VGF6sLGdatx3gPeGEDQxHb",
    "topic": "user-interactions",
    "content": {...},
    "timestamp": "2024-01-15T14:30:00Z"
  }
}
```

## Error Responses

All API errors follow a consistent format:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Guild not found: invalid-guild-id",
    "details": {...},
    "timestamp": "2024-01-15T14:30:00Z"
  }
}
```

### Common Error Codes

- `RESOURCE_NOT_FOUND` - The requested resource doesn't exist
- `INVALID_PARAMETERS` - Invalid query parameters or request body
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_ERROR` - Server-side error
- `UNAUTHORIZED` - Missing or invalid authentication
- `FORBIDDEN` - Insufficient permissions

## Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Default limit:** 1000 requests per minute
- **Burst limit:** 100 requests per second
- **WebSocket connections:** Max 10 per IP

**Rate Limit Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705325460
```

## Authentication (Optional)

While Rustic Debug operates in read-only mode by default, you can enable authentication:

```bash
rustic-debug start --auth-enabled --auth-token YOUR_TOKEN
```

**Request with Authentication:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/guilds
```

## SDK Examples

### JavaScript/TypeScript
```typescript
import { RusticDebugClient } from '@rustic-ai/debug-client';

const client = new RusticDebugClient({
  host: 'localhost',
  port: 3001,
  authToken: 'optional-token'
});

// Get guilds
const guilds = await client.getGuilds();

// Stream messages
client.stream('guild-001')
  .subscribe(['topic-1', 'topic-2'])
  .on('message', (msg) => {
    console.log('New message:', msg);
  });
```

### Python
```python
from rustic_debug import DebugClient

client = DebugClient(
    host='localhost',
    port=3001,
    auth_token='optional-token'
)

# Get guilds
guilds = client.get_guilds()

# Stream messages
stream = client.stream_messages('guild-001', topics=['topic-1'])
for message in stream:
    print(f"New message: {message}")
```

## Next Steps

- [Integration Guide](./integration.html) - Integrate Rustic Debug with your application
- [WebSocket Guide](./websocket.html) - Detailed WebSocket streaming documentation
- [SDK Documentation](./sdk.html) - Language-specific SDK guides
