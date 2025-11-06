# Claude Code Subagents Documentation

## Overview
Subagents are specialized AI assistants that Claude Code can delegate tasks to. Each operates with its own context window, custom system prompt, and configurable tool access, enabling more efficient problem-solving for specific domains.

## Key Features

**Core Benefits:**
- Context preservation through separate context windows
- Task-specific expertise via customized configurations
- Reusability across projects and teams
- Flexible tool permission controls

## Quick Start
1. Run `/agents` command
2. Select "Create New Agent"
3. Choose project or user-level scope
4. Define subagent with description and tools
5. Save and invoke automatically or explicitly

## Configuration Structure

**File Locations:**
- Project subagents: `.claude/agents/`
- User subagents: `~/.claude/agents/`
- Project-level takes precedence

**File Format:** Markdown with YAML frontmatter containing:
- `name`: Unique identifier (lowercase, hyphens)
- `description`: When to invoke the subagent
- `tools`: Optional comma-separated tool list (inherits all if omitted)
- `model`: Optional model specification or `'inherit'`

## Tool & Model Configuration

Subagents can specify tool access or inherit from main thread. Model options include aliases (`sonnet`, `opus`, `haiku`) or `'inherit'` for consistency with main conversation.

## Management Methods

**Via `/agents` command (recommended):** Interactive interface for creating, editing, and managing subagents with tool selection.

**Direct file management:** Create Markdown files in appropriate directories with YAML configuration.

## Invocation Patterns

**Automatic delegation:** Claude detects matching tasks based on subagent descriptions and invokes automatically.

**Explicit invocation:** Request specific subagents by name in commands.

## Built-in & Example Subagents

Includes Plan subagent for plan mode research. Examples provided for code review, debugging, and data science workflows.

## Advanced Capabilities

- Subagent chaining for complex workflows
- Dynamic selection based on context
- Resumable agents for long-running tasks (via `agentId`)
- CLI-based configuration using `--agents` JSON flag

## Best Practices

Design focused agents with single responsibilities, write detailed system prompts, limit tool access appropriately, and version control project subagents for team collaboration.
