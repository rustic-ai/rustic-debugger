---
title: User Guide Overview
description: Complete guide to using Rustic Debug for everyday debugging tasks
sidebar:
  category: user-guide
  order: 1
tags: [overview, getting-started]
---

# User Guide Overview

Welcome to the Rustic Debug user guide! This comprehensive guide will help you get started with debugging Redis message flows in your RusticAI applications.

## What is Rustic Debug?

Rustic Debug is a powerful web-based debugging tool designed specifically for RusticAI guild systems. It provides real-time visualization and analysis of Redis message flows, making it easier to understand and troubleshoot your distributed AI applications.

## Key Features

### 🔍 **Real-time Message Monitoring**
Monitor Redis pub/sub channels and message queues in real-time with live updates.

### 📊 **Visual Flow Graphs**
Visualize message flows between guilds, topics, and agents with interactive diagrams.

### 🕵️ **Message Inspector**
Deep dive into individual messages with detailed payload inspection and metadata analysis.

### 🧵 **Thread Tracking**
Follow conversation threads and message chains across multiple topics and guilds.

### 📈 **Performance Metrics**
Track message throughput, latency, and system performance with built-in analytics.

## Getting Started

1. **[📸 Screenshots & Visual Guide](./screenshots.html)** - See Rustic Debug in action with visual examples
2. **[Installation](./installation.html)** - Set up Rustic Debug in your environment
3. **[Configuration](./configuration.html)** - Configure Redis connections and guild settings
4. **[Basic Usage](./basic-usage.html)** - Learn the core debugging workflows
5. **[Advanced Features](./advanced.html)** - Explore advanced debugging capabilities

## Quick Start

For users who want to jump right in:

```bash
# Install Rustic Debug
npm install -g @rustic-ai/rustic-debug

# Start the debugger
rustic-debug start --redis-url redis://localhost:6379

# Open the web interface
open http://localhost:3000
```

## Common Use Cases

- **Message Flow Debugging** - Trace messages through complex guild hierarchies
- **Performance Analysis** - Identify bottlenecks in message processing
- **Integration Testing** - Validate message flows in development environments
- **Production Monitoring** - Monitor live systems for issues and anomalies

## Need Help?

- Check out our [Troubleshooting Guide](./troubleshooting) for common issues
- Browse the [FAQ](./faq) for quick answers
- Join our [Community Discussion](https://github.com/rustic-ai/rustic-debug/discussions) for help from other users

Let's get started with [installation](./installation)!