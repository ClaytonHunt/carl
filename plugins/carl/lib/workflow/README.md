# Workflow Session State

## Overview

Session state management for CARL workflows following **IndyDevDan's Agentic Orchestration Patterns**:

- **Session-Based Correlation** - Shared session identifiers coordinate agents
- **Event-Sourced Coordination** - Shared event logs enable reactive systems
- **Clean Context Separation** - Share only necessary information

## Purpose

Enable commands, agents, and skills in a workflow to:
1. **Share state** - Pass data between components
2. **Coordinate work** - Track progress and dependencies
3. **Enable observability** - Inspect workflow execution
4. **Support async patterns** - Parallel agents can coordinate

## Directory Structure

```
.claude/.carl/sessions/
└── [session-id]/              # UUID for each workflow session
    ├── state.json             # Current workflow state
    ├── events.log             # Event log (newline-delimited JSON)
    └── artifacts/             # Optional: Generated files
```

**Note**: `.claude/` is gitignored - sessions are transient, not committed.

## Usage

### Basic Example

```javascript
const SessionState = require('./lib/workflow/session-state');

// Create new session
const session = new SessionState();
await session.initialize();

console.log(`Session ID: ${session.sessionId}`);

// Update state
await session.setState({
  input: 'Implement user authentication',
  inputType: 'description',
  breakdown: [...]
});

// Read state
const state = await session.getState();
console.log(state.data.input); // 'Implement user authentication'

// Log events
await session.logEvent('agent_started', { agent: 'planning-orchestrator' });
await session.logEvent('work_items_created', { count: 5 });

// Clean up when done
await session.cleanup();
```

### Resume Existing Session

```javascript
// Pass session ID to child agents
const childSession = await SessionState.resume(parentSessionId);

// Read parent's state
const parentState = await childSession.getState();

// Update state
await childSession.setState({ childResult: 'completed' });
```

### Workflow Metadata

```javascript
// Track workflow progress
await session.setWorkflow({
  name: 'planning',
  step: 'breakdown',
  status: 'in-progress',
  agent: 'planning-orchestrator'
});
```

### Event Log

```javascript
// Log events for observability
await session.logEvent('context_loaded', {
  workItem: 'E0001',
  hasParent: true,
  childCount: 3
});

// Read event history
const events = await session.getEvents();
events.forEach(event => {
  console.log(`${event.timestamp}: ${event.type}`, event);
});
```

### Artifacts Directory

```javascript
// Store generated files
const artifactsDir = await session.ensureArtifactsDir();
await fs.writeFile(
  path.join(artifactsDir, 'breakdown.json'),
  JSON.stringify(breakdown, null, 2)
);
```

## Integration with Planning Orchestrator

### Command Level (carl-plan.md)

```markdown
Initialize session and pass to agent:

```javascript
const SessionState = require('./plugins/carl/lib/workflow/session-state');
const session = new SessionState();
await session.initialize();

// Pass session ID to agent
await Task({
  subagent_type: "carl:planning-orchestrator",
  prompt: `...

  Session ID: ${session.sessionId}
  Use SessionState.resume('${session.sessionId}') to access shared state.
  `
});
```
```

### Agent Level (planning-orchestrator.md)

```markdown
Load session state at the beginning:

```javascript
// Resume session from parent command
const SessionState = require('./plugins/carl/lib/workflow/session-state');
const session = await SessionState.resume(sessionId);

// Initialize workflow state
await session.setWorkflow({
  name: 'planning',
  agent: 'planning-orchestrator',
  status: 'started'
});

// Track state as you work
await session.setState({ input, inputType });
await session.logEvent('context_loaded', { ...context });

// Update as you progress
await session.setState({ breakdown });
await session.logEvent('breakdown_created', { itemCount: breakdown.length });

await session.setState({ result });
await session.logEvent('items_persisted', { created: result.created.length });

// Final workflow update
await session.setWorkflow({ status: 'completed' });
```
```

## State File Format

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "created": "2025-11-12T10:30:00.000Z",
  "updated": "2025-11-12T10:35:23.456Z",
  "workflow": {
    "name": "planning",
    "step": "persist",
    "status": "in-progress",
    "agent": "planning-orchestrator"
  },
  "data": {
    "input": "Implement user authentication",
    "inputType": "description",
    "breakdown": [...],
    "result": {...}
  }
}
```

## Event Log Format

Newline-delimited JSON (NDJSON):

```json
{"timestamp":"2025-11-12T10:30:00.000Z","type":"session_started","sessionId":"..."}
{"timestamp":"2025-11-12T10:30:01.234Z","type":"context_loaded","workItem":"E0001"}
{"timestamp":"2025-11-12T10:31:15.678Z","type":"breakdown_created","itemCount":5}
{"timestamp":"2025-11-12T10:35:23.456Z","type":"items_persisted","created":5}
```

## Cleanup

### Automatic Cleanup

Add to SessionStart hook or scheduled task:

```javascript
const SessionState = require('./plugins/carl/lib/workflow/session-state');

// Clean up sessions older than 7 days
const cleaned = await SessionState.cleanupOldSessions(7);
console.log(`Cleaned ${cleaned} old sessions`);
```

### Manual Cleanup

```bash
# Remove all sessions
rm -rf .claude/.carl/sessions

# Remove specific session
rm -rf .claude/.carl/sessions/[session-id]
```

## Best Practices

### ✅ Do

- **Initialize at command level** - Parent command creates session
- **Resume in agents** - Child agents resume parent's session
- **Log significant events** - Aid debugging and observability
- **Clean up when done** - Or let automatic cleanup handle it
- **Share minimal context** - Only what's needed for coordination
- **Use for async coordination** - Especially useful for parallel agents

### ❌ Don't

- **Store large data** - Keep state lean, use artifacts dir for big files
- **Commit to git** - Sessions are transient (already gitignored)
- **Use for long-term storage** - Use `.cascade/` or database for persistence
- **Pass entire context** - Share only necessary information
- **Rely on sessions persisting forever** - They're cleaned up automatically

## When to Use Session State

**Use session state when:**
- Coordinating between command → agent → sub-agents
- Running parallel agents that need to share results
- Debugging complex workflows (observability)
- Passing context without polluting prompts

**Don't use session state when:**
- Single agent with no coordination needed
- State fits comfortably in prompt (< 1KB)
- Long-term persistence needed (use `.cascade/` or database)

## IndyDevDan Alignment

This implementation follows:

1. **Session-Based Correlation** ✅
   - Each workflow gets unique session ID
   - Agents coordinate via shared session

2. **Event-Sourced Coordination** ✅
   - Event log tracks all workflow actions
   - Enables reactive patterns and debugging

3. **Clean Context Separation** ✅
   - Agents maintain own context
   - Share only via explicit state updates

4. **Observable by Default** ✅
   - Event log provides real-time monitoring
   - State file enables inspection

5. **Async-First Mindset** ✅
   - Parallel agents can coordinate via shared state
   - No blocking required

## Examples

See test file for comprehensive examples:
- `tests/unit/session-state.test.js` (to be created)

## API Reference

### Constructor
- `new SessionState(sessionId?, baseDir?)` - Create or resume session

### Methods
- `initialize()` - Create session directory and state file
- `getState()` - Read current state
- `setState(updates)` - Merge updates into state
- `setWorkflow(workflow)` - Update workflow metadata
- `logEvent(type, data)` - Append to event log
- `getEvents()` - Read event log
- `cleanup()` - Delete session files
- `getArtifactsDir()` - Get artifacts directory path
- `ensureArtifactsDir()` - Create artifacts directory

### Static Methods
- `SessionState.cleanupOldSessions(daysOld, baseDir)` - Clean old sessions
- `SessionState.resume(sessionId, baseDir)` - Resume existing session

## Related

- **IndyDevDan Patterns**: `@docs/indydevdan/agentic-orchestration-patterns.md`
- **Cascade Manager**: `plugins/carl/lib/cascade/cascade-manager.js`
- **Planning Helpers**: `plugins/carl/lib/planning/planning-helpers.js`
