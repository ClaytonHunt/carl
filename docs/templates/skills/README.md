# Skill Templates

Skills are modular, model-invoked capabilities that Claude discovers and uses automatically based on context.

## Overview

**Skills** are Claude's autonomous capabilities—unlike commands (user-invoked) or agents (separate context), Skills are discovered automatically when Claude detects trigger keywords in the conversation. They're perfect for extending Claude's capabilities in specific domains without requiring explicit invocation.

## When to Use Skills

### ✅ Use Skills When:
- Claude should discover capability automatically
- Functionality is self-contained and focused
- Want to extend Claude's knowledge in a domain
- Need progressive disclosure (load details on-demand)
- Providing templates, scripts, or reference material
- Creating reusable utilities across projects
- Want zero-friction access to capability

### ❌ Don't Use Skills When:
- User should explicitly trigger → Use **Slash Command**
- Need separate context window → Use **SubAgent**
- Very simple one-liner → Just add to instructions
- Requires orchestration logic → Use **SubAgent**
- Need tool restrictions → Use **SubAgent** or **Command**

## Skill vs Command vs SubAgent

| Feature | Skill | Command | SubAgent |
|---------|-------|---------|----------|
| **Discovery** | Automatic (context-based) | Explicit (`/command`) | Auto or explicit |
| **Context** | Shared with main thread | Shared with main thread | Separate window |
| **Invocation** | Claude decides | User types `/cmd` | Task tool or auto |
| **Complexity** | Simple to medium | Simple | Medium to complex |
| **Use Case** | Domain extension | Quick prompts | Specialized work |
| **Tool Restrictions** | Yes (optional) | Yes (optional) | Yes (optional) |

## File Structure

### Location
- **Personal**: `~/.claude/skills/skill-name/` (across all projects)
- **Project**: `.claude/skills/skill-name/` (team-shared)
- **Plugin**: `plugins/{plugin-name}/skills/skill-name/`

**Precedence**: Project > Personal > Plugin

### Basic Structure (Simple Skill)
```
skill-name/
└── SKILL.md (required - contains instructions)
```

### Advanced Structure (Complex Skill)
```
skill-name/
├── SKILL.md (required - main instructions)
├── reference.md (optional - detailed documentation)
├── examples.md (optional - usage examples)
├── scripts/ (optional - executable scripts)
│   ├── helper.sh
│   └── validator.py
└── templates/ (optional - file templates)
    ├── component.tsx
    └── test.spec.ts
```

## SKILL.md Format

### Required Frontmatter

```yaml
---
name: skill-name-kebab-case
description: What this Skill does and when Claude should use it. Include trigger keywords that users might say.
allowed-tools: Tool1, Tool2, Tool3
---
```

### Frontmatter Fields

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `name` | ✅ Yes | Unique identifier, kebab-case, max 64 chars | `"api-integration"` |
| `description` | ✅ Yes | When Claude should use this Skill, max 1024 chars (CRITICAL for discovery) | `"Use this Skill when the user needs to integrate with external APIs, including REST, GraphQL, or WebSocket connections."` |
| `allowed-tools` | ❌ No | Comma-separated tool list; omit to allow all | `"Read, Write, Bash"` |

### Critical: Description Field

The `description` is **THE MOST IMPORTANT** field for Skill discovery. Claude uses it to determine when to activate your Skill.

**✅ Good Descriptions** (specific, keyword-rich):
```yaml
description: Use this Skill when the user mentions API integration, REST calls, HTTP requests, or connecting to external services. Includes templates for fetch, axios, and GraphQL queries.
```

**❌ Bad Descriptions** (vague, generic):
```yaml
description: A helpful utility for APIs
```

**Include**:
- **Trigger keywords**: What users say ("API", "REST", "GraphQL", "testing", "deployment")
- **Specific capabilities**: What this Skill enables
- **Use cases**: When to apply this Skill
- **Technology mentions**: Frameworks, languages, tools

## Progressive Disclosure Pattern

Skills support progressive loading—start with essential info in SKILL.md, then reference supporting files only when needed.

### SKILL.md (Always Loaded)
```markdown
---
name: api-integration
description: API integration helper
---

# API Integration Skill

Use this Skill for integrating with external APIs.

## Quick Reference

- REST API calls
- GraphQL queries
- WebSocket connections
- Authentication patterns

## Available Templates

See `templates/` for ready-to-use code:
- `rest-client.ts` - REST API client
- `graphql-client.ts` - GraphQL client
- `websocket-client.ts` - WebSocket client

## Detailed Documentation

For comprehensive guides, see:
- `reference.md` - API patterns and best practices
- `examples.md` - Real-world integration examples
```

### reference.md (Loaded When Needed)
```markdown
# API Integration Reference

[Detailed documentation loaded only when Claude needs deep information]

## REST API Patterns
[Comprehensive REST information]

## GraphQL Patterns
[Comprehensive GraphQL information]

## Authentication
[Detailed auth patterns]
```

### Why Progressive Disclosure?

1. **Efficient Context Usage** - Don't load everything upfront
2. **Faster Discovery** - Smaller initial payload
3. **Better Organization** - Separate concerns clearly
4. **Scalability** - Support complex Skills without overwhelming context

## Supporting Files

### reference.md
**Purpose**: Detailed documentation, specifications, API references

**When to Use**: Comprehensive information that's too long for SKILL.md

**Example Content**:
- API documentation
- Pattern explanations
- Best practices guides
- Technical specifications

### examples.md
**Purpose**: Usage examples, code samples, tutorials

**When to Use**: Show how to use the Skill in practice

**Example Content**:
- Code examples
- Step-by-step tutorials
- Common use cases
- Before/after comparisons

### scripts/
**Purpose**: Executable helper scripts

**When to Use**: Automation, validation, generation tasks

**Example Content**:
- Bash scripts for automation
- Python scripts for processing
- Node.js utilities
- Validation scripts

### templates/
**Purpose**: File templates, boilerplate code

**When to Use**: Generating new files with standard structure

**Example Content**:
- Component templates
- Test file templates
- Configuration templates
- Boilerplate code

## Tool Restrictions

Limit tools for security or focus:

### Read-Only Skill
```yaml
---
name: documentation-reader
description: Read and explain documentation
allowed-tools: Read, Grep, Glob
---
```

### File Generation Skill
```yaml
---
name: component-generator
description: Generate React components
allowed-tools: Write, Read, Grep, Glob
---
```

### Full Capability Skill
```yaml
---
name: deployment-helper
description: Assist with deployment tasks
# No allowed-tools = all tools available
---
```

## Skill Patterns

### Pattern 1: Knowledge Skill
Provides domain expertise and information:

```markdown
---
name: typescript-patterns
description: TypeScript design patterns and best practices
allowed-tools: Read, Write
---

# TypeScript Patterns Skill

## Design Patterns in TypeScript

### Singleton Pattern
[Implementation and usage]

### Factory Pattern
[Implementation and usage]

### Observer Pattern
[Implementation and usage]
```

**Use When**: Extending Claude's knowledge in a domain

### Pattern 2: Template Skill
Provides code templates and boilerplate:

```markdown
---
name: react-component-templates
description: React component templates and boilerplate
allowed-tools: Write, Read
---

# React Component Templates

Use the templates in `templates/` to generate components:

- `templates/functional-component.tsx`
- `templates/class-component.tsx`
- `templates/component.test.tsx`

See `examples.md` for usage patterns.
```

**Use When**: Generating standardized code

### Pattern 3: Integration Skill
Connects to external systems or APIs:

```markdown
---
name: github-api-integration
description: GitHub API integration helper
allowed-tools: Bash, Read, Write
---

# GitHub API Integration

Use this Skill for GitHub API operations.

## Available Operations
- Create issues
- List PRs
- Update repositories

See `reference.md` for API details.
See `scripts/github-helper.sh` for CLI tools.
```

**Use When**: Working with external services

### Pattern 4: Utility Skill
Provides helper functions and tools:

```markdown
---
name: code-formatters
description: Code formatting and linting utilities
allowed-tools: Bash, Read, Write
---

# Code Formatters Skill

## Available Formatters
- Prettier (JS/TS)
- Black (Python)
- gofmt (Go)

See `scripts/` for formatter wrappers.
```

**Use When**: Common utilities across projects

## Complexity Guidelines

| Size | Structure | Characteristics | Action |
|------|-----------|----------------|--------|
| **Simple** | Single SKILL.md | <100 lines, focused capability | Perfect for Skill |
| **Medium** | SKILL.md + 1-2 supporting files | 100-300 lines, some complexity | Good Skill with docs |
| **Complex** | SKILL.md + multiple supporting files | 300-500 lines, templates, scripts | Advanced Skill with progressive disclosure |
| **Too Complex** | Many files, multiple capabilities | >500 lines, unrelated features | Split into multiple Skills |

**Split when**: Skill handles multiple unrelated capabilities → Create separate Skills

## Skill Discovery

### How Claude Discovers Skills

1. **Description Matching**: Claude scans Skill descriptions for relevant keywords
2. **Context Analysis**: Evaluates conversation context against Skill capabilities
3. **Automatic Activation**: Loads Skill when context matches
4. **Progressive Loading**: Loads supporting files as needed

### Testing Discovery

Test if your Skill is discoverable:

```
User: "What Skills are available?"
→ Claude lists all Skills including yours

User: "I need to [trigger phrase from description]"
→ Claude should activate your Skill
```

### Improving Discovery

1. **Rich Descriptions**: Include many relevant keywords
2. **Clear Use Cases**: State explicitly when to use
3. **Technology Names**: Mention specific frameworks, tools
4. **Action Verbs**: "integrate", "generate", "analyze", "deploy"
5. **Problem Statements**: What problems this solves

## Naming Conventions

- **Kebab-case**: `api-integration`, `test-generator`, `code-formatter`
- **Lowercase**: `helper`, not `Helper`
- **Descriptive**: Indicate domain/purpose
- **Max 64 chars**: For frontmatter name field
- **Suffix patterns**:
  - `-helper`: Utility Skills
  - `-generator`: Creation Skills
  - `-integration`: External service Skills
  - `-patterns`: Knowledge Skills

## Examples in This Directory

| Template | Purpose | Complexity | Pattern |
|----------|---------|------------|---------|
| `simple-skill/` | Basic single-file Skill | Simple | Knowledge |
| `complex-skill/` | Multi-file with progressive disclosure | Complex | Integration |

## Best Practices

### ✅ Do
- Keep Skills focused on single capability
- Write detailed, keyword-rich descriptions
- Use progressive disclosure for complex Skills
- Test discovery with realistic user phrases
- Provide examples in examples.md
- Keep SKILL.md concise (load details on-demand)
- Version control project Skills
- Document trigger keywords clearly
- Organize supporting files logically

### ❌ Don't
- Create Skills with multiple unrelated capabilities
- Write vague descriptions
- Put all documentation in SKILL.md (use supporting files)
- Skip examples for complex Skills
- Forget to test discovery
- Mix multiple domains in one Skill
- Use Skills for orchestration (use SubAgent)
- Make descriptions too generic

## Common Pitfalls

1. **Poor Discovery** - Vague description → Claude can't find it
2. **Context Overload** - Everything in SKILL.md → Use supporting files
3. **Too Broad** - Multiple capabilities → Split into focused Skills
4. **No Examples** - Users don't know how to use → Add examples.md
5. **Wrong Tool Restrictions** - Needed tool blocked → Fix allowed-tools
6. **Complex Orchestration** - Multi-step workflows → Use SubAgent instead

## Skill Lifecycle

### Development
1. Create skill directory
2. Write SKILL.md with frontmatter
3. Add supporting files if needed
4. Test discovery with realistic phrases
5. Refine description for better discovery

### Testing
1. List Skills: "What Skills are available?"
2. Test activation: Use trigger phrases
3. Verify tool restrictions work
4. Test with supporting files
5. Validate with team members

### Deployment
1. Commit to `.claude/skills/` for team
2. Or bundle in plugin for distribution
3. Document in team knowledge base
4. Monitor usage and refine

## Integration with Other Features

### Skills + Commands
Commands can explicitly invoke Skills:
```markdown
---
description: Use API integration Skill
allowed-tools: Skill, Read
---

Use the api-integration Skill to connect to ${API_NAME}...
```

### Skills + SubAgents
Agents can use Skills:
```markdown
---
name: integration-agent
tools: Skill, Read, Write, Bash
---

You have access to the api-integration Skill for API work...
```

### Skills + Hooks
Hooks can react to Skill usage:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Skill",
        "hooks": [{"type": "command", "command": "..."}]
      }
    ]
  }
}
```

## Plugin Distribution

To distribute Skills via plugin:

1. Place in `plugins/{plugin-name}/skills/skill-name/`
2. Reference in plugin.json:
   ```json
   {
     "name": "my-plugin",
     "skills": "./skills"
   }
   ```
3. Skills become available automatically when plugin enabled

## Debugging Skills

### Skill Not Discovered

**Symptoms**: Claude doesn't activate your Skill

**Solutions**:
1. Check description has relevant keywords
2. Test with explicit phrases from description
3. Verify SKILL.md frontmatter is valid YAML
4. Check file location is correct
5. Restart Claude Code to reload

### Skill Loads Wrong Files

**Symptoms**: Supporting files not found or incorrect

**Solutions**:
1. Use relative paths from SKILL.md location
2. Verify file names match references
3. Check file permissions
4. Ensure files are in correct subdirectories

### Tool Restrictions Don't Work

**Symptoms**: Claude uses tools not in allowed-tools

**Solutions**:
1. Verify allowed-tools syntax (comma-separated)
2. Check for typos in tool names
3. Ensure YAML frontmatter is valid
4. Test with simple tool list first

## Additional Resources

- **Claude Code Docs**: `@docs/claude-code/skills.md`
- **CARL Examples**: `@plugins/carl/skills/`
- **Command Templates**: `@.claude/.carl/templates/commands/`
- **SubAgent Templates**: `@.claude/.carl/templates/agents/`
- **Available Tools**: Read, Write, Edit, Grep, Glob, Bash, Task, etc.

---

**Next Steps**:
1. Review template files in subdirectories
2. Choose simple or complex template based on needs
3. Copy and customize for your use case
4. Test discovery thoroughly
5. Deploy to team or plugin
