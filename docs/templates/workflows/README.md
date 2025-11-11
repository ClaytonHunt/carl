# Workflow Templates

Workflow patterns for orchestrating multiple agents, commands, and hooks to accomplish complex tasks efficiently.

## Overview

**Workflows** are patterns for coordinating multiple Claude Code components (Commands, Agents, Hooks, Skills) to accomplish complex multi-step tasks. They enable efficient orchestration, parallel execution, and event-driven coordination.

## What is a Workflow?

A workflow is NOT a single file or component. Instead, it's a **pattern** or **architecture** that combines multiple Claude Code features:

- **Slash Commands** - User-triggered orchestrators (HOP)
- **SubAgents** - Specialized workers (LOP)
- **Hooks** - Event-driven automation
- **Skills** - Reusable capabilities

Think of workflows as the "blueprint" for how these components work together.

## When to Use Workflows

### ✅ Use Workflows When:
- Task requires multiple specialized agents
- Need parallel execution for efficiency
- Complex multi-phase operations
- Event-driven coordination needed
- Building autonomous systems
- Scaling from single agent to multi-agent
- Need real-time observability
- Implementing IndyDevDan patterns

### ❌ Don't Use Workflows When:
- Simple single-agent task
- One-step operation
- User just needs quick answer
- No need for coordination
- Task is too simple for orchestration

## Workflow Patterns

### 1. HOP/LOP Pattern
**Higher Order Prompt / Lower Order Prompt**

**Architecture**: Thin orchestrator delegates to specialized workers

**Components**:
- **HOP**: Slash Command (orchestrator)
- **LOP**: SubAgents (specialists)

**When to use**: Most multi-agent scenarios, delegation patterns

**Example**: Planning workflow
```
/plan-feature [feature-name]  (HOP - Command)
    ↓
planning-orchestrator agent   (LOP - analyzes & breaks down)
    ↓ spawns
    ├─ requirements-analyst agent
    ├─ technical-architect agent
    └─ task-decomposer agent
```

**Benefits**:
- Clean separation of concerns
- Efficient context management
- Easy to test and debug
- Reusable specialists

### 2. Sequential Execution Pattern
**One agent after another in specific order**

**Architecture**: Linear chain of agents with dependencies

**When to use**: Clear dependencies, ordered steps, progressive refinement

**Example**: Deployment workflow
```
deploy-agent
    ↓ completes
test-runner agent
    ↓ completes
build-agent
    ↓ completes
deployment-agent
    ↓ completes
verification-agent
```

**Benefits**:
- Simple to understand
- Predictable execution
- Easy error handling
- Clear progress tracking

### 3. Parallel Execution Pattern
**Multiple agents work simultaneously on independent tasks**

**Architecture**: Fan-out to workers, then fan-in to aggregator

**When to use**: Independent subtasks, time-sensitive work, scalability needed

**Example**: Code analysis workflow
```
analysis-orchestrator
    ↓ spawns parallel
    ├─ security-analyzer agent   ─┐
    ├─ performance-analyzer agent ─┤
    ├─ quality-analyzer agent     ─┤
    └─ dependency-analyzer agent  ─┘
                ↓ all complete
        aggregator-agent (combines results)
```

**Benefits**:
- Faster execution
- Better resource utilization
- Scalable architecture
- Independent failure domains

### 4. Hierarchical Pattern
**Multi-level agent delegation**

**Architecture**: Tree structure with multiple orchestration levels

**When to use**: Complex domains, nested responsibilities, large-scale coordination

**Example**: Project generation workflow
```
project-generator (top orchestrator)
    ├─ frontend-orchestrator
    │   ├─ react-component-generator
    │   ├─ style-generator
    │   └─ test-generator
    ├─ backend-orchestrator
    │   ├─ api-generator
    │   ├─ database-generator
    │   └─ auth-generator
    └─ docs-orchestrator
        ├─ readme-generator
        └─ api-docs-generator
```

**Benefits**:
- Manages complexity
- Clear responsibility layers
- Reusable sub-orchestrators
- Scales to large tasks

### 5. Event-Driven Pattern
**Hooks trigger coordination based on events**

**Architecture**: Agents publish events, hooks coordinate reactions

**When to use**: Async workflows, external system integration, reactive patterns

**Example**: CI/CD workflow (IndyDevDan pattern)
```
PostToolUse hook (Write|Edit)
    ↓ publishes event
Webhook server receives
    ↓ broadcasts
External orchestrator
    ↓ decides
Spawns test-runner agent
    ↓ publishes SubagentStop event
    ↓
Spawns build-agent
    ↓ publishes SubagentStop event
    ↓
Spawns deploy-agent
```

**Benefits**:
- Loose coupling
- External coordination
- Real-time observability
- Integrates with other systems
- Supports async patterns

## IndyDevDan's Principles

### Core Philosophy
"Prompts (agents) are THE new fundamental unit of programming"

Move from "in the loop" to "out of the loop" - build autonomous systems.

### Key Principles

#### 1. Planning Over Prompting
**"Success is Planned"**
- Progress from simple prompts to detailed plans
- Agents execute structured specifications autonomously
- Move from vague requests to precise instructions

**Implementation**:
- Create planning-orchestrator agent
- Generate structured work breakdowns
- Feed plans to execution agents

#### 2. Specialization
**"A focused agent is a performant agent"**
- Deploy domain-specific agents vs. general-purpose
- Careful context window management
- Clear responsibility boundaries

**Implementation**:
- One agent per domain
- Tool restrictions for focus
- Clean, specialized system prompts

#### 3. Async-First Execution
**"Do more when possible, wait when needed"**
- Default to parallel execution
- Wait only when dependencies require it
- Maximize throughput

**Implementation**:
- Use Task tool for parallel agent spawning
- Coordinate via events, not blocking
- Fan-out then fan-in patterns

#### 4. Observable by Default
**Real-time monitoring and coordination**
- Stream output during execution
- Publish state transitions
- Enable external coordination

**Implementation**:
- SubagentStop hooks publish events
- Webhook server broadcasts state
- External orchestrator coordinates

#### 5. Composability
**Reusable building blocks**
- Design agents as composable components
- Enable combination strategies
- Prioritize modularity over monoliths

**Implementation**:
- Small, focused agents
- Clear interfaces
- Reusable across workflows

#### 6. Closed-Loop Systems
**Self-correcting workflows**
- Build in strategic feedback mechanisms
- Enable agents to validate their own work
- Reduce need for human intervention

**Implementation**:
- Validation agents review work
- Error detection and retry logic
- Quality gates between phases

## Workflow Complexity Guidelines

### When to Use Workflows

| Complexity | Characteristics | Approach |
|------------|-----------------|----------|
| **Simple** | Single agent, <10 steps, no parallelization | Don't use workflow, use single agent/command |
| **Medium** | 2-5 agents, some parallelization, clear dependencies | Use basic workflow pattern (HOP/LOP or Sequential) |
| **Complex** | 5-10 agents, significant parallelization, multi-phase | Use advanced pattern (Parallel, Hierarchical) |
| **Very Complex** | 10+ agents, event-driven, external integration | Use Event-Driven pattern with observability |

### Measuring Complexity

Assess these factors:

1. **Number of Agents**: How many specialized agents needed?
2. **Dependencies**: How many dependencies between steps?
3. **Parallelization**: How many tasks can run simultaneously?
4. **Duration**: How long will workflow run?
5. **External Integration**: Does it integrate with other systems?
6. **Coordination Needs**: How much orchestration required?

**Scoring**:
- 1-5 points: Single agent or simple command
- 6-15 points: Basic workflow (HOP/LOP or Sequential)
- 16-30 points: Advanced workflow (Parallel or Hierarchical)
- 31+ points: Event-Driven workflow with full observability

### When to Split Workflows

Split when:
- Single workflow exceeds 10 agents
- Multiple unrelated responsibilities
- Some parts need different orchestration patterns
- Workflow becomes hard to understand
- Individual phases are reusable independently

**Example Split**:
```
Before: mega-deployment-workflow (15 agents)
After:
  - pre-deployment-workflow (3 agents)
  - test-workflow (4 agents)
  - build-workflow (3 agents)
  - deploy-workflow (3 agents)
  - post-deployment-workflow (2 agents)
```

## Building a Workflow

### Step 1: Analyze Requirements
- What is the end goal?
- What are the major phases?
- What can run in parallel?
- What are the dependencies?
- Do you need external coordination?

### Step 2: Choose Pattern
- Simple linear? → Sequential
- Need delegation? → HOP/LOP
- Independent tasks? → Parallel
- Complex hierarchy? → Hierarchical
- External systems? → Event-Driven

### Step 3: Identify Components
- List all agents needed
- Define orchestrator (if needed)
- Identify hook points
- List any skills required

### Step 4: Design Flow
- Draw workflow diagram
- Mark dependencies
- Identify parallel sections
- Plan error handling

### Step 5: Implement Components

**Create Orchestrator Command**:
```markdown
---
description: [Workflow description]
allowed-tools: Task, Read, Grep
---

# [Workflow Name]

1. Analyze input
2. Spawn agents in parallel/sequence
3. Aggregate results
4. Validate and report
```

**Create Specialist Agents**:
```markdown
---
name: specialist-agent
description: [When to invoke]
tools: [Minimal required tools]
---

You are [specific role] with expertise in [domain].
[Detailed instructions]
```

**Add Hooks (if event-driven)**:
```json
{
  "SubagentStop": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "publish-event.sh"
        }
      ]
    }
  ]
}
```

### Step 6: Test Workflow
1. Test individual agents first
2. Test orchestrator logic
3. Test parallel execution
4. Test error cases
5. Test with realistic data
6. Measure performance

## Examples in This Directory

| Template | Pattern | Complexity |
|----------|---------|------------|
| `complexity-guidelines.md` | Assessment guide | Reference |
| `patterns/hop-lop.md` | HOP/LOP detailed guide | Basic |
| `patterns/sequential-chain.md` | Sequential execution | Basic |
| `patterns/parallel-execution.md` | Parallel pattern | Medium |
| `patterns/event-driven.md` | Event-driven coordination | Advanced |

## Integration Examples

### Workflow + Commands
Command acts as thin orchestrator (HOP):
```markdown
---
description: Run code review workflow
allowed-tools: Task, Read
---

Delegate to code-review-orchestrator agent...
```

### Workflow + Agents
Agents are the workflow workers (LOPs):
- Each agent has single responsibility
- Agents can spawn other agents
- Results flow back to orchestrator

### Workflow + Hooks
Hooks enable event-driven coordination:
- SubagentStop publishes completion events
- PostToolUse triggers downstream actions
- SessionStart loads workflow context

### Workflow + Skills
Skills provide reusable capabilities:
- Agents use Skills for specialized tasks
- Skills can be shared across workflows
- Skills reduce duplication

## Common Workflow Use Cases

### 1. Feature Development
```
/plan-feature → planning-orchestrator
    ↓ parallel
    ├─ requirement-analyzer
    ├─ technical-architect
    └─ task-decomposer
        ↓ sequential
/implement-feature → implementation-orchestrator
    ↓ parallel
    ├─ frontend-developer
    ├─ backend-developer
    └─ test-writer
        ↓
/review-feature → review-orchestrator
```

### 2. Code Analysis
```
/analyze-codebase → analysis-orchestrator
    ↓ parallel
    ├─ security-analyzer
    ├─ performance-analyzer
    ├─ quality-analyzer
    └─ dependency-analyzer
        ↓
    aggregator-agent → final report
```

### 3. Documentation Generation
```
/generate-docs → docs-orchestrator
    ↓ sequential
    readme-generator
        ↓
    api-docs-generator
        ↓ parallel
        ├─ endpoint-documenter
        ├─ schema-documenter
        └─ example-generator
```

### 4. Testing Workflow
```
PostToolUse hook (code change)
    ↓ event
test-orchestrator
    ↓ parallel
    ├─ unit-test-runner
    ├─ integration-test-runner
    └─ e2e-test-runner
        ↓ all complete
    report-generator
        ↓ if failures
    bug-reporter agent
```

### 5. Deployment Pipeline
```
/deploy → deployment-orchestrator
    ↓ sequential
    pre-deployment-check
        ↓
    test-runner (parallel suites)
        ↓
    build-agent
        ↓
    deploy-to-staging
        ↓
    smoke-test-agent
        ↓
    deploy-to-production
        ↓
    post-deployment-verification
```

## Best Practices

### ✅ Do
- Start simple, add complexity as needed
- Use appropriate pattern for the task
- Test agents individually first
- Document workflow architecture
- Measure and optimize performance
- Plan for error handling
- Use parallel execution when possible
- Keep orchestrators thin
- Make specialists focused
- Build in observability

### ❌ Don't
- Over-engineer simple tasks
- Mix multiple patterns without reason
- Create monolithic orchestrators
- Skip error handling
- Ignore performance implications
- Make agents do too much
- Block when you could parallelize
- Forget to validate results
- Skip testing individual components

## Debugging Workflows

### Common Issues

1. **Agent not triggered**: Check description field, add keywords
2. **Wrong execution order**: Review dependencies, check parallel vs sequential
3. **Performance issues**: Profile agent execution times, add parallelization
4. **Coordination failures**: Check event publishing, verify hook configuration
5. **Context pollution**: Clean up agent contexts, restrict information sharing

### Debugging Tools

- `/agents` - View all available agents
- `/hooks` - View active hooks
- `--debug` flag - Detailed execution logging
- Transcript review - Analyze conversation flow
- Webhook logs - Monitor event publishing

## Additional Resources

- **Commands Templates**: `@.claude/.carl/templates/commands/`
- **Agents Templates**: `@.claude/.carl/templates/agents/`
- **Hooks Templates**: `@.claude/.carl/templates/hooks/`
- **IndyDevDan Patterns**: `@docs/indydevdan/agentic-orchestration-patterns.md`
- **Claude Code Docs**: `@docs/claude-code/`

---

**Next Steps**:
1. Review pattern files in `patterns/` directory
2. Assess your task complexity
3. Choose appropriate pattern
4. Design workflow architecture
5. Implement components
6. Test and refine
