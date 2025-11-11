# Minimal Plugin Example

A minimal Claude Code plugin demonstrating the basic structure and components.

## Overview

This is the simplest possible plugin with:
- Plugin manifest (`.claude-plugin/plugin.json`)
- Single command (`commands/example-command.md`)
- Documentation (this README)

## Installation

### From Local Path
```bash
/plugin install /path/to/minimal-plugin
```

### From Git Repository
```bash
/plugin install https://github.com/username/minimal-plugin
```

### Via Marketplace
```bash
/plugin install minimal-plugin@marketplace-name
```

## Features

### Commands

**`/minimal-plugin:example-command [name]`**
- Greets the user by name
- Demonstrates basic command structure
- Shows parameter handling

## Usage

After installation, invoke the command:

```bash
# Basic greeting
/minimal-plugin:example-command

# Personalized greeting
/minimal-plugin:example-command Alice

# With full name
/minimal-plugin:example-command "Alice Smith"
```

## Project Structure

```
minimal-plugin/
├── .claude-plugin/
│   └── plugin.json          # Plugin manifest
├── commands/
│   └── example-command.md   # Example command
└── README.md                # This file
```

## Extending This Plugin

### Add More Commands

1. Create new `.md` file in `commands/`:
   ```bash
   touch commands/my-command.md
   ```

2. Add frontmatter and instructions:
   ```markdown
   ---
   description: What my command does
   ---

   # My Command

   Instructions for Claude...
   ```

3. Reinstall plugin to test:
   ```bash
   /plugin uninstall minimal-plugin
   /plugin install /path/to/minimal-plugin
   ```

### Add Agents

1. Create `agents/` directory:
   ```bash
   mkdir agents
   ```

2. Add agent file:
   ```bash
   touch agents/my-agent.md
   ```

3. Update `plugin.json`:
   ```json
   {
     "name": "minimal-plugin",
     "commands": "./commands",
     "agents": "./agents"
   }
   ```

### Add Skills

1. Create `skills/` directory structure:
   ```bash
   mkdir -p skills/my-skill
   ```

2. Add skill file:
   ```bash
   touch skills/my-skill/SKILL.md
   ```

3. Update `plugin.json`:
   ```json
   {
     "name": "minimal-plugin",
     "commands": "./commands",
     "skills": "./skills"
   }
   ```

### Add Hooks

1. Create hooks structure:
   ```bash
   mkdir -p hooks/scripts
   touch hooks/hooks.json
   ```

2. Configure hooks in `hooks.json`

3. Update `plugin.json`:
   ```json
   {
     "name": "minimal-plugin",
     "commands": "./commands",
     "hooks": "./hooks/hooks.json"
   }
   ```

### Add MCP Server

1. Create server:
   ```bash
   mkdir servers
   touch servers/my-server.js
   touch .mcp.json
   ```

2. Configure in `.mcp.json`

3. Update `plugin.json`:
   ```json
   {
     "name": "minimal-plugin",
     "commands": "./commands",
     "mcpServers": "./.mcp.json"
   }
   ```

## Development Workflow

1. **Make Changes**
   - Edit commands, agents, etc.
   - Update version in `plugin.json`

2. **Test Locally**
   ```bash
   /plugin uninstall minimal-plugin
   /plugin install /path/to/minimal-plugin
   ```

3. **Verify Changes**
   - Test all commands
   - Check agents auto-discover
   - Verify hooks trigger
   - Test MCP tools

4. **Document**
   - Update README.md
   - Add examples
   - Document changes

5. **Release**
   - Tag version in git
   - Update marketplace (if applicable)
   - Announce to users

## Customization

### Change Plugin Name

1. Update `plugin.json`:
   ```json
   {
     "name": "your-plugin-name"
   }
   ```

2. Users will then invoke commands as:
   ```
   /your-plugin-name:command-name
   ```

### Add Metadata

Enhance `plugin.json` with:
```json
{
  "name": "minimal-plugin",
  "version": "1.0.0",
  "description": "Your description",
  "author": {
    "name": "Your Name",
    "email": "you@example.com"
  },
  "homepage": "https://github.com/you/plugin",
  "repository": "https://github.com/you/plugin",
  "license": "MIT",
  "keywords": ["tag1", "tag2"]
}
```

## Best Practices

1. **Version Properly**
   - Use semantic versioning
   - Update on each change
   - Tag releases in git

2. **Document Thoroughly**
   - Clear README
   - Command descriptions
   - Usage examples

3. **Test Before Release**
   - Install/uninstall cycle
   - Test all features
   - Verify error handling

4. **Keep It Simple**
   - One plugin = related features
   - Don't mix unrelated tools
   - Clear naming conventions

## Troubleshooting

**Plugin won't install**:
- Check `plugin.json` syntax
- Verify paths are correct
- Use `claude --debug` for details

**Commands not showing**:
- Check frontmatter in `.md` files
- Verify `commands` path in `plugin.json`
- Reinstall plugin

**Wrong command invocation**:
- Commands use pattern: `/plugin-name:command-name`
- Plugin name from `name` field in `plugin.json`
- Command name from filename (without `.md`)

## Additional Resources

- **Plugin Templates**: `@.claude/.carl/templates/plugins/`
- **Command Templates**: `@.claude/.carl/templates/commands/`
- **Agent Templates**: `@.claude/.carl/templates/agents/`
- **Claude Code Docs**: https://docs.claude.com/claude-code

## License

MIT

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request
