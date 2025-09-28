---
title: System Architecture
description: Deep dive into the Rustic Debug architecture and design patterns
tags: [architecture, system-design, technical]
---

# System Architecture

This document provides a comprehensive overview of Rustic Debug's architecture, design patterns, and technical implementation details.

## Architecture Overview

Rustic Debug follows a modular, microservices-inspired architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                        Web Browser                          │
│  ┌─────────────────────────────────────────────────────┐  │
│  │             React Frontend Application               │  │
│  │  ┌─────────┐ ┌──────────┐ ┌───────────────────┐    │  │
│  │  │  Views  │ │  State   │ │   WebSocket       │    │  │
│  │  │         │ │  Store   │ │   Connection      │    │  │
│  │  └─────────┘ └──────────┘ └───────────────────┘    │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↑ ↓
                     HTTP/WebSocket
                            ↑ ↓
┌─────────────────────────────────────────────────────────────┐
│                    Backend API Server                       │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                  Fastify Server                      │  │
│  │  ┌──────────┐ ┌────────────┐ ┌────────────────┐   │  │
│  │  │   REST   │ │ WebSocket  │ │  Message       │   │  │
│  │  │   API    │ │  Handler   │ │  Processor     │   │  │
│  │  └──────────┘ └────────────┘ └────────────────┘   │  │
│  └─────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              Service Layer                           │  │
│  │  ┌──────────┐ ┌────────────┐ ┌────────────────┐   │  │
│  │  │  Guild   │ │  Message   │ │   Analytics    │   │  │
│  │  │  Service │ │  Service   │ │   Service      │   │  │
│  │  └──────────┘ └────────────┘ └────────────────┘   │  │
│  └─────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              Data Access Layer                       │  │
│  │  ┌──────────┐ ┌────────────┐ ┌────────────────┐   │  │
│  │  │  Redis   │ │   Cache    │ │  Search        │   │  │
│  │  │  Client  │ │   Manager  │ │  Engine        │   │  │
│  │  └──────────┘ └────────────┘ └────────────────┘   │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↑ ↓
                      Redis Protocol
                            ↑ ↓
┌─────────────────────────────────────────────────────────────┐
│                      Redis Server                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  ┌──────────┐ ┌────────────┐ ┌────────────────┐   │  │
│  │  │ Messages │ │  Pub/Sub   │ │   Metadata     │   │  │
│  │  │  Store   │ │  Channels  │ │   Indexes      │   │  │
│  │  └──────────┘ └────────────┘ └────────────────┘   │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### Frontend Architecture

#### Technology Stack
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Query** - Data fetching and caching
- **Zustand** - State management
- **Tailwind CSS** - Styling
- **D3.js** - Data visualizations

#### Component Structure

```typescript
// Component hierarchy
src/
├── components/
│   ├── common/          // Shared UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── Modal.tsx
│   ├── layout/          // Layout components
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Layout.tsx
│   ├── features/        // Feature-specific components
│   │   ├── MessageList/
│   │   ├── FlowGraph/
│   │   ├── Inspector/
│   │   └── Metrics/
│   └── visualizations/  // D3 visualizations
│       ├── FlowChart.tsx
│       ├── HeatMap.tsx
│       └── Timeline.tsx
├── hooks/              // Custom React hooks
│   ├── useMessages.ts
│   ├── useWebSocket.ts
│   └── useDebugger.ts
├── services/          // API clients
│   ├── api.ts
│   ├── websocket.ts
│   └── analytics.ts
├── stores/           // State management
│   ├── messageStore.ts
│   ├── uiStore.ts
│   └── configStore.ts
└── types/           // TypeScript definitions
    ├── message.ts
    ├── guild.ts
    └── api.ts
```

#### State Management

```typescript
// Zustand store example
interface MessageStore {
  messages: Message[];
  selectedMessage: Message | null;
  filters: FilterOptions;

  // Actions
  addMessage: (message: Message) => void;
  selectMessage: (id: string) => void;
  setFilter: (filter: FilterOptions) => void;
  clearMessages: () => void;
}

const useMessageStore = create<MessageStore>((set) => ({
  messages: [],
  selectedMessage: null,
  filters: {},

  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),

  selectMessage: (id) => set((state) => ({
    selectedMessage: state.messages.find(m => m.id === id)
  })),

  setFilter: (filter) => set({ filters: filter }),

  clearMessages: () => set({ messages: [] })
}));
```

### Backend Architecture

#### Technology Stack
- **Node.js 18+** - Runtime
- **Fastify** - Web framework
- **TypeScript** - Type safety
- **ioredis** - Redis client
- **ws** - WebSocket server
- **Pino** - Logging
- **Jest** - Testing

#### Service Architecture

```typescript
// Service layer structure
src/
├── routes/           // API route handlers
│   ├── guilds.ts
│   ├── messages.ts
│   ├── metrics.ts
│   └── websocket.ts
├── services/        // Business logic
│   ├── GuildService.ts
│   ├── MessageService.ts
│   ├── AnalyticsService.ts
│   └── StreamService.ts
├── repositories/    // Data access
│   ├── RedisRepository.ts
│   ├── MessageRepository.ts
│   └── CacheRepository.ts
├── models/         // Data models
│   ├── Message.ts
│   ├── Guild.ts
│   └── Metrics.ts
├── utils/         // Utilities
│   ├── gemstoneId.ts
│   ├── validator.ts
│   └── logger.ts
└── middleware/    // Middleware
    ├── auth.ts
    ├── rateLimit.ts
    └── cors.ts
```

#### Dependency Injection

```typescript
// Container setup
class Container {
  private services = new Map<string, any>();

  register<T>(name: string, factory: () => T): void {
    this.services.set(name, factory());
  }

  get<T>(name: string): T {
    if (!this.services.has(name)) {
      throw new Error(`Service ${name} not found`);
    }
    return this.services.get(name);
  }
}

// Service registration
const container = new Container();

container.register('redis', () => new Redis({
  host: config.redis.host,
  port: config.redis.port
}));

container.register('messageService', () =>
  new MessageService(container.get('redis'))
);

container.register('guildService', () =>
  new GuildService(container.get('redis'))
);
```

## Data Models

### Message Schema

```typescript
interface Message {
  // Identification
  id: GemstoneID;           // 64-bit encoded ID
  topic: string;            // Topic name
  guild_id: string;         // Guild identifier

  // Agent information
  agent_tag: {
    name: string;           // Agent name
    version: string;        // Agent version
    instance_id?: string;   // Instance identifier
  };

  // Content
  content: {
    type: 'text' | 'json' | 'binary';
    body: any;              // Message payload
    encoding?: string;      // Content encoding
    compression?: string;   // Compression type
  };

  // Metadata
  metadata: {
    timestamp: Date;        // Message timestamp
    thread_id?: string;     // Conversation thread
    parent_id?: string;     // Parent message ID
    correlation_id?: string;// Correlation ID
    processing_time_ms?: number;
    retry_count?: number;
    priority?: number;
    ttl?: number;          // Time to live
  };

  // Routing
  routing_rules: Array<{
    target_topic: string;
    condition?: string;
    priority?: number;
  }>;

  // Tracing
  trace?: {
    trace_id: string;
    span_id: string;
    parent_span_id?: string;
    flags: number;
  };
}
```

### GemstoneID Format

```typescript
// 64-bit ID structure
// [timestamp: 42 bits][priority: 8 bits][sequence: 14 bits]

class GemstoneID {
  private static sequence = 0;
  private static lastTimestamp = 0;

  static generate(priority: number = 5): string {
    const timestamp = Date.now();

    // Handle clock sequence
    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1) & 0x3FFF; // 14 bits
    } else {
      this.sequence = 0;
      this.lastTimestamp = timestamp;
    }

    // Compose 64-bit ID
    const high = (timestamp >> 10) & 0xFFFFFFFF;
    const low = ((timestamp & 0x3FF) << 22) |
                (priority << 14) |
                this.sequence;

    // Encode to base64
    return Buffer.from([
      ...this.toBytes(high, 4),
      ...this.toBytes(low, 4)
    ]).toString('base64url');
  }

  static decode(id: string): DecodedID {
    const buffer = Buffer.from(id, 'base64url');
    const high = this.fromBytes(buffer.slice(0, 4));
    const low = this.fromBytes(buffer.slice(4, 8));

    return {
      timestamp: (high << 10) | (low >> 22),
      priority: (low >> 14) & 0xFF,
      sequence: low & 0x3FFF
    };
  }
}
```

## Data Flow

### Message Processing Pipeline

```typescript
class MessageProcessor {
  private pipeline: ProcessingStage[] = [];

  constructor() {
    this.setupPipeline();
  }

  private setupPipeline() {
    this.pipeline = [
      new ValidationStage(),      // Validate message format
      new DecompressionStage(),   // Decompress if needed
      new DecryptionStage(),      // Decrypt if encrypted
      new EnrichmentStage(),      // Add metadata
      new FilteringStage(),       // Apply filters
      new TransformationStage(),  // Transform data
      new IndexingStage(),        // Index for search
      new StorageStage(),         // Store in Redis
      new BroadcastStage()        // Broadcast to clients
    ];
  }

  async process(message: RawMessage): Promise<Message> {
    let processed = message;

    for (const stage of this.pipeline) {
      processed = await stage.process(processed);

      if (stage.shouldStop(processed)) {
        break;
      }
    }

    return processed as Message;
  }
}
```

### WebSocket Communication

```typescript
// WebSocket message protocol
interface WsMessage {
  type: 'subscribe' | 'unsubscribe' | 'message' |
        'history' | 'stats' | 'ping' | 'error';
  data?: any;
  id?: string;
  timestamp: number;
}

class WebSocketHandler {
  private clients = new Map<string, Client>();

  async handleConnection(ws: WebSocket, req: Request) {
    const clientId = generateId();
    const client = new Client(clientId, ws);

    this.clients.set(clientId, client);

    ws.on('message', (data) =>
      this.handleMessage(client, data)
    );

    ws.on('close', () =>
      this.handleDisconnect(client)
    );

    // Send initial state
    await this.sendInitialState(client);
  }

  async handleMessage(client: Client, data: string) {
    const message = JSON.parse(data) as WsMessage;

    switch (message.type) {
      case 'subscribe':
        await this.handleSubscribe(client, message.data);
        break;
      case 'unsubscribe':
        await this.handleUnsubscribe(client, message.data);
        break;
      case 'history':
        await this.sendHistory(client, message.data);
        break;
      case 'ping':
        client.send({ type: 'pong', timestamp: Date.now() });
        break;
    }
  }
}
```

## Performance Optimizations

### Caching Strategy

```typescript
class CacheManager {
  private memoryCache: LRUCache<string, any>;
  private redisCache: Redis;

  constructor() {
    this.memoryCache = new LRUCache({
      max: 10000,
      ttl: 5 * 60 * 1000, // 5 minutes
      updateAgeOnGet: true
    });

    this.redisCache = new Redis({
      keyPrefix: 'cache:',
      enableOfflineQueue: false
    });
  }

  async get<T>(key: string): Promise<T | null> {
    // L1 Cache - Memory
    const memResult = this.memoryCache.get(key);
    if (memResult) return memResult;

    // L2 Cache - Redis
    const redisResult = await this.redisCache.get(key);
    if (redisResult) {
      const parsed = JSON.parse(redisResult);
      this.memoryCache.set(key, parsed);
      return parsed;
    }

    return null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // Write to both caches
    this.memoryCache.set(key, value);

    await this.redisCache.setex(
      key,
      ttl || 300,
      JSON.stringify(value)
    );
  }
}
```

### Message Batching

```typescript
class MessageBatcher {
  private batch: Message[] = [];
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private batchSize: number = 100,
    private maxDelay: number = 100
  ) {}

  add(message: Message): void {
    this.batch.push(message);

    if (this.batch.length >= this.batchSize) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.maxDelay);
    }
  }

  private async flush(): Promise<void> {
    if (this.batch.length === 0) return;

    const messages = [...this.batch];
    this.batch = [];

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    await this.processBatch(messages);
  }

  private async processBatch(messages: Message[]): Promise<void> {
    // Batch insert to Redis
    const pipeline = redis.pipeline();

    messages.forEach(msg => {
      pipeline.hset(`msg:${msg.id}`, msg);
      pipeline.zadd(msg.topic, Date.now(), msg.id);
    });

    await pipeline.exec();
  }
}
```

## Scalability

### Horizontal Scaling

```typescript
// Cluster mode for multi-core utilization
import cluster from 'cluster';
import os from 'os';

if (cluster.isPrimary) {
  const numWorkers = os.cpus().length;

  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died, restarting...`);
    cluster.fork();
  });
} else {
  // Start worker
  startServer();
}
```

### Redis Cluster Support

```typescript
class RedisClusterClient {
  private cluster: Cluster;

  constructor(nodes: RedisNode[]) {
    this.cluster = new Cluster(nodes, {
      redisOptions: {
        password: config.redis.password
      },
      clusterRetryStrategy: (times) => {
        return Math.min(100 * times, 2000);
      }
    });
  }

  async getMessagesByGuild(guildId: string): Promise<Message[]> {
    // Use hash tags for cluster routing
    const key = `{${guildId}}:messages`;
    return this.cluster.smembers(key);
  }
}
```

## Security Architecture

### Authentication Flow

```typescript
// JWT-based authentication
class AuthService {
  private readonly secret: string;

  async authenticate(credentials: Credentials): Promise<string> {
    const user = await this.validateCredentials(credentials);

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    return this.generateToken(user);
  }

  private generateToken(user: User): string {
    return jwt.sign(
      {
        userId: user.id,
        role: user.role,
        permissions: user.permissions
      },
      this.secret,
      {
        expiresIn: '24h',
        issuer: 'rustic-debug',
        audience: 'rustic-ai'
      }
    );
  }

  async verifyToken(token: string): Promise<TokenPayload> {
    try {
      return jwt.verify(token, this.secret) as TokenPayload;
    } catch (error) {
      throw new UnauthorizedError('Invalid token');
    }
  }
}
```

### Rate Limiting

```typescript
class RateLimiter {
  private limits = new Map<string, Limit>();

  async checkLimit(key: string): Promise<boolean> {
    const limit = this.limits.get(key) || this.createLimit(key);

    if (limit.requests >= limit.max) {
      if (Date.now() - limit.window > limit.windowMs) {
        // Reset window
        limit.requests = 0;
        limit.window = Date.now();
      } else {
        return false; // Rate limit exceeded
      }
    }

    limit.requests++;
    return true;
  }

  private createLimit(key: string): Limit {
    const limit = {
      requests: 0,
      max: 1000,
      windowMs: 60000,
      window: Date.now()
    };

    this.limits.set(key, limit);
    return limit;
  }
}
```

## Monitoring & Observability

### Metrics Collection

```typescript
class MetricsCollector {
  private metrics = {
    messagesProcessed: new Counter('messages_processed_total'),
    messageLatency: new Histogram('message_latency_ms'),
    activeConnections: new Gauge('active_connections'),
    errorRate: new Counter('errors_total')
  };

  recordMessage(message: Message, duration: number): void {
    this.metrics.messagesProcessed.inc({
      guild: message.guild_id,
      topic: message.topic
    });

    this.metrics.messageLatency.observe(duration);
  }

  recordError(error: Error): void {
    this.metrics.errorRate.inc({
      type: error.name,
      code: error.code
    });
  }

  async export(): Promise<string> {
    return register.metrics();
  }
}
```

## Next Steps

- [API Reference](./api.html) - Complete API documentation
- [Integration Guide](./integration.html) - How to integrate
- [Contributing](./contributing.html) - Contribute to the project