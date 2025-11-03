# CARL Plugin Settings System

> **Version:** 1.0.0
> **Last Updated:** 2025-11-03

## Overview

The CARL plugin settings system provides a standardized, schema-validated approach for managing plugin configuration. Settings are stored in JSON format, validated on session start, and made available to all plugin components (agents, commands, skills, hooks, and MCP servers) via environment variables.

## Architecture

### Directory Structure

```
# Plugin Directory (distributed with plugin)
plugins/[plugin]/
├── lib/
│   ├── load-settings.sh           # SessionStart: Load & validate
│   ├── get-setting.sh             # Get specific setting value
│   └── validate-schema.sh         # JSON schema validation
├── defaults/
│   └── settings.json              # Default settings template
├── schema/
│   └── settings-schema.json       # JSON schema for validation
└── hooks/
    └── hooks.json                 # SessionStart hook configuration

# Project Directory (user's project)
${CLAUDE_PROJECT_DIR}/.claude/.carl/
└── [plugin-name].settings.json    # User-modifiable settings
```

### Key Components

1. **Settings File**: JSON file in user's project directory (`.claude/.carl/[plugin].settings.json`)
2. **Schema**: JSON schema for validation (`plugins/[plugin]/schema/settings-schema.json`)
3. **Defaults**: Template settings copied on first run (`plugins/[plugin]/defaults/settings.json`)
4. **Scripts**: Bash scripts for loading, validating, and retrieving settings
5. **Hook**: SessionStart hook that loads settings into environment variables

---

## Settings File Format

### Basic Structure

```json
{
  "$schema": "../schema/settings-schema.json",
  "plugin": "my-plugin",
  "version": "1.0.0",
  "settings": {
    "feature_flags": {},
    "configuration": {},
    "agent_settings": {},
    "command_settings": {},
    "hook_settings": {},
    "skill_settings": {},
    "mcp_settings": {}
  }
}
```

### Complete Example

```json
{
  "$schema": "../schema/settings-schema.json",
  "plugin": "my-plugin",
  "version": "1.0.0",
  "settings": {
    "feature_flags": {
      "enable_advanced_mode": true,
      "enable_debug_logging": false,
      "auto_commit": false
    },
    "configuration": {
      "api_endpoint": "${ENV:API_ENDPOINT}",
      "timeout_ms": 5000,
      "max_retries": 3,
      "cache_dir": "/tmp/cache"
    },
    "agent_settings": {
      "default_model": "sonnet",
      "max_tokens": 4096,
      "temperature": 0.7
    },
    "command_settings": {
      "verbose_output": true,
      "confirm_before_action": false
    },
    "hook_settings": {
      "validation_level": "strict",
      "fail_on_warning": true
    },
    "skill_settings": {
      "auto_discover": true,
      "cache_results": true
    },
    "mcp_settings": {
      "server_port": 3000,
      "auth_token": "${ENV:MCP_AUTH_TOKEN}",
      "ssl_enabled": false
    }
  },
  "metadata": {
    "last_updated": "2025-11-03T12:00:00Z",
    "updated_by": "user@example.com"
  }
}
```

### Environment Variable Substitution

Settings support environment variable substitution using the `${ENV:VAR_NAME}` syntax:

```json
{
  "settings": {
    "configuration": {
      "api_key": "${ENV:MY_API_KEY}",
      "database_url": "${ENV:DATABASE_URL}"
    }
  }
}
```

**Important:** Environment variables are expanded during the SessionStart hook, so they must be set before Claude Code starts.

---

## How It Works

### Settings Flow

```
1. User starts Claude Code in project
   ↓
2. SessionStart hook fires
   ↓
3. load-settings.sh runs:
   - Checks for ${CLAUDE_PROJECT_DIR}/.claude/.carl/[plugin].settings.json
   - If missing, copies from ${CLAUDE_PLUGIN_ROOT}/defaults/settings.json
   - Validates JSON syntax with jq
   - Validates against schema (${CLAUDE_PLUGIN_ROOT}/schema/settings-schema.json)
   - Expands ${ENV:VAR} references
   - Exports settings as CARL_* environment variables to CLAUDE_ENV_FILE
   ↓
4. Settings now available to ALL bash commands for entire session
   ↓
5. Components consume settings:
   - Via ${CLAUDE_PLUGIN_ROOT}/lib/get-setting.sh [path]
   - Or directly via $CARL_* environment variables
```

### Environment Variable Naming

Settings are exported as environment variables with this naming convention:

```
CARL_[PLUGIN_NAME]_[SECTION]_[KEY]
```

**Examples:**

| Setting Path | Environment Variable |
|-------------|---------------------|
| `settings.configuration.timeout_ms` | `CARL_MY_PLUGIN_CONFIGURATION_TIMEOUT_MS` |
| `settings.feature_flags.enable_debug` | `CARL_MY_PLUGIN_FEATURE_FLAGS_ENABLE_DEBUG` |
| `settings.agent_settings.default_model` | `CARL_MY_PLUGIN_AGENT_SETTINGS_DEFAULT_MODEL` |

---

## Usage in Plugin Components

### 1. Agents

Agents can read settings using the getter script in their instructions:

```markdown
---
name: code-reviewer
description: Reviews code with configurable strictness
---

You are a code review agent with configurable behavior.

## Check Settings

!bash ${CLAUDE_PLUGIN_ROOT}/lib/get-setting.sh feature_flags.enable_advanced_mode

If advanced mode is enabled (true), perform deep static analysis.
Otherwise, perform standard review.

## Get Model Preference

!bash ${CLAUDE_PLUGIN_ROOT}/lib/get-setting.sh agent_settings.default_model

Use this model for any sub-agent invocations.
```

### 2. Commands

Commands can access settings via environment variables or the getter script:

```markdown
---
description: Deploy with configurable settings
allowed-tools: [Bash, Read, Write]
---

# Deploy Command

## Option 1: Direct Environment Variables

!bash echo "Timeout: $CARL_MY_PLUGIN_CONFIGURATION_TIMEOUT_MS"
!bash echo "Retries: $CARL_MY_PLUGIN_CONFIGURATION_MAX_RETRIES"
!bash echo "Endpoint: $CARL_MY_PLUGIN_CONFIGURATION_API_ENDPOINT"

## Option 2: Use Getter Script

!bash ${CLAUDE_PLUGIN_ROOT}/lib/get-setting.sh configuration.api_endpoint

Deploy to the configured endpoint with specified timeout and retry settings.
```

### 3. Skills

Skills document available settings for Claude to understand:

```markdown
---
name: api-integration
description: Integrate with external APIs using configured endpoints
---

# API Integration Skill

This skill integrates with external APIs using settings from the CARL configuration.

## Available Settings

- `configuration.api_endpoint` - API base URL
- `configuration.timeout_ms` - Request timeout in milliseconds
- `configuration.max_retries` - Number of retry attempts

## Usage

When working with APIs, check the endpoint configuration:

!bash ${CLAUDE_PLUGIN_ROOT}/lib/get-setting.sh configuration.api_endpoint

Use this endpoint for all API calls. Apply timeout and retry settings from configuration.
```

### 4. Hooks

Hooks can access settings directly via environment variables:

```json
{
  "hooks": [
    {
      "name": "validate-before-deploy",
      "event": "PreToolUse",
      "command": "bash -c 'if [ \"$CARL_MY_PLUGIN_HOOK_SETTINGS_VALIDATION_LEVEL\" = \"strict\" ]; then echo \"✓ Strict validation enabled\"; fi'",
      "filter": {
        "tools": ["Bash"]
      },
      "description": "Apply validation based on settings"
    }
  ]
}
```

### 5. MCP Servers

MCP servers receive settings as environment variables:

```json
{
  "mcpServers": {
    "my-mcp-server": {
      "command": "node",
      "args": ["server.js"],
      "env": {
        "API_ENDPOINT": "${CARL_MY_PLUGIN_CONFIGURATION_API_ENDPOINT}",
        "TIMEOUT_MS": "${CARL_MY_PLUGIN_CONFIGURATION_TIMEOUT_MS}",
        "AUTH_TOKEN": "${CARL_MY_PLUGIN_MCP_SETTINGS_AUTH_TOKEN}"
      }
    }
  }
}
```

---

## Scripts Reference

### load-settings.sh

**Location:** `${CLAUDE_PLUGIN_ROOT}/lib/load-settings.sh`

**Purpose:** Load, validate, and export settings as environment variables

**Called by:** SessionStart hook

**Behavior:**
1. Checks if settings file exists in project directory
2. If missing, copies defaults from plugin
3. Validates JSON syntax
4. Validates against schema
5. Expands `${ENV:VAR}` references
6. Exports all settings as `CARL_*` environment variables
7. Fails with clear error messages if validation fails

**Error Handling:**
- Missing or invalid JSON → Exit 1, session cannot start
- Schema validation failure → Exit 1, session cannot start
- Missing environment variables → Replaced with empty string

---

### get-setting.sh

**Location:** `${CLAUDE_PLUGIN_ROOT}/lib/get-setting.sh`

**Purpose:** Retrieve a specific setting value

**Usage:**
```bash
${CLAUDE_PLUGIN_ROOT}/lib/get-setting.sh <setting-path>
```

**Examples:**
```bash
# Get timeout value
${CLAUDE_PLUGIN_ROOT}/lib/get-setting.sh configuration.timeout_ms
# Output: 5000

# Get feature flag
${CLAUDE_PLUGIN_ROOT}/lib/get-setting.sh feature_flags.enable_debug
# Output: true

# Get model preference
${CLAUDE_PLUGIN_ROOT}/lib/get-setting.sh agent_settings.default_model
# Output: sonnet
```

**Error Handling:**
- Setting not found → Exit 1, prints error message
- No setting path provided → Exit 1, prints usage

---

### validate-schema.sh

**Location:** `${CLAUDE_PLUGIN_ROOT}/lib/validate-schema.sh`

**Purpose:** Validate settings JSON against schema

**Usage:**
```bash
${CLAUDE_PLUGIN_ROOT}/lib/validate-schema.sh <settings-file> <schema-file>
```

**Validation Tools:**
1. **Preferred:** Uses `ajv-cli` if available (full JSON schema validation)
2. **Fallback:** Uses `jq` for basic validation (required fields, null checks)

**Error Handling:**
- Schema validation failure → Exit 1, prints validation errors
- Missing required fields → Exit 1, prints missing field names

---

## Error Handling

### Fail-Fast Philosophy

The CARL settings system follows a **fail-fast** approach:

> **If settings are broken, the session cannot start.**

This ensures:
- Plugin behavior is predictable
- Configuration errors are caught immediately
- Users receive clear error messages

### Common Errors

#### 1. Invalid JSON Syntax

```
ERROR: Invalid JSON in settings file: /path/to/carl.settings.json
CARL cannot continue with malformed settings.
Please fix the JSON syntax errors and restart.
```

**Solution:** Fix JSON syntax errors (missing commas, brackets, quotes, etc.)

#### 2. Schema Validation Failure

```
ERROR: Settings validation failed for my-plugin
CARL cannot continue with invalid settings.
Please fix validation errors in: /path/to/my-plugin.settings.json
```

**Solution:** Check that all required fields are present and values match expected types

#### 3. Setting Not Found

```
ERROR: Setting not found: configuration.timeout_ms for plugin my-plugin
Available settings are exported as CARL_MY_PLUGIN_* environment variables
Check your settings file: /path/to/my-plugin.settings.json
```

**Solution:** Add the missing setting to your settings file or check the setting path

---

## Best Practices

### 1. Provide Sensible Defaults

Always include a complete `defaults/settings.json` with reasonable values:

```json
{
  "plugin": "my-plugin",
  "version": "1.0.0",
  "settings": {
    "feature_flags": {
      "enable_experimental": false
    },
    "configuration": {
      "timeout_ms": 5000,
      "max_retries": 3
    }
  }
}
```

### 2. Document All Settings

In your plugin's README or docs, document:
- What each setting does
- Valid values/ranges
- Default values
- Examples

### 3. Use Semantic Versioning

Update the `version` field when making breaking changes to settings structure:

```json
{
  "plugin": "my-plugin",
  "version": "2.0.0",  // Breaking change
  "settings": { ... }
}
```

### 4. Use Environment Variables for Secrets

Never commit secrets to settings files. Use environment variable substitution:

```json
{
  "settings": {
    "configuration": {
      "api_key": "${ENV:MY_PLUGIN_API_KEY}",
      "database_password": "${ENV:DB_PASSWORD}"
    }
  }
}
```

### 5. Organize Settings by Category

Use the standard categories for consistency:

- `feature_flags`: Boolean toggles
- `configuration`: General config (URLs, timeouts, etc.)
- `agent_settings`: Agent-specific settings
- `command_settings`: Command-specific settings
- `hook_settings`: Hook-specific settings
- `skill_settings`: Skill-specific settings
- `mcp_settings`: MCP server settings

### 6. Validate Early, Fail Fast

Use the SessionStart hook to catch configuration errors immediately:

```json
{
  "hooks": [
    {
      "name": "carl-load-settings",
      "event": "SessionStart",
      "command": "bash ${CLAUDE_PLUGIN_ROOT}/lib/load-settings.sh",
      "description": "Load and validate settings"
    }
  ]
}
```

---

## Troubleshooting

### Settings Not Loading

**Check:**
1. Hook is configured in `hooks/hooks.json`
2. Scripts have execute permissions (`chmod +x lib/*.sh`)
3. `jq` is installed and available in PATH

### Environment Variables Not Available

**Check:**
1. SessionStart hook completed successfully
2. Variable name matches expected format: `CARL_[PLUGIN]_[SECTION]_[KEY]`
3. Settings were actually defined in the settings file

### Schema Validation Failing

**Check:**
1. All required fields are present: `plugin`, `version`, `settings`
2. Field types match schema expectations
3. Consider installing `ajv-cli` for better error messages: `npm install -g ajv-cli`

---

## Example: Adding a New Setting

Let's add a `retry_delay_ms` setting:

### 1. Update Defaults

```json
{
  "plugin": "my-plugin",
  "version": "1.0.0",
  "settings": {
    "configuration": {
      "timeout_ms": 5000,
      "max_retries": 3,
      "retry_delay_ms": 1000  // NEW SETTING
    }
  }
}
```

### 2. Update User's Settings

Edit `${CLAUDE_PROJECT_DIR}/.claude/.carl/my-plugin.settings.json`:

```json
{
  "settings": {
    "configuration": {
      "retry_delay_ms": 2000
    }
  }
}
```

### 3. Use in Component

In an agent, command, or skill:

```bash
!bash ${CLAUDE_PLUGIN_ROOT}/lib/get-setting.sh configuration.retry_delay_ms
```

Or access directly:

```bash
!bash echo "Retry delay: $CARL_MY_PLUGIN_CONFIGURATION_RETRY_DELAY_MS"
```

### 4. Document It

Add to your plugin's documentation:

```markdown
## Configuration Settings

- `configuration.retry_delay_ms` - Delay between retry attempts in milliseconds (default: 1000)
```

---

## FAQ

### Q: Where should I store settings?

**A:** Settings files live in `${CLAUDE_PROJECT_DIR}/.claude/.carl/[plugin-name].settings.json`. They are project-specific and should be committed to version control (unless they contain secrets).

### Q: Can I have different settings per project?

**A:** Yes! Each project has its own `.claude/.carl/` directory with independent settings files. When you start Claude Code in a project for the first time, defaults are copied automatically.

### Q: How do I share settings across projects?

**A:** Settings are intentionally project-specific. If you want consistent settings, create a template `settings.json` and copy it to new projects, or use environment variables for shared values.

### Q: Can I add custom setting categories?

**A:** Yes! The schema allows additional properties. You can add custom categories beyond the standard ones:

```json
{
  "settings": {
    "my_custom_category": {
      "custom_setting": "value"
    }
  }
}
```

### Q: What happens if settings file is deleted?

**A:** On the next session start, the SessionStart hook will detect the missing file and copy defaults from the plugin automatically.

### Q: Can I disable settings validation?

**A:** No. Validation is mandatory to ensure plugin reliability. If you encounter validation issues, fix the settings file rather than bypassing validation.

---

## Summary

The CARL plugin settings system provides:

✅ **Standardized format** - JSON with schema validation
✅ **Automatic loading** - SessionStart hook loads settings once per session
✅ **Environment variables** - Settings available as `CARL_*` env vars
✅ **Fail-fast validation** - Broken settings prevent session start
✅ **Default values** - Pit of success with sensible defaults
✅ **Per-project isolation** - Each project has independent settings
✅ **Secret management** - Environment variable substitution for sensitive data
✅ **Clear errors** - Helpful error messages guide users to solutions

For questions or issues, please refer to the main CARL documentation or open an issue on the GitHub repository.
