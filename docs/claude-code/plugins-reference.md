# Plugins Reference

> **Source:** [Claude Code Documentation - Plugins Reference](https://docs.claude.com/en/docs/claude-code/plugins-reference.md)
>
> **Last Updated:** 2025-11-03

## Overview

This technical documentation covers the complete plugin system for Claude Code, detailing five primary component types that plugins can provide.

## Five Plugin Component Types

**Commands**: Markdown files in the `commands/` directory that add custom slash commands to Claude Code.

**Agents**: Markdown files describing specialized subagents that Claude can invoke automatically. Located in `agents/` directory with capabilities defined in frontmatter.

**Skills**: Model-invoked extensions placed in `skills/` directories as `SKILL.md` files. "Plugin Skills are automatically discovered when the plugin is installed" and Claude determines usage based on task context.

**Hooks**: JSON-configured event handlers responding to Claude Code events like `PreToolUse`, `PostToolUse`, and `SessionStart`. Support command execution, validation, and notifications.

**MCP Servers**: Model Context Protocol servers bundled via `.mcp.json` configuration, "start automatically when the plugin is enabled" and integrate as standard tools.

## Plugin Manifest Requirements

The `plugin.json` file must include:
- **Required**: `name` field (unique, kebab-case identifier)
- **Optional metadata**: version, description, author, homepage, repository, license, keywords
- **Component paths**: `commands`, `agents`, `hooks`, `mcpServers` fields

All paths must be relative and prefixed with `./`; the `${CLAUDE_PLUGIN_ROOT}` variable provides the absolute plugin directory path.

## Directory Structure

The `.claude-plugin/` directory contains only `plugin.json`. All component directories (`commands/`, `agents/`, `skills/`, `hooks/`) must exist at the plugin root level.

## Development Tools

Run `claude --debug` to troubleshoot plugin loading issues, validate manifest syntax, and verify command/agent registration.
