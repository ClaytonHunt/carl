---
description: Execute planned work items with async orchestration
allowed-tools: Task, SlashCommand, Read, Write, Bash, Grep, Glob
argument-hint: [work-item-id]
---

# CARL Work Command

Orchestrates the execution of planned work items using async delegation and specialized agents.

## Purpose

This command acts as the **Higher Order Prompt (HOP)** that delegates work execution to the specialized `work-orchestrator` agent. It follows IndyDevDan's async-first orchestration patterns for maximum parallelization.

## Arguments

- `$ARGUMENTS` - Work item ID to execute (e.g., `E1234`, `F5678`, `S9012`)

## Workflow

### 1. Work Item Loading
- Parse the work item ID
- Load the work item from `.cascade/`
- Load all child work items (e.g., Epic → Features → Stories → Tasks)
- Verify the work item is fully planned

### 2. Validation
Check that:
- Work item exists in the Cascade system
- Work item is sufficiently detailed for implementation
- All dependencies are clear
- Parent/child relationships are intact

### 3. Delegation Strategy
Delegate to the `work-orchestrator` agent via the Task tool with:
- The complete work item hierarchy
- Current codebase context
- Instructions to maximize async execution
- Progress tracking requirements

### 4. Agent Invocation

Use the Task tool to invoke the work orchestrator agent:

```
Task(
  subagent_type: "work-orchestrator",
  description: "Execute work item: $ARGUMENTS",
  prompt: "Execute the following work item using async orchestration:

  Work Item ID: $ARGUMENTS

  Please:
  1. Load the work item and all children from .cascade/
  2. Analyze the work breakdown and dependencies
  3. Create an execution plan with parallel and sequential phases
  4. Delegate to specialized agents/commands/skills as needed:
     - Code generation: Use appropriate coding agents
     - Testing: Delegate to test agents
     - File operations: Use Read/Write/Edit tools
     - Search: Use Grep/Glob tools
  5. Execute tasks in optimal order:
     - Parallel execution when tasks are independent
     - Sequential execution when dependencies exist
  6. Track progress and provide real-time updates
  7. Handle errors gracefully with fallbacks
  8. Synthesize results from all delegated work
  9. Update work item status in Cascade system

  Follow IndyDevDan's orchestration principles:
  - 'Do more when possible, wait when needed' - maximize async execution
  - Clean context separation - each delegated agent has its own context
  - Observable by default - stream progress updates
  - Event-driven coordination - use hooks for monitoring
  - Graceful degradation - handle failures independently
  "
)
```

### 5. Progress Monitoring

The work-orchestrator agent will provide real-time updates:
- Tasks started (delegated to agents)
- Tasks in progress
- Tasks completed
- Any errors or blockers

### 6. Result Synthesis

After all work completes:
- Aggregate results from all delegated agents
- Update Cascade work item statuses
- Optionally sync to external systems (ADO, GitHub) via adapters
- Provide summary report to user

## Example Usage

```bash
# Execute an entire epic with all features and stories
/carl:work E1234

# Execute a single feature
/carl:work F5678

# Execute a specific story
/carl:work S9012

# Execute a single task
/carl:work T3456
```

## Execution Patterns

### Epic Execution
When executing an Epic:
1. Load all Features
2. For each Feature, load all Stories
3. For each Story, load all Tasks
4. Identify parallelizable work
5. Execute independent Features in parallel
6. Execute dependent Features sequentially
7. Aggregate all results

### Story Execution
When executing a Story:
1. Load all Tasks
2. Execute independent Tasks in parallel
3. Handle task dependencies
4. Track progress for each Task
5. Report completion

### Task Execution
When executing a Task:
1. Load task details
2. Delegate to appropriate specialized agent/command
3. Monitor completion
4. Update status

## Error Handling

The work-orchestrator will:
- Retry failed operations with backoff
- Provide fallback strategies
- Continue other work when one task fails
- Report all errors clearly
- Maintain partial progress

## Notes

- This command is thin by design - all logic lives in the `work-orchestrator` agent
- The agent maximizes async execution following IndyDevDan's patterns
- Multiple work items CAN be executed concurrently if launched separately
- Progress is tracked and reported in real-time
- The Cascade format is the source of truth; external adapters sync status

## Related

- Agent: `work-orchestrator` - Handles the actual execution logic
- Command: `/carl:plan` - Creates the work items to be executed
- Directory: `.cascade/` - Where all work items are stored
- Adapters: `plugins/carl/lib/adapters/` - External system integration
