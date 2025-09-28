# WebSocket API Contract

## Connection

### Endpoint
```
ws://localhost:3000/stream/:guildId
```

### Query Parameters
- `sinceId` (optional): Resume from specific message ID
- `token` (optional): Resume token from previous session

### Connection Protocol
1. Client connects to WebSocket endpoint
2. Server sends initial `connected` message with session info
3. Client can send control messages
4. Server streams updates based on guild activity

## Message Types

### From Server

#### Connected Message
```json
{
  "type": "connected",
  "data": {
    "sessionId": "uuid",
    "resumeToken": "token-for-reconnection",
    "guildId": "guild-id",
    "timestamp": "2025-01-01T00:00:00Z"
  }
}
```

#### Message Update
```json
{
  "type": "message",
  "guildId": "guild-id",
  "data": {
    // Full Message object as defined in OpenAPI schema
  },
  "timestamp": "2025-01-01T00:00:00Z",
  "resumeToken": "updated-token"
}
```

#### Statistics Update
```json
{
  "type": "stats",
  "guildId": "guild-id",
  "data": {
    "topicId": "guild:topic",
    "messageRate": 45.2,
    "errorRate": 0.5,
    "subscriberCount": 12
  },
  "timestamp": "2025-01-01T00:00:00Z"
}
```

#### Error Message
```json
{
  "type": "error",
  "guildId": "guild-id",
  "data": {
    "code": "CONNECTION_ERROR",
    "message": "Redis connection lost",
    "retryable": true,
    "timestamp": "2025-01-01T00:00:00Z"
  }
}
```

#### Heartbeat
```json
{
  "type": "heartbeat",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

### From Client

#### Subscribe to Additional Topics
```json
{
  "type": "subscribe",
  "topics": ["guild:topic1", "guild:topic2"]
}
```

#### Unsubscribe from Topics
```json
{
  "type": "unsubscribe",
  "topics": ["guild:topic1"]
}
```

#### Update Filters
```json
{
  "type": "filter",
  "filters": {
    "status": ["ERROR", "TIMEOUT"],
    "agentIds": ["agent1", "agent2"]
  }
}
```

#### Heartbeat Response
```json
{
  "type": "pong",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

## Connection Management

### Heartbeat Protocol
- Server sends `heartbeat` every 30 seconds
- Client should respond with `pong` within 10 seconds
- Connection closed if no pong received

### Reconnection Protocol
1. Client disconnects (intentionally or network issue)
2. Client reconnects with `token` from last session
3. Server resumes from last known position
4. Missed messages are sent in order

### Rate Limiting
- Maximum 100 messages per second per connection
- Messages dropped using FIFO when limit exceeded
- Client notified via stats update

### Error Handling
- Invalid message format: Connection remains open, error sent
- Invalid guild ID: Connection closed with error
- Redis unavailable: Connection remains, error messages sent
- Rate limit exceeded: Oldest messages dropped, warning sent

## Security
- No authentication required (as per spec)
- Read-only operations only
- Guild ID validation on connection
- Input sanitization for all client messages