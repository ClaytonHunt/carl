---
description: [Brief description - delegates to specialized agent for complex work]
allowed-tools: Task, Read, Write, Grep, Glob
argument-hint: [work-item-id-or-description]
---

# [Orchestrator Command Name]

[Brief overview - this command acts as a Higher Order Prompt (HOP) that delegates to a specialized agent.]

## Purpose

This command acts as the **Higher Order Prompt (HOP)** that delegates work to the specialized `[agent-name]` agent. It follows IndyDevDan's orchestration patterns for clean separation of concerns.

## Variables

- `${INPUT_PARAMETER}` - Description of the input (e.g., work item ID, file path, configuration)

## Workflow

### 1. Context Gathering
Analyze the input to determine:
- What is the nature of this request?
- What context is needed from the codebase?
- Which specialized agent should handle this?
- What information does that agent need?

### 2. Validation
Verify that:
- Input is valid and properly formatted
- Required resources are available
- Preconditions are met
- No blocking issues exist

### 3. Delegation Strategy
Delegate to the `[agent-name]` agent via the Task tool with:
- The parsed and validated input
- Relevant context from the codebase
- Clear instructions following the agent's expected format
- Any configuration or preferences

### 4. Agent Invocation

Use the Task tool to invoke the specialized agent:

```
Task(
  subagent_type: "[agent-name]",
  description: "[Brief description]: ${INPUT_PARAMETER}",
  prompt: "[Detailed instructions for the agent]:

  Input: ${INPUT_PARAMETER}

  Please:
  1. [First major step the agent should take]
  2. [Second major step the agent should take]
  3. [Third major step the agent should take]
  4. [Additional steps as needed]
  5. [Final step - return results]

  Follow [relevant pattern/principle]:
  - [Key principle 1]
  - [Key principle 2]
  - [Key principle 3]
  "
)
```

### 5. Result Handling

The [agent-name] agent will:
- [Action 1 the agent performs]
- [Action 2 the agent performs]
- [Action 3 the agent performs]
- Return a summary of the work completed

Display the results to the user with:
- [What to show the user]
- [How to present the information]
- Next steps (e.g., "Run `/next-command` to continue")

## Example Usage

```bash
# Example 1: Basic usage
/orchestrator-command "input value"

# Example 2: With work item ID
/orchestrator-command W1234

# Example 3: With complex input
/orchestrator-command "multi-word description of work"
```

## Notes

- This command is thin by design - all logic lives in the `[agent-name]` agent
- The agent has its own context window for efficient operation
- Multiple operations can run concurrently if needed
- [Any domain-specific notes about source of truth, integrations, etc.]

## IndyDevDan's HOP/LOP Pattern

**HOP (This Command)**:
- Reads task definition
- Gathers minimal context
- Delegates to specialized agent
- Validates/presents results

**LOP (The Agent)**:
- Receives specific task
- Executes focused work with full context
- Reports detailed results back
- Operates in clean, separate context window

## Related

- Agent: `[agent-name]` - Handles the actual [work type]
- Command: `/related-command` - [Relationship description]
- Skill: `related-skill` - [How it might be used]
