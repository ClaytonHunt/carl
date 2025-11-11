# Slash Command Templates

Custom slash commands are user-invoked prompts that extend Claude Code functionality.

## Overview

**Slash Commands** are markdown files containing prompts that users explicitly invoke with `/command-name`. They're ideal for quick, reusable prompts that don't require separate context windows.

## When to Use Slash Commands

### ✅ Use Slash Commands When:
- User should explicitly trigger the action
- Quick, focused prompts (<100 lines)
- Simple parameter passing needed
- Team needs shared prompt templates
- No separate context window required
- Want tool restrictions for security

### ❌ Don't Use Slash Commands When:
- Need separate context window → Use **SubAgent**
- Claude should auto-discover → Use **Skill**
- Complex multi-file capability → Use **Skill**
- Long-running orchestration → Use **SubAgent**

## File Structure

### Location
- **Project**: `.claude/commands/*.md` (shared with team)
- **Personal**: `~/.claude/commands/*.md` (user-specific)
- **Plugin**: `plugins/{plugin-name}/commands/*.md`

**Precedence**: Project > Personal > Plugin

### Format

```markdown
---
description: Short description shown in /help
allowed-tools: Tool1, Tool2, Tool3
argument-hint: [arg1] [arg2]
model: sonnet | opus | haiku | inherit
disable-model-invocation: true
---

# Command Title

Command instructions go here.

## Variables

- `${VARIABLE_NAME}` - Description of this variable

## Workflow

1. Step one
2. Step two
3. Step three

## Example Usage

\`\`\`
/command-name arg1 arg2
\`\`\`
```

## Frontmatter Fields

All fields are **optional**, but `description` is highly recommended for discoverability.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `description` | string | Brief description for /help menu (~100 chars max) | `"Analyze code quality and suggest improvements"` |
| `allowed-tools` | string | Comma-separated list of allowed tools | `"Read, Grep, Glob, Write"` |
| `argument-hint` | string | Usage hint shown in help | `"[file-path] [options]"` |
| `model` | string | Override model (sonnet/opus/haiku/inherit) | `"haiku"` |
| `disable-model-invocation` | boolean | Template-only, no LLM invocation | `true` |

## Variable Substitution

### Built-in Variables
- **`$ARGUMENTS`** - All arguments as single string
- **`$1`, `$2`, `$3`...** - Positional arguments (indexed from 1)
- **`@filepath`** - Include file contents

### Named Variables Pattern
Use descriptive variable names in documentation (IndyDevDan pattern):

```markdown
## Variables

- `${WORK_ITEM_ID}` - Work item to process (e.g., E1234)
- `${TARGET_DIR}` - Directory to analyze
- `${OUTPUT_FORMAT}` - Output format (json|markdown|html)
```

Then reference in prompt:
```
Process work item: ${WORK_ITEM_ID}
Analyze directory: ${TARGET_DIR}
Output as: ${OUTPUT_FORMAT}
```

**Note**: Named variables like `${VAR}` are documentation conventions. Claude Code actually receives `$ARGUMENTS` or `$1, $2, $3...`

## Tool Restrictions

Limit Claude's tool access for security and focus:

### Common Patterns

**Read-only**:
```yaml
allowed-tools: Read, Grep, Glob
```

**File operations only**:
```yaml
allowed-tools: Read, Write, Edit, Grep, Glob
```

**Orchestration**:
```yaml
allowed-tools: Task, Read, Write, Grep, Glob
```

**Analysis only**:
```yaml
allowed-tools: Read, Grep, Glob, WebFetch, WebSearch
```

**No restrictions** (omit field):
```yaml
# No allowed-tools field = all tools available
```

### Available Tools
Task, Bash, Glob, Grep, Read, Edit, Write, WebFetch, WebSearch, BashOutput, KillShell, AskUserQuestion, Skill, SlashCommand, NotebookEdit, TodoWrite

## Complexity Guidelines

| Size | Lines | Characteristics | Action |
|------|-------|----------------|--------|
| **Simple** | <50 | Single purpose, basic logic | Perfect for command |
| **Medium** | 50-100 | Multiple sections, some complexity | Still okay for command |
| **Complex** | >100 | Orchestration, detailed workflow | Consider SubAgent |

**Split when**: Command exceeds ~100 lines or needs separate context window → Convert to SubAgent

## Command Patterns

### Pattern 1: Direct Action
Simple command that directly instructs Claude:
```markdown
---
description: Format all TypeScript files
allowed-tools: Read, Write, Edit, Bash
---

Format all TypeScript files in the project using prettier.
```

### Pattern 2: Template with Variables
Command with parameter substitution:
```markdown
---
description: Generate component boilerplate
argument-hint: [component-name]
allowed-tools: Write
---

Create React component named ${COMPONENT_NAME} with:
- Component file
- Test file
- Story file
```

### Pattern 3: HOP Orchestrator
Command that delegates to subagent (Higher Order Prompt):
```markdown
---
description: Run comprehensive code review
allowed-tools: Task, Read, Grep
---

Delegate to the code-reviewer agent:

Task(
  subagent_type: "code-reviewer",
  description: "Review codebase: ${TARGET}",
  prompt: "Perform code review on ${TARGET}..."
)
```

### Pattern 4: Multi-Step Workflow
Command with defined workflow:
```markdown
---
description: Deploy application
allowed-tools: Bash, Read, Write
---

# Deployment Workflow

1. Run tests
2. Build application
3. Update version
4. Tag release
5. Deploy to staging
```

## Naming Conventions

- **Kebab-case**: `analyze-code`, `run-tests`, `deploy-app`
- **Lowercase**: `review`, not `Review`
- **Descriptive**: Indicate action/purpose
- **Max 64 chars**: For frontmatter name field

### Invocation
- File: `.claude/commands/my-feature.md`
- Invoke: `/my-feature`
- Subdirectories don't affect invocation (namespacing only)

## Examples in This Directory

| Template | Purpose | Complexity |
|----------|---------|------------|
| `simple-command.md` | Basic direct action | Simple |
| `orchestrator-command.md` | HOP pattern delegation | Medium |
| `examples/file-processor.md` | File operation example | Medium |
| `examples/workflow-trigger.md` | Multi-step workflow | Medium |

## Integration with Other Features

### Commands + SubAgents (HOP/LOP)
Command acts as thin orchestrator (HOP) that delegates to subagent (LOP):

**Command** (thin):
```markdown
---
description: Plan work items
allowed-tools: Task, Read
---

Delegate to planning-orchestrator agent...
```

**SubAgent** (thick):
```markdown
---
name: planning-orchestrator
description: Planning specialist
---

Detailed planning logic...
```

### Commands + Skills
Commands can invoke Skills via the Skill tool:
```markdown
---
allowed-tools: Skill, Read
---

Use the api-integration Skill to connect to ${API_NAME}...
```

### Commands + Hooks
Hooks can react to SlashCommand tool use:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "SlashCommand",
        "hooks": [{"type": "command", "command": "..."}]
      }
    ]
  }
}
```

## Best Practices

### ✅ Do
- Keep commands focused and single-purpose
- Use descriptive names and clear descriptions
- Restrict tools to minimum required
- Document variables in a Variables section
- Provide example usage
- Version control project commands
- Test with actual team usage patterns

### ❌ Don't
- Create commands longer than ~100 lines
- Use for complex orchestration (use SubAgent)
- Skip the description field
- Give vague or generic names
- Mix multiple unrelated actions
- Expose security-sensitive operations without restrictions

## Common Pitfalls

1. **Too Complex**: Command trying to do too much → Split into SubAgent
2. **Missing Description**: Users can't discover or understand purpose
3. **Wrong Tool Restrictions**: Needed tool not in allowed-tools list
4. **No Argument Hint**: Users don't know how to use command
5. **Vague Instructions**: Claude doesn't know what to do
6. **No Variables Section**: Hard to understand parameters

## Testing Commands

1. Create command file in `.claude/commands/`
2. Restart Claude Code or reload commands
3. Run `/help` to verify command appears
4. Test with various arguments
5. Verify tool restrictions work
6. Check with team members

## Plugin Distribution

To distribute commands via plugin:

1. Place in `plugins/{plugin-name}/commands/`
2. Reference in plugin.json:
   ```json
   {
     "name": "my-plugin",
     "commands": "./commands"
   }
   ```
3. Commands become available as `/plugin-name:command-name`

## Additional Resources

- **Claude Code Docs**: `@docs/claude-code/slash-commands.md`
- **IndyDevDan Patterns**: `@docs/indydevdan/agentic-orchestration-patterns.md`
- **CARL Examples**: `@plugins/carl/commands/`
- **SubAgent Templates**: `@.claude/.carl/templates/agents/`

---

**Next Steps**:
1. Review template files in this directory
2. Copy relevant template for your use case
3. Modify for your specific needs
4. Test thoroughly before deployment
