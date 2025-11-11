# CARL Template Library

This directory contains comprehensive templates for all Claude Code extensibility features, designed following **IndyDevDan's Agentic Orchestration Patterns** and Claude Code best practices.

## Purpose

These templates serve multiple purposes:
1. **Starting Points** - Copy and modify for new features
2. **Reference Examples** - See proper structure and best practices
3. **Documentation** - Understand when and how to use each feature type
4. **RAG Context** - AI-readable documentation for code generation
5. **Critique & Review** - Clear examples for evaluating architecture

## Template Organization

```
templates/
├── README.md (this file)
├── commands/
│   ├── README.md (Command documentation)
│   ├── simple-command.md (Basic command template)
│   ├── orchestrator-command.md (HOP pattern template)
│   └── examples/
│       ├── file-processor.md
│       └── workflow-trigger.md
├── agents/
│   ├── README.md (SubAgent documentation)
│   ├── simple-agent.md (Basic agent template)
│   ├── orchestrator-agent.md (Coordinator template)
│   ├── specialist-agent.md (Focused agent template)
│   └── examples/
│       ├── code-analyzer.md
│       └── test-runner.md
├── skills/
│   ├── README.md (Skill documentation)
│   ├── simple-skill/
│   │   ├── SKILL.md
│   │   └── reference.md
│   ├── complex-skill/
│   │   ├── SKILL.md
│   │   ├── reference.md
│   │   ├── examples.md
│   │   └── templates/
│   └── examples/
│       └── api-integration/
├── hooks/
│   ├── README.md (Hook documentation & patterns)
│   ├── hooks-template.json (Full hooks.json template)
│   ├── scripts/
│   │   ├── pre-tool-use.sh
│   │   ├── post-tool-use.sh
│   │   ├── session-start.sh
│   │   └── user-prompt-submit.sh
│   └── examples/
│       ├── validation-hook.json
│       └── notification-hook.json
├── workflows/
│   ├── README.md (Orchestration patterns & complexity guide)
│   ├── patterns/
│   │   ├── hop-lop.md
│   │   ├── parallel-execution.md
│   │   ├── sequential-chain.md
│   │   └── event-driven.md
│   └── complexity-guidelines.md
├── mcp/
│   ├── README.md (MCP server documentation)
│   ├── mcp-config-template.json
│   └── examples/
│       └── simple-server/
└── plugins/
    ├── README.md (Plugin structure documentation)
    ├── plugin-manifest-template.json
    └── examples/
        └── minimal-plugin/
```

## Quick Reference

### When to Use Each Feature

| Feature | Use When | Discovery | Context |
|---------|----------|-----------|---------|
| **Command** | User explicitly invokes | User types `/command` | Shared with main thread |
| **SubAgent** | Need separate context or specialized expertise | Auto or explicit | Separate context window |
| **Skill** | Claude should discover automatically | Claude detects trigger keywords | Shared with main thread |
| **Hook** | React to events or validate operations | Automatic on events | N/A (bash scripts) |

### Complexity Guidelines

| Feature | Simple | Medium | Complex | Split When |
|---------|--------|--------|---------|------------|
| **Command** | <50 lines | 50-100 lines | >100 lines | Needs separate context → SubAgent |
| **SubAgent** | Single responsibility | Multiple sections | Orchestrator | Doing unrelated things → Multiple agents |
| **Skill** | Single file | Multi-file with docs | Scripts + templates | Too many capabilities → Multiple skills |
| **Hook** | Single operation | Multiple checks | LLM evaluation | Hard to maintain → External scripts |

### Orchestration Patterns

| Pattern | Implementation | Use When |
|---------|---------------|----------|
| **HOP/LOP** | Command → SubAgent(s) | Complex workflows with specialists |
| **Sequential** | Chain agents in order | Clear dependencies |
| **Parallel** | Multiple Task calls | Independent subtasks |
| **Hierarchical** | Agent spawns subagents | Clean separation needed |
| **Event-Driven** | Hooks coordinate workflow | Long-running, distributed |

## IndyDevDan's Core Principles

Templates are designed around these key principles:

1. **Planning Over Prompting** - "Success is Planned"
2. **Composability First** - Reusable building blocks
3. **Specialization Architecture** - "A focused agent is a performant agent"
4. **Observable by Default** - Real-time monitoring
5. **Async When Possible** - "Do more when possible, wait when needed"
6. **Clean Context Separation** - Each agent has clean context
7. **Event-Sourced Coordination** - Use hooks for monitoring
8. **Graceful Degradation** - Handle failures independently

## Template Naming Conventions

- **Kebab-case** for all identifiers: `my-feature-name`
- **Lowercase** for names
- **Descriptive** names indicating purpose
- **Max 64 characters** for frontmatter names

## Using These Templates

### For New Features
1. Navigate to the appropriate template directory
2. Copy the relevant template file(s)
3. Modify for your specific use case
4. Review the README in that directory for specific guidance

### For Learning
1. Read the feature-specific README files
2. Review examples to see patterns in action
3. Compare simple vs complex templates
4. Study workflow patterns for orchestration

### For AI/RAG
These templates are designed to be AI-readable with:
- Clear structure and formatting
- Inline documentation and comments
- Examples showing proper usage
- Explicit best practices and anti-patterns

## Common Anti-Patterns to Avoid

1. **Monolithic Orchestrators** - Don't build one agent that does everything
2. **Tight Coupling** - Avoid direct agent-to-agent dependencies
3. **Blocking Execution** - Don't wait when you could parallelize
4. **Context Overload** - Don't share entire context with every agent
5. **Manual Intervention** - Don't require human input mid-workflow
6. **Vague Descriptions** - Be specific about when/how to use
7. **Poor Tool Restrictions** - Limit tools to minimum required
8. **Missing Documentation** - Always document why and when

## Additional Resources

- **Claude Code Documentation**: `@docs/claude-code/`
- **IndyDevDan Patterns**: `@docs/indydevdan/agentic-orchestration-patterns.md`
- **CARL Plugin Examples**: `@plugins/carl/`
- **CARL Settings**: `.claude/.carl/carl.settings.json`

## Contributing

When creating new templates:
1. Follow existing structure and conventions
2. Include comprehensive documentation
3. Provide both simple and complex examples
4. Document complexity considerations
5. Add to appropriate README files
6. Test templates before committing

---

**Note**: These templates represent best practices as of the current Claude Code version. Always check official documentation for the latest features and guidelines.
