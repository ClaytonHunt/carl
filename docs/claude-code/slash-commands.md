# Custom Slash Commands

> **Source:** [Claude Code Documentation - Slash Commands](https://docs.claude.com/en/docs/claude-code/slash-commands.md)
>
> **Last Updated:** 2025-11-03

## Overview

Slash commands control Claude's behavior during interactive sessions. Claude Code provides built-in commands, supports custom commands via Markdown files, integrates plugin commands, and connects to MCP server prompts.

## Built-in Commands

The platform includes 24 built-in commands including:

- **Conversation management**: `/clear`, `/compact`, `/rewind`
- **Configuration**: `/config`, `/status`, `/settings`
- **Development tools**: `/review`, `/sandbox`, `/terminal-setup`
- **Account management**: `/login`, `/logout`
- **Diagnostics**: `/doctor`, `/cost`, `/usage`

## Custom Slash Commands

Users can create reusable prompts as Markdown files organized by scope.

### Project vs. Personal Commands

**Project commands** reside in `.claude/commands/` and are shared with teams, appearing with "(project)" in help text.

**Personal commands** live in `~/.claude/commands/` and work across projects, labeled "(user)" in help.

### Key Features

**Namespacing**: Subdirectories organize commands without affecting invocation names.

**Arguments**: Commands support `$ARGUMENTS` for all values or `$1`, `$2` for specific positional parameters.

**Bash execution**: Commands can run shell operations using the `!` prefix with specified `allowed-tools`.

**File references**: Include file contents using `@` prefix syntax.

**Extended thinking**: Commands can trigger thinking mode via keywords.

### Frontmatter Options

Commands support metadata including `description`, `allowed-tools`, `argument-hint`, `model`, and `disable-model-invocation` settings.

## Plugin and MCP Commands

**Plugin commands** are distributed through marketplaces and follow the format `/plugin-name:command-name`.

**MCP commands** connect to external servers using the pattern `/mcp__server__prompt-name` with dynamic discovery when servers are active.

## SlashCommand Tool

This tool enables Claude to execute custom commands programmatically during conversations. It requires command descriptions and respects permission rules with support for exact and prefix matching.

## Slash Commands vs. Skills

Slash commands suit quick, single-file prompts you invoke explicitly. Skills work better for complex capabilities spanning multiple files that Claude discovers automatically based on context. Both approaches can coexist in projects.
