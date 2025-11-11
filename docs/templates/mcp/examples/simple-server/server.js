#!/usr/bin/env node

/**
 * Simple MCP Server Example
 *
 * This is a minimal Model Context Protocol server that demonstrates:
 * - Basic server setup
 * - Tool registration
 * - Parameter handling
 * - Error handling
 *
 * Usage:
 *   node server.js
 *
 * Or via MCP configuration:
 *   {
 *     "mcpServers": {
 *       "simple": {
 *         "command": "node",
 *         "args": ["path/to/server.js"]
 *       }
 *     }
 *   }
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * Create the MCP server instance
 */
const server = new Server(
  {
    name: 'simple-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Register available tools
 *
 * This handler lists all tools that Claude can invoke.
 * Each tool should have a clear name, description, and parameter schema.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'echo',
        description: 'Echo back the provided message',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'The message to echo back',
            },
          },
          required: ['message'],
        },
      },
      {
        name: 'add',
        description: 'Add two numbers together',
        inputSchema: {
          type: 'object',
          properties: {
            a: {
              type: 'number',
              description: 'First number',
            },
            b: {
              type: 'number',
              description: 'Second number',
            },
          },
          required: ['a', 'b'],
        },
      },
      {
        name: 'get_timestamp',
        description: 'Get the current timestamp',
        inputSchema: {
          type: 'object',
          properties: {
            format: {
              type: 'string',
              description: 'Format: "iso" or "unix"',
              enum: ['iso', 'unix'],
            },
          },
        },
      },
    ],
  };
});

/**
 * Handle tool invocations
 *
 * This handler executes the requested tool and returns results.
 * Always validate inputs and handle errors gracefully.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'echo': {
        const { message } = args;

        // Validate input
        if (typeof message !== 'string') {
          throw new Error('message must be a string');
        }

        return {
          content: [
            {
              type: 'text',
              text: `Echo: ${message}`,
            },
          ],
        };
      }

      case 'add': {
        const { a, b } = args;

        // Validate inputs
        if (typeof a !== 'number' || typeof b !== 'number') {
          throw new Error('Both a and b must be numbers');
        }

        const result = a + b;

        return {
          content: [
            {
              type: 'text',
              text: `${a} + ${b} = ${result}`,
            },
          ],
        };
      }

      case 'get_timestamp': {
        const { format = 'iso' } = args;
        const now = new Date();

        let timestamp;
        if (format === 'unix') {
          timestamp = Math.floor(now.getTime() / 1000);
        } else {
          timestamp = now.toISOString();
        }

        return {
          content: [
            {
              type: 'text',
              text: `Current timestamp (${format}): ${timestamp}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    // Return error in a user-friendly format
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * Start the server
 */
async function main() {
  // Use stdio transport for communication with Claude Code
  const transport = new StdioServerTransport();

  // Connect server to transport
  await server.connect(transport);

  // Log to stderr (stdout is used for protocol communication)
  console.error('Simple MCP Server running on stdio');
  console.error('Available tools: echo, add, get_timestamp');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
