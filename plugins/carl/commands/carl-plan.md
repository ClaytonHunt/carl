---
description: Plan and break down work items using structured Cascade format
allowed-tools: Task, Read, Write, Grep, Glob
argument-hint: [work-item-id-or-description]
---

# CARL Planning Command

Orchestrates the planning and breakdown of work items into structured Cascade format.

## Purpose

This command acts as the **Higher Order Prompt (HOP)** that delegates planning work to the specialized `planning-orchestrator` agent. It follows IndyDevDan's orchestration patterns for clean separation of concerns.

## Arguments

- `$ARGUMENTS` - Either a work item ID (e.g., `E1234`) or a description for a new work item

## Workflow

### 1. Context Gathering
Analyze the input to determine:
- Is this an existing work item ID or a new item description?
- What level is this work item? (Project/Epic/Feature/Story/Task)
- What context is needed from the Cascade system?

### 2. Delegation Strategy
Delegate to the `planning-orchestrator` agent via the Task tool with:
- The work item ID or description
- Current Cascade registry state
- Any relevant parent/child work item context
- Instructions to use IndyDevDan's async-first patterns

### 3. Agent Invocation

Use the Task tool to invoke the planning orchestrator agent:

```
Task(
  subagent_type: "planning-orchestrator",
  description: "Plan work item: $ARGUMENTS",
  prompt: "Plan the following work item using Cascade format:

  Input: $ARGUMENTS

  Please:
  1. Determine if this is an existing item or new item
  2. Load context from .cascade/ if existing
  3. Break down into appropriate sub-items following the hierarchy:
     P (Project) → E (Epic) → F (Feature) → S (Story)/B (Bug) → PH (Phase) → T (Task)
  4. Estimate complexity and resources for each item
  5. Determine optimal execution strategy (parallel vs sequential)
  6. Generate structured Cascade format documents
  7. Update .cascade/work-item-registry.json with new IDs

  Follow IndyDevDan's planning principles:
  - 'Success is Planned' - create detailed, actionable plans
  - Break into atomic tasks with clear boundaries
  - Identify dependencies explicitly
  - Estimate resources realistically
  "
)
```

### 4. Result Handling

The planning-orchestrator agent will:
- Create/update Cascade work item files in `.cascade/`
- Update the work item registry
- Return a summary of created/updated items

Display the results to the user with:
- List of created/updated work items
- File locations
- Next steps (e.g., "Run `/carl:work E1234` to implement this epic")

## Example Usage

```bash
# Plan a new epic
/carl:plan "Implement user authentication system"

# Break down an existing epic
/carl:plan E1234

# Plan a specific feature
/carl:plan F5678
```

## Notes

- This command is thin by design - all logic lives in the `planning-orchestrator` agent
- The agent has its own context window for efficient operation
- Multiple planning operations can run concurrently if needed
- The Cascade format is the local source of truth; external adapters (ADO, GitHub) are extensions

## Related

- Agent: `planning-orchestrator` - Handles the actual planning logic
- Command: `/carl:work` - Executes planned work items
- Directory: `.cascade/` - Where all work items are stored
