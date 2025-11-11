# MCP Server Templates

Model Context Protocol (MCP) servers extend Claude Code with custom tools, resources, and prompts through standardized server interfaces.

## Overview

**MCP Servers** are standalone processes that communicate with Claude Code via the Model Context Protocol. They provide tools (functions Claude can call), resources (data Claude can access), and prompts (templates Claude can use).

## When to Use MCP Servers

### ✅ Use MCP Servers When:
- Need external tool integration (APIs, databases, services)
- Want to expose system capabilities to Claude
- Building reusable tool libraries
- Need to maintain state between invocations
- Want language-agnostic tool implementation
- Sharing tools across multiple AI applications
- Need fine-grained access control
- Building production-grade integrations

### ❌ Don't Use MCP Servers When:
- Simple bash scripts suffice → Use **Hooks**
- One-off project-specific logic → Use **Hooks** or direct bash
- No external dependencies needed → Use built-in tools
- Workflow orchestration only → Use **Commands** or **SubAgents**

## MCP vs Other Features

| Feature | Purpose | When to Use |
|---------|---------|-------------|
| **MCP Server** | External tool integration | APIs, databases, system services |
| **Hook** | Event-driven automation | Git notifications, validation, monitoring |
| **Command** | User-invoked workflow | Reusable prompts, quick actions |
| **SubAgent** | Specialized AI task | Complex analysis, orchestration |
| **Skill** | Auto-discovered capability | Contextual assistance, templates |

## Configuration Format

MCP servers are configured in `.mcp.json` files with this structure:

```json
{
  "mcpServers": {
    "server-name": {
      "command": "node",
      "args": ["path/to/server.js"],
      "env": {
        "API_KEY": "your-api-key",
        "CONFIG_PATH": "${CLAUDE_PLUGIN_ROOT}/config.json"
      }
    }
  }
}
```

### Configuration Locations

- **Project**: `.claude/.mcp.json` (shared with team)
- **Personal**: `~/.claude/.mcp.json` (user-specific)
- **Plugin**: `plugins/{plugin-name}/.mcp.json` (bundled with plugin)

**Precedence**: Project > Personal > Plugin

## Tool Naming Patterns

MCP tools are exposed to Claude with this naming pattern:

```
mcp__<server-name>__<tool-name>
```

**Examples**:
- `mcp__github__create_issue`
- `mcp__database__query`
- `mcp__filesystem__read_file`

This naming prevents conflicts and clearly identifies the tool source.

## Integration with Plugins

### Plugin Structure
```
my-plugin/
├── .claude-plugin/
│   └── plugin.json          # References .mcp.json
├── .mcp.json                # MCP server config
├── servers/
│   ├── my-server.js         # Server implementation
│   └── package.json         # Server dependencies
└── README.md
```

### Plugin Manifest
```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "Plugin with MCP server",
  "mcpServers": "./.mcp.json"
}
```

### Automatic Server Startup

MCP servers configured in plugins:
1. **Start automatically** when plugin is enabled
2. **Stop automatically** when plugin is disabled
3. **Restart** when configuration changes
4. **Share lifecycle** with the plugin

## Hook Patterns for MCP Tools

You can use hooks to monitor or validate MCP tool usage:

### Example: Log MCP Tool Calls
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "mcp__*",
        "hooks": [
          {
            "type": "command",
            "command": "echo \"MCP tool called: ${TOOL_NAME}\" >> mcp-usage.log"
          }
        ]
      }
    ]
  }
}
```

### Example: Validate API Calls
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "mcp__api__*",
        "hooks": [
          {
            "type": "command",
            "command": "bash scripts/validate-api-access.sh \"${TOOL_NAME}\""
          }
        ]
      }
    ]
  }
}
```

## Environment Variables

### Special Variables

- **`${CLAUDE_PLUGIN_ROOT}`** - Absolute path to plugin directory
- **`${HOME}`** - User home directory
- **`${PWD}`** - Current working directory

### Common Patterns

**API Keys**:
```json
{
  "env": {
    "OPENAI_API_KEY": "${OPENAI_API_KEY}",
    "GITHUB_TOKEN": "${GITHUB_TOKEN}"
  }
}
```

**Configuration Paths**:
```json
{
  "env": {
    "CONFIG_PATH": "${CLAUDE_PLUGIN_ROOT}/config.json",
    "DATA_DIR": "${HOME}/.claude/data"
  }
}
```

**Runtime Settings**:
```json
{
  "env": {
    "LOG_LEVEL": "info",
    "MAX_RETRIES": "3",
    "TIMEOUT_MS": "5000"
  }
}
```

## Server Implementation Languages

MCP servers can be implemented in any language:

### Node.js (Recommended)
```json
{
  "command": "node",
  "args": ["${CLAUDE_PLUGIN_ROOT}/servers/server.js"]
}
```

### Python
```json
{
  "command": "python",
  "args": ["${CLAUDE_PLUGIN_ROOT}/servers/server.py"]
}
```

### Binary
```json
{
  "command": "${CLAUDE_PLUGIN_ROOT}/bin/server"
}
```

### npm Package
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/root"]
}
```

## Server Capabilities

MCP servers can provide:

### 1. Tools
Functions Claude can invoke:
```javascript
server.tool({
  name: "get_weather",
  description: "Get current weather for a location",
  parameters: {
    location: { type: "string", description: "City name" }
  }
}, async ({ location }) => {
  const weather = await fetchWeather(location);
  return { temperature: weather.temp, conditions: weather.conditions };
});
```

### 2. Resources
Data Claude can read:
```javascript
server.resource({
  uri: "database://users",
  name: "User Database",
  description: "List of all users"
}, async () => {
  const users = await db.query("SELECT * FROM users");
  return { mimeType: "application/json", text: JSON.stringify(users) };
});
```

### 3. Prompts
Templates Claude can use:
```javascript
server.prompt({
  name: "code_review",
  description: "Structured code review template",
  parameters: {
    language: { type: "string", description: "Programming language" }
  }
}, async ({ language }) => {
  return {
    messages: [
      { role: "user", content: `Review this ${language} code...` }
    ]
  };
});
```

## Security Best Practices

### 1. Validate Input
Always validate tool parameters:
```javascript
if (!isValidPath(filepath)) {
  throw new Error("Invalid file path");
}
```

### 2. Restrict Access
Limit what the server can access:
```javascript
const ALLOWED_DIRS = ["/safe/path1", "/safe/path2"];
if (!ALLOWED_DIRS.some(dir => filepath.startsWith(dir))) {
  throw new Error("Access denied");
}
```

### 3. Environment Variables
Never hardcode secrets:
```javascript
// ✅ Good
const apiKey = process.env.API_KEY;

// ❌ Bad
const apiKey = "sk-1234567890";
```

### 4. Error Handling
Don't leak sensitive information:
```javascript
try {
  await apiCall();
} catch (error) {
  // ❌ Don't expose internal details
  // throw error;

  // ✅ Return generic message
  throw new Error("API request failed");
}
```

## Testing MCP Servers

### 1. Local Testing
```bash
# Start server manually
node servers/my-server.js

# Test with MCP inspector
npx @modelcontextprotocol/inspector node servers/my-server.js
```

### 2. Debug Mode
```bash
# Run Claude Code with debug logging
claude --debug
```

### 3. Validation
- Test each tool with various inputs
- Verify error handling
- Check performance with large inputs
- Test concurrent requests
- Validate environment variable substitution

## Common Patterns

### Pattern 1: API Integration
Server wraps external API:
```javascript
server.tool({
  name: "create_issue",
  description: "Create GitHub issue"
}, async ({ title, body }) => {
  const response = await github.issues.create({
    owner: "org",
    repo: "repo",
    title,
    body
  });
  return { url: response.data.html_url };
});
```

### Pattern 2: Database Access
Server provides database operations:
```javascript
server.tool({
  name: "query",
  description: "Execute SQL query"
}, async ({ sql }) => {
  const results = await db.query(sql);
  return { rows: results };
});
```

### Pattern 3: File System Operations
Server exposes controlled file access:
```javascript
server.tool({
  name: "read_config",
  description: "Read configuration file"
}, async ({ name }) => {
  const path = join(CONFIGS_DIR, `${name}.json`);
  const content = await readFile(path, 'utf8');
  return { content: JSON.parse(content) };
});
```

### Pattern 4: External Service Integration
Server connects to third-party services:
```javascript
server.tool({
  name: "send_notification",
  description: "Send Slack notification"
}, async ({ channel, message }) => {
  await slack.chat.postMessage({
    channel,
    text: message
  });
  return { success: true };
});
```

## Examples in This Directory

| Template | Purpose | Complexity |
|----------|---------|------------|
| `mcp-config-template.json` | Complete configuration reference | Reference |
| `examples/simple-server/` | Minimal working MCP server | Simple |

## Troubleshooting

### Server Won't Start
1. Check command path is correct
2. Verify environment variables are set
3. Check server logs for errors
4. Test server manually from command line

### Tools Not Appearing
1. Verify server started successfully
2. Check tool naming follows pattern
3. Review server implementation
4. Run with `--debug` flag

### Permission Errors
1. Check file/directory permissions
2. Verify access restrictions in server code
3. Review environment variable values

## Best Practices

### ✅ Do
- Use descriptive server and tool names
- Validate all inputs thoroughly
- Handle errors gracefully
- Log important operations
- Document tool parameters clearly
- Use environment variables for configuration
- Test with various inputs
- Implement timeouts for external calls
- Version your server implementations

### ❌ Don't
- Hardcode secrets or API keys
- Expose unrestricted file system access
- Return sensitive data in error messages
- Skip input validation
- Ignore error handling
- Use blocking operations without timeouts
- Create overly broad tools
- Mix multiple unrelated capabilities in one server

## Plugin Distribution

To distribute MCP servers via plugin:

1. **Package server code** in plugin directory
2. **Include dependencies** (package.json, etc.)
3. **Reference in plugin.json**:
   ```json
   {
     "name": "my-plugin",
     "mcpServers": "./.mcp.json"
   }
   ```
4. **Document required environment variables** in README
5. **Test installation process** on clean system

## Additional Resources

- **Claude Code Docs**: `@docs/claude-code/plugins.md`
- **MCP Specification**: https://modelcontextprotocol.io/
- **Plugin Examples**: `@plugins/carl/`
- **Hook Templates**: `@.claude/.carl/templates/hooks/`

---

**Next Steps**:
1. Review template files in this directory
2. Copy `mcp-config-template.json` for your server
3. Implement server in your preferred language
4. Test locally before bundling in plugin
5. Document configuration requirements
