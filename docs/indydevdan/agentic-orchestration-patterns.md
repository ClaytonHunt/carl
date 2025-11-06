# IndyDevDan's Agentic Orchestration Patterns

**Source**: IndyDevDan (disler on GitHub) - Agentic Engineer
**References**:
- https://github.com/disler/indydevtools
- https://github.com/disler/claude-code-hooks-multi-agent-observability
- https://agenticengineer.com/tactical-agentic-coding

## Core Philosophy

### From "In the Loop" to "Out of the Loop"
The fundamental shift is moving from continuously directing agents to building autonomous systems. Engineers should "encode your engineering best practices into your agents so they ship how you would ship."

**Key Principle**: "Prompts (agents) are THE new fundamental unit of programming."

### Agent Hierarchy
**USE THE RIGHT TOOL (AGENT) FOR THE JOB**
- Preference order: **Agent > Code > Manual Input**
- Establish clear precedence for delegating work to appropriate agents
- Treat LLM agents as first-class components, not secondary utilities

## The 12 Leverage Points Framework

Success requires mastering both **in-agent** and **through-agent** leverage points:

### Core Four
1. **Context** - What information the agent has access to
2. **Model** - Which LLM powers the agent
3. **Prompt** - Instructions and system messages
4. **Tools** - Available capabilities and functions

### Additional Strategic Elements
5-12. Eight additional leverage points that maximize agent autonomy and capability

## Orchestration Patterns

### 1. Sequential Agent Coordination

**Pattern**: Chain agents in a specific order where each completes before the next begins.

**Example from YouTube Metadata Tool**:
```
1. Transcription agent processes video
2. User input gathering agent collects parameters
3. Parallel generation agents create titles/descriptions/tags
4. Thumbnail agent produces visual assets
5. Consolidation agent merges outputs for final metadata
```

**When to use**: Tasks with clear dependencies and ordered steps.

### 2. Parallel Agent Execution

**Pattern**: Multiple agents work simultaneously on independent subtasks.

**Key Insight**: "The shift to parallel agents resembles the transition from a synchronous for-loop to an asynchronous, event-driven architecture."

**Requirements**:
- Break large specs into atomic tasks
- Ensure agents can work independently
- Coordinate results afterward

**Example**: Multiple agents generating different metadata components (title, description, tags) simultaneously.

### 3. Async Event Architecture

**Pattern**: Webhook-based event streaming for decoupled coordination.

**Event Flow**:
```
Claude Agents → Hook Scripts → HTTP POST → Server → SQLite → WebSocket → Client
```

**Key Components**:
- **Independent Publishing**: Each agent publishes lifecycle events
- **Session-Based Correlation**: Shared session identifiers coordinate agents
- **Event Sequencing**: Timestamps enable temporal ordering
- **Observable State Machine**: External systems coordinate based on events

**Events**:
- `SessionStart` - Agent initialization
- `PreToolUse/PostToolUse` - Tool execution lifecycle
- `SubagentStop` - Subagent task completion
- `SessionEnd` - Graceful termination

### 4. Hierarchical Agent Composition (Subagent Pattern)

**Pattern**: Parent agents spawn subagents for specialized tasks.

**Coordination**: Completion events signal task resolution without blocking parent execution.

**Benefits**:
- Clean separation of concerns
- Efficient context management
- Parallel execution of subtasks

### 5. Templating Orchestration (Simple Prompt System)

**Pattern**: Configuration-driven prompts with variable substitution.

**Benefits**:
- Reusable agent patterns without code changes
- Consistent agent behavior
- Easy iteration on prompts

**Implementation**:
- Templates define agent structure
- Variables inject runtime context
- Routing logic selects appropriate template

### 6. Function-Driven Composition

**Pattern**: "EVERYTHING IS A FUNCTION" - modular agent design.

**Benefits**:
- Each tool is callable independently or as part of pipelines
- Flexible orchestration patterns
- Composable building blocks

**Example**: SPS (Simple Prompt System) and YouTube tools can be called standalone or combined.

## Design Principles

### 1. Planning Over Prompting
**"Success is Planned"**
- Progress from simple prompts to detailed plans
- Agents execute structured specifications autonomously
- Move from vague requests to precise instructions

### 2. Closed-Loop Systems
**Self-Correcting Workflows**
- Build in strategic feedback mechanisms
- Enable agents to validate their own work
- Reduce need for human intervention

### 3. Specialization Architecture
**"A focused agent is a performant agent"**
- Deploy domain-specific agents vs. general-purpose
- Careful context window management
- Clear responsibility boundaries

### 4. Composability First
**Reusable Building Blocks**
- Design agents as composable components
- Enable combination strategies
- Prioritize modularity over monoliths

### 5. Observable by Default
**Real-time Monitoring**
- Stream output during execution
- Publish state transitions
- Enable external coordination

### 6. State Management
**Iterative Refinement**
- Draft/final directory separation
- Enable review and iteration cycles
- Support progressive enhancement

## Multi-Agent Orchestration Architecture

### Orchestrator Agent Pattern

**Concept**: Single orchestrator commands a fleet of specialized agents.

**Capabilities**:
- **CRUD Operations**: Create, Read, Update, Delete agent configurations
- **Real-time Observability**: Monitor all agent activities
- **Task Routing**: Delegate to appropriate specialized agents
- **Result Aggregation**: Synthesize outputs from multiple agents

**Architecture**:
```
Orchestrator Agent
    ├── Planning Agent (analyzes and breaks down tasks)
    ├── Search Agent (finds relevant code/docs)
    ├── Coder Agent (implements changes)
    ├── Analyst Agent (reviews and validates)
    ├── Verifier Agent (tests and confirms)
    └── Writer Agent (documents results)
```

### Reasoning Agents as Architects

**Pattern**: Use reasoning agents to act as architects and planners.

**Responsibilities**:
- Analyze overall objectives
- Break into atomic tasks
- Determine execution order
- Assign tasks to specialized agents
- Monitor progress and coordinate

## Implementation Strategies

### HOP/LOP Pattern
**Higher Order Prompt / Lower Order Prompt**

**HOP (Orchestrator)**:
- Reads task definitions
- Delegates to agents in parallel
- Grades/validates results
- Aggregates outcomes

**LOP (Individual Agents)**:
- Receives specific task definition
- Executes focused work
- Reports results back

### Git Worktrees for Parallelization

**Pattern**: Run multiple Claude instances in parallel using git worktrees.

**Benefits**:
- True parallel execution
- Isolated workspaces
- Independent agent contexts
- Merge results afterward

**Use case**: Large refactoring tasks that can be split into independent changes.

## Building "The System That Builds The System"

### Meta-Level Orchestration

Move from individual coding to building autonomous systems:

1. **Encode Engineering Excellence**: Capture best practices in agent templates
2. **Agent Development Workflows (ADWs)**: Standardized patterns for common tasks
3. **Self-Running Codebase**: "Your codebase runs itself" through orchestrated agents
4. **Quality Standards**: Maintain standards while operating autonomously

### Production Deployment

**TAC (Tactical Agentic Coding) Principles**:
- Deploy agents that work autonomously
- Build in observability from the start
- Create feedback loops for self-improvement
- Scale from single agents to fleets

## Best Practices

### 1. Async When Possible
- Default to parallel execution
- Wait only when dependencies require it
- "Do more when possible, wait when needed"

### 2. Clean Context Separation
- Each agent maintains its own clean context
- Share only necessary information
- Avoid context pollution

### 3. Event-Sourced Coordination
- Use shared event logs for coordination
- Enable reactive systems
- Decouple agent communication

### 4. Streaming for Responsiveness
- Stream output in real-time
- Provide progress updates
- Enable monitoring and intervention

### 5. Graceful Degradation
- Handle agent failures independently
- Provide fallback strategies
- Report errors clearly

## Common Anti-Patterns to Avoid

1. **Monolithic Orchestrators**: Don't build one agent that does everything
2. **Tight Coupling**: Avoid direct agent-to-agent dependencies
3. **Blocking Execution**: Don't wait when you could parallelize
4. **Context Overload**: Don't share entire context with every agent
5. **Manual Intervention**: Don't require human input in the middle of workflows

## Measuring Success

**From Individual Coding to System Building**:
- Can agents complete tasks without intervention?
- Are engineering best practices encoded in prompts?
- Does the system self-correct and improve?
- Can you scale from 1 agent to 10+ agents?

**The Ultimate Goal**: Build systems where "thousands of valuable agents" operate autonomously, coordinated by well-designed orchestrators, following encoded best practices.
