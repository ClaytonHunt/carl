# Work Orchestrator - Quick Start Guide

## What is the Work Orchestrator?

The Work Orchestrator is CARL's autonomous agent for executing planned work items. It takes structured work items from the Planning Orchestrator and executes them intelligently using:

- **Dependency Analysis**: Understands what can run in parallel vs sequential
- **Async Orchestration**: Executes multiple work items simultaneously when possible
- **HOP/LOP Pattern**: Orchestrator coordinates, worker agents execute
- **Error Handling**: Automatically retries, rolls back, and recovers from failures
- **Observable Execution**: Complete tracking and logging of all actions

## Core Capabilities

### 1. Load and Execute Work Items
```bash
# Execute a single work item
/carl:work T0001

# Execute a story (will execute all child tasks)
/carl:work S0001

# Execute a feature (will execute all stories and tasks)
/carl:work F0001

# Execute an entire epic
/carl:work E0001
```

### 2. Parallel Execution
When you execute a work item with independent children, the orchestrator will:
- Analyze dependencies
- Identify independent items
- Execute them in parallel
- Collect and report results

Example: Execute Feature F0001 with 3 independent stories → All 3 execute simultaneously

### 3. Sequential Execution
When work items have dependencies, the orchestrator will:
- Determine execution order
- Execute in sequence
- Pass context between items
- Stop on failure (fail-fast)

Example: Story S0001 depends on S0002 → S0002 executes first, then S0001

### 4. Hybrid Execution
Most real work has both parallel and sequential patterns:
- Execute parallel groups within sequential phases
- Optimize for maximum throughput
- Respect all dependencies

Example: Phase 1 has 2 parallel features, then Phase 2 depends on both completing

## Usage Patterns

### Pattern 1: Plan Then Execute
```bash
# 1. Plan your work
/carl:plan "Implement user authentication"

# Output: Created E0001 with 4 features, 12 stories, 45 tasks

# 2. Execute the work
/carl:work E0001

# Output: Executing in parallel...
#   - F0001: 3 stories in progress
#   - F0002: 2 stories in progress
```

### Pattern 2: Incremental Execution
```bash
# Execute one story at a time for control
/carl:work S0001   # Complete first story
/carl:work S0002   # Then next story
/carl:work S0003   # And so on
```

### Pattern 3: Resume After Interruption
```bash
# If execution is interrupted, simply resume
/carl:work E0001   # Will resume from where it stopped
```

### Pattern 4: Execute with Monitoring
```bash
# Start execution (will log to session)
/carl:work E0001

# Monitor in real-time (separate terminal)
tail -f .claude/.carl/sessions/[session-id]/events.log

# Check current state
cat .claude/.carl/sessions/[session-id]/state.json
```

## How It Works

### Step 1: Load Work Item
- Reads work item from `.cascade/` directory
- Validates structure and required fields
- Loads related items (parent, children, dependencies)

### Step 2: Analyze Dependencies
- Builds dependency graph from hierarchy
- Identifies explicit dependencies (blocks, depends_on)
- Identifies implicit dependencies (parent-child)
- Detects circular dependencies

### Step 3: Determine Execution Strategy
- **Independent items**: Execute in parallel
- **Dependent items**: Execute sequentially
- **Hybrid**: Parallel groups in sequential order

### Step 4: Execute
- Spawn worker agents for parallel execution
- Pass context between sequential items
- Track progress and update state
- Handle errors with retry/rollback

### Step 5: Report Results
- Update Cascade state.json files
- Log all events to session
- Generate execution summary
- Report completion status

## Architecture

```
User Command: /carl:work E0001
    ↓
Command (HOP): carl-work.md
    ├─ Creates session
    ├─ Logs workflow start
    └─ Delegates to agent
         ↓
Work Orchestrator Agent (LOP): work-orchestrator.md
    ├─ Loads work item E0001
    ├─ Analyzes dependencies
    ├─ Determines execution strategy
    └─ Spawns worker agents
         ↓
Work Executor Agents (Workers): work-executor.md
    ├─ Execute individual work items
    ├─ Report results back
    └─ Update state
```

## Configuration

### Execution Settings
Location: `.claude/.carl/carl.settings.json`

```json
{
  "execution": {
    "maxParallelExecutions": 5,
    "retryAttempts": 3,
    "retryBackoff": "exponential",
    "timeoutSeconds": 300,
    "failFast": true,
    "autoRollback": true
  }
}
```

### Parallel Execution Limit
```json
{
  "execution": {
    "maxParallelExecutions": 3  // Max 3 work items at once
  }
}
```

### Retry Policy
```json
{
  "execution": {
    "retryAttempts": 5,              // Try 5 times before giving up
    "retryBackoff": "exponential",   // Wait 2s, 4s, 8s, 16s, 32s
    "retryTransientOnly": true       // Only retry transient failures
  }
}
```

### Timeout Settings
```json
{
  "execution": {
    "timeoutSeconds": 600,     // 10 minutes per work item
    "timeoutAction": "rollback" // What to do on timeout
  }
}
```

## Monitoring and Observability

### Session State
Every execution creates a session in `.claude/.carl/sessions/[session-id]/`

**state.json**: Current execution state
```json
{
  "sessionId": "uuid",
  "workflow": {
    "name": "work-execution",
    "agent": "work-orchestrator",
    "workItemId": "E0001",
    "status": "in_progress",
    "progress": {
      "total": 45,
      "completed": 12,
      "inProgress": 3,
      "failed": 0,
      "blocked": 0
    }
  }
}
```

**events.log**: Complete event history (NDJSON)
```json
{"timestamp":"2025-11-12T10:00:00Z","type":"execution_started","workItemId":"E0001"}
{"timestamp":"2025-11-12T10:00:01Z","type":"dependency_analysis_complete","independent":3,"sequential":2}
{"timestamp":"2025-11-12T10:00:02Z","type":"parallel_execution_started","workItems":["F0001","F0002","F0003"]}
```

### Cascade State Files
Each work item's state is tracked in `.cascade/.../state.json`

```json
{
  "id": "S0001",
  "status": "in_progress",
  "progress": 45,
  "startedAt": "2025-11-12T10:00:00Z",
  "executedBy": "work-orchestrator",
  "children": {
    "T0001": "completed",
    "T0002": "in_progress",
    "T0003": "pending"
  }
}
```

### Real-Time Monitoring
```bash
# Watch session events
tail -f .claude/.carl/sessions/[session-id]/events.log | grep "execution"

# Watch specific work item state
watch -n 1 cat .cascade/E0001-epic-title/state.json

# Monitor parallel executions
grep "parallel_execution" .claude/.carl/sessions/*/events.log
```

## Error Handling

### Automatic Retry
Transient failures are automatically retried:
- Network errors
- Timeout errors
- Resource temporarily unavailable

### Automatic Rollback
On permanent failure, the orchestrator will:
1. Mark work item as failed
2. Rollback any partial changes
3. Update dependent items to blocked
4. Log detailed error information
5. Suggest recovery actions

### Manual Recovery
```bash
# View error details
cat .claude/.carl/sessions/[session-id]/state.json

# Fix the issue, then retry
/carl:work S0001  # Will resume from failure point
```

## Best Practices

### 1. Start Small
```bash
# Don't start with an entire epic
/carl:work E0001  # Could be overwhelming

# Instead, start with one feature
/carl:work F0001  # More manageable
```

### 2. Monitor Progress
```bash
# Keep session state visible during execution
watch -n 2 cat .claude/.carl/sessions/[session-id]/state.json
```

### 3. Use Incremental Execution
```bash
# Execute one story, verify, then next
/carl:work S0001  # Complete and verify
/carl:work S0002  # Then continue
```

### 4. Handle Dependencies Explicitly
```markdown
# In your work item markdown, specify dependencies
---
id: S0002
depends_on: [S0001]
blocks: [S0003]
---
```

### 5. Review Before Large Executions
```bash
# Before executing an entire epic, review the breakdown
/carl:plan E0001  # Shows all work items
# Review the plan
/carl:work E0001  # Execute when ready
```

## Common Scenarios

### Scenario 1: Build a Feature
```bash
# 1. Plan the feature
/carl:plan "Add user profile page"

# 2. Review the breakdown
# Check .cascade/ directory for created work items

# 3. Execute the feature
/carl:work F0001

# 4. Monitor progress
tail -f .claude/.carl/sessions/*/events.log

# 5. Verify completion
cat .cascade/F0001-user-profile/state.json
```

### Scenario 2: Fix a Bug
```bash
# 1. Create bug work item
/carl:plan "Fix login button not responding"

# 2. Execute the bug fix
/carl:work B0001

# 3. Verify fix is applied
# Check state.json and code changes
```

### Scenario 3: Parallel Development
```bash
# 1. Plan multiple features
/carl:plan E0001  # Creates F0001, F0002, F0003

# 2. Execute all in parallel
/carl:work E0001  # Orchestrator runs F0001, F0002, F0003 simultaneously

# 3. Monitor all executions
grep "execution_" .claude/.carl/sessions/[session-id]/events.log
```

### Scenario 4: Sequential Pipeline
```bash
# 1. Create sequential stories with dependencies
# S0001: Design database schema
# S0002: Implement API endpoints (depends on S0001)
# S0003: Create frontend UI (depends on S0002)

# 2. Execute feature
/carl:work F0001  # Orchestrator runs S0001 → S0002 → S0003 in order
```

## Troubleshooting

### Execution Stuck
```bash
# Check session state
cat .claude/.carl/sessions/[session-id]/state.json

# Look for blocked items
grep "blocked" .claude/.carl/sessions/[session-id]/events.log

# Review last error
tail -20 .claude/.carl/sessions/[session-id]/events.log
```

### Dependency Issues
```bash
# Check dependency graph
grep "dependency_analysis" .claude/.carl/sessions/[session-id]/events.log

# Look for circular dependencies
grep "circular_dependency_detected" .claude/.carl/sessions/[session-id]/events.log
```

### Parallel Execution Not Working
```bash
# Check execution strategy
grep "execution_strategy" .claude/.carl/sessions/[session-id]/events.log

# Verify items are truly independent
# Review work item dependencies in .cascade/
```

## Integration with Planning

### Complete Workflow
```bash
# 1. Plan your work
/carl:plan "Build authentication system"
# Creates: E0001 → F0001, F0002, F0003 → S0001-S0010 → T0001-T0045

# 2. Execute your work
/carl:work E0001
# Executes: All work items with intelligent orchestration

# 3. Review results
# Check session state and Cascade files

# 4. Iterate if needed
/carl:plan S0011  # Break down further if needed
/carl:work S0011  # Execute additional work
```

### Feedback Loop
The Work Orchestrator provides feedback to planning:
- Updates complexity estimates based on actuals
- Identifies missing work items during execution
- Suggests refinements for future planning
- Tracks velocity for better estimates

## Key Differences from Planning Orchestrator

| Aspect | Planning Orchestrator | Work Orchestrator |
|--------|---------------------|-------------------|
| **Purpose** | Break down work into items | Execute work items |
| **Input** | Description or existing ID | Work item ID |
| **Output** | Structured work items | Completed work with results |
| **Agent Role** | Analyzes and structures | Coordinates and executes |
| **Parallelism** | Creates items in batch | Executes items in parallel |
| **State** | Creates initial state | Updates state during execution |

## Summary

The Work Orchestrator transforms CARL from a planning tool into a complete autonomous execution system:

- 📋 **Planning Orchestrator**: "What needs to be done?"
- 🚀 **Work Orchestrator**: "Let's do it!"

Together, they provide a seamless plan-and-execute workflow following IndyDevDan's agentic orchestration patterns.

**Status**: 📋 Planned, ready for implementation

**Next Step**: Execute this planning document itself!
```bash
# Once Work Orchestrator is implemented:
/carl:plan "Work Orchestrator - Autonomous Execution Agent"
/carl:work E0001
```

---

For complete technical details, see:
- **Planning Document**: `docs/WORK-ORCHESTRATOR-PLANNING.md`
- **Breakdown**: `docs/WORK-ORCHESTRATOR-BREAKDOWN.md`
- **Architecture**: `docs/PLANNING-ORCHESTRATOR.md` (similar patterns)
- **IndyDevDan Patterns**: `docs/indydevdan/agentic-orchestration-patterns.md`
