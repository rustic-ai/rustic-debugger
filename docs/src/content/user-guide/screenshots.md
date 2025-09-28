---
title: Screenshots & Visual Guide
description: Visual tour of Rustic Debug interface and features
tags: [screenshots, visual-guide, ui]
---

# Screenshots & Visual Guide

Explore the Rustic Debug interface through these annotated screenshots and visual guides.

## Guild Selection Page

The Guild Selection page is your entry point to debugging. It displays all available RusticAI guilds in your Redis instance.

![Guild Selection Page](../assets/screenshots/guilds-page.png)

**Key Features:**
- **Guild Cards**: Each guild is displayed as a card showing:
  - Guild name and ID
  - Number of active topics
  - Message count
  - Last activity timestamp
  - Health status indicator
- **Search Bar**: Filter guilds by name or ID
- **Status Indicators**:
  - 🟢 Active guilds with recent messages
  - 🟡 Idle guilds with no recent activity
  - 🔴 Guilds with errors or issues
- **Quick Actions**: Direct links to debug specific guilds

## Debug Dashboard

The main debugging interface provides comprehensive tools for message analysis.

![Debug Dashboard](../assets/screenshots/debug-page.png)

**Dashboard Components:**
- **Header Bar**: Guild name, connection status, and view controls
- **Sidebar**: Navigation between different views
- **Main Content Area**: Dynamic content based on selected view
- **Metrics Bar**: Real-time statistics and performance metrics

## Message List View

The List View presents messages in a chronological, filterable table format.

![List View](../assets/screenshots/list-view.png)

**List View Features:**

### Message Table
- **Columns**:
  - Timestamp (with millisecond precision)
  - Message ID (GemstoneID format)
  - Topic
  - Agent Tag
  - Status (success/error/pending)
  - Content preview
  - Actions (inspect, replay, export)

### Filtering Panel
- **Time Range**: Last hour, day, week, or custom range
- **Status Filter**: All, Success, Error, Pending
- **Topic Filter**: Multi-select dropdown
- **Agent Filter**: Filter by specific agents
- **Search**: Full-text search in message content

### Message Inspector
When you click on a message, the inspector panel opens:

![Message Inspector](../assets/screenshots/message-inspector.png)

**Inspector Details:**
- **Message Header**: ID, timestamp, and status
- **Content Viewer**:
  - JSON tree view for structured data
  - Syntax highlighting
  - Copy to clipboard
  - Export options
- **Metadata Section**:
  - Processing time
  - Retry count
  - Thread ID
  - Parent message link
- **Routing Rules**: Shows message routing configuration
- **Raw View**: Toggle between formatted and raw JSON

## Thread View

The Thread View visualizes conversation flows and message chains.

![Thread View](../assets/screenshots/thread-view.png)

**Thread Visualization:**

### Thread Timeline
- **Vertical Timeline**: Messages arranged chronologically
- **Thread Connections**: Lines connecting related messages
- **Branch Points**: Where conversations diverge
- **Color Coding**:
  - Blue: User messages
  - Green: System responses
  - Yellow: Processing messages
  - Red: Error messages

### Thread Inspector
- **Thread Metadata**:
  - Thread ID
  - Start time
  - Duration
  - Message count
  - Participating agents
- **Thread Actions**:
  - Export thread
  - Replay thread
  - Share thread link

### Thread Statistics
- **Performance Metrics**:
  - Total thread duration
  - Average response time
  - Number of retries
  - Error rate

## Graph View

The Graph View provides an interactive visualization of message flows between topics and agents.

![Graph View](../assets/screenshots/graph-view.png)

**Graph Visualization Components:**

### Node Types
- **Guild Node** (Large circle): Central node representing the guild
- **Topic Nodes** (Medium circles): Topics within the guild
- **Agent Nodes** (Small circles): Individual agents
- **Message Nodes** (Dots): Individual messages (optional)

### Edge Types
- **Solid Lines**: Direct message flow
- **Dashed Lines**: Async/delayed messages
- **Thick Lines**: High-traffic routes
- **Red Lines**: Error paths

### Interactive Features
- **Zoom & Pan**: Navigate the graph
- **Node Selection**: Click to see details
- **Filter Controls**: Show/hide node types
- **Layout Options**:
  - Hierarchical
  - Force-directed
  - Circular
  - Tree

### Graph Statistics Panel
![Graph Statistics](../assets/screenshots/graph-stats.png)

- **Flow Metrics**:
  - Messages per second
  - Average latency
  - Bottleneck detection
- **Node Statistics**:
  - Most active topics
  - Busiest agents
  - Error hotspots

## Real-time Monitoring

The real-time monitoring view shows live message flow.

![Real-time Monitor](../assets/screenshots/realtime-view.png)

**Real-time Features:**
- **Live Message Stream**: Messages appear as they arrive
- **Activity Graph**: Rolling time-series chart
- **Alert Panel**: Real-time alerts and warnings
- **Performance Gauges**: CPU, memory, and throughput meters

## Filter & Search Interface

Advanced filtering capabilities for finding specific messages.

![Filter Interface](../assets/screenshots/filter-interface.png)

**Filter Options:**
- **Quick Filters**: Pre-configured common filters
- **Advanced Query Builder**: Build complex queries
- **Saved Filters**: Save and reuse filter configurations
- **Filter History**: Recent filter queries

## Export & Reporting

Export functionality for sharing and analysis.

![Export Dialog](../assets/screenshots/export-dialog.png)

**Export Options:**
- **Formats**: JSON, CSV, PDF, HTML
- **Scope**: Current view, filtered results, or time range
- **Include Options**:
  - Messages
  - Metadata
  - Thread context
  - Performance metrics

## Settings & Configuration

Configure Rustic Debug for your environment.

![Settings Page](../assets/screenshots/settings-page.png)

**Settings Sections:**
- **Connection Settings**: Redis connection configuration
- **UI Preferences**: Theme, layout, refresh rates
- **Performance**: Caching, sampling, limits
- **Security**: Authentication, encryption
- **Advanced**: Debug options, experimental features

## Mobile Responsive Views

Rustic Debug is fully responsive for mobile debugging.

### Mobile List View
![Mobile List View](../assets/screenshots/mobile-list.png)

- Optimized table layout
- Swipe actions
- Collapsible panels

### Mobile Graph View
![Mobile Graph View](../assets/screenshots/mobile-graph.png)

- Touch-optimized controls
- Simplified visualization
- Gesture support

## Dark Mode

All views support dark mode for comfortable debugging at any time.

![Dark Mode](../assets/screenshots/dark-mode.png)

**Dark Mode Features:**
- High contrast text
- Reduced eye strain
- Syntax highlighting optimized for dark backgrounds
- Automatic theme switching based on system preferences

## Keyboard Shortcuts

Quick reference for power users:

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Quick search |
| `Ctrl/Cmd + F` | Filter messages |
| `Ctrl/Cmd + G` | Toggle graph view |
| `Ctrl/Cmd + L` | Toggle list view |
| `Ctrl/Cmd + T` | Toggle thread view |
| `Ctrl/Cmd + R` | Refresh data |
| `Ctrl/Cmd + E` | Export current view |
| `Esc` | Close panels/modals |
| `Space` | Pause/resume live updates |

## Video Tutorials

For a more comprehensive understanding, check out our video tutorials:

1. **Getting Started** (5 mins) - Basic navigation and setup
2. **Debugging Workflows** (10 mins) - Common debugging scenarios
3. **Advanced Features** (15 mins) - Power user features
4. **Performance Analysis** (8 mins) - Using metrics and profiling

[View Video Tutorials →](https://rustic.ai/tutorials)

## Next Steps

Now that you're familiar with the interface:

- [Learn Basic Usage](./basic-usage.html) - Start debugging
- [Explore Advanced Features](./advanced.html) - Power user features
- [Read API Docs](../dev-guide/api.html) - Integrate with your tools