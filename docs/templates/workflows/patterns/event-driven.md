# Event-Driven Pattern

Coordinate agents through asynchronous events using hooks, webhooks, and external orchestration.

## Overview

**Event-Driven** is the most advanced orchestration pattern, enabling loose coupling, external coordination, and true asynchronous workflows. Instead of direct agent-to-agent communication, agents publish events that other systems react to.

IndyDevDan's insight: *"The shift to parallel agents resembles the transition from a synchronous for-loop to an asynchronous, event-driven architecture."*

## Pattern Architecture

```
Agent A executes
    ↓ publishes event
PostToolUse Hook
    ↓ HTTP POST
Webhook Server
    ↓ stores + broadcasts
Event Stream (SQLite + WebSocket)
    ↓ consumes
External Orchestrator
    ↓ decides next action
    ├─ Spawn Agent B
    ├─ Trigger external system
    └─ Update dashboard
```

## Key Characteristics

- **Loose Coupling**: Agents don't know about each other
- **Asynchronous**: Events published without blocking
- **External Coordination**: Orchestration outside Claude
- **Observable**: Real-time visibility into all agent activity
- **Reactive**: Systems respond to events automatically
- **Session-Based**: Correlation through session IDs
- **Event Sourcing**: Complete audit trail

## When to Use Event-Driven

### ✅ Use When:
- Need external system coordination
- Real-time monitoring required
- Multiple independent systems involved
- Complex async workflows
- Building autonomous systems
- Need complete observability
- Integration with CI/CD, monitoring, notifications
- Long-running workflows (>10 minutes)
- Implementing IndyDevDan's full patterns

### ❌ Don't Use When:
- Simple workflows (use HOP/LOP or Sequential)
- No external integration needed
- Synchronous execution sufficient
- Quick one-off tasks
- Team lacks infrastructure capability
- Over-engineering simple problems

## Event Types

### 1. SessionStart
**When**: Claude Code session begins

**Use cases**:
- Initialize workflow context
- Load configuration
- Set up monitoring
- Notify external systems of start

### 2. PreToolUse
**When**: Before tool executes

**Use cases**:
- Validate tool parameters
- Log tool invocation intent
- Check permissions
- Modify tool input

### 3. PostToolUse
**When**: After tool completes

**Use cases**:
- Track tool execution
- React to file changes
- Trigger downstream actions
- Validate tool output

### 4. SubagentStop
**When**: SubAgent completes task

**Use cases**:
- Track agent completion
- Coordinate next agent
- Aggregate results
- Update progress

### 5. Stop
**When**: Main agent finishes

**Use cases**:
- Workflow completion
- Final reporting
- Cleanup actions
- Success notification

### 6. SessionEnd
**When**: Session terminates

**Use cases**:
- Cleanup resources
- Save state
- Final audit logging
- Notification

### 7. Notification
**When**: Claude sends notification

**Use cases**:
- User alerts
- External notifications
- Monitoring updates

## Implementation Pattern: IndyDevDan's Architecture

### Component Overview

```
Claude Code Agents
    ↓ (hooks publish events)
Hook Scripts (.claude/settings.json)
    ↓ (HTTP POST)
Webhook Server (Node.js/Python)
    ↓ (store + broadcast)
SQLite Database + WebSocket
    ↓ (consume events)
External Orchestrator (watches events)
    ↓ (coordinates)
Spawn new Claude agents, trigger systems
```

### Component 1: Hook Configuration

**File**: `.claude/settings.json`

```json
{
  "hooks": {
    "SubagentStop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/publish-event.js\"",
            "timeout": 10
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/publish-event.js\"",
            "timeout": 10
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/publish-event.js\"",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

### Component 2: Event Publisher Script

**File**: `.claude/hooks/publish-event.js`

```javascript
#!/usr/bin/env node
const https = require('https');
const fs = require('fs');

// Read hook input from stdin
let inputData = '';
process.stdin.on('data', chunk => inputData += chunk);

process.stdin.on('end', () => {
  try {
    const hookData = JSON.parse(inputData);

    // Add timestamp and additional metadata
    const event = {
      ...hookData,
      timestamp: new Date().toISOString(),
      project: process.env.CLAUDE_PROJECT_DIR,
    };

    // Post to webhook server
    const data = JSON.stringify(event);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/webhook/claude-event',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    };

    const req = https.request(options, (res) => {
      let response = '';
      res.on('data', chunk => response += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`Event published: ${hookData.hook_event_name}`);
          process.exit(0);
        } else {
          console.error(`Failed to publish: ${res.statusCode}`);
          process.exit(1);
        }
      });
    });

    req.on('error', (error) => {
      console.error(`Error publishing event: ${error.message}`);
      process.exit(1);
    });

    req.write(data);
    req.end();

  } catch (error) {
    console.error(`Failed to parse hook input: ${error.message}`);
    process.exit(1);
  }
});
```

### Component 3: Webhook Server

**File**: `webhook-server/server.js`

```javascript
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const WebSocket = require('ws');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Initialize SQLite database
const db = new sqlite3.Database('./events.db');

db.run(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    timestamp TEXT,
    event_type TEXT,
    event_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// WebSocket server for real-time updates
const wss = new WebSocket.Server({ port: 3001 });

app.use(bodyParser.json());

// Webhook endpoint
app.post('/webhook/claude-event', (req, res) => {
  const event = req.body;

  // Store event
  db.run(
    'INSERT INTO events (session_id, timestamp, event_type, event_data) VALUES (?, ?, ?, ?)',
    [
      event.session_id,
      event.timestamp,
      event.hook_event_name,
      JSON.stringify(event)
    ],
    (err) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to store event' });
      }

      // Broadcast to WebSocket clients
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'event',
            data: event
          }));
        }
      });

      console.log(`Event stored: ${event.hook_event_name} [${event.session_id}]`);
      res.json({ success: true });
    }
  );
});

// API endpoint to query events
app.get('/api/events/:sessionId', (req, res) => {
  db.all(
    'SELECT * FROM events WHERE session_id = ? ORDER BY created_at DESC',
    [req.params.sessionId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Query failed' });
      }
      res.json(rows);
    }
  );
});

app.listen(PORT, () => {
  console.log(`Webhook server listening on port ${PORT}`);
  console.log(`WebSocket server listening on port 3001`);
});
```

### Component 4: External Orchestrator

**File**: `orchestrator/coordinator.js`

```javascript
const WebSocket = require('ws');
const { spawn } = require('child_process');

class WorkflowOrchestrator {
  constructor() {
    this.sessions = new Map();
    this.connectToEventStream();
  }

  connectToEventStream() {
    const ws = new WebSocket('ws://localhost:3001');

    ws.on('message', (data) => {
      const message = JSON.parse(data);
      if (message.type === 'event') {
        this.handleEvent(message.data);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  handleEvent(event) {
    const sessionId = event.session_id;

    // Get or create session state
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        startTime: Date.now(),
        completedAgents: [],
        pendingActions: []
      });
    }

    const session = this.sessions.get(sessionId);

    // Route based on event type
    switch (event.hook_event_name) {
      case 'SessionStart':
        this.handleSessionStart(sessionId, event);
        break;

      case 'SubagentStop':
        this.handleSubagentStop(sessionId, event, session);
        break;

      case 'PostToolUse':
        this.handlePostToolUse(sessionId, event, session);
        break;

      case 'Stop':
        this.handleWorkflowComplete(sessionId, event, session);
        break;
    }
  }

  handleSessionStart(sessionId, event) {
    console.log(`[${sessionId}] Workflow started`);
    // Initialize monitoring, logging, etc.
  }

  handleSubagentStop(sessionId, event, session) {
    console.log(`[${sessionId}] Agent completed`);

    // Track completion
    session.completedAgents.push({
      timestamp: event.timestamp,
      event: event
    });

    // Example: Trigger next agent based on completion
    if (this.shouldTriggerNextAgent(session)) {
      this.spawnNextAgent(sessionId);
    }
  }

  handlePostToolUse(sessionId, event, session) {
    // React to tool usage (e.g., file changes)
    if (event.tool_name === 'Write' || event.tool_name === 'Edit') {
      console.log(`[${sessionId}] Code changed, triggering tests`);
      // Could trigger test suite here
    }
  }

  handleWorkflowComplete(sessionId, event, session) {
    console.log(`[${sessionId}] Workflow complete`);

    // Generate report
    const duration = Date.now() - session.startTime;
    console.log(`Duration: ${duration}ms`);
    console.log(`Agents completed: ${session.completedAgents.length}`);

    // Cleanup
    this.sessions.delete(sessionId);
  }

  shouldTriggerNextAgent(session) {
    // Implement your coordination logic
    // Example: trigger next agent after 3 agents complete
    return session.completedAgents.length % 3 === 0;
  }

  spawnNextAgent(sessionId) {
    console.log(`[${sessionId}] Spawning next agent`);

    // Spawn new Claude instance (via CLI or API)
    // This is simplified - real implementation would use Claude API
    const claudeProcess = spawn('claude', [
      '--agent', 'next-phase-agent',
      '--session', sessionId
    ]);

    claudeProcess.stdout.on('data', (data) => {
      console.log(`Agent output: ${data}`);
    });
  }
}

// Start orchestrator
const orchestrator = new WorkflowOrchestrator();
console.log('Workflow orchestrator running...');
```

## Complete Example: CI/CD Pipeline

### Workflow Overview

```
Code Change (Write/Edit)
    ↓ PostToolUse event
Test Orchestrator detects change
    ↓ spawns
Test Runner Agent
    ↓ SubagentStop event
Build Orchestrator detects test completion
    ↓ spawns
Build Agent
    ↓ SubagentStop event
Deploy Orchestrator detects build completion
    ↓ spawns
Deploy Agent
    ↓ SubagentStop event
Notification System sends completion
```

### Implementation

**Hook Configuration**:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "node publish-event.js"
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node publish-event.js"
          }
        ]
      }
    ]
  }
}
```

**Orchestrator Logic**:
```javascript
class CICDOrchestrator extends WorkflowOrchestrator {
  handlePostToolUse(sessionId, event, session) {
    if (event.tool_name === 'Write' || event.tool_name === 'Edit') {
      // Code changed, trigger tests
      this.spawnAgent(sessionId, 'test-runner', 'Run test suite');
      session.phase = 'testing';
    }
  }

  handleSubagentStop(sessionId, event, session) {
    if (session.phase === 'testing') {
      // Tests complete, trigger build
      this.spawnAgent(sessionId, 'build-agent', 'Build artifacts');
      session.phase = 'building';
    }
    else if (session.phase === 'building') {
      // Build complete, trigger deploy
      this.spawnAgent(sessionId, 'deploy-agent', 'Deploy to staging');
      session.phase = 'deploying';
    }
    else if (session.phase === 'deploying') {
      // Deploy complete, send notification
      this.sendNotification(sessionId, 'Deployment complete!');
      session.phase = 'complete';
    }
  }
}
```

## Advanced Patterns

### Pattern A: State Machine

Orchestrator maintains state machine:

```javascript
const stateMachine = {
  'initial': {
    on: { 'code_change': 'testing' }
  },
  'testing': {
    on: {
      'tests_pass': 'building',
      'tests_fail': 'failed'
    }
  },
  'building': {
    on: {
      'build_success': 'deploying',
      'build_fail': 'failed'
    }
  },
  'deploying': {
    on: {
      'deploy_success': 'complete',
      'deploy_fail': 'rollback'
    }
  },
  'rollback': {
    on: { 'rollback_complete': 'failed' }
  },
  'failed': { terminal: true },
  'complete': { terminal: true }
};
```

### Pattern B: Complex Event Processing

React to event combinations:

```javascript
class EventProcessor {
  processEvents(events) {
    // Wait for multiple events before acting
    const securityDone = events.find(e =>
      e.type === 'SubagentStop' &&
      e.agentName === 'security-analyzer'
    );
    const perfDone = events.find(e =>
      e.type === 'SubagentStop' &&
      e.agentName === 'performance-analyzer'
    );

    if (securityDone && perfDone) {
      // Both complete, trigger next phase
      this.triggerAggregation();
    }
  }
}
```

### Pattern C: Fan-Out/Fan-In

Coordinate parallel agents via events:

```javascript
handleFanOut(sessionId) {
  // Spawn multiple agents
  this.spawnAgent(sessionId, 'agent-a', 'Task A');
  this.spawnAgent(sessionId, 'agent-b', 'Task B');
  this.spawnAgent(sessionId, 'agent-c', 'Task C');

  this.sessions.get(sessionId).expectedAgents = 3;
  this.sessions.get(sessionId).completedCount = 0;
}

handleAgentComplete(sessionId, session) {
  session.completedCount++;

  if (session.completedCount === session.expectedAgents) {
    // All agents complete, fan-in
    this.spawnAgent(sessionId, 'aggregator', 'Combine results');
  }
}
```

### Pattern D: Event Replay

Rebuild state from event log:

```javascript
class StateReconstructor {
  async reconstructSession(sessionId) {
    const events = await this.getEvents(sessionId);
    const state = { agents: [], tools: [], phase: 'initial' };

    for (const event of events) {
      this.applyEvent(state, event);
    }

    return state;
  }

  applyEvent(state, event) {
    switch (event.type) {
      case 'SubagentStop':
        state.agents.push(event.agentName);
        break;
      case 'PostToolUse':
        state.tools.push(event.toolName);
        break;
      // ... more event handlers
    }
  }
}
```

## Benefits of Event-Driven

### Loose Coupling
Agents don't know about each other, reducing dependencies.

### Scalability
Add new event consumers without changing agents.

### Observability
Complete visibility into all agent activities.

### External Integration
Easy integration with monitoring, notifications, CI/CD.

### Async Coordination
True asynchronous workflows without blocking.

### Audit Trail
Complete event log for debugging and compliance.

### Flexibility
Change orchestration logic without changing agents.

## Challenges and Solutions

### Challenge 1: Infrastructure Complexity
**Problem**: Requires webhook server, database, orchestrator

**Solutions**:
- Start simple: File-based event log
- Use managed services: Webhook.site for testing
- Containerize: Docker Compose for easy setup
- Cloud functions: Serverless webhook handlers

### Challenge 2: Event Ordering
**Problem**: Events may arrive out of order

**Solutions**:
- Timestamp all events
- Use sequence numbers
- Implement event buffering
- Handle out-of-order events gracefully

### Challenge 3: Failure Handling
**Problem**: Webhook server might be down

**Solutions**:
- Retry logic with exponential backoff
- Fallback to file-based logging
- Queue events for later processing
- Alert on hook failures

### Challenge 4: Session Correlation
**Problem**: Multiple sessions need correlation

**Solutions**:
- Use consistent session IDs
- Include correlation IDs in events
- Session metadata in database
- Cleanup old sessions

## Testing Event-Driven Workflows

### Test Strategy

1. **Unit Tests**: Test event handlers individually
2. **Integration Tests**: Test webhook → database → websocket flow
3. **End-to-End Tests**: Test complete workflow with real agents
4. **Failure Tests**: Test error handling and recovery
5. **Performance Tests**: Verify event throughput

### Testing Tools

```javascript
// Mock webhook server for testing
class MockWebhookServer {
  constructor() {
    this.events = [];
  }

  receiveEvent(event) {
    this.events.push(event);
  }

  getEvents(sessionId) {
    return this.events.filter(e => e.session_id === sessionId);
  }

  reset() {
    this.events = [];
  }
}

// Test example
describe('Event-Driven Workflow', () => {
  it('should trigger next agent after SubagentStop', async () => {
    const mock = new MockWebhookServer();
    const orchestrator = new Orchestrator(mock);

    // Simulate event
    mock.receiveEvent({
      hook_event_name: 'SubagentStop',
      session_id: 'test-123',
      timestamp: new Date().toISOString()
    });

    // Verify next agent spawned
    expect(orchestrator.spawnedAgents).toContain('next-phase-agent');
  });
});
```

## Monitoring and Observability

### Dashboards

Build real-time dashboards consuming event stream:

```javascript
// React dashboard example
function WorkflowDashboard() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001');

    ws.onmessage = (msg) => {
      const event = JSON.parse(msg.data);
      setEvents(prev => [...prev, event.data]);
    };

    return () => ws.close();
  }, []);

  return (
    <div>
      <h1>Active Sessions</h1>
      {events.map(event => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
```

### Metrics

Track key metrics:

```javascript
class MetricsCollector {
  trackAgentDuration(agentName, duration) {
    // Track how long agents take
  }

  trackWorkflowSuccess(sessionId) {
    // Track success rate
  }

  trackEventThroughput() {
    // Events per second
  }
}
```

### Alerting

Send alerts on important events:

```javascript
class AlertManager {
  handleEvent(event) {
    if (event.hook_event_name === 'SubagentStop') {
      // Check for failure indicators
      if (event.error) {
        this.sendAlert({
          severity: 'high',
          message: `Agent failed: ${event.agentName}`,
          sessionId: event.session_id
        });
      }
    }
  }

  sendAlert(alert) {
    // Send to Slack, PagerDuty, email, etc.
  }
}
```

## Best Practices

### ✅ Do
- Use consistent event schemas
- Include comprehensive metadata in events
- Implement event versioning
- Log all events persistently
- Handle events idempotently
- Monitor event processing lag
- Test webhook reliability
- Document event flows
- Implement retry logic
- Use correlation IDs

### ❌ Don't
- Couple agents to orchestrator
- Block hook execution
- Skip event persistence
- Ignore out-of-order events
- Hard-code webhook URLs
- Skip error handling
- Forget to clean up old sessions
- Over-complicate simple workflows
- Ignore security (authenticate webhooks)
- Skip monitoring and alerting

## Security Considerations

### Webhook Authentication

```javascript
const crypto = require('crypto');

function verifyWebhook(req, secret) {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

### Event Sanitization

```javascript
function sanitizeEvent(event) {
  // Remove sensitive data
  const sanitized = { ...event };
  delete sanitized.api_keys;
  delete sanitized.passwords;
  delete sanitized.secrets;
  return sanitized;
}
```

## Migration Path

### From Sequential to Event-Driven

**Phase 1**: Add event publishing to existing workflow
```javascript
// Keep existing workflow, add hooks
```

**Phase 2**: Build event consumer
```javascript
// Read events, log to console
```

**Phase 3**: Add coordination logic
```javascript
// Start making decisions based on events
```

**Phase 4**: Move orchestration external
```javascript
// Full external orchestration
```

## Integration with Other Patterns

### Event-Driven + HOP/LOP
HOP spawns LOPs, all publish events for external coordination.

### Event-Driven + Parallel
Parallel agents publish completion events, orchestrator coordinates.

### Event-Driven + Sequential
Sequential phases publish events, external system tracks progress.

## Real-World Examples

### Example 1: GitHub Actions Integration

```javascript
class GitHubIntegration {
  handleEvent(event) {
    if (event.hook_event_name === 'Stop') {
      // Workflow complete, update PR status
      this.updatePRStatus(event.session_id, 'success');
    }
  }

  async updatePRStatus(sessionId, status) {
    await octokit.repos.createCommitStatus({
      owner: 'user',
      repo: 'repo',
      sha: sessionId,
      state: status,
      description: 'Claude workflow complete'
    });
  }
}
```

### Example 2: Slack Notifications

```javascript
class SlackNotifier {
  handleEvent(event) {
    if (event.hook_event_name === 'SubagentStop') {
      this.sendSlackMessage({
        channel: '#deployments',
        text: `Agent ${event.agentName} completed`,
        attachments: [{
          color: 'good',
          fields: [
            { title: 'Session', value: event.session_id },
            { title: 'Duration', value: this.calculateDuration(event) }
          ]
        }]
      });
    }
  }
}
```

### Example 3: Metrics to DataDog

```javascript
class DataDogReporter {
  handleEvent(event) {
    const metric = {
      metric: 'claude.agent.completion',
      points: [[Date.now(), 1]],
      tags: [
        `agent:${event.agentName}`,
        `session:${event.session_id}`
      ]
    };

    this.sendToDataDog(metric);
  }
}
```

## Troubleshooting

### Events Not Publishing
- Check hook configuration syntax
- Verify script is executable
- Check webhook server is running
- Verify network connectivity
- Check script permissions

### Out-of-Order Events
- Implement event buffering
- Use timestamps for ordering
- Handle events idempotently
- Add sequence numbers

### High Event Lag
- Check database performance
- Optimize event processing
- Add event batching
- Scale webhook server

### Session Correlation Issues
- Verify session ID propagation
- Check event metadata
- Validate database queries
- Clean up old sessions

## Additional Resources

- **IndyDevDan's Patterns**: `@docs/indydevdan/agentic-orchestration-patterns.md`
- **Hooks Documentation**: `@docs/claude-code/hooks.md`
- **HOP/LOP Pattern**: `@.claude/.carl/templates/workflows/patterns/hop-lop.md`
- **Parallel Pattern**: `@.claude/.carl/templates/workflows/patterns/parallel-execution.md`
- **Agent Templates**: `@.claude/.carl/templates/agents/`
- **Webhook Example**: GitHub repo: `disler/claude-code-hooks-multi-agent-observability`

---

**Getting Started**:
1. Set up basic webhook server
2. Configure hooks for SubagentStop
3. Test event publishing
4. Build simple orchestrator
5. Add monitoring dashboard
6. Expand to full workflow
