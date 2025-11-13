# Planning Orchestrator - Architecture & Implementation

## Overview

The Planning Orchestrator is CARL's system for analyzing work requirements and breaking them down into structured, actionable work items using the Cascade format.

## Design Philosophy

**Agent-First Approach**: Code handles data operations, agent handles reasoning.

Instead of writing 2000+ lines of complex NLP/analysis code, we built:
- **~230 lines** of simple helper functions (data operations)
- **~300 lines** of clear agent instructions (leveraging LLM reasoning)

This is more powerful, maintainable, and flexible than rule-based code.

## Architecture

### Components

```
Commands:
└── carl-plan.md              # HOP: Initializes session, delegates to agent

Agents:
└── planning-orchestrator.md  # LOP: Analyzes, breaks down, creates work items

Libraries:
├── planning/
│   ├── planning-helpers.js   # Data operations (load, create, format)
│   └── README.md             # API documentation
└── workflow/
    ├── session-state.js      # Session state management
    ├── cleanup-sessions.js   # Cleanup utility
    └── README.md             # API documentation

Cascade:
└── cascade-manager.js        # Work item CRUD (144 tests passing)
```

### Key Design Decisions

#### 1. Agent-First vs Code-First

**Question**: Should analysis logic be in code or agent instructions?

**Decision**: Agent instructions with LLM reasoning

**Why**:
- Analyzing vague input ("Add auth" → Epic or Feature?) requires reasoning
- Breaking down work ("Auth system" → what tasks?) requires domain knowledge
- Estimating complexity requires judgment
- NLP in code would require 2000+ lines and still fail
- LLMs excel at natural language understanding
- Much more flexible and maintainable

**What's in Code**: Data operations only (load, save, format)
**What's in Agent**: All reasoning and creativity

#### 2. Session State Management

**Question**: Should workflow state be persisted or in-memory?

**Decision**: Persisted to `.claude/.carl/sessions/[session-id]/`

**Why**:
- Enables coordination between command/agent/future-agents
- Provides observability for debugging
- Supports async/parallel workflows
- Follows IndyDevDan's session-based correlation pattern
- Complete event log for audit trail

**Structure**:
```
.claude/.carl/sessions/
└── [session-id]/
    ├── state.json      # Current workflow state
    ├── events.log      # Event history (NDJSON)
    └── artifacts/      # Optional generated files
```

#### 3. Smart Hybrid Breakdown

**Question**: How deep should initial breakdown go?

**Decision**: Depth based on input detail level

**Why**:
- **High detail** input → Create multiple levels (efficient)
- **Vague** input → Create top level only, suggest refinement (safe)
- **Existing** item → Break down one level (focused)
- Allows flexibility without overwhelming user

#### 4. Ask Only When Ambiguous

**Question**: When should agent ask clarifying questions?

**Decision**: Only when truly unclear

**Why**:
- Default: Make intelligent assumptions, move fast
- Ask: Only when ambiguous or critical info missing
- User can always edit after creation
- Reduces friction in workflow

## Workflow

### Command Level (HOP)

```javascript
// 1. Create session
const session = new SessionState();
await session.initialize();

// 2. Log workflow start
await session.logEvent('workflow_started', { command: 'carl:plan', input });

// 3. Delegate to agent with session ID
await Task({
  subagent_type: "carl:planning-orchestrator",
  prompt: `Session ID: ${session.sessionId} ...`
});

// 4. Log workflow completion
await session.logEvent('workflow_completed');
```

### Agent Level (LOP)

```javascript
// 1. Resume session
const session = await SessionState.resume(sessionId);
await session.setWorkflow({ name: 'planning', agent: 'planning-orchestrator' });

// 2. Load context
const context = await loadContext(input);
await session.setState({ input, inputType, context });
await session.logEvent('context_loaded');

// 3. Create breakdown (agent reasoning)
const breakdown = [ /* agent creates structure */ ];
await session.setState({ breakdown });
await session.logEvent('breakdown_created', { itemCount });

// 4. Persist work items
const result = await createWorkItems(breakdown);
await session.setState({ result, formatted });
await session.logEvent('items_persisted', { created });

// 5. Present results
// Display formatted output to user
await session.setWorkflow({ status: 'completed' });
await session.logEvent('workflow_completed');
```

## Cascade Work Item Hierarchy

```
P#### - Project (top level)
  └── E#### - Epic
      └── F#### - Feature
          ├── S#### - Story
          └── B#### - Bug
              └── PH#### - Phase
                  └── T#### - Task (leaf)
```

**Note**: Projects are the only top-level items. Epics must have Project parents.

## Testing

### Helper Functions
- **File**: `tests/unit/planning-helpers.test.js`
- **Tests**: 19 (all passing)
- **Coverage**: loadContext, createWorkItems, isWorkItemId, formatResult, parseWorkItemId

### Session State
- **File**: `tests/unit/session-state.test.js`
- **Tests**: 35 (all passing)
- **Coverage**: Complete SessionState class, integration scenarios

### Cascade Manager
- **File**: Multiple test files
- **Tests**: 144 (all passing)
- **Coverage**: Full CRUD, state management, hierarchy navigation

**Total**: 198 passing tests ✅

## IndyDevDan Alignment

### HOP/LOP Pattern
- ✅ Command (HOP) delegates to agent (LOP)
- ✅ Clean separation of concerns
- ✅ Thin coordinator, thick implementation

### Session-Based Correlation
- ✅ Shared session ID coordinates workflow
- ✅ State persisted across boundaries
- ✅ Observable by default

### Event-Sourced Coordination
- ✅ Complete event log for audit trail
- ✅ Enables reactive patterns
- ✅ Real-time monitoring capability

### Planning Over Prompting
- ✅ "Success is Planned" - Detailed breakdowns
- ✅ Atomic tasks with clear boundaries
- ✅ Composable, reusable work items

### Async-First Mindset
- ✅ Session state enables parallel coordination
- ✅ Independent agents can share state
- ✅ Ready for "do more when possible, wait when needed"

## Usage

### Basic Usage

```bash
# Plan new work from description
/carl:plan "Implement user authentication with OAuth and JWT"

# Break down existing Epic
/carl:plan E0001

# Break down existing Feature
/carl:plan F0005
```

### Expected Behavior

1. Session created in `.claude/.carl/sessions/[uuid]/`
2. Agent analyzes input and creates breakdown
3. Work items persisted to `.cascade/`
4. Session files contain complete state and event log
5. User sees formatted summary of created items

### Inspect Session

```bash
# View state
cat .claude/.carl/sessions/[id]/state.json

# View events
cat .claude/.carl/sessions/[id]/events.log

# Clean up old sessions
node plugins/carl/lib/workflow/cleanup-sessions.js
```

## API Reference

### Planning Helpers

```javascript
const { loadContext, createWorkItems, isWorkItemId, formatResult } =
  require('./plugins/carl/lib/planning/planning-helpers');

// Load context
const context = await loadContext(id);  // or loadContext(null)

// Create work items
const result = await createWorkItems(breakdown, '.cascade');

// Check if string is work item ID
const isId = isWorkItemId('E0001');  // true

// Format results for display
const formatted = formatResult(result.created);
```

### Session State

```javascript
const SessionState = require('./plugins/carl/lib/workflow/session-state');

// Create new session
const session = new SessionState();
await session.initialize();

// Update state
await session.setState({ key: 'value' });

// Update workflow metadata
await session.setWorkflow({ step: 'breakdown' });

// Log events
await session.logEvent('event_type', { data });

// Resume existing session
const resumed = await SessionState.resume(sessionId);
```

See library READMEs for full API documentation.

## Future Enhancements

### Short Term
1. Manual testing and refinement
2. Error recovery patterns
3. Progress indicators

### Medium Term
1. Work Orchestrator (execution counterpart)
2. External adapter implementations (ADO, GitHub, Jira)
3. Session UI for monitoring

### Long Term
1. Historical data for better estimates
2. Team velocity tracking
3. ML-based complexity estimation
4. Dependency graph visualization

## Related Documentation

- **Planning Helpers API**: `plugins/carl/lib/planning/README.md`
- **Session State API**: `plugins/carl/lib/workflow/README.md`
- **Workflow State Decision**: `docs/WORKFLOW-STATE-DECISION.md`
- **IndyDevDan Patterns**: `docs/indydevdan/agentic-orchestration-patterns.md`
- **Cascade Manager**: `plugins/carl/lib/cascade/cascade-manager.js`

## Summary

The Planning Orchestrator demonstrates that **simple code + smart instructions** is more powerful than complex code trying to simulate intelligence.

**Key Metrics**:
- ~500 lines of simple, maintainable code
- 198 passing tests
- Complete observability via session state
- Follows IndyDevDan's patterns exactly

**Status**: ✅ Implemented, tested, documented, ready for use
