# Rustic Debug - Redis Messaging Debugger

A comprehensive web-based debugging tool for RusticAI's Redis messaging system. This tool provides real-time and historical visualization of message flow through Redis topics and guilds.

## Features

- **Guild Discovery**: Automatic discovery of Redis guilds and topics
- **Real-time Monitoring**: Live message streaming via WebSocket
- **Message Inspection**: Detailed view of message payloads, metadata, and routing
- **Visual Flow**: Message flow visualization with React Flow
- **Filtering**: Advanced filtering by status, time range, and agents
- **Export**: Export message data in JSON or CSV format
- **Thread View**: Track message threads and conversations
- **Developer Presence**: See which developers are currently monitoring

## Architecture

This is a monorepo project using PNPM workspaces:

```
rustic-debug/
├── packages/
│   └── types/          # Shared TypeScript types
├── backend/            # Node.js/Fastify backend
├── frontend/           # React frontend
└── specs/              # Project specifications
```

## Prerequisites

- Node.js 18+ 
- PNPM 8+
- Redis 7+ (for production) or tests will use ioredis-mock

## Quick Start

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Development mode:**
   ```bash
   pnpm dev
   ```

   This starts:
   - Backend on http://localhost:3001
   - Frontend on http://localhost:5173

3. **Run tests:**
   ```bash
   pnpm test
   ```

4. **Build for production:**
   ```bash
   pnpm build
   ```

## Configuration

### Backend Configuration

Create a `.env` file in the backend directory:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=

# Server Configuration
PORT=3001
LOG_LEVEL=info

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
```

### Frontend Configuration

The frontend automatically connects to the backend based on the current host.

## Development

### Running Tests

The project uses **ioredis-mock** for testing, eliminating the need for a real Redis instance:

```bash
# Run all tests
pnpm test

# Run backend tests
cd backend && pnpm test

# Run frontend tests  
cd frontend && pnpm test
```

To use a real Redis instance for testing instead:
1. Start Redis locally
2. Remove the ioredis mock from test setup files
3. Set Redis environment variables
4. Run tests

### Code Structure

- **Backend**: Fastify-based REST API with WebSocket support
  - `/api/routes/` - HTTP endpoints
  - `/api/websocket/` - WebSocket handlers
  - `/services/` - Business logic and Redis operations
  
- **Frontend**: React 18 with TypeScript
  - `/components/` - UI components
  - `/hooks/` - Custom React hooks
  - `/services/` - API and WebSocket clients
  - `/stores/` - Zustand state management

## API Documentation

### REST Endpoints

- `GET /health` - Health check
- `GET /guilds` - List all guilds
- `GET /guilds/:id` - Get guild details
- `GET /guilds/:id/topics` - List guild topics
- `GET /guilds/:id/topics/:name/messages` - Get topic messages
- `POST /export` - Export messages
- `DELETE /cache/:pattern` - Clear cache

### WebSocket Events

Connect to `/ws` for real-time updates:

- `subscribe` - Subscribe to guild/topic messages
- `unsubscribe` - Unsubscribe from updates
- `message` - Incoming message event
- `stats` - Connection statistics

## Production Deployment

1. **Build the project:**
   ```bash
   pnpm build
   ```

2. **Set production environment variables**

3. **Start the backend:**
   ```bash
   cd backend
   pnpm start
   ```

4. **Serve the frontend:**
   The frontend build is in `frontend/dist/` - serve with any static file server.

## Contributing

This project follows Test-Driven Development (TDD) principles:

1. Write failing tests first
2. Implement features to make tests pass
3. Refactor while keeping tests green

## License

MIT