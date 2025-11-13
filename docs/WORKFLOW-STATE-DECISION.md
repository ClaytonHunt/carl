# Workflow State Management - Architecture Decision

## Question

Should CARL persist workflow state to files that can be shared across commands, agents, and skills?

## Answer

**Yes** - Using session-based state management following IndyDevDan's patterns.

## Rationale

### Benefits

1. **Coordination** - Commands, agents, and skills can share state
2. **Observability** - Inspect workflow execution in real-time
3. **Async Support** - Parallel agents can coordinate via shared state
4. **Debugging** - Event logs provide execution history
5. **Clean Separation** - Agents maintain own context, share minimally

### IndyDevDan Alignment

Directly implements three of his patterns:

1. **Session-Based Correlation** - Shared session identifiers coordinate agents
2. **Event-Sourced Coordination** - Event logs enable reactive systems
3. **Clean Context Separation** - Share only necessary information

## Implementation

### Location

```
.claude/.carl/sessions/
└── [session-id]/              # UUID per workflow
    ├── state.json             # Current state
    ├── events.log             # Event history (NDJSON)
    └── artifacts/             # Optional files
```

**Why this location:**
- Under `.claude/.carl/` - Alongside settings
- Already gitignored - Won't pollute repo
- Session-isolated - Each workflow independent
- Discoverable - Agents can find via session ID

### State File Structure

```json
{
  "sessionId": "uuid",
  "created": "timestamp",
  "updated": "timestamp",
  "workflow": {
    "name": "planning",
    "step": "current-step",
    "status": "in-progress",
    "agent": "agent-name"
  },
  "data": {
    // Agent-specific state
    "input": "...",
    "breakdown": [...],
    "result": {...}
  }
}
```

### Event Log Format

Newline-delimited JSON (NDJSON):

```json
{"timestamp":"...","type":"context_loaded","sessionId":"...","workItem":"E0001"}
{"timestamp":"...","type":"breakdown_created","itemCount":5}
{"timestamp":"...","type":"items_persisted","created":5}
```

## Usage Pattern

### 1. Command Level (HOP)

```javascript
// Create session
const session = new SessionState();
await session.initialize();

// Pass to agent
await Task({
  subagent_type: "carl:planning-orchestrator",
  prompt: `
    Session ID: ${session.sessionId}
    Use SessionState.resume('${session.sessionId}')
  `
});
```

### 2. Agent Level (LOP)

```javascript
// Resume parent's session
const session = await SessionState.resume(sessionId);

// Track workflow state
await session.setState({ input, inputType });
await session.logEvent('context_loaded', { workItem });

// Update as you progress
await session.setState({ breakdown });
await session.setState({ result });
```

### 3. Parallel Agents

```javascript
// Agent A
await session.setState({ resultA: 'data' });

// Agent B (running in parallel)
const state = await session.getState();
const resultA = state.data.resultA; // Access Agent A's result
```

## When to Use

**Use session state when:**
- ✅ Coordinating multiple agents
- ✅ Running parallel workflows
- ✅ Debugging complex orchestration
- ✅ Need observability

**Don't use when:**
- ❌ Single agent, no coordination
- ❌ State fits in prompt (< 1KB)
- ❌ Long-term persistence needed (use `.cascade/` instead)

## Cleanup

**Automatic**: Clean sessions older than 7 days
**Manual**: `rm -rf .claude/.carl/sessions`

Sessions are transient - they're for coordination during workflow execution, not long-term storage.

## Files Created

1. **`plugins/carl/lib/workflow/session-state.js`** (~280 lines)
   - SessionState class
   - CRUD operations for state
   - Event logging
   - Cleanup utilities

2. **`plugins/carl/lib/workflow/README.md`**
   - Comprehensive usage documentation
   - Examples and best practices
   - API reference

3. **`.gitignore`** (already configured)
   - `.claude/` already ignored
   - Sessions won't be committed

## Testing

TODO: Create `tests/unit/session-state.test.js` with:
- Session creation/initialization
- State CRUD operations
- Event logging
- Session resume
- Cleanup operations

## Next Steps

1. ✅ Implement SessionState class
2. ✅ Document usage
3. ⏳ Update planning-orchestrator to use sessions
4. ⏳ Update carl-plan command to initialize sessions
5. ⏳ Create tests
6. ⏳ Add cleanup to SessionStart hook

## Alternative Considered: In-Memory Only

**Pros**: Simple, no file I/O
**Cons**: Can't coordinate across agents, no observability, lost on error

**Decision**: Persisted state is worth the small overhead for the benefits.

## Alternative Considered: TodoWrite Metadata

**Pros**: Already visible in UI
**Cons**: Mixes user-facing tasks with internal state, awkward API

**Decision**: Dedicated session state is cleaner separation of concerns.

## Conclusion

Session-based state management provides:
- Clean coordination between workflow components
- Observability for debugging
- Alignment with IndyDevDan's patterns
- Minimal overhead (~280 lines of simple code)

**Status**: ✅ Implemented, ready to integrate into planning orchestrator.
