# Plugin Templates

Plugins are packages of commands, agents, skills, hooks, and MCP servers that extend Claude Code and can be shared across projects and teams.

## Overview

**Plugins** bundle multiple Claude Code extensibility features into a single distributable package. They enable:
- **Team collaboration** - Share custom workflows across projects
- **Community distribution** - Publish to plugin marketplaces
- **Modular architecture** - Organize related features together
- **Easy installation** - One-command setup for users
- **Automatic updates** - Centralized version management

## When to Use Plugins

### ✅ Use Plugins When:
- Sharing features across multiple projects
- Distributing to team or community
- Bundling related commands/agents/skills
- Including MCP servers with configuration
- Need version management
- Want marketplace distribution
- Building reusable toolkits

### ❌ Don't Use Plugins When:
- Single project-specific features → Use `.claude/` directory
- One-off custom prompts → Use project commands
- Quick prototyping → Start in project, convert to plugin later

## Plugin Structure

### Minimal Plugin
```
my-plugin/
├── .claude-plugin/
│   └── plugin.json          # Required: Plugin manifest
└── README.md                # Recommended: Documentation
```

### Full Plugin
```
my-plugin/
├── .claude-plugin/
│   └── plugin.json          # Plugin manifest
├── commands/
│   ├── command1.md
│   └── command2.md
├── agents/
│   ├── agent1.md
│   └── agent2.md
├── skills/
│   └── skill1/
│       ├── SKILL.md
│       └── reference.md
├── hooks/
│   ├── hooks.json
│   └── scripts/
│       └── validation.sh
├── servers/
│   └── my-server.js
├── .mcp.json                # MCP server configuration
├── package.json             # If using npm dependencies
├── README.md                # User documentation
└── LICENSE                  # License file
```

## Plugin Manifest (plugin.json)

### Location
**Required**: `.claude-plugin/plugin.json`

This directory contains **only** the manifest file. All other components go in the plugin root.

### Complete Template
```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "Brief description of what this plugin provides",
  "author": {
    "name": "Author Name",
    "email": "author@example.com",
    "url": "https://example.com"
  },
  "homepage": "https://github.com/username/my-plugin",
  "repository": "https://github.com/username/my-plugin",
  "license": "MIT",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "commands": "./commands",
  "agents": "./agents",
  "skills": "./skills",
  "hooks": "./hooks/hooks.json",
  "mcpServers": "./.mcp.json"
}
```

### Required Fields

Only **`name`** is required. All other fields are optional but recommended.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `name` | string | Unique identifier, kebab-case | `"my-plugin"` |

### Optional Metadata Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `version` | string | Semantic version | `"1.2.3"` |
| `description` | string | Brief description (1-2 sentences) | `"Tools for API development"` |
| `author` | object/string | Author information | `{"name": "John", "email": "..."}` |
| `homepage` | string | Plugin homepage URL | `"https://github.com/..."` |
| `repository` | string | Source repository URL | `"https://github.com/..."` |
| `license` | string | License identifier | `"MIT"`, `"Apache-2.0"` |
| `keywords` | array | Search keywords | `["api", "tools", "dev"]` |

### Component Path Fields

All paths are **relative** and must be prefixed with `./`

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `commands` | string | Commands directory | `"./commands"` |
| `agents` | string | Agents directory | `"./agents"` |
| `skills` | string | Skills directory | `"./skills"` |
| `hooks` | string | Hooks config file | `"./hooks/hooks.json"` |
| `mcpServers` | string | MCP config file | `"./.mcp.json"` |

### Special Variables

**`${CLAUDE_PLUGIN_ROOT}`** - Absolute path to plugin directory

Use in hooks, MCP configs, and scripts:
```json
{
  "command": "bash",
  "args": ["${CLAUDE_PLUGIN_ROOT}/scripts/validate.sh"]
}
```

## Component Organization

### Commands
```
commands/
├── action1.md
├── action2.md
└── category/
    └── specific-action.md
```

Invoked as:
- `/plugin-name:action1`
- `/plugin-name:action2`
- `/plugin-name:specific-action` (subdirectories don't affect naming)

### Agents
```
agents/
├── specialist1.md
├── specialist2.md
└── orchestrator.md
```

Auto-discovered based on frontmatter `description` field.

### Skills
```
skills/
├── skill1/
│   ├── SKILL.md
│   └── reference.md
└── skill2/
    ├── SKILL.md
    ├── reference.md
    └── examples.md
```

Auto-discovered when plugin is installed.

### Hooks
```
hooks/
├── hooks.json
└── scripts/
    ├── pre-tool.sh
    └── post-tool.sh
```

Reference in hooks.json:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/pre-tool.sh"
          }
        ]
      }
    ]
  }
}
```

### MCP Servers
```
servers/
├── server1.js
├── server2.py
└── package.json
```

Reference in .mcp.json:
```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/servers/server1.js"]
    }
  }
}
```

## Plugin Lifecycle

### Development

1. **Create plugin directory**:
   ```bash
   mkdir my-plugin
   cd my-plugin
   ```

2. **Create manifest**:
   ```bash
   mkdir .claude-plugin
   # Create .claude-plugin/plugin.json
   ```

3. **Add components**:
   ```bash
   mkdir commands agents
   # Create your commands, agents, etc.
   ```

4. **Test locally**:
   ```bash
   # Install from local path
   /plugin install /path/to/my-plugin
   ```

5. **Iterate**:
   ```bash
   # Uninstall, make changes, reinstall
   /plugin uninstall my-plugin
   # Make changes
   /plugin install /path/to/my-plugin
   ```

### Distribution

#### Option 1: Plugin Marketplace

1. **Create marketplace** (see marketplace templates)
2. **Add plugin to marketplace**
3. **Users install via**:
   ```
   /plugin install my-plugin@marketplace-name
   ```

#### Option 2: Direct Installation

Users install from:
- **Local path**: `/plugin install /path/to/plugin`
- **Git URL**: `/plugin install https://github.com/user/plugin`
- **npm package**: `/plugin install npm:package-name`

#### Option 3: Team Auto-Install

Add to `.claude/settings.json`:
```json
{
  "plugins": {
    "marketplaces": ["https://example.com/marketplace.json"],
    "install": ["my-plugin@my-marketplace"]
  }
}
```

Team members automatically get the plugin when they trust the folder.

## Plugin Management

### Interactive (Recommended)

```bash
/plugin                    # Open plugin browser
/plugin install <name>     # Install plugin
/plugin uninstall <name>   # Uninstall plugin
/plugin enable <name>      # Enable plugin
/plugin disable <name>     # Disable plugin
/plugin list               # List installed plugins
```

### Settings File

Plugins are installed to:
- **Personal**: `~/.claude/plugins/`
- **Project**: `.claude/plugins/` (if configured)

Configuration in `~/.claude/settings.json`:
```json
{
  "plugins": {
    "enabled": ["plugin1", "plugin2"],
    "disabled": ["plugin3"],
    "install": ["plugin1@marketplace"]
  }
}
```

## Versioning

Follow **Semantic Versioning** (semver):

- **MAJOR.MINOR.PATCH** (e.g., `1.2.3`)
- **MAJOR** - Breaking changes
- **MINOR** - New features, backward compatible
- **PATCH** - Bug fixes, backward compatible

### Version Constraints

Users can specify version constraints:
```
/plugin install my-plugin@^1.2.0    # >=1.2.0 <2.0.0
/plugin install my-plugin@~1.2.0    # >=1.2.0 <1.3.0
/plugin install my-plugin@1.2.3     # Exact version
```

## Best Practices

### ✅ Do

**Documentation**:
- Include comprehensive README.md
- Document all commands, agents, and tools
- Provide usage examples
- List prerequisites and dependencies
- Document required environment variables

**Organization**:
- Use clear, consistent naming
- Group related features
- Keep components focused
- Follow directory structure conventions

**Versioning**:
- Use semantic versioning
- Maintain changelog
- Tag releases in git
- Document breaking changes

**Testing**:
- Test all components before releasing
- Test installation process
- Verify uninstall is clean
- Test with different configurations

**Quality**:
- Write clear descriptions
- Provide helpful error messages
- Handle edge cases gracefully
- Include input validation

### ❌ Don't

- Mix unrelated features in one plugin
- Skip documentation
- Hardcode paths or secrets
- Use absolute paths (use `${CLAUDE_PLUGIN_ROOT}`)
- Ignore error handling
- Release without testing
- Break semantic versioning contract
- Include sensitive data in repository

## Common Patterns

### Pattern 1: Tool Suite Plugin
Bundle related commands and tools:
```
api-tools/
├── .claude-plugin/plugin.json
├── commands/
│   ├── api-test.md
│   ├── api-docs.md
│   └── api-mock.md
└── README.md
```

### Pattern 2: Workflow Plugin
Combine commands, agents, and hooks:
```
ci-workflow/
├── .claude-plugin/plugin.json
├── commands/deploy.md
├── agents/deployment-orchestrator.md
├── hooks/
│   ├── hooks.json
│   └── scripts/validate-tests.sh
└── README.md
```

### Pattern 3: MCP Integration Plugin
Package MCP server with commands:
```
github-integration/
├── .claude-plugin/plugin.json
├── commands/pr-review.md
├── servers/github-server.js
├── .mcp.json
├── package.json
└── README.md
```

### Pattern 4: Skill Library Plugin
Share reusable skills:
```
code-patterns/
├── .claude-plugin/plugin.json
├── skills/
│   ├── react-component/
│   ├── api-endpoint/
│   └── test-suite/
└── README.md
```

## Examples in This Directory

| Template | Purpose | Complexity |
|----------|---------|------------|
| `plugin-manifest-template.json` | Complete manifest reference | Reference |
| `examples/minimal-plugin/` | Minimal working plugin | Simple |

## Troubleshooting

### Plugin Won't Install
- Check plugin.json syntax
- Verify all referenced paths exist
- Review error message in debug mode: `claude --debug`

### Components Not Loading
- Check component paths in plugin.json
- Verify files exist at specified locations
- Check frontmatter in commands/agents
- Review hooks.json syntax

### MCP Servers Not Starting
- Verify .mcp.json configuration
- Check server dependencies are installed
- Test server independently
- Review logs with `claude --debug`

### Plugin Conflicts
- Check for name conflicts with other plugins
- Review command/agent names for collisions
- Verify plugin names are unique in marketplace

## Security Considerations

### Code Review
- Review all plugin code before installation
- Check for suspicious operations
- Verify network requests are legitimate
- Examine file system access patterns

### Trust
- Only install from trusted sources
- Review plugin repository history
- Check author reputation
- Verify marketplace credibility

### Permissions
- Limit hook access to necessary operations
- Restrict MCP server capabilities
- Use environment variables for secrets
- Never commit API keys or tokens

## Additional Resources

- **Claude Code Docs**: `@docs/claude-code/plugins.md`
- **Plugin Reference**: `@docs/claude-code/plugins-reference.md`
- **Marketplace Guide**: `@docs/claude-code/plugin-marketplaces.md`
- **MCP Templates**: `@.claude/.carl/templates/mcp/`
- **Command Templates**: `@.claude/.carl/templates/commands/`
- **Agent Templates**: `@.claude/.carl/templates/agents/`
- **Hook Templates**: `@.claude/.carl/templates/hooks/`

---

**Next Steps**:
1. Review template files in this directory
2. Copy `plugin-manifest-template.json` to start
3. Add your components (commands, agents, etc.)
4. Test locally before distribution
5. Document thoroughly in README.md
6. Publish to marketplace or share directly
