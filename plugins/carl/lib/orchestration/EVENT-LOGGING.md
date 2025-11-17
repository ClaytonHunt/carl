# Event Logging Framework

Comprehensive event logging system for all execution activities with structured data, timestamps, correlation IDs, and metadata.

## Overview

The Event Logging Framework provides observable, event-driven coordination for workflow execution, state management, and worker activities. It follows IndyDevDan's orchestration principles:

- **Observable by default** - Log all significant events
- **Event-driven coordination** - Use events for monitoring and coordination
- **Session-based correlation** - Link related events with correlation IDs
- **Event-sourced coordination** - Build audit trails and state from events

## Architecture

### Core Components

1. **EventLogger** - Main logging class with storage and query capabilities
2. **Event** - Event data structure with schema validation
3. **EventType** - Comprehensive enumeration of all event types
4. **EventPriority** - Priority levels for event classification

### Event Schema

Every event includes:

```javascript
{
  // Core fields (required)
  eventId: "uuid",           // Unique event identifier
  timestamp: "ISO-8601",     // Event timestamp
  type: "event:type",        // Event type from EventType enum

  // Correlation fields
  correlationId: "uuid",     // Links related events
  executionId: "uuid",       // Execution context
  sessionId: "uuid",         // Session context
  workItemId: "T0001",       // Work item context (optional)
  workerId: "worker-1",      // Worker context (optional)

  // Event classification
  priority: "medium",        // Priority level
  category: "workflow",      // Auto-inferred category

  // Event data
  message: "Event message",  // Human-readable message
  metadata: {},              // Structured metadata

  // State transition fields (optional)
  oldState: "planned",
  newState: "in_progress",

  // Error fields (optional)
  error: "Error message",
  errorStack: "Stack trace",

  // Duration tracking (optional)
  duration: 5000             // Duration in milliseconds
}
```

## Event Types

### Workflow Lifecycle Events

- `WORKFLOW_STARTED` - Workflow execution started
- `WORKFLOW_COMPLETED` - Workflow execution completed successfully
- `WORKFLOW_FAILED` - Workflow execution failed
- `WORKFLOW_PAUSED` - Workflow paused
- `WORKFLOW_RESUMED` - Workflow resumed
- `WORKFLOW_CANCELLED` - Workflow cancelled

### Work Item State Transitions

- `STATE_TRANSITION` - Work item state changed
- `ITEM_CREATED` - Work item created
- `ITEM_UPDATED` - Work item updated
- `ITEM_DELETED` - Work item deleted

### Worker Agent Activities

- `WORKER_ASSIGNED` - Worker assigned to task
- `WORKER_STARTED` - Worker started task execution
- `WORKER_COMPLETED` - Worker completed task successfully
- `WORKER_FAILED` - Worker task execution failed
- `WORKER_RETRY` - Worker retrying failed task
- `WORKER_TIMEOUT` - Worker task timed out

### Wave Execution Events

- `WAVE_STARTED` - Execution wave started
- `WAVE_COMPLETED` - Execution wave completed
- `WAVE_FAILED` - Execution wave failed

### Task Execution Events

- `TASK_QUEUED` - Task queued for execution
- `TASK_STARTED` - Task execution started
- `TASK_COMPLETED` - Task execution completed
- `TASK_FAILED` - Task execution failed
- `TASK_BLOCKED` - Task blocked by dependencies
- `TASK_SKIPPED` - Task skipped

### Other Events

- `PROGRESS_UPDATE` - Progress update
- `PROGRESS_MILESTONE` - Progress milestone reached
- `ERROR_OCCURRED` - Error occurred
- `RECOVERY_STARTED` - Recovery started
- `RECOVERY_COMPLETED` - Recovery completed
- `RECOVERY_FAILED` - Recovery failed
- `CUSTOM` - Custom event type

## Usage

### Basic Usage

```javascript
const EventLogger = require('./lib/orchestration/event-logger');
const SessionState = require('./lib/workflow/session-state');

// Create session state for persistence
const sessionState = new SessionState();
await sessionState.initialize();

// Create event logger
const logger = new EventLogger({
  maxEvents: 10000,
  enablePersistence: true,
  sessionState,
  defaultExecutionId: 'exec-123',
  defaultSessionId: 'session-456',
  defaultCorrelationId: 'corr-789',
});

// Log events
await logger.logWorkflowStarted({
  metadata: { totalItems: 10 }
});

await logger.logStateTransition({
  workItemId: 'T0001',
  oldState: 'planned',
  newState: 'in_progress',
  metadata: { assignee: 'worker-1' }
});

await logger.logWorkerStarted({
  workerId: 'worker-1',
  workItemId: 'T0001'
});

await logger.logWorkerCompleted({
  workerId: 'worker-1',
  workItemId: 'T0001',
  duration: 5000
});

await logger.logWorkflowCompleted({
  metadata: { completedItems: 10, failedItems: 0 }
});
```

### Querying Events

```javascript
// Get all events
const allEvents = logger.getEvents();

// Filter by type
const workflowEvents = logger.getEvents({
  type: EventType.WORKFLOW_STARTED
});

// Filter by work item
const itemEvents = logger.getEvents({
  workItemId: 'T0001'
});

// Filter by worker
const workerEvents = logger.getEvents({
  workerId: 'worker-1'
});

// Filter by category
const stateEvents = logger.getEvents({
  category: 'state'
});

// Filter by priority
const criticalEvents = logger.getEvents({
  priority: EventPriority.CRITICAL
});

// Filter by time range
const recentEvents = logger.getEvents({
  startTime: new Date(Date.now() - 3600000).toISOString()
});

// Filter by correlation ID
const correlatedEvents = logger.getEvents({
  correlationId: 'corr-789'
});

// Sort and limit
const latestEvents = logger.getEvents({
  sortBy: 'timestamp',
  sortOrder: 'desc',
  limit: 10
});

// Get event count
const totalCount = logger.getEventCount();
const failureCount = logger.getEventCount({
  category: 'error'
});

// Get statistics
const stats = logger.getStatistics();
// Returns:
// {
//   totalEvents: 100,
//   eventsByType: { 'workflow:started': 1, ... },
//   eventsByCategory: { 'workflow': 5, 'worker': 30, ... },
//   eventsByPriority: { 'high': 10, 'medium': 80, ... }
// }
```

### Event Emission

```javascript
// Listen to all events
logger.on('event', (event) => {
  console.log('Event logged:', event.type, event.message);
});

// Listen to specific event type
logger.on(EventType.WORKER_FAILED, (event) => {
  console.error('Worker failed:', event.workerId, event.error);
});

// Disable event emission if needed
const silentLogger = new EventLogger({
  enableEmit: false
});
```

### Error Handling

```javascript
// Log workflow failure with error details
const error = new Error('Database connection failed');
await logger.logWorkflowFailed({
  error,
  metadata: {
    reason: 'Database unavailable',
    retryAttempt: 3
  }
});

// Log worker failure with error
await logger.logWorkerFailed({
  workerId: 'worker-2',
  workItemId: 'T0002',
  error: new Error('Task timeout'),
  metadata: {
    timeout: 30000,
    lastCheckpoint: 'step-5'
  }
});
```

### Event Correlation

```javascript
// Use correlation ID to trace related events
const correlationId = 'trace-abc123';

await logger.logEvent(EventType.WORKFLOW_STARTED, { correlationId });
await logger.logEvent(EventType.TASK_STARTED, { correlationId });
await logger.logEvent(EventType.TASK_COMPLETED, { correlationId });
await logger.logEvent(EventType.WORKFLOW_COMPLETED, { correlationId });

// Query all related events
const trace = logger.getEvents({ correlationId });
// Returns all events in the trace
```

## Integration with HybridCoordinator

The EventLogger integrates seamlessly with HybridCoordinator for comprehensive execution tracking:

```javascript
const HybridCoordinator = require('./lib/orchestration/hybrid-coordinator');
const EventLogger = require('./lib/orchestration/event-logger');

// Create coordinator with session state enabled
const coordinator = new HybridCoordinator({
  enableSessionState: true,
  sessionId: 'my-session'
});

// Access session state from coordinator
const sessionState = coordinator.sessionState;

// Create event logger using coordinator's session state
const logger = new EventLogger({
  sessionState,
  defaultExecutionId: coordinator.executionId,
  defaultSessionId: sessionState.sessionId
});

// Events are automatically persisted to session state
await logger.logWorkflowStarted();

// Both coordinator and logger write to same session
const events = await sessionState.getEvents();
```

## Performance

### Event Indexing

The EventLogger maintains indexes for fast querying:

- **Type index** - O(1) lookup by event type
- **Correlation index** - O(1) lookup by correlation ID
- **Work item index** - O(1) lookup by work item ID
- **Worker index** - O(1) lookup by worker ID

### Memory Management

```javascript
const logger = new EventLogger({
  maxEvents: 10000  // Automatically removes oldest events
});

// Clear all events manually
logger.clear();
```

### Persistence

Events are persisted to SessionState for durability:

```javascript
// Enable persistence
const logger = new EventLogger({
  enablePersistence: true,
  sessionState
});

// Events are written to .claude/.carl/sessions/{sessionId}/events.log
```

## Testing

The Event Logging Framework includes comprehensive tests:

- **Event Schema and Types** (5 tests)
- **Workflow Lifecycle Event Logging** (4 tests) - T0117
- **Work Item State Transition Logging** (4 tests) - T0118
- **Worker Agent Activity Logging** (4 tests) - T0119
- **Event Storage and Query** (12 tests) - T0120
- **Event Correlation and Tracing** (3 tests)
- **Event Indexing Performance** (3 tests)
- **Event Emission** (3 tests)
- **Error Handling** (2 tests)
- **Integration with SessionState** (2 tests)

**Total: 44 passing tests**

Run tests:
```bash
npm test -- event-logger.test.js
```

## API Reference

### EventLogger Constructor

```javascript
new EventLogger(config)
```

**Config Options:**
- `maxEvents` (number) - Maximum events to keep in memory (default: 10000)
- `enablePersistence` (boolean) - Enable persistence to SessionState (default: true)
- `sessionState` (SessionState) - SessionState instance for persistence
- `enableEmit` (boolean) - Enable event emission via EventEmitter (default: true)
- `defaultCorrelationId` (string) - Default correlation ID for events
- `defaultExecutionId` (string) - Default execution ID for events
- `defaultSessionId` (string) - Default session ID for events

### Methods

#### Logging Methods

- `logEvent(type, data)` - Log a generic event
- `logWorkflowStarted(data)` - Log workflow started event
- `logWorkflowCompleted(data)` - Log workflow completed event
- `logWorkflowFailed(data)` - Log workflow failed event
- `logStateTransition(data)` - Log work item state transition
- `logWorkerAssigned(data)` - Log worker assigned event
- `logWorkerStarted(data)` - Log worker started event
- `logWorkerCompleted(data)` - Log worker completed event
- `logWorkerFailed(data)` - Log worker failed event

#### Query Methods

- `getEvents(options)` - Get events with optional filters
- `getEventCount(options)` - Get event count with optional filters
- `getStatistics()` - Get event statistics
- `clear()` - Clear all events

#### Query Options

- `type` (string) - Filter by event type
- `correlationId` (string) - Filter by correlation ID
- `workItemId` (string) - Filter by work item ID
- `workerId` (string) - Filter by worker ID
- `category` (string) - Filter by category
- `priority` (string) - Filter by priority
- `startTime` (string) - Filter by start time (ISO-8601)
- `endTime` (string) - Filter by end time (ISO-8601)
- `sortBy` (string) - Sort field (currently only 'timestamp')
- `sortOrder` (string) - Sort order ('asc' or 'desc')
- `limit` (number) - Limit number of results

## Best Practices

### 1. Use Correlation IDs

Link related events together for tracing:

```javascript
const correlationId = randomUUID();

await logger.logEvent(EventType.WORKFLOW_STARTED, { correlationId });
// ... all related events use same correlationId
```

### 2. Include Rich Metadata

Add context to events for better debugging:

```javascript
await logger.logWorkerFailed({
  workerId: 'worker-1',
  workItemId: 'T0001',
  error,
  metadata: {
    retryAttempt: 2,
    lastCheckpoint: 'data-validation',
    inputSize: 1024,
    memoryUsage: process.memoryUsage()
  }
});
```

### 3. Use Appropriate Priority Levels

- `CRITICAL` - System failures, data loss
- `HIGH` - Task failures, workflow failures
- `MEDIUM` - State transitions, worker activities (default)
- `LOW` - Progress updates
- `DEBUG` - Detailed debugging information

### 4. Query Efficiently

Use indexes for fast queries:

```javascript
// Good - uses index
logger.getEvents({ type: EventType.WORKER_FAILED });

// Less efficient - filters all events
logger.getEvents().filter(e => e.type === EventType.WORKER_FAILED);
```

### 5. Monitor Event Growth

```javascript
setInterval(() => {
  const stats = logger.getStatistics();
  if (stats.totalEvents > 9000) {
    console.warn('Event log approaching capacity');
  }
}, 60000);
```

## Related Documentation

- [Session State Management](../workflow/README.md)
- [Progress Tracker](./progress-tracker.js)
- [Hybrid Coordinator](./hybrid-coordinator.js)
- [IndyDevDan Orchestration Patterns](../../../../docs/indydevdan/agentic-orchestration-patterns.md)
