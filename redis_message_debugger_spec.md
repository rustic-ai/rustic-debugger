# Redis Messaging Debugger — Product & Technical Specification

The equivalent and relevant python classes are accessible in the local symlink ./rustic-ai/.
Never edit anything in that folder. Only refer to it for understanding the the message system, class, etc.

This is a simple debugger for developer to view  the message flow in redis. Which mesdssages were sent, what topics, which actros processed it and how they responded. We want to visdsualize this flow graph.

## Product Overview

- **Audience**: Developers creating aand debugging Guilds for RusticAI.
- **Goals**:
  - Discover guild namespaces, topics, and traffic volume in real time.
  - Inspect individual messages (payload, routing slip, state updates) and trace conversation threads.
  - Diagnose delivery issues by replaying historical windows or tailing live pub/sub streams.
  - Export filtered message sets for offline analysis or regression tests.
- **Non-goals**:
  - Replace the existing Rustic AI web UI, provide CRUD for guild metadata, or mutate production data by default.
  - Auth, motioring, logging, andything prod.
- **Key user journeys**:
  - Observe the message flow for a guild in a graph.
  - Observe all traffic for a target guild, group by topics, and inspect the agent handlers involved.
  - Tail live broadcast events.
  - Detect spikes in `ProcessStatus.ERROR`, inspect routing history, and download affected payloads for local debugging.

## Technical Design

### Frontend (React + TypeScript)

- Vite or Next.js scaffold with React Query and Zustand for state/query management.
- Component library (e.g., Material UI/Chakra) and VisX/Recharts for timeline visualisations.
- Features:
  - Visual representation of message flows in a guild.
  - Guild/topic explorer with grouping, filters.
  - Message list + details panel (payload viewer, routing history, state diff, thread view).
- WebSocket client for real-time updates and React Query cache integration for history fetches.

### Backend (Node.js/Bun/Deno + Fastify/Express)

- TypeScript service exposing REST + WebSocket endpoints.
- Shared type package (`@rustic-dev/types`) mirroring Rustic AI schemas (`Message`, `GemstoneID`, `RoutingRule`, `AgentTag`, `ProcessEntry`, etc.).
- REST endpoints:
  - `GET /health`
  - `GET /guilds`
  - `GET /guilds/:guildId/topics`
  - `GET /guilds/:guildId/topics/:topic/messages?limit&sinceId&minutes`
  - `GET /messages/:id`
  - (Feature-flagged) `POST /replay`
- WebSocket or Server-Sent Events endpoint: `/stream/:guildId?sinceId`, delivering live pub/sub data with resume tokens.
- Utilities:
  - Gemstone ID encoder/decoder implemented via `BigInt` bit operations.
  - Redis namespace discovery (`SCAN`, `TYPE`) and history fetch (`ZRANGE`, `ZRANGEBYSCORE`).
  - History caching layer (in-memory with TTL) to reduce repeated Redis reads.

### Redis Integration

- Use `ioredis` (preferred for cluster + TLS) with configurable connection profiles.
- Separate connections for command operations and pub/sub to avoid head-of-line blocking.
- Read-only default mode (no writes) with feature flag enabling replay/injection.
- Support for `RedisBackendConfig`-like options (host, port, TLS certs, cluster startup nodes, keepalive).

### Packaging & Deployment

- Monorepo managed with PNPM/TurboRepo containing `frontend`, `backend`, and `packages/types` workspaces.
- CI pipeline (GitHub Actions) running linting, unit tests (Vitest/Jest), type checks, and integration tests against ephemeral Redis (Testcontainers).
- Dockerfile building backend service + static frontend bundle.
- Optional Helm chart or docker-compose definition for local deployment.

## Architecture

```
+------------+        HTTP / WS        +-------------------+       Pub/Sub & Commands       +------------+
|  React UI  |  <------------------->  |  Node/Bun Service  |  <------------------------->  |  Redis DB  |
+------------+                          +-------------------+                                +------------+
        ^                                      ^       |
        |                                      |       +-- Shared Type Package (TypeScript models)
        | WebSocket stream + REST APIs         |
        +--------------------------------------+
```

1. Browser authenticates with the service and requests `/guilds`; backend scans `guild-id:*` keys to enumerate namespaces.
2. User selects a guild/topic; backend fetches history via `ZRANGEBYSCORE` using Gemstone-derived timestamps, converts payloads to typed `Message` objects, and returns JSON.
3. User opens a live tail; backend subscribes to `psubscribe("<guild-id>:")`, normalises payloads, and streams them over WebSocket.
4. Optional replay posts a batch to `/replay`; service guards with RBAC/feature flag and publishes using the same pipeline as Rustic AI’s backend (write, ZADD, publish).
