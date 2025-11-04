# CARL Hook Utilities

This directory contains shared utility modules used by CARL notification hooks.

## Available Modules

### settings-loader.cjs

Loads CARL settings from the settings file and injects them into `process.env` for hooks to use.

**Usage:**
```javascript
const { loadSettingsIntoEnv } = require('./lib/settings-loader.cjs');

// In your hook, after determining the project directory and plugin root:
loadSettingsIntoEnv(CLAUDE_PROJECT_DIR, CLAUDE_PLUGIN_ROOT);

// Now you can access settings via environment variables:
const enabled = process.env.CARL_CARL_NOTIFICATIONS_ENABLED === 'true';
```

**Why this is needed:**

Claude Code's `CLAUDE_ENV_FILE` persistence mechanism (used during SessionStart) doesn't always guarantee that environment variables will be available in subsequent hook invocations. This utility ensures hooks can always access settings by loading them directly from the settings file.

**How it works:**

1. Locates the settings file at `.claude/.carl/{plugin-name}.settings.json`
2. Recursively flattens nested objects into environment variable keys
3. Converts arrays to JSON strings
4. Injects all settings into `process.env` with the prefix `CARL_{PLUGIN_NAME}_`

**Example:**

Given settings:
```json
{
  "settings": {
    "notifications": {
      "enabled": true,
      "tool_events": {
        "tools": {
          "git_operations": {
            "enabled": true,
            "messages": {
              "after_success": "Git operation completed"
            }
          }
        }
      }
    }
  }
}
```

Environment variables created:
```
CARL_CARL_NOTIFICATIONS_ENABLED=true
CARL_CARL_NOTIFICATIONS_TOOL_EVENTS_TOOLS_GIT_OPERATIONS_ENABLED=true
CARL_CARL_NOTIFICATIONS_TOOL_EVENTS_TOOLS_GIT_OPERATIONS_MESSAGES_AFTER_SUCCESS=Git operation completed
```

## Adding New Utilities

When creating new shared utilities for hooks:

1. Create a new `.cjs` file in this directory
2. Export functions using `module.exports`
3. Document the utility in this README
4. Update existing hooks to use the shared utility if applicable
