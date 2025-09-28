---
title: Integration Guide
description: How to integrate Rustic Debug with your RusticAI applications
tags: [integration, setup, development]
---

# Integration Guide

Learn how to integrate Rustic Debug with your existing RusticAI applications and development workflow.

## Integration Overview

Rustic Debug can be integrated in several ways:
1. **Standalone Mode** - Run as a separate debugging service
2. **Embedded Mode** - Integrate directly into your application
3. **Sidecar Pattern** - Deploy alongside your services
4. **Development Mode** - Use during local development

## Standalone Integration

### Basic Setup

The simplest way to integrate Rustic Debug is running it as a standalone service:

```bash
# Start Rustic Debug pointing to your Redis instance
rustic-debug start \
  --redis-url redis://your-redis-host:6379 \
  --guild-whitelist "your-guild-*" \
  --port 3000
```

### Docker Compose Integration

Add Rustic Debug to your existing `docker-compose.yml`:

```yaml
version: '3.8'
services:
  # Your existing services
  your-app:
    image: your-app:latest
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  # Add Rustic Debug
  rustic-debug:
    image: rusticai/rustic-debug:latest
    ports:
      - "3000:3000"
    environment:
      - REDIS_URL=redis://redis:6379
      - DEBUG_READ_ONLY=true
      - DEBUG_GUILD_WHITELIST=production-*,staging-*
    depends_on:
      - redis
    networks:
      - your-network
```

### Kubernetes Integration

Deploy Rustic Debug in your Kubernetes cluster:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rustic-debug
  namespace: rustic-ai
spec:
  replicas: 1
  selector:
    matchLabels:
      app: rustic-debug
  template:
    metadata:
      labels:
        app: rustic-debug
    spec:
      containers:
      - name: rustic-debug
        image: rusticai/rustic-debug:latest
        ports:
        - containerPort: 3000
        env:
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: url
        - name: DEBUG_READ_ONLY
          value: "true"
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"

---
apiVersion: v1
kind: Service
metadata:
  name: rustic-debug-service
  namespace: rustic-ai
spec:
  selector:
    app: rustic-debug
  ports:
  - port: 3000
    targetPort: 3000
  type: ClusterIP

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rustic-debug-ingress
  namespace: rustic-ai
spec:
  rules:
  - host: debug.your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: rustic-debug-service
            port:
              number: 3000
```

## Embedded Integration

### Node.js/TypeScript Integration

Install the Rustic Debug SDK:

```bash
npm install @rustic-ai/debug-embedded
```

Embed in your application:

```typescript
import { RusticDebugServer } from '@rustic-ai/debug-embedded';
import { createServer } from 'http';

// Your application
const app = express();

// Initialize Rustic Debug
const debugServer = new RusticDebugServer({
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  server: {
    port: 3001,  // Debug UI port
    embedded: true
  },
  auth: {
    enabled: true,
    sharedSecret: process.env.DEBUG_SECRET
  }
});

// Start debug server
await debugServer.start();

// Optional: Add middleware to your app
app.use('/debug', debugServer.getMiddleware());

// Your application routes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    debug: debugServer.getStatus()
  });
});

app.listen(3000);
```

### Python Integration

For Python RusticAI applications:

```python
from rustic_debug import DebugServer, DebugMiddleware
from rustic_ai import Guild
import asyncio

# Initialize debug server
debug_server = DebugServer(
    redis_url="redis://localhost:6379",
    port=3001,
    read_only=True
)

# Start debug server in background
async def start_debug():
    await debug_server.start()
    print(f"Debug UI available at http://localhost:3001")

# Add to your RusticAI guild
guild = Guild("my-guild")

# Add debug middleware
guild.add_middleware(DebugMiddleware(debug_server))

# Your application logic
@guild.agent("processor")
async def process_message(message):
    # Debug context is automatically captured
    result = await do_processing(message)
    return result

# Run everything
async def main():
    await asyncio.gather(
        start_debug(),
        guild.run()
    )

if __name__ == "__main__":
    asyncio.run(main())
```

## Sidecar Pattern

### Kubernetes Sidecar

Deploy Rustic Debug as a sidecar container:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: your-app-with-debug
spec:
  template:
    spec:
      containers:
      # Main application
      - name: your-app
        image: your-app:latest
        ports:
        - containerPort: 8080

      # Rustic Debug sidecar
      - name: debug-sidecar
        image: rusticai/rustic-debug:latest
        ports:
        - containerPort: 3000
        env:
        - name: REDIS_URL
          value: "redis://localhost:6379"
        - name: DEBUG_GUILD_WHITELIST
          value: "your-app-guild"

      # Redis sidecar (optional)
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
```

### Docker Sidecar

Using Docker networks for sidecar pattern:

```bash
# Create network
docker network create rustic-network

# Run Redis
docker run -d \
  --name redis \
  --network rustic-network \
  redis:7-alpine

# Run your application
docker run -d \
  --name your-app \
  --network rustic-network \
  -e REDIS_URL=redis://redis:6379 \
  your-app:latest

# Run Rustic Debug as sidecar
docker run -d \
  --name rustic-debug \
  --network rustic-network \
  -p 3000:3000 \
  -e REDIS_URL=redis://redis:6379 \
  -e DEBUG_GUILD_WHITELIST=your-app-* \
  rusticai/rustic-debug:latest
```

## Development Integration

### VS Code Integration

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug with Rustic Debug",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev:with-debug"],
      "env": {
        "RUSTIC_DEBUG_ENABLED": "true",
        "RUSTIC_DEBUG_PORT": "3001"
      },
      "serverReadyAction": {
        "pattern": "Debug UI available at (https?://localhost:[0-9]+)",
        "uriFormat": "%s",
        "action": "openExternally"
      }
    }
  ]
}
```

Add to `package.json`:

```json
{
  "scripts": {
    "dev:with-debug": "concurrently \"npm run dev\" \"rustic-debug start --dev\""
  }
}
```

### Testing Integration

Use Rustic Debug in your tests:

```typescript
import { RusticDebugClient } from '@rustic-ai/debug-client';
import { describe, it, expect, beforeAll, afterAll } from 'jest';

describe('Message Processing', () => {
  let debug: RusticDebugClient;

  beforeAll(async () => {
    debug = new RusticDebugClient({
      url: 'http://localhost:3001'
    });
    await debug.connect();
  });

  afterAll(async () => {
    await debug.disconnect();
  });

  it('should process messages without errors', async () => {
    // Start monitoring
    const monitor = debug.monitor({
      guild: 'test-guild',
      topic: 'test-topic'
    });

    // Run your test
    await yourApp.processMessage({
      topic: 'test-topic',
      content: 'test message'
    });

    // Check results in debug
    const messages = await monitor.getMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].status).toBe('success');

    // Check for errors
    const errors = await monitor.getErrors();
    expect(errors).toHaveLength(0);
  });
});
```

## CI/CD Integration

### GitHub Actions

`.github/workflows/debug-integration.yml`:

```yaml
name: Debug Integration Tests

on: [push, pull_request]

jobs:
  test-with-debug:
    runs-on: ubuntu-latest

    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

      rustic-debug:
        image: rusticai/rustic-debug:latest
        ports:
          - 3001:3000
        env:
          REDIS_URL: redis://redis:6379
          DEBUG_READ_ONLY: false

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests with debug monitoring
        run: npm run test:integration
        env:
          REDIS_URL: redis://localhost:6379
          DEBUG_URL: http://localhost:3001

      - name: Export debug report
        if: always()
        run: |
          npx @rustic-ai/debug-cli export \
            --url http://localhost:3001 \
            --format html \
            --output debug-report.html

      - name: Upload debug report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: debug-report
          path: debug-report.html
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any

    stages {
        stage('Setup') {
            steps {
                sh 'docker-compose up -d redis rustic-debug'
                sh 'npm ci'
            }
        }

        stage('Test with Debug') {
            steps {
                script {
                    try {
                        sh 'npm run test:integration'
                    } finally {
                        // Capture debug report
                        sh '''
                            npx @rustic-ai/debug-cli export \
                                --url http://localhost:3001 \
                                --format html \
                                --output debug-report.html
                        '''
                        archiveArtifacts artifacts: 'debug-report.html'
                    }
                }
            }
        }

        stage('Performance Test') {
            steps {
                sh '''
                    npx @rustic-ai/debug-cli monitor \
                        --url http://localhost:3001 \
                        --duration 5m \
                        --threshold-latency 100 \
                        --threshold-errors 1
                '''
            }
        }
    }

    post {
        always {
            sh 'docker-compose down'
        }
    }
}
```

## SDK Integration

### JavaScript/TypeScript SDK

```typescript
import { RusticDebugSDK } from '@rustic-ai/debug-sdk';

// Initialize SDK
const debug = new RusticDebugSDK({
  apiUrl: 'http://localhost:3001',
  apiKey: process.env.DEBUG_API_KEY
});

// Instrument your code
class MessageProcessor {
  @debug.trace('process-message')
  async processMessage(message: Message) {
    // Automatically tracked
    const result = await this.doProcessing(message);
    return result;
  }

  @debug.measure('processing-time')
  private async doProcessing(message: Message) {
    // Performance metrics automatically collected
    return await heavyComputation(message);
  }
}

// Manual instrumentation
async function handleRequest(req: Request) {
  const span = debug.startSpan('handle-request');

  try {
    // Your logic
    const result = await process(req);
    span.setTag('status', 'success');
    return result;
  } catch (error) {
    span.setTag('error', true);
    span.log({ event: 'error', message: error.message });
    throw error;
  } finally {
    span.finish();
  }
}
```

### Python SDK

```python
from rustic_debug import DebugSDK, trace, measure

# Initialize SDK
debug = DebugSDK(
    api_url="http://localhost:3001",
    api_key=os.environ.get("DEBUG_API_KEY")
)

class MessageProcessor:
    @trace("process-message")
    async def process_message(self, message):
        # Automatically tracked
        result = await self.do_processing(message)
        return result

    @measure("processing-time")
    async def do_processing(self, message):
        # Performance metrics collected
        return await heavy_computation(message)

# Manual instrumentation
async def handle_request(request):
    with debug.start_span("handle-request") as span:
        try:
            result = await process(request)
            span.set_tag("status", "success")
            return result
        except Exception as e:
            span.set_tag("error", True)
            span.log({"event": "error", "message": str(e)})
            raise
```

## Configuration Management

### Environment-Based Config

```typescript
// config/debug.config.ts
export const debugConfig = {
  development: {
    enabled: true,
    url: 'http://localhost:3001',
    verbosity: 'debug',
    features: {
      replay: true,
      export: true,
      modify: true
    }
  },
  staging: {
    enabled: true,
    url: 'https://debug-staging.example.com',
    verbosity: 'info',
    features: {
      replay: false,
      export: true,
      modify: false
    }
  },
  production: {
    enabled: true,
    url: 'https://debug.example.com',
    verbosity: 'warn',
    features: {
      replay: false,
      export: false,
      modify: false
    },
    auth: {
      required: true,
      token: process.env.DEBUG_AUTH_TOKEN
    }
  }
};

// Use in application
const env = process.env.NODE_ENV || 'development';
const config = debugConfig[env];

if (config.enabled) {
  const debug = new RusticDebugClient(config);
  await debug.connect();
}
```

## Monitoring Integration

### Prometheus Metrics

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'rustic-debug'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'
```

### Grafana Dashboard

Import the Rustic Debug dashboard:

```json
{
  "dashboard": {
    "title": "Rustic Debug Monitoring",
    "panels": [
      {
        "title": "Message Rate",
        "targets": [
          {
            "expr": "rate(rustic_debug_messages_total[5m])"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(rustic_debug_errors_total[5m])"
          }
        ]
      },
      {
        "title": "Latency P95",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rustic_debug_latency_bucket)"
          }
        ]
      }
    ]
  }
}
```

## Security Considerations

### Network Policies

```yaml
# Kubernetes NetworkPolicy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: rustic-debug-network-policy
spec:
  podSelector:
    matchLabels:
      app: rustic-debug
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          allow-debug: "true"
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
```

### Authentication Setup

```typescript
// Secure integration with authentication
const debug = new RusticDebugClient({
  url: 'https://debug.example.com',
  auth: {
    type: 'oauth2',
    clientId: process.env.DEBUG_CLIENT_ID,
    clientSecret: process.env.DEBUG_CLIENT_SECRET,
    tokenUrl: 'https://auth.example.com/token'
  },
  tls: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/ca.pem')
  }
});
```

## Next Steps

- [API Reference](./api.html) - Complete API documentation
- [Contributing](./contributing.html) - Contribute to the project
- [Architecture](./architecture.html) - System architecture