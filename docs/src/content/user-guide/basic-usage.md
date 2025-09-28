---
title: Basic Usage & Examples
description: Learn the core debugging workflows with practical examples
tags: [usage, examples, tutorial]
---

# Basic Usage & Examples

This guide walks you through common debugging scenarios and practical examples using Rustic Debug.

## Starting the Debugger

### Quick Start

```bash
# Install globally
npm install -g @rustic-ai/rustic-debug

# Start with default settings (connects to localhost:6379)
rustic-debug start

# Start with custom Redis URL
rustic-debug start --redis-url redis://192.168.1.100:6379

# Start with specific database
rustic-debug start --redis-url redis://localhost:6379 --db 2
```

### Docker Usage

```bash
# Run with Docker
docker run -p 3000:3000 \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  rustic-ai/rustic-debug

# With docker-compose
docker-compose up rustic-debug
```

## Common Debugging Workflows

### 1. Monitoring Message Flow

**Scenario:** You want to see all messages flowing through a specific guild.

```bash
# Open the debugger UI
open http://localhost:3000

# Navigate to Guild Explorer
# Select your guild (e.g., "chat-service-guild")
# Watch real-time messages appear in the flow graph
```

**What to look for:**
- Message frequency and patterns
- Topics with high activity
- Agent response times
- Error messages or retries

### 2. Inspecting Individual Messages

**Scenario:** A specific message seems to be causing issues.

1. **Find the message:**
   - Use the search bar with message ID
   - Or filter by time range
   - Or search by content keywords

2. **Inspect the message:**
   ```javascript
   // Example message structure you'll see
   {
     "id": "VGF6sLGdatx3gPeGEDQxHb",
     "topic": "user-queries",
     "guild_id": "chat-service-guild",
     "agent_tag": {
       "name": "query-processor",
       "version": "2.1.0"
     },
     "content": {
       "query": "What is the weather today?",
       "user_id": "user-123",
       "session_id": "sess-456"
     },
     "metadata": {
       "timestamp": "2024-01-15T10:30:00Z",
       "processing_time_ms": 120,
       "retry_count": 0
     }
   }
   ```

3. **Check related messages:**
   - Click "View Thread" to see the conversation chain
   - Check parent and child messages
   - Look at routing rules and targets

### 3. Tracking Conversation Threads

**Scenario:** Following a user interaction through multiple services.

```javascript
// In the Thread View, you'll see the flow:

1. User Input → chat-handler
   └── Message: "Help me book a flight"

2. chat-handler → intent-classifier
   └── Message: {intent: "flight_booking", confidence: 0.95}

3. intent-classifier → booking-agent
   └── Message: {action: "initiate_booking", user_id: "123"}

4. booking-agent → flight-api
   └── Message: {request: "search_flights", params: {...}}

5. flight-api → booking-agent
   └── Message: {results: [...flights]}

6. booking-agent → chat-handler
   └── Message: {response: "Found 5 flights..."}

7. chat-handler → User
   └── Message: "I found 5 flights for you..."
```

### 4. Performance Analysis

**Scenario:** Identifying bottlenecks in message processing.

1. **Check the Metrics Dashboard:**
   ```
   Topic: user-queries
   ├── Messages/sec: 45
   ├── Avg latency: 230ms
   ├── 95th percentile: 450ms
   └── Error rate: 0.2%
   ```

2. **Identify slow agents:**
   ```
   Agent Performance:
   ├── query-processor: 45ms avg
   ├── intent-classifier: 120ms avg  ⚠️
   ├── response-generator: 65ms avg
   └── cache-handler: 5ms avg
   ```

3. **Find message backlogs:**
   ```bash
   # Topics with queued messages
   high-priority-tasks: 0 queued
   normal-tasks: 12 queued ⚠️
   low-priority-tasks: 145 queued ⚠️⚠️
   ```

### 5. Error Investigation

**Scenario:** Messages are failing with errors.

1. **Filter for errors:**
   ```javascript
   // Use the filter panel
   {
     "status": "error",
     "time_range": "last_hour"
   }
   ```

2. **Common error patterns:**
   ```javascript
   // Timeout error
   {
     "error": {
       "type": "TIMEOUT",
       "message": "Agent response timeout after 30s",
       "agent": "slow-processor",
       "retry_count": 3
     }
   }

   // Processing error
   {
     "error": {
       "type": "PROCESSING_ERROR",
       "message": "Invalid input format",
       "stack_trace": "...",
       "input": {...}
     }
   }
   ```

3. **Check error rates by topic:**
   ```
   Error Rates:
   ├── user-queries: 0.1% ✅
   ├── payment-processing: 2.5% ⚠️
   └── external-api-calls: 5.2% 🔴
   ```

## Example Debugging Sessions

### Example 1: Debugging a Stuck Message

```bash
# 1. Identify the stuck message
$ rustic-debug search --status pending --age ">5m"

Found 1 stuck message:
- ID: VGF6sLGdatx3gPeGEDQxHc
- Topic: payment-processing
- Age: 7m 32s
- Agent: payment-validator

# 2. Inspect the message
$ rustic-debug inspect VGF6sLGdatx3gPeGEDQxHc

Message Details:
- Status: PENDING
- Retry Count: 3/3
- Last Error: "Connection timeout to payment gateway"
- Next Retry: Disabled (max retries reached)

# 3. Check agent status
$ rustic-debug agent-status payment-validator

Agent: payment-validator
- Status: UNHEALTHY
- Last Heartbeat: 8m ago
- Error: "Cannot connect to payment gateway API"
```

### Example 2: Analyzing Message Flow Pattern

```javascript
// Using the JavaScript client
const debug = require('@rustic-ai/debug-client');

const client = new debug.Client({
  host: 'localhost',
  port: 3001
});

// Analyze message flow for the last hour
async function analyzeFlow() {
  const stats = await client.getFlowStatistics({
    guild: 'main-guild',
    timeRange: '1h',
    groupBy: 'topic'
  });

  console.log('Message Flow Analysis:');
  stats.topics.forEach(topic => {
    console.log(`\n${topic.name}:`);
    console.log(`  Total: ${topic.messageCount}`);
    console.log(`  Rate: ${topic.messagesPerSecond}/s`);
    console.log(`  Avg Size: ${topic.avgMessageSize} bytes`);
    console.log(`  Error Rate: ${topic.errorRate}%`);
  });

  // Find anomalies
  const anomalies = stats.topics.filter(t => 
    t.errorRate > 1 || 
    t.messagesPerSecond > 100 ||
    t.avgLatency > 1000
  );

  if (anomalies.length > 0) {
    console.log('\n⚠️ Anomalies detected:');
    anomalies.forEach(t => {
      console.log(`  - ${t.name}: ${t.anomalyReason}`);
    });
  }
}

analyzeFlow();
```

### Example 3: Monitoring Specific Patterns

```python
# Python example for pattern monitoring
from rustic_debug import DebugClient
import re

client = DebugClient('localhost', 3001)

# Monitor for specific error patterns
def monitor_errors():
    stream = client.stream_messages(
        guild='production-guild',
        filter={
            'status': 'error',
            'content_pattern': r'database.*timeout'
        }
    )
    
    for message in stream:
        print(f"Database timeout detected:")
        print(f"  Message ID: {message['id']}")
        print(f"  Topic: {message['topic']}")
        print(f"  Agent: {message['agent_tag']['name']}")
        print(f"  Error: {message['error']['message']}")
        
        # Alert if pattern repeats
        recent = client.count_messages(
            filter={
                'status': 'error',
                'content_pattern': r'database.*timeout',
                'time_range': '5m'
            }
        )
        
        if recent > 5:
            print("⚠️ ALERT: Multiple database timeouts detected!")
            # Send alert to monitoring system
            
monitor_errors()
```

## Tips and Best Practices

### 1. Efficient Filtering

- Use time ranges to limit data: `last_hour`, `last_day`
- Filter by specific topics when debugging known issues
- Use regex patterns for content matching
- Combine multiple filters for precise results

### 2. Performance Monitoring

- Set up alerts for high latency (>1s)
- Monitor error rates by topic
- Track message queue sizes
- Watch for retry storms

### 3. Debugging Checklist

When investigating issues:

- [ ] Check message status and error details
- [ ] Verify agent health and connectivity
- [ ] Look at retry counts and patterns
- [ ] Check parent/child message chain
- [ ] Review routing rules
- [ ] Examine message timing and latency
- [ ] Look for patterns in similar messages
- [ ] Check system resource usage

### 4. Common Patterns to Watch For

**Message Storm:**
- Sudden spike in message rate
- Often indicates retry loops or cascading failures

**Processing Bottleneck:**
- Growing queue size on specific topics
- Increasing latency over time

**Silent Failures:**
- Messages disappearing without errors
- Check routing rules and agent filters

**Timeout Cascade:**
- Multiple timeouts across different agents
- Usually indicates downstream service issues

## CLI Commands Reference

```bash
# Search messages
rustic-debug search --guild main --topic user-queries --limit 10

# Inspect specific message
rustic-debug inspect <message-id>

# Show guild statistics
rustic-debug stats --guild main

# Monitor real-time stream
rustic-debug stream --guild main --topic payments

# Export messages for analysis
rustic-debug export --guild main --format json --output messages.json

# Check agent health
rustic-debug health --guild main

# Show message flow graph
rustic-debug flow --guild main --format dot | dot -Tpng > flow.png
```

## Next Steps

- [Advanced Features](./advanced.html) - Learn about advanced debugging capabilities
- [Performance Tuning](./performance.html) - Optimize your debugging workflow
- [Integration Guide](../dev-guide/integration.html) - Integrate with your application
