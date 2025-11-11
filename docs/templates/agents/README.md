# SubAgent Templates

SubAgents are specialized AI assistants with custom system prompts, separate context windows, and configurable tool access for domain-specific tasks.

## Overview

**SubAgents** are separate Claude instances with their own context windows and specialized system prompts. They enable efficient task delegation, domain expertise, and parallel execution patterns.

## When to Use SubAgents

### ✅ Use SubAgents When:
- Need separate context window for efficiency
- Specialized domain expertise required
- Complex, long-running tasks
- Want automatic delegation based on description
- Need tool restrictions for security/focus
- Building orchestrator patterns (HOP/LOP)
- Task requires >100 lines of detailed instructions

### ❌ Don't Use SubAgents When:
- Simple, quick prompts → Use **Slash Command**
- Want user-invoked action → Use **Slash Command**
- Need automatic discovery without user trigger → Consider **Skill**
- Very simple task (<50 lines) → Use **Slash Command**

## File Structure

### Location
- **Project**: `.claude/agents/*.md` (shared with team)
- **Personal**: `~/.claude/agents/*.md` (user-specific)
- **Plugin**: `plugins/{plugin-name}/agents/*.md`

**Precedence**: Project > Personal > Plugin

### Format

```markdown
---
name: agent-name-kebab-case
description: When to invoke this agent (critical for auto-discovery)
tools: Tool1, Tool2, Tool3
model: sonnet | opus | haiku | inherit
---

# Agent Title

You are [role description with specific expertise].

## Core Responsibilities

1. Responsibility one
2. Responsibility two
3. Responsibility three

## [Relevant Domain Knowledge]

[Domain-specific information the agent needs]

## Workflow

### Step 1: [First Phase]
[Detailed instructions]

### Step 2: [Second Phase]
[Detailed instructions]

## [Pattern or Principle Name]

[Guidance on patterns to follow]

## Output Format

[How to structure and return results]
```

## Frontmatter Fields

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `name` | ✅ Yes | Unique identifier, kebab-case, max 64 chars | `"code-reviewer"` |
| `description` | ✅ Yes | When Claude should invoke, max 1024 chars (CRITICAL for discovery) | `"Use this agent for comprehensive code reviews. Invoke when analyzing code quality, security, or best practices."` |
| `tools` | ❌ No | Comma-separated allowed tools; omit to inherit all | `"Read, Grep, Glob, Write"` |
| `model` | ❌ No | Model override (sonnet/opus/haiku/inherit) | `"haiku"` |

### Critical: Description Field

The `description` is **THE MOST IMPORTANT** field for agent discovery. Claude uses it to determine when to invoke your agent.

**✅ Good Descriptions** (specific, keyword-rich):
```yaml
description: Use this agent for planning and breaking down work items into structured Cascade format. Invoke when the user needs to plan projects, epics, features, stories, or tasks.
```

**❌ Bad Descriptions** (vague, generic):
```yaml
description: A helpful agent for work items
```

**Include**:
- **Trigger keywords**: "planning", "code review", "testing", "deployment"
- **Specific use cases**: "when analyzing...", "for breaking down...", "to validate..."
- **Domain indicators**: "Cascade format", "TypeScript code", "API integration"

## Tool Configuration

### Inherit All Tools (Default)
Omit `tools` field to give agent access to all available tools:
```yaml
name: research-agent
description: Research agent with full tool access
# No tools field = inherits all tools
```

### Restrict Tools (Security/Focus)
Specify only needed tools:
```yaml
name: safe-analyzer
description: Read-only code analyzer
tools: Read, Grep, Glob
```

### Common Tool Patterns

**Read-only analysis**:
```yaml
tools: Read, Grep, Glob
```

**Code modification**:
```yaml
tools: Read, Write, Edit, Grep, Glob
```

**Orchestration**:
```yaml
tools: Task, Read, Write, Grep, Glob
```

**Full capability**:
```yaml
# Omit tools field
```

## Agent Patterns

### Pattern 1: Specialist Agent
Focused expertise in one domain:
- Single clear responsibility
- Deep domain knowledge
- Specific workflow
- ~100-300 lines

**Example**: Code reviewer, test generator, documentation writer

### Pattern 2: Orchestrator Agent
Coordinates multiple sub-agents:
- Analyzes task requirements
- Delegates to specialists
- Aggregates results
- ~200-500 lines

**Example**: Planning orchestrator, work orchestrator, deployment coordinator

### Pattern 3: Analyzer Agent
Examines and reports without modification:
- Read-only tools
- Deep analysis
- Detailed reporting
- ~100-200 lines

**Example**: Security analyzer, performance profiler, dependency auditor

## Complexity Guidelines

| Size | Lines | Characteristics | Action |
|------|-------|----------------|--------|
| **Simple** | 50-100 | Single responsibility, clear workflow | Perfect for agent |
| **Medium** | 100-300 | Multiple sections, detailed logic | Good for specialist |
| **Complex** | 300-500 | Orchestration, delegation patterns | Good for orchestrator |
| **Too Complex** | >500 | Multiple unrelated responsibilities | Split into multiple agents |

**Split when**: Agent handles multiple unrelated domains → Create specialized agents

## Invocation Methods

### 1. Automatic Delegation
Claude detects when to use agent based on description:
```
User: "I need to plan out the new authentication feature"
→ Claude automatically invokes planning-orchestrator agent
```

### 2. Explicit User Request
User requests specific agent:
```
User: "Use the code-reviewer agent to analyze src/auth.ts"
→ Claude invokes code-reviewer agent
```

### 3. Programmatic (Task Tool)
From command or other agent:
```markdown
Task(
  subagent_type: "test-generator",
  description: "Generate tests for auth module",
  prompt: "..."
)
```

## IndyDevDan's Patterns

### HOP/LOP Architecture
**Higher Order Prompt / Lower Order Prompt**

**HOP (Orchestrator Agent)**:
- Thin coordinator
- Analyzes requirements
- Delegates to specialists
- Validates and aggregates results

**LOP (Specialist Agent)**:
- Thick implementation
- Focused expertise
- Detailed execution
- Reports back to HOP

### Key Principles

1. **Specialization** - "A focused agent is a performant agent"
2. **Clean Context** - Each agent has separate context window
3. **Async-First** - Maximize parallel execution
4. **Observable** - Real-time progress reporting
5. **Composable** - Reusable building blocks

## System Prompt Design

### Effective Structure

```markdown
# [Agent Name]

You are [specific role] with expertise in [domain].

## Core Responsibilities

1. [Primary responsibility]
2. [Secondary responsibility]
3. [Tertiary responsibility]

## Domain Knowledge

[Essential domain information]

## Workflow

### Phase 1: [Name]
[Step-by-step instructions]

### Phase 2: [Name]
[Step-by-step instructions]

## [Principle/Pattern Name]

[Guidance on patterns to follow, e.g., "IndyDevDan's Async Patterns"]

## Output Format

[How to structure results]

## Error Handling

[How to handle failures]
```

### Best Practices for System Prompts

**✅ Do**:
- Be specific about role and expertise
- Provide step-by-step workflows
- Include relevant domain knowledge
- Reference patterns/principles to follow
- Define clear output format
- Specify error handling
- Use headings for structure

**❌ Don't**:
- Be vague or generic
- Mix multiple unrelated domains
- Skip workflow details
- Assume knowledge without providing it
- Leave output format undefined
- Ignore error cases

## Examples in This Directory

| Template | Purpose | Complexity | Pattern |
|----------|---------|------------|---------|
| `simple-agent.md` | Basic specialist agent | Simple | Specialist |
| `orchestrator-agent.md` | HOP coordinator | Complex | Orchestrator |
| `specialist-agent.md` | Focused domain expert | Medium | Specialist |
| `examples/code-analyzer.md` | Read-only analyzer | Medium | Analyzer |
| `examples/test-runner.md` | Test execution specialist | Medium | Specialist |

## Integration with Other Features

### Commands + SubAgents (HOP/LOP)
Slash command delegates to agent:

**Command**:
```markdown
---
description: Review code quality
allowed-tools: Task
---

Task(subagent_type: "code-reviewer", ...)
```

**Agent**:
```markdown
---
name: code-reviewer
description: Comprehensive code review specialist
tools: Read, Grep, Glob
---

You are a code review specialist...
```

### SubAgents + SubAgents (Hierarchy)
Agent can spawn other agents:

**Orchestrator**:
```markdown
---
name: deployment-orchestrator
---

1. Invoke test-runner agent
2. Invoke build-agent
3. Invoke deployment-agent
```

### SubAgents + Skills
Agents can use Skills:
```markdown
---
name: api-integration-agent
tools: Skill, Read, Write
---

Use the api-client Skill to connect...
```

## Naming Conventions

- **Kebab-case**: `code-reviewer`, `test-generator`, `deployment-orchestrator`
- **Lowercase**: `analyzer`, not `Analyzer`
- **Descriptive**: Indicate role/purpose
- **Max 64 chars**: For frontmatter name field
- **Suffix patterns**:
  - `-orchestrator`: Coordinates other agents
  - `-analyzer`: Read-only analysis
  - `-generator`: Creates artifacts
  - `-runner`: Executes operations

## Agent Lifecycle

### Development
1. Create agent markdown file
2. Define frontmatter (name, description critical)
3. Write system prompt
4. Test with explicit invocation
5. Verify automatic discovery works
6. Refine description keywords

### Testing
1. Test explicit invocation by name
2. Test automatic discovery (use trigger phrases)
3. Verify tool restrictions work
4. Test with various inputs
5. Check error handling
6. Validate with team members

### Deployment
1. Commit to `.claude/agents/` for team sharing
2. Or bundle in plugin for wider distribution
3. Document in team knowledge base
4. Monitor usage and refine

## Common Pitfalls

1. **Too Broad**: Agent trying to do multiple unrelated things → Split
2. **Vague Description**: Claude can't discover when to use → Add keywords
3. **Context Pollution**: Sharing too much information → Clean, focused prompts
4. **Wrong Tools**: Agent has more access than needed → Restrict
5. **No Workflow**: Agent doesn't know steps → Add detailed workflow
6. **Generic Role**: "helpful assistant" → Specific expertise/role
7. **Missing Error Handling**: No guidance for failures → Define error cases

## Best Practices

### ✅ Do
- Keep agents focused on single domain
- Write specific, keyword-rich descriptions
- Provide detailed step-by-step workflows
- Restrict tools to minimum required
- Test automatic discovery
- Document expected inputs/outputs
- Include error handling guidance
- Version control project agents
- Use descriptive names

### ❌ Don't
- Create agents that do "everything"
- Write vague descriptions
- Skip workflow documentation
- Give unnecessary tool access
- Mix multiple unrelated domains
- Assume the agent knows context
- Ignore error cases
- Use generic names like "helper"

## Plugin Distribution

To distribute agents via plugin:

1. Place in `plugins/{plugin-name}/agents/`
2. Reference in plugin.json:
   ```json
   {
     "name": "my-plugin",
     "agents": "./agents"
   }
   ```
3. Agents become available automatically when plugin enabled

## Management

### Interactive (Recommended)
Use `/agents` command for GUI:
- View all available agents
- Create new agents
- Edit existing agents
- Test agents
- Delete agents

### Manual
Edit markdown files directly in:
- `.claude/agents/` (project)
- `~/.claude/agents/` (personal)
- `plugins/{name}/agents/` (plugin)

## Additional Resources

- **Claude Code Docs**: `@docs/claude-code/sub-agents.md`
- **IndyDevDan Patterns**: `@docs/indydevdan/agentic-orchestration-patterns.md`
- **CARL Examples**: `@plugins/carl/agents/`
- **Command Templates**: `@.claude/.carl/templates/commands/`
- **Workflow Patterns**: `@.claude/.carl/templates/workflows/`

---

**Next Steps**:
1. Review template files in this directory
2. Choose pattern matching your use case
3. Copy and customize template
4. Test thoroughly
5. Deploy to team or plugin
