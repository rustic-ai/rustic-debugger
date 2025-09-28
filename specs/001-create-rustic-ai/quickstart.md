# Quickstart: Redis Messaging Debugger

## Prerequisites
- Node.js 18+ or Bun 1.0+
- PNPM 8+
- Redis 6+ instance with RusticAI messages
- Modern web browser (Chrome, Firefox, Safari)

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd rustic-debug

# Install dependencies
pnpm install

# Build shared types
pnpm build:types
```

## Configuration

Create a `.env` file in the project root:

```bash
# Redis connection
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TLS=false

# API server
API_PORT=3000
API_HOST=0.0.0.0

# Feature flags
ENABLE_REPLAY=false  # Set to true to enable message replay

# Performance
MAX_MESSAGES_PER_SECOND=100
CACHE_TTL_SECONDS=300
```

## Running the Application

### Development Mode

```bash
# Terminal 1: Start the backend
pnpm --filter backend dev

# Terminal 2: Start the frontend
pnpm --filter frontend dev
```

The debugger will be available at http://localhost:5173

### Production Mode

```bash
# Build all packages
pnpm build

# Start the backend server
pnpm --filter backend start

# Frontend is served as static files by backend
```

Access the debugger at http://localhost:3000

## Basic Usage

### 1. View Guild Activity

1. Open the debugger in your browser
2. You'll see a list of all active guild namespaces
3. Activity indicators show:
   - 🟢 Active: Messages in last minute
   - 🟡 Idle: Messages in last hour
   - 🔴 Inactive: No recent messages

### 2. Visualize Message Flow

1. Click on a guild to open the debug view
2. The flow graph shows:
   - Blue nodes: Topics
   - Green nodes: Online agents
   - Red nodes: Agents with errors
   - Animated edges: Active message flow
3. Click any node for details

### 3. Inspect Messages

1. Select a topic from the sidebar or click a topic node
2. Messages appear in real-time in the message list
3. Click any message to view:
   - Full payload (JSON viewer)
   - Routing history (which agents processed it)
   - Processing time per agent
   - Error details if failed
4. Use filters to find specific messages:
   - Status: ERROR, SUCCESS, etc.
   - Time range: Last hour, day, week
   - Search: Text in payload

### 4. Trace Conversations

1. Find a message that's part of a thread
2. Click the "Thread" icon to view conversation
3. The thread view shows:
   - All related messages in order
   - Participating agents
   - Total conversation duration

### 5. Export for Analysis

1. Apply desired filters
2. Click "Export" button
3. Choose fields to include
4. Download as JSON file
5. Maximum 10,000 messages per export

## Testing the Installation

Run this test script to verify your setup:

```bash
# Run all tests
pnpm test

# Verify Redis connection
pnpm --filter backend test:redis

# Test with sample data
pnpm --filter backend seed:test-data
```

Expected output:
```
✓ Redis connection established
✓ Found 3 guild namespaces
✓ Streaming 45 messages/second
✓ WebSocket connection active
✓ All systems operational
```

## Common Scenarios

### Debugging High Error Rates

1. Select affected guild
2. Filter by status = ERROR
3. Look for patterns in:
   - Specific agents failing
   - Time-based spikes
   - Common error messages
4. Export error messages for deeper analysis

### Performance Monitoring

1. Open guild overview
2. Check message rates per topic
3. Identify bottlenecks:
   - Topics with high latency
   - Agents processing slowly
   - Queue buildup indicators

### Historical Investigation

1. Use time range picker
2. Select "Custom range" up to 7 days ago
3. Navigate to specific incident time
4. Replay message sequence
5. Trace error propagation

## Troubleshooting

### No Guilds Showing
- Verify Redis connection in backend logs
- Check Redis has keys matching pattern `guild-*`
- Ensure correct Redis database selected

### WebSocket Disconnections
- Check browser console for errors
- Verify no proxy blocking WebSocket
- Increase heartbeat timeout if needed

### High Memory Usage
- Reduce time window for queries
- Lower message rate limits
- Enable FIFO dropping in settings

### Export Failures
- Check message count < 10,000
- Verify sufficient memory for export
- Try smaller time windows

## Performance Tips

1. **For Large Datasets**:
   - Use specific time ranges
   - Filter by topic or status
   - Enable virtualized scrolling

2. **For Real-time Monitoring**:
   - Limit concurrent guild streams
   - Use status filters
   - Close unused debug views

3. **For Slow Connections**:
   - Enable message compression
   - Reduce update frequency
   - Use pagination for history

## Next Steps

1. Read the [API Documentation](./contracts/openapi.yaml)
2. Learn about [WebSocket Protocol](./contracts/websocket.md)
3. Understand the [Data Model](./data-model.md)
4. Configure monitoring dashboards
5. Set up alerts for error spikes

## Support

For issues or questions:
1. Check the [Research Notes](./research.md)
2. Review constitution principles
3. Consult RusticAI documentation
4. Submit issues to project repository