---
title: Advanced Features
description: Advanced debugging capabilities and power user features
tags: [advanced, features, power-user]
---

# Advanced Features

Unlock the full power of Rustic Debug with these advanced features and techniques.

## Message Replay

Replay historical message flows to debug past issues or test fixes.

### Capturing Message Flows

```bash
# Start recording messages
rustic-debug record \
  --guild production-guild \
  --duration 60s \
  --output replay.json

# Record with filters
rustic-debug record \
  --guild production-guild \
  --topic user-queries \
  --filter "status=error" \
  --duration 5m \
  --output errors-replay.json
```

### Replaying Messages

```bash
# Replay captured messages
rustic-debug replay \
  --file replay.json \
  --speed 2x \
  --target-guild test-guild

# Replay with modifications
rustic-debug replay \
  --file replay.json \
  --modify "agent_tag.version=2.0" \
  --target-guild staging-guild
```

### Time Travel Debugging

```javascript
// Jump to specific point in message history
const debugger = new RusticDebug.TimeTravelDebugger({
  guild: 'production-guild',
  startTime: '2024-01-15T10:00:00Z',
  endTime: '2024-01-15T11:00:00Z'
});

// Step through messages
await debugger.stepForward();  // Next message
await debugger.stepBackward(); // Previous message
await debugger.jumpTo('2024-01-15T10:30:00Z');

// Inspect state at specific time
const state = await debugger.getStateAt('2024-01-15T10:45:00Z');
console.log('Active topics:', state.topics);
console.log('Message count:', state.messageCount);
console.log('Error rate:', state.errorRate);
```

## Custom Filters and Queries

### Advanced Query Language

```javascript
// Complex message queries
const query = `
  guild:production-* AND
  topic:(payments OR billing) AND
  status:error AND
  timestamp:[2024-01-15T00:00:00Z TO 2024-01-15T23:59:59Z] AND
  content.amount:>1000 AND
  metadata.retry_count:>=3
`;

const results = await debug.search(query);
```

### Custom Filter Functions

```javascript
// Register custom filters
debug.registerFilter('highValue', (message) => {
  return message.content.amount > 10000 &&
         message.content.currency === 'USD';
});

debug.registerFilter('slowProcessing', (message) => {
  return message.metadata.processing_time_ms > 1000;
});

// Use custom filters
const highValueMessages = await debug.filter('highValue');
const slowMessages = await debug.filter('slowProcessing');
```

### Query Builder API

```javascript
const query = new QueryBuilder()
  .guild('production-*')
  .topic(['payments', 'billing'])
  .timeRange('last_hour')
  .where('status', '=', 'error')
  .where('content.amount', '>', 1000)
  .orderBy('timestamp', 'desc')
  .limit(100)
  .build();

const results = await debug.execute(query);
```

## Performance Profiling

### Message Flow Profiling

```bash
# Profile message flow performance
rustic-debug profile \
  --guild production-guild \
  --duration 5m \
  --output profile.html

# Generates interactive flame graph
open profile.html
```

### Latency Analysis

```javascript
// Analyze message latencies
const analysis = await debug.analyzeLatency({
  guild: 'production-guild',
  timeRange: 'last_hour',
  percentiles: [50, 90, 95, 99]
});

console.log('Latency Analysis:');
console.log(`P50: ${analysis.p50}ms`);
console.log(`P90: ${analysis.p90}ms`);
console.log(`P95: ${analysis.p95}ms`);
console.log(`P99: ${analysis.p99}ms`);

// Find bottlenecks
const bottlenecks = analysis.slowestPaths.map(path => ({
  from: path.source,
  to: path.target,
  avgLatency: path.avgLatency,
  messageCount: path.count
}));
```

### Resource Monitoring

```javascript
// Monitor Redis memory usage
const metrics = await debug.getResourceMetrics();

console.log('Redis Memory:', metrics.redis.memory);
console.log('Key Count:', metrics.redis.keyCount);
console.log('Connected Clients:', metrics.redis.clients);
console.log('Commands/sec:', metrics.redis.commandsPerSecond);

// Set up alerts
debug.onResourceAlert((alert) => {
  if (alert.type === 'MEMORY_HIGH') {
    console.warn(`Memory usage critical: ${alert.usage}%`);
    // Trigger cleanup or alert
  }
});
```

## Distributed Tracing

### Trace Context Propagation

```javascript
// Enable distributed tracing
const debug = new RusticDebug({
  tracing: {
    enabled: true,
    serviceName: 'rustic-debug',
    endpoint: 'http://jaeger:14268/api/traces'
  }
});

// Trace message flow
const trace = await debug.traceMessage('VGF6sLGdatx3gPeGEDQxHb');

console.log('Trace ID:', trace.traceId);
console.log('Span Count:', trace.spans.length);
console.log('Total Duration:', trace.duration);

// Visualize trace
trace.spans.forEach(span => {
  console.log(`${span.operationName}: ${span.duration}ms`);
});
```

### OpenTelemetry Integration

```javascript
import { NodeTracerProvider } from '@opentelemetry/node';
import { RusticDebugExporter } from '@rustic-ai/debug-otel';

const provider = new NodeTracerProvider();
provider.addSpanProcessor(
  new BatchSpanProcessor(
    new RusticDebugExporter({
      url: 'http://localhost:3000',
      serviceName: 'my-service'
    })
  )
);
provider.register();
```

## Anomaly Detection

### Pattern Recognition

```javascript
// Enable anomaly detection
const detector = new AnomalyDetector({
  guild: 'production-guild',
  sensitivity: 'medium',
  algorithms: ['isolation-forest', 'mad', 'seasonal']
});

// Train on normal behavior
await detector.train({
  timeRange: 'last_week',
  excludeErrors: true
});

// Detect anomalies
detector.onAnomaly((anomaly) => {
  console.log('Anomaly detected:', {
    type: anomaly.type,
    severity: anomaly.severity,
    topic: anomaly.topic,
    deviation: anomaly.deviation,
    recommendation: anomaly.recommendation
  });
});
```

### Predictive Alerts

```javascript
// Set up predictive monitoring
const predictor = new Predictor({
  model: 'arima',
  horizon: '1h'
});

// Predict future load
const prediction = await predictor.predictLoad({
  guild: 'production-guild',
  metric: 'message_rate'
});

if (prediction.peak > threshold) {
  console.warn(`High load predicted at ${prediction.peakTime}`);
  console.warn(`Expected rate: ${prediction.peak} msg/s`);
}
```

## Export and Integration

### Data Export Formats

```bash
# Export to various formats
rustic-debug export \
  --guild production-guild \
  --format json \
  --output messages.json

rustic-debug export \
  --guild production-guild \
  --format csv \
  --output messages.csv

rustic-debug export \
  --guild production-guild \
  --format parquet \
  --output messages.parquet
```

### Grafana Integration

```javascript
// Grafana datasource configuration
{
  "datasources": [{
    "name": "Rustic Debug",
    "type": "rustic-debug-datasource",
    "url": "http://localhost:3000",
    "access": "proxy",
    "jsonData": {
      "guild": "production-guild",
      "refreshInterval": "5s"
    }
  }]
}
```

### Elasticsearch Export

```javascript
// Export to Elasticsearch
const exporter = new ElasticsearchExporter({
  node: 'http://localhost:9200',
  index: 'rustic-messages',
  pipeline: 'rustic-processing'
});

await exporter.export({
  guild: 'production-guild',
  timeRange: 'last_day',
  batchSize: 1000
});
```

## Custom Visualizations

### D3.js Integration

```javascript
// Create custom visualization
import * as d3 from 'd3';

const visualization = new MessageFlowVisualization({
  container: '#flow-chart',
  width: 1200,
  height: 800
});

// Load message data
const messages = await debug.getMessages({
  guild: 'production-guild',
  limit: 1000
});

// Render custom flow chart
visualization.render(messages, {
  layout: 'force-directed',
  colorScheme: 'category20',
  nodeSize: (d) => d.messageCount,
  linkWidth: (d) => Math.log(d.frequency)
});
```

### Real-time Dashboards

```html
<!-- Custom dashboard -->
<div id="rustic-dashboard">
  <rustic-message-stream
    guild="production-guild"
    refresh-rate="1000">
  </rustic-message-stream>

  <rustic-metrics-panel
    metrics="['rate', 'latency', 'errors']"
    time-range="last_hour">
  </rustic-metrics-panel>

  <rustic-flow-graph
    layout="hierarchical"
    animated="true">
  </rustic-flow-graph>
</div>

<script>
// Initialize dashboard
const dashboard = new RusticDashboard({
  apiUrl: 'http://localhost:3000',
  theme: 'dark',
  autoRefresh: true
});

dashboard.init();
</script>
```

## Scripting and Automation

### Debug Scripts

```javascript
#!/usr/bin/env node
// debug-script.js

const { RusticDebug } = require('@rustic-ai/debug-client');

async function analyzeErrorPatterns() {
  const debug = new RusticDebug({
    url: 'http://localhost:3000'
  });

  // Get all errors from last hour
  const errors = await debug.search({
    status: 'error',
    timeRange: 'last_hour'
  });

  // Group by error type
  const grouped = {};
  errors.forEach(error => {
    const type = error.error?.type || 'unknown';
    grouped[type] = (grouped[type] || 0) + 1;
  });

  // Generate report
  console.log('Error Analysis Report:');
  Object.entries(grouped)
    .sort(([,a], [,b]) => b - a)
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count} occurrences`);
    });
}

analyzeErrorPatterns();
```

### CI/CD Integration

```yaml
# .github/workflows/debug-check.yml
name: Debug Analysis

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Run Debug Analysis
        run: |
          npx @rustic-ai/debug-cli analyze \
            --url ${{ secrets.DEBUG_URL }} \
            --token ${{ secrets.DEBUG_TOKEN }} \
            --threshold-errors 100 \
            --threshold-latency 1000

      - name: Upload Report
        if: failure()
        uses: actions/upload-artifact@v2
        with:
          name: debug-report
          path: debug-analysis.html
```

## Security Features

### Audit Logging

```javascript
// Enable audit logging
const debug = new RusticDebug({
  audit: {
    enabled: true,
    logLevel: 'detailed',
    storage: 'elasticsearch',
    retention: '90d'
  }
});

// Query audit logs
const audits = await debug.getAuditLogs({
  user: 'john.doe',
  action: 'message_export',
  timeRange: 'last_week'
});
```

### Data Masking

```javascript
// Configure data masking
const debug = new RusticDebug({
  masking: {
    enabled: true,
    rules: [
      {
        path: 'content.creditCard',
        type: 'credit-card'
      },
      {
        path: 'content.email',
        type: 'email'
      },
      {
        path: 'content.ssn',
        type: 'custom',
        pattern: /\d{3}-\d{2}-\d{4}/,
        replacement: 'XXX-XX-XXXX'
      }
    ]
  }
});
```

## WebSocket Advanced Usage

### Custom WebSocket Handlers

```javascript
// Advanced WebSocket client
const ws = new WebSocket('ws://localhost:3000/stream');

// Custom protocol handling
ws.on('open', () => {
  // Subscribe with filters
  ws.send(JSON.stringify({
    type: 'subscribe',
    topics: ['payments'],
    filters: {
      amount: { gt: 1000 },
      status: { in: ['pending', 'processing'] }
    }
  }));

  // Request historical data
  ws.send(JSON.stringify({
    type: 'history',
    count: 100,
    before: new Date().toISOString()
  }));
});

// Handle different message types
ws.on('message', (data) => {
  const msg = JSON.parse(data);

  switch(msg.type) {
    case 'message':
      handleNewMessage(msg.data);
      break;
    case 'history':
      handleHistoricalData(msg.data);
      break;
    case 'stats':
      updateStatistics(msg.data);
      break;
    case 'alert':
      handleAlert(msg.data);
      break;
  }
});
```

## Plugin System

### Creating Plugins

```javascript
// custom-plugin.js
class CustomAnalyzer {
  constructor(debug) {
    this.debug = debug;
    this.name = 'custom-analyzer';
    this.version = '1.0.0';
  }

  async init() {
    // Initialize plugin
    console.log('Custom Analyzer initialized');
  }

  async analyze(messages) {
    // Custom analysis logic
    return {
      totalMessages: messages.length,
      customMetric: this.calculateCustomMetric(messages)
    };
  }

  calculateCustomMetric(messages) {
    // Custom calculation
    return messages.filter(m => m.custom_flag).length;
  }
}

// Register plugin
debug.registerPlugin(CustomAnalyzer);
```

## Next Steps

- [API Reference](../dev-guide/api.html) - Complete API documentation
- [Integration Guide](../dev-guide/integration.html) - Integration patterns
- [Contributing](../dev-guide/contributing.html) - Contribute to Rustic Debug