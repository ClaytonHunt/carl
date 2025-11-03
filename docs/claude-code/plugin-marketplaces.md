# Plugin Marketplaces

> **Source:** [Claude Code Documentation - Plugin Marketplaces](https://docs.claude.com/en/docs/claude-code/plugin-marketplaces.md)
>
> **Last Updated:** 2025-11-03

## Overview

Plugin marketplaces are JSON-based catalogs for discovering, installing, and managing Claude Code extensions. They enable "centralized discovery" and "version management" across distributed plugin sources.

## Adding and Using Marketplaces

### Commands for Marketplace Installation

Users can add marketplaces from multiple sources:

- **GitHub repositories**: `/plugin marketplace add owner/repo`
- **Git services**: `/plugin marketplace add https://gitlab.com/company/plugins.git`
- **Local directories**: `/plugin marketplace add ./my-marketplace`
- **Direct JSON files**: `/plugin marketplace add https://url.of/marketplace.json`

After adding a marketplace, users browse plugins with `/plugin` or install specific ones using `/plugin install plugin-name@marketplace-name`.

### Team Configuration

Organizations can configure automatic marketplace installation in `.claude/settings.json` using the `extraKnownMarketplaces` field with GitHub or Git source specifications.

## Creating Your Own Marketplace

### Required Structure

Marketplaces need a `.claude-plugin/marketplace.json` file containing:

- **name**: Marketplace identifier (kebab-case)
- **owner**: Maintainer information object
- **plugins**: Array of plugin entries

### Plugin Entry Requirements

Each plugin entry requires:

- **name**: Plugin identifier (kebab-case)
- **source**: Plugin location (relative path, GitHub repo, or Git URL)

Optional fields include description, version, author, homepage, repository, license, keywords, category, and component configuration paths (commands, agents, hooks, mcpServers).

### Source Types Supported

Plugins can be sourced from:

- Relative paths within the same repository
- GitHub repositories using `{"source": "github", "repo": "owner/repo"}`
- Git repositories using `{"source": "url", "url": "https://..."}`

## Hosting and Distribution

### Primary Methods

- **GitHub (recommended)**: Create repository with marketplace file; share via `/plugin marketplace add owner/repo`
- **Alternative git services**: Use full URLs to GitLab or other providers
- **Local testing**: Add local paths before distribution

## Marketplace Operations

Manage marketplaces using:

- `/plugin marketplace list` - View all configured marketplaces
- `/plugin marketplace update marketplace-name` - Refresh metadata
- `/plugin marketplace remove marketplace-name` - Remove marketplace

**Warning:** Removing a marketplace uninstalls all associated plugins.

## Troubleshooting

Common issues include inaccessible URLs, missing `.claude-plugin/marketplace.json` files, and invalid JSON syntax. Validate marketplaces locally before distribution using `claude plugin validate`.

## Next Steps

Users should explore community marketplaces, while creators should focus on themed collections, clear versioning, and documentation. Organizations can establish internal marketplaces aligned with governance policies.
