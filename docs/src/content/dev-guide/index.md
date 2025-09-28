---
title: Developer Guide Overview
description: Technical documentation for developers and integrators building with Rustic Debug
sidebar:
  category: dev-guide
  order: 1
tags: [development, integration, api]
---

# Developer Guide Overview

Welcome to the Rustic Debug developer guide! This section provides comprehensive technical documentation for developers who want to integrate, extend, or contribute to Rustic Debug.

## Architecture Overview

Rustic Debug is built with a modern, scalable architecture:

### Frontend Stack
- **React** with TypeScript for type-safe component development
- **Vite** for fast development and optimized production builds
- **Tailwind CSS** for consistent, utility-first styling
- **React Query** for efficient data fetching and caching

### Backend Stack
- **Node.js/Fastify** for high-performance API server
- **Redis** for both message storage and pub/sub functionality
- **WebSockets** for real-time message streaming
- **TypeScript** throughout for end-to-end type safety

### Message Processing
- **Redis Streams** for reliable message queuing
- **Pub/Sub** for real-time message broadcasting
- **GemstoneID** encoding for efficient message identification
- **JSON Schema** validation for message structure

## Core Concepts

### GemstoneID Format
Rustic Debug uses a custom 64-bit ID format that embeds timestamp and priority information:

```typescript
interface GemstoneID {
  timestamp: number;  // 42 bits - milliseconds since epoch
  priority: number;   // 8 bits - message priority (0-255)
  sequence: number;   // 14 bits - sequence number (0-16383)
}
```

### Message Structure
All messages in the system follow a consistent structure:

```typescript
interface Message {
  id: GemstoneID;
  topic: string;
  guild_id: string;
  agent_tag: AgentTag;
  content: MessageContent;
  metadata: MessageMetadata;
  routing_rules: RoutingRule[];
  timestamp: Date;
}
```

### Guild System
Messages are organized hierarchically:

```
Guild (rustic-debug-guild-001)
├── Topic (user-interactions)
│   ├── Agent (chat-handler)
│   └── Agent (response-generator)
└── Topic (system-events)
    ├── Agent (error-handler)
    └── Agent (metrics-collector)
```

## Getting Started

### Development Environment Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/rustic-ai/rustic-debug.git
   cd rustic-debug
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Start Redis**
   ```bash
   docker compose -f scripts/redis/docker-compose.yml up -d
   ```

4. **Start Development Servers**
   ```bash
   # Backend API server
   pnpm --filter backend dev

   # Frontend development server
   pnpm --filter frontend dev
   ```

### Project Structure

```
rustic-debug/
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API clients and utilities
│   │   └── types/         # TypeScript type definitions
│   └── public/            # Static assets
├── backend/               # Node.js backend API
│   ├── src/
│   │   ├── routes/        # API route handlers
│   │   ├── services/      # Business logic services
│   │   ├── models/        # Data models and schemas
│   │   └── utils/         # Utility functions
│   └── tests/             # Backend tests
├── packages/
│   └── types/             # Shared TypeScript types
└── rustic-ai/             # Reference RusticAI codebase (symlink)
```

## API Reference

### REST Endpoints

The backend provides several REST endpoints for accessing message data:

- `GET /api/guilds` - List all available guilds
- `GET /api/guilds/:guildId/topics` - List topics in a guild
- `GET /api/guilds/:guildId/topics/:topic/messages` - Get message history
- `GET /api/messages/:id` - Get specific message details

### WebSocket Streaming

Real-time message streaming is available via WebSocket:

```javascript
const ws = new WebSocket('ws://localhost:3001/stream/rustic-debug-guild-001');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('New message:', message);
};
```

## Integration Guide

### Connecting to Existing RusticAI Systems

Rustic Debug is designed to be read-only by default, making it safe to connect to production systems:

```typescript
// Backend configuration
const config = {
  redis: {
    host: 'localhost',
    port: 6379,
    db: 0,
    readOnly: true  // Prevents any write operations
  },
  guilds: {
    patterns: ['*-guild-*'],  // Guild name patterns to monitor
    exclude: ['test-*']       // Patterns to exclude
  }
};
```

### Custom Message Processors

You can extend Rustic Debug with custom message processors:

```typescript
interface MessageProcessor {
  canProcess(message: Message): boolean;
  process(message: Message): ProcessedMessage;
  getMetadata(): ProcessorMetadata;
}

class CustomProcessor implements MessageProcessor {
  canProcess(message: Message): boolean {
    return message.content.type === 'custom-event';
  }

  process(message: Message): ProcessedMessage {
    // Custom processing logic
    return {
      ...message,
      processed: {
        customField: this.extractCustomData(message),
        timestamp: new Date()
      }
    };
  }
}
```

## Contributing

### Development Workflow

1. **Fork and Clone** the repository
2. **Create a feature branch** from `main`
3. **Make your changes** with tests
4. **Run the test suite** to ensure everything works
5. **Submit a pull request** with a clear description

### Code Standards

- **TypeScript** is required for all new code
- **ESLint** and **Prettier** are used for code formatting
- **Jest** for unit tests, **Playwright** for end-to-end tests
- **Conventional Commits** for commit message format

### Testing

```bash
# Run all tests
pnpm test

# Run frontend tests only
pnpm --filter frontend test

# Run backend tests only
pnpm --filter backend test

# Run end-to-end tests
pnpm test:e2e
```

## Advanced Topics

- **[Custom Themes](./theming)** - Creating custom UI themes
- **[Plugin Development](./plugins)** - Building plugins and extensions
- **[Performance Optimization](./performance)** - Optimizing for large message volumes
- **[Deployment Guide](./deployment)** - Production deployment strategies
- **[Security Considerations](./security)** - Security best practices

## Next Steps

Ready to dive deeper? Check out:

1. **[API Documentation](../api/)** - Detailed API reference
2. **[Code Examples](../examples/)** - Working code examples
3. **[Architecture Deep Dive](./architecture)** - Detailed system architecture
4. **[Contributing Guide](./contributing)** - How to contribute to the project