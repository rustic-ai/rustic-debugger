---
title: Installation Guide
description: Step-by-step guide to install and set up Rustic Debug
tags: [installation, setup, getting-started]
---

# Installation Guide

Get Rustic Debug up and running in your environment with these installation methods.

## Prerequisites

Before installing Rustic Debug, ensure you have:

- **Node.js** v18.0 or higher (for npm installation)
- **Redis** v6.0 or higher running and accessible
- **RusticAI** application using Redis for messaging
- **Modern web browser** (Chrome, Firefox, Safari, Edge)

## Installation Methods

### Method 1: NPM (Recommended)

The quickest way to get started with Rustic Debug.

```bash
# Install globally
npm install -g @rustic-ai/rustic-debug

# Or with yarn
yarn global add @rustic-ai/rustic-debug

# Or with pnpm
pnpm add -g @rustic-ai/rustic-debug
```

#### Verify Installation

```bash
# Check version
rustic-debug --version

# View help
rustic-debug --help
```

### Method 2: Docker

Run Rustic Debug in a containerized environment.

```bash
# Pull the latest image
docker pull rusticai/rustic-debug:latest

# Run the container
docker run -d \
  --name rustic-debug \
  -p 3000:3000 \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  rusticai/rustic-debug
```

#### Docker Compose

Create a `docker-compose.yml`:

```yaml
version: '3.8'
services:
  rustic-debug:
    image: rusticai/rustic-debug:latest
    ports:
      - "3000:3000"
    environment:
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
    depends_on:
      - redis
    networks:
      - rustic-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    networks:
      - rustic-network

networks:
  rustic-network:
    driver: bridge
```

Then run:
```bash
docker-compose up -d
```

### Method 3: From Source

Build and run from the source code.

```bash
# Clone the repository
git clone https://github.com/rustic-ai/rustic-debug.git
cd rustic-debug

# Install dependencies
pnpm install

# Build the project
pnpm build

# Start the application
pnpm start
```

#### Development Mode

```bash
# Run in development mode with hot reload
pnpm dev

# Run frontend and backend separately
pnpm --filter frontend dev
pnpm --filter backend dev
```

### Method 4: Kubernetes

Deploy to a Kubernetes cluster using Helm.

```bash
# Add the Rustic helm repository
helm repo add rustic https://charts.rustic.ai
helm repo update

# Install Rustic Debug
helm install rustic-debug rustic/rustic-debug \
  --set redis.url=redis://my-redis-service:6379 \
  --set ingress.enabled=true \
  --set ingress.host=debug.example.com
```

## Configuration

### Basic Configuration

After installation, configure Rustic Debug to connect to your Redis instance:

```bash
# Start with basic configuration
rustic-debug start \
  --redis-url redis://localhost:6379 \
  --port 3000 \
  --host 0.0.0.0
```

### Advanced Configuration

Create a configuration file `rustic-debug.config.json`:

```json
{
  "redis": {
    "url": "redis://localhost:6379",
    "password": "your-password",
    "db": 0,
    "connectionTimeout": 5000,
    "reconnectStrategy": "exponential"
  },
  "server": {
    "port": 3000,
    "host": "0.0.0.0",
    "cors": {
      "enabled": true,
      "origins": ["http://localhost:*"]
    }
  },
  "debug": {
    "readOnly": true,
    "maxMessages": 10000,
    "retentionHours": 24
  },
  "auth": {
    "enabled": false,
    "token": "your-secret-token"
  }
}
```

Load the configuration:
```bash
rustic-debug start --config ./rustic-debug.config.json
```

### Environment Variables

You can also use environment variables:

```bash
export REDIS_URL=redis://localhost:6379
export REDIS_PASSWORD=your-password
export REDIS_DB=0
export DEBUG_PORT=3000
export DEBUG_HOST=0.0.0.0
export DEBUG_READ_ONLY=true
export DEBUG_AUTH_TOKEN=your-secret-token

rustic-debug start
```

## Connecting to Redis

### Redis Connection Strings

Different Redis configurations:

```bash
# Standard connection
redis://localhost:6379

# With password
redis://:password@localhost:6379

# With username and password
redis://username:password@localhost:6379

# With database selection
redis://localhost:6379/2

# Redis Cluster
redis://node1:6379,node2:6379,node3:6379

# Redis Sentinel
redis+sentinel://localhost:26379/mymaster

# TLS/SSL connection
rediss://localhost:6380
```

### Testing Redis Connection

Before starting Rustic Debug, verify your Redis connection:

```bash
# Test connection
rustic-debug test-connection --redis-url redis://localhost:6379

# Output:
# ✅ Successfully connected to Redis at localhost:6379
# ✅ Redis version: 7.0.5
# ✅ Found 3 guilds with 142 messages
```

## Platform-Specific Instructions

### macOS

```bash
# Install Redis (if needed)
brew install redis
brew services start redis

# Install Rustic Debug
npm install -g @rustic-ai/rustic-debug

# Start
rustic-debug start
```

### Ubuntu/Debian

```bash
# Install Redis (if needed)
sudo apt update
sudo apt install redis-server
sudo systemctl start redis

# Install Node.js (if needed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs

# Install Rustic Debug
sudo npm install -g @rustic-ai/rustic-debug

# Start
rustic-debug start
```

### Windows

```powershell
# Install Redis (using WSL2 or Docker)
# WSL2 approach:
wsl --install
wsl sudo apt install redis-server
wsl sudo service redis-server start

# Install Rustic Debug
npm install -g @rustic-ai/rustic-debug

# Start
rustic-debug start
```

## Verifying Installation

After installation, verify everything is working:

1. **Check Service Status:**
   ```bash
   rustic-debug status
   ```

2. **Open the Web UI:**
   ```bash
   open http://localhost:3000
   ```

3. **Run Health Check:**
   ```bash
   curl http://localhost:3000/health

   # Expected response:
   {
     "status": "healthy",
     "redis": "connected",
     "version": "1.0.0",
     "uptime": 120
   }
   ```

## Setting Up as a Service

### systemd (Linux)

Create `/etc/systemd/system/rustic-debug.service`:

```ini
[Unit]
Description=Rustic Debug Service
After=network.target redis.service

[Service]
Type=simple
User=rustic
WorkingDirectory=/opt/rustic-debug
ExecStart=/usr/bin/rustic-debug start --config /etc/rustic-debug/config.json
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable rustic-debug
sudo systemctl start rustic-debug
```

### PM2 (Node.js Process Manager)

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start rustic-debug --name rustic-debug -- start

# Save configuration
pm2 save
pm2 startup
```

## Troubleshooting Installation

### Common Issues

**Issue: Cannot connect to Redis**
```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Check Redis connection
rustic-debug test-connection --redis-url redis://localhost:6379
```

**Issue: Port already in use**
```bash
# Find what's using port 3000
lsof -i :3000

# Use a different port
rustic-debug start --port 3001
```

**Issue: Permission denied**
```bash
# Fix npm permissions (macOS/Linux)
sudo npm install -g @rustic-ai/rustic-debug

# Or change npm prefix
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

**Issue: Node version too old**
```bash
# Check Node version
node --version

# Update Node.js using nvm
nvm install 18
nvm use 18
```

## Uninstalling

### NPM
```bash
npm uninstall -g @rustic-ai/rustic-debug
```

### Docker
```bash
docker stop rustic-debug
docker rm rustic-debug
docker rmi rusticai/rustic-debug
```

### From Source
```bash
# Remove the cloned directory
rm -rf /path/to/rustic-debug
```

## Next Steps

Now that Rustic Debug is installed:

1. [Configure your environment](./configuration.html)
2. [Learn basic usage](./basic-usage.html)
3. [Connect to your RusticAI application](./advanced.html)
4. [Set up monitoring dashboards](./advanced.html#monitoring)

## Getting Help

- Check the [Troubleshooting Guide](./troubleshooting.html)
- Visit our [GitHub Issues](https://github.com/rustic-ai/rustic-debug/issues)
- Join the [RusticAI Community](https://rustic.ai/community)