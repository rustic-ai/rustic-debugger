---
title: Configuration Guide
description: Configure Rustic Debug for your specific environment and needs
tags: [configuration, settings, customization]
---

# Configuration Guide

This guide covers all configuration options for Rustic Debug to customize it for your specific debugging needs.

## Configuration Overview

Rustic Debug can be configured through:
1. Command-line arguments
2. Configuration files (JSON/YAML)
3. Environment variables
4. Runtime API calls

Priority order (highest to lowest):
1. Command-line arguments
2. Environment variables
3. Configuration file
4. Default values

## Configuration File

### JSON Configuration

Create `rustic-debug.config.json`:

```json
{
  "redis": {
    "url": "redis://localhost:6379",
    "password": null,
    "username": null,
    "db": 0,
    "family": 4,
    "connectionName": "rustic-debug",
    "connectionTimeout": 5000,
    "commandTimeout": 5000,
    "keepAlive": 30000,
    "retryStrategy": {
      "retries": 10,
      "factor": 2,
      "minTimeout": 1000,
      "maxTimeout": 30000
    },
    "tls": {
      "enabled": false,
      "rejectUnauthorized": true,
      "cert": "/path/to/cert.pem",
      "key": "/path/to/key.pem",
      "ca": "/path/to/ca.pem"
    }
  },
  "server": {
    "port": 3000,
    "host": "0.0.0.0",
    "baseUrl": "/",
    "cors": {
      "enabled": true,
      "origins": ["http://localhost:*", "https://*.example.com"],
      "credentials": true
    },
    "compression": true,
    "trustProxy": false,
    "requestTimeout": 30000,
    "bodyLimit": "10mb"
  },
  "debug": {
    "readOnly": true,
    "maxMessages": 10000,
    "messageRetention": {
      "enabled": true,
      "hours": 24,
      "maxSize": "1GB"
    },
    "sampling": {
      "enabled": false,
      "rate": 1.0,
      "rules": [
        {
          "topic": "high-volume-topic",
          "rate": 0.1
        }
      ]
    }
  },
  "guilds": {
    "whitelist": ["production-*", "staging-*"],
    "blacklist": ["test-*", "dev-*"],
    "autoDiscovery": true,
    "refreshInterval": 60000
  },
  "monitoring": {
    "metrics": {
      "enabled": true,
      "interval": 10000,
      "detailed": false
    },
    "healthCheck": {
      "enabled": true,
      "interval": 30000,
      "timeout": 5000
    },
    "alerts": {
      "enabled": false,
      "rules": [
        {
          "name": "high-error-rate",
          "condition": "errorRate > 0.05",
          "action": "webhook",
          "webhook": "https://alerts.example.com/rustic-debug"
        }
      ]
    }
  },
  "ui": {
    "theme": "auto",
    "defaultView": "flow-graph",
    "messageLimit": 100,
    "refreshRate": 1000,
    "features": {
      "flowGraph": true,
      "messageInspector": true,
      "threadView": true,
      "metricsPanel": true,
      "searchBar": true,
      "exportTools": false
    }
  },
  "auth": {
    "enabled": false,
    "type": "token",
    "token": "your-secret-token",
    "sessionTimeout": 3600000,
    "oauth": {
      "provider": "github",
      "clientId": "your-client-id",
      "clientSecret": "your-client-secret",
      "callbackUrl": "http://localhost:3000/auth/callback"
    }
  },
  "logging": {
    "level": "info",
    "format": "json",
    "file": {
      "enabled": true,
      "path": "/var/log/rustic-debug",
      "maxSize": "100MB",
      "maxFiles": 10,
      "compress": true
    },
    "console": {
      "enabled": true,
      "colors": true
    }
  },
  "advanced": {
    "clustering": {
      "enabled": false,
      "workers": 4
    },
    "cache": {
      "enabled": true,
      "ttl": 300000,
      "maxSize": "100MB"
    },
    "rateLimit": {
      "enabled": true,
      "windowMs": 60000,
      "max": 1000
    }
  }
}
```

### YAML Configuration

Alternatively, use `rustic-debug.config.yaml`:

```yaml
redis:
  url: redis://localhost:6379
  db: 0
  connectionTimeout: 5000
  retryStrategy:
    retries: 10
    factor: 2

server:
  port: 3000
  host: 0.0.0.0
  cors:
    enabled: true
    origins:
      - http://localhost:*

debug:
  readOnly: true
  maxMessages: 10000
  messageRetention:
    enabled: true
    hours: 24

guilds:
  whitelist:
    - production-*
    - staging-*
  blacklist:
    - test-*

ui:
  theme: auto
  defaultView: flow-graph
  refreshRate: 1000

logging:
  level: info
  format: json
```

Load configuration:
```bash
rustic-debug start --config ./rustic-debug.config.yaml
```

## Environment Variables

All configuration options can be set via environment variables:

```bash
# Redis Configuration
export REDIS_URL=redis://localhost:6379
export REDIS_PASSWORD=your-password
export REDIS_USERNAME=default
export REDIS_DB=0
export REDIS_CONNECTION_TIMEOUT=5000
export REDIS_COMMAND_TIMEOUT=5000
export REDIS_KEEP_ALIVE=30000
export REDIS_TLS_ENABLED=false

# Server Configuration
export DEBUG_PORT=3000
export DEBUG_HOST=0.0.0.0
export DEBUG_BASE_URL=/
export DEBUG_CORS_ENABLED=true
export DEBUG_CORS_ORIGINS=http://localhost:*

# Debug Settings
export DEBUG_READ_ONLY=true
export DEBUG_MAX_MESSAGES=10000
export DEBUG_RETENTION_HOURS=24
export DEBUG_SAMPLING_ENABLED=false
export DEBUG_SAMPLING_RATE=1.0

# Guild Settings
export DEBUG_GUILD_WHITELIST=production-*,staging-*
export DEBUG_GUILD_BLACKLIST=test-*,dev-*
export DEBUG_AUTO_DISCOVERY=true

# UI Settings
export DEBUG_UI_THEME=auto
export DEBUG_UI_DEFAULT_VIEW=flow-graph
export DEBUG_UI_REFRESH_RATE=1000

# Authentication
export DEBUG_AUTH_ENABLED=false
export DEBUG_AUTH_TOKEN=your-secret-token

# Logging
export DEBUG_LOG_LEVEL=info
export DEBUG_LOG_FORMAT=json
```

## Command-Line Options

Override any configuration with command-line flags:

```bash
rustic-debug start \
  --redis-url redis://localhost:6379 \
  --redis-db 2 \
  --port 3001 \
  --host 127.0.0.1 \
  --read-only \
  --max-messages 5000 \
  --retention-hours 12 \
  --guild-whitelist "prod-*" \
  --guild-blacklist "test-*" \
  --auth-enabled \
  --auth-token "secret-token" \
  --log-level debug \
  --config ./custom-config.json
```

### Available Flags

```bash
# Redis Options
--redis-url <url>           # Redis connection URL
--redis-password <pass>     # Redis password
--redis-db <number>         # Redis database number
--redis-timeout <ms>        # Connection timeout

# Server Options
--port <port>               # Server port (default: 3000)
--host <host>               # Server host (default: 0.0.0.0)
--base-url <path>          # Base URL path
--cors                      # Enable CORS
--no-compression           # Disable compression

# Debug Options
--read-only                # Enable read-only mode
--max-messages <n>         # Maximum messages to store
--retention-hours <h>      # Message retention period
--sampling-rate <rate>     # Sampling rate (0.0-1.0)

# Guild Options
--guild-whitelist <pattern> # Guild whitelist patterns
--guild-blacklist <pattern> # Guild blacklist patterns
--no-auto-discovery        # Disable auto-discovery

# UI Options
--ui-theme <theme>         # UI theme (light/dark/auto)
--ui-refresh-rate <ms>     # UI refresh rate
--disable-flow-graph       # Disable flow graph feature

# Auth Options
--auth-enabled             # Enable authentication
--auth-token <token>       # Authentication token
--auth-session-timeout <ms> # Session timeout

# Logging Options
--log-level <level>        # Log level
--log-file <path>          # Log file path
--quiet                    # Minimal output
--verbose                  # Verbose output
```

## Redis Configuration

### Basic Connection

```javascript
{
  "redis": {
    "url": "redis://localhost:6379",
    "db": 0
  }
}
```

### Authenticated Connection

```javascript
{
  "redis": {
    "url": "redis://username:password@localhost:6379",
    "db": 0
  }
}
```

### Redis Cluster

```javascript
{
  "redis": {
    "cluster": true,
    "nodes": [
      { "host": "node1", "port": 6379 },
      { "host": "node2", "port": 6379 },
      { "host": "node3", "port": 6379 }
    ],
    "options": {
      "redisOptions": {
        "password": "cluster-password"
      }
    }
  }
}
```

### Redis Sentinel

```javascript
{
  "redis": {
    "sentinels": [
      { "host": "sentinel1", "port": 26379 },
      { "host": "sentinel2", "port": 26379 }
    ],
    "name": "mymaster",
    "password": "redis-password",
    "sentinelPassword": "sentinel-password"
  }
}
```

### TLS/SSL Connection

```javascript
{
  "redis": {
    "url": "rediss://localhost:6380",
    "tls": {
      "enabled": true,
      "rejectUnauthorized": true,
      "cert": "/path/to/client-cert.pem",
      "key": "/path/to/client-key.pem",
      "ca": "/path/to/ca-cert.pem",
      "checkServerIdentity": true
    }
  }
}
```

## Guild Configuration

### Whitelist/Blacklist Patterns

```javascript
{
  "guilds": {
    "whitelist": [
      "production-*",      // All production guilds
      "staging-guild-01",  // Specific staging guild
      "critical-*"         // All critical guilds
    ],
    "blacklist": [
      "test-*",           // Exclude all test guilds
      "*-dev",            // Exclude development guilds
      "benchmark-*"       // Exclude benchmark guilds
    ],
    "autoDiscovery": true,
    "refreshInterval": 60000
  }
}
```

### Guild Filtering Rules

```javascript
{
  "guilds": {
    "filters": [
      {
        "type": "include",
        "pattern": "production-*",
        "priority": 1
      },
      {
        "type": "exclude",
        "pattern": "production-test-*",
        "priority": 2
      }
    ]
  }
}
```

## UI Configuration

### Theme Settings

```javascript
{
  "ui": {
    "theme": "dark",
    "customTheme": {
      "primaryColor": "#667eea",
      "backgroundColor": "#1a1a1a",
      "textColor": "#ffffff",
      "borderColor": "#333333"
    }
  }
}
```

### Feature Toggles

```javascript
{
  "ui": {
    "features": {
      "flowGraph": true,
      "messageInspector": true,
      "threadView": true,
      "metricsPanel": true,
      "searchBar": true,
      "exportTools": false,
      "replayMode": false,
      "customFilters": true
    },
    "defaultPanels": ["messages", "metrics"],
    "maxPanels": 4
  }
}
```

## Performance Configuration

### Message Sampling

```javascript
{
  "debug": {
    "sampling": {
      "enabled": true,
      "defaultRate": 1.0,
      "rules": [
        {
          "topic": "high-volume-topic",
          "rate": 0.1  // Sample 10%
        },
        {
          "guild": "chatty-guild",
          "rate": 0.05  // Sample 5%
        },
        {
          "agent": "verbose-agent",
          "rate": 0.01  // Sample 1%
        }
      ]
    }
  }
}
```

### Caching

```javascript
{
  "advanced": {
    "cache": {
      "enabled": true,
      "type": "memory",
      "ttl": 300000,
      "maxSize": "100MB",
      "evictionPolicy": "lru",
      "redis": {
        "enabled": false,
        "prefix": "rustic-debug:cache:",
        "ttl": 600000
      }
    }
  }
}
```

## Security Configuration

### Authentication

```javascript
{
  "auth": {
    "enabled": true,
    "type": "jwt",
    "jwt": {
      "secret": "your-jwt-secret",
      "issuer": "rustic-debug",
      "audience": "rustic-ai",
      "expiresIn": "24h"
    },
    "users": [
      {
        "username": "admin",
        "password": "$2b$10$...",  // bcrypt hash
        "role": "admin"
      },
      {
        "username": "viewer",
        "password": "$2b$10$...",
        "role": "readonly"
      }
    ]
  }
}
```

### HTTPS/TLS

```javascript
{
  "server": {
    "https": {
      "enabled": true,
      "cert": "/path/to/cert.pem",
      "key": "/path/to/key.pem",
      "ca": "/path/to/ca.pem",
      "passphrase": "cert-passphrase"
    }
  }
}
```

## Monitoring Configuration

### Metrics Export

```javascript
{
  "monitoring": {
    "prometheus": {
      "enabled": true,
      "port": 9090,
      "path": "/metrics",
      "defaultLabels": {
        "service": "rustic-debug",
        "environment": "production"
      }
    },
    "statsd": {
      "enabled": false,
      "host": "localhost",
      "port": 8125,
      "prefix": "rustic.debug."
    }
  }
}
```

### Health Checks

```javascript
{
  "monitoring": {
    "healthCheck": {
      "enabled": true,
      "interval": 30000,
      "checks": [
        {
          "name": "redis",
          "type": "redis-ping",
          "critical": true
        },
        {
          "name": "memory",
          "type": "memory-usage",
          "threshold": 0.9,
          "critical": false
        }
      ]
    }
  }
}
```

## Profiles

Use configuration profiles for different environments:

### Development Profile

`config.dev.json`:
```json
{
  "extends": "./config.base.json",
  "redis": {
    "url": "redis://localhost:6379"
  },
  "server": {
    "port": 3000
  },
  "debug": {
    "readOnly": false
  },
  "logging": {
    "level": "debug"
  }
}
```

### Production Profile

`config.prod.json`:
```json
{
  "extends": "./config.base.json",
  "redis": {
    "url": "${REDIS_URL}"
  },
  "server": {
    "port": "${PORT}"
  },
  "debug": {
    "readOnly": true
  },
  "auth": {
    "enabled": true
  },
  "logging": {
    "level": "warn"
  }
}
```

Load profile:
```bash
rustic-debug start --config config.prod.json --profile production
```

## Configuration Validation

Rustic Debug validates configuration on startup:

```bash
# Validate configuration without starting
rustic-debug validate --config ./rustic-debug.config.json

# Output:
✅ Configuration valid
✅ Redis connection successful
✅ All required settings present
⚠️  Warning: Authentication disabled
⚠️  Warning: Using default retention period
```

## Dynamic Configuration

Some settings can be changed at runtime via the API:

```bash
# Update sampling rate
curl -X PUT http://localhost:3000/api/config \
  -H "Content-Type: application/json" \
  -d '{"debug": {"sampling": {"rate": 0.5}}}'

# Update UI refresh rate
curl -X PUT http://localhost:3000/api/config \
  -H "Content-Type: application/json" \
  -d '{"ui": {"refreshRate": 2000}}'
```

## Next Steps

- [Basic Usage](./basic-usage.html) - Start using Rustic Debug
- [Advanced Features](./advanced.html) - Explore advanced capabilities
- [API Reference](../dev-guide/api.html) - API documentation