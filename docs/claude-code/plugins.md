# Plugins

> **Source:** [Claude Code Documentation - Plugins](https://docs.claude.com/en/docs/claude-code/plugins.md)
>
> **Last Updated:** 2025-11-03

## Overview

The plugin system enables extending Claude Code through custom commands, agents, hooks, Skills, and MCP servers that can be shared across projects and teams.

## Core Components

Plugins consist of these optional elements:

- **Commands**: Slash commands defined in markdown files within a `commands/` directory
- **Agents**: Custom agent definitions in an `agents/` directory
- **Skills**: Agent capabilities organized in `skills/` subdirectories with `SKILL.md` files
- **Hooks**: Event handlers configured via `hooks/hooks.json`
- **MCP servers**: External tool integration through `.mcp.json`

Every plugin requires a manifest at `.claude-plugin/plugin.json` containing metadata like name, description, version, and author information.

## Installation Workflow

Users can discover and install plugins through marketplaces using either:

1. **Interactive menu**: `/plugin` command opens a browsable interface
2. **Direct commands**: `/plugin install plugin-name@marketplace-name`

Additional management commands include enabling, disabling, and uninstalling plugins without removing them entirely.

## Development Process

Creating plugins involves:

1. Establishing a marketplace structure with `.claude-plugin/marketplace.json`
2. Building plugin directories with required manifest files
3. Adding components (commands, agents, skills, hooks) as needed
4. Testing locally before distribution
5. Iterating through uninstall/reinstall cycles during development

## Team Implementation

Teams can configure automatic plugin installation by adding marketplace and plugin specifications to `.claude/settings.json` in their repository. Once team members trust the folder, Claude Code automatically installs designated plugins.

## Distribution

Ready-to-share plugins should include documentation, semantic versioning, and be published through marketplaces for discoverable installation by other users.
