# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the Redis Messaging Debugger for RusticAI - a web-based debugging tool for developers working with RusticAI guilds to visualize and debug message flow through Redis.

**Current Status**: Specification phase (no implementation yet)

**Tech Stack (Planned)**:
- Frontend: React + TypeScript (Vite or Next.js)
- Backend: Node.js/Bun/Deno with Fastify/Express
- Database: Redis (for message pub/sub and storage)
- Monorepo: PNPM/TurboRepo with workspaces

## Commands

### Development Setup (Future)
```bash
# Install dependencies (monorepo)
pnpm install

# Run frontend development server
pnpm --filter frontend dev

# Run backend development server
pnpm --filter backend dev

# Run all tests
pnpm test

# Run type checks
pnpm typecheck

# Run linting
pnpm lint

# Build all packages
pnpm build
```

### RusticAI Integration (Reference)
The `rustic-ai/` directory is a symlink to the RusticAI Python codebase. **Never edit files in this directory** - it's for reference only.

To understand the messaging system the debugger will interface with:
```bash
# Start Redis (required for RusticAI)
docker compose -f rustic-ai/scripts/redis/docker-compose.yml up

# View RusticAI API server (runs on port 8880)
python -m rustic_ai.api_server.main
```

## Architecture

### Key Components to Implement

1. **Frontend** (`frontend/`)
   - Guild/topic explorer with visual flow graph
   - Message list with payload inspector
   - Real-time WebSocket updates
   - Thread/conversation viewer

2. **Backend** (`backend/`)
   - REST API endpoints:
     - `/guilds` - List all guilds
     - `/guilds/:guildId/topics` - List topics in guild
     - `/guilds/:guildId/topics/:topic/messages` - Get message history
     - `/messages/:id` - Get specific message
   - WebSocket endpoint: `/stream/:guildId` for live updates
   - Redis integration using ioredis

3. **Shared Types** (`packages/types/`)
   - TypeScript interfaces matching RusticAI schemas:
     - Message, GemstoneID, RoutingRule, AgentTag, ProcessEntry
   - Gemstone ID encoder/decoder utilities

### Redis Message Structure (from RusticAI)

Messages in Redis use:
- Direct lookup: `msg:{namespace}:{message_id}`
- Topic sorted set: `{topic}` with timestamp scores
- Pub/Sub channels: `{guild-id}:*` patterns
- GemstoneID format: 64-bit ID with embedded timestamp and priority

### Important RusticAI Files for Reference

- Message definitions: `rustic-ai/core/src/rustic_ai/core/messaging/core/message.py`
- Redis backend: `rustic-ai/redis/src/rustic_ai/redis/messaging/backend.py`
- Message store: `rustic-ai/redis/src/rustic_ai/redis/messaging/message_store.py`
- API server: `rustic-ai/api/src/rustic_ai/api_server/main.py`

## Development Guidelines

1. **Read-Only by Default**: The debugger should only read from Redis, never write (except for optional replay feature behind feature flag)

2. **Type Safety**: Use shared TypeScript types package to ensure consistency between frontend and backend

3. **Performance**: 
   - Use separate Redis connections for commands vs pub/sub
   - Implement caching layer for history queries
   - Use React Query for efficient data fetching

4. **Testing**:
   - Unit tests with Vitest/Jest
   - Integration tests with Testcontainers for Redis
   - E2E tests for critical user journeys

5. **Monorepo Structure**:
   ```
   rustic-debug/
   ├── frontend/          # React UI
   ├── backend/           # Node.js API
   ├── packages/
   │   └── types/        # Shared TypeScript types
   └── rustic-ai/        # Symlink to RusticAI (reference only)
   ```
