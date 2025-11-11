# Simple MCP Server Example

A minimal Model Context Protocol server demonstrating basic tool implementation.

## Overview

This example shows how to create a simple MCP server with three tools:
- **echo** - Echo back a message
- **add** - Add two numbers
- **get_timestamp** - Get current timestamp in ISO or Unix format

## Installation

```bash
npm install
```

## Testing Locally

```bash
# Start the server
node server.js

# Or use npm
npm start
```

## Configuration

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "simple": {
      "command": "node",
      "args": ["/absolute/path/to/server.js"],
      "env": {
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

## Using in Plugin

1. Copy this directory to your plugin
2. Update plugin's `.mcp.json`:
   ```json
   {
     "mcpServers": {
       "simple": {
         "command": "node",
         "args": ["${CLAUDE_PLUGIN_ROOT}/servers/simple-server/server.js"]
       }
     }
   }
   ```
3. Reference in `plugin.json`:
   ```json
   {
     "name": "my-plugin",
     "mcpServers": "./.mcp.json"
   }
   ```

## Available Tools

When the server is running, Claude can use these tools:

### mcp__simple__echo
Echo back a message.

**Parameters**:
- `message` (string, required) - The message to echo

**Example**:
```
Claude will invoke: mcp__simple__echo with message "Hello!"
Result: "Echo: Hello!"
```

### mcp__simple__add
Add two numbers together.

**Parameters**:
- `a` (number, required) - First number
- `b` (number, required) - Second number

**Example**:
```
Claude will invoke: mcp__simple__add with a=5, b=3
Result: "5 + 3 = 8"
```

### mcp__simple__get_timestamp
Get the current timestamp.

**Parameters**:
- `format` (string, optional) - Either "iso" or "unix" (default: "iso")

**Example**:
```
Claude will invoke: mcp__simple__get_timestamp with format="unix"
Result: "Current timestamp (unix): 1699564800"
```

## Code Structure

```javascript
// 1. Create server
const server = new Server({ name, version }, { capabilities });

// 2. List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: [...] };
});

// 3. Handle tool invocations
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  // Execute tool and return results
});

// 4. Start server with stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
```

## Extending This Example

To add a new tool:

1. **Add to ListToolsRequestSchema handler**:
   ```javascript
   {
     name: 'my_tool',
     description: 'What this tool does',
     inputSchema: {
       type: 'object',
       properties: {
         param: { type: 'string', description: 'Parameter description' }
       },
       required: ['param']
     }
   }
   ```

2. **Add case to CallToolRequestSchema handler**:
   ```javascript
   case 'my_tool': {
     const { param } = args;
     // Validate input
     // Execute logic
     return {
       content: [{ type: 'text', text: result }]
     };
   }
   ```

## Best Practices

1. **Validate all inputs** before processing
2. **Handle errors gracefully** and return user-friendly messages
3. **Use descriptive names** for tools and parameters
4. **Document parameter schemas** clearly
5. **Log to stderr** (stdout is reserved for protocol)
6. **Return structured responses** with proper content types

## Troubleshooting

**Server won't start**:
- Check Node.js version (>= 18.0.0)
- Verify dependencies are installed (`npm install`)
- Check for syntax errors in server.js

**Tools not appearing**:
- Verify server is running (`claude --debug`)
- Check .mcp.json configuration
- Ensure paths use `${CLAUDE_PLUGIN_ROOT}` for plugins

**Tool invocation fails**:
- Check parameter validation logic
- Review error messages in stderr
- Test tool logic independently

## Additional Resources

- MCP SDK Documentation: https://github.com/modelcontextprotocol/sdk
- MCP Specification: https://modelcontextprotocol.io/
- CARL MCP Templates: `@.claude/.carl/templates/mcp/`
