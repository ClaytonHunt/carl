---
description: Plan and break down work items using structured Cascade format
allowed-tools: Task, Bash
argument-hint: [work-item-id|description]
---

# Plan Work Item

You are delegating to the Planning Orchestrator agent. Initialize a workflow session, then pass the user's input to the agent.

## Input

The user provided: `$ARGUMENTS`

## Your Task

### 1. Initialize Session

First, create a workflow session to track state:

```javascript
const SessionState = require('./plugins/carl/lib/workflow/session-state');

const session = new SessionState();
await session.initialize();

// Log workflow start
await session.logEvent('workflow_started', {
  command: 'carl:plan',
  input: '$ARGUMENTS'
});
```

### 2. Invoke Planning Orchestrator

Pass the input and session ID to the agent:

```javascript
await Task({
  subagent_type: "carl:planning-orchestrator",
  description: `Plan work item: ${session.sessionId.substring(0, 8)}...`,
  prompt: `You are the Planning Orchestrator. Plan the following work item:

Input: $ARGUMENTS

Session ID: ${session.sessionId}

To access session state:
  const SessionState = require('./plugins/carl/lib/workflow/session-state');
  const session = await SessionState.resume('${session.sessionId}');

Follow your instructions to:
1. Resume the session and initialize your state
2. Determine if this is an existing work item ID or new description
3. Load context using planning-helpers
4. Analyze and break down the work (YOU do this with reasoning)
5. Create work items using planning-helpers
6. Update session state as you progress
7. Present results to the user

Remember:
- Helpers handle data, you handle reasoning
- Update session.setState() as you work
- Log events with session.logEvent()

Go!`
});
```

### 3. Log Completion

After the agent completes:

```javascript
await session.logEvent('workflow_completed', {
  command: 'carl:plan'
});
```

That's it. The agent will handle the planning and track state in the session.
