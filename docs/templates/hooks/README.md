# Hook Templates

Hooks are automated actions triggered by specific events in Claude Code, enabling validation, automation, and integration with external systems.

## Overview

**Hooks** are shell commands or LLM prompts that execute automatically during specific events in your Claude Code workflow. They enable validation, automation, notifications, and integration patterns without requiring user intervention.

## When to Use Hooks

### ✅ Use Hooks When:
- Need automatic validation or security checks
- Want to automate repetitive tasks
- Need integration with external systems
- Want to enforce coding standards
- Need real-time notifications
- Want to add context automatically
- Need to track tool usage or events
- Want to prevent certain operations

### ❌ Don't Use Hooks When:
- User should explicitly trigger action → Use **Slash Command**
- Need complex multi-step logic → Use **SubAgent**
- Want user-controlled behavior → Use **Slash Command**
- Simple one-time automation → Run manually

## File Structure

### Location
- **User**: `~/.claude/settings.json` (personal hooks)
- **Project**: `.claude/settings.json` (team hooks, committed)
- **Local**: `.claude/settings.local.json` (local overrides, not committed)
- **Plugin**: `plugins/{plugin-name}/hooks/hooks.json`

**Precedence**: Local > Project > User > Plugin

### Format

```json
{
  "hooks": {
    "EventName": [
      {
        "matcher": "ToolPattern",
        "hooks": [
          {
            "type": "command",
            "command": "bash-command-here",
            "timeout": 60
          }
        ]
      }
    ]
  }
}
```

## Hook Events

### PreToolUse
**When**: After Claude creates tool parameters, before execution
**Matchers**: Task, Bash, Glob, Grep, Read, Edit, Write, WebFetch, WebSearch, SlashCommand
**Use for**: Validation, security checks, parameter modification, blocking operations

**Example**: Prevent writing to sensitive files
```json
{
  "PreToolUse": [
    {
      "matcher": "Write|Edit",
      "hooks": [
        {
          "type": "command",
          "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/validate-file.sh"
        }
      ]
    }
  ]
}
```

### PostToolUse
**When**: Immediately after tool completes successfully
**Matchers**: Same as PreToolUse
**Use for**: Notifications, logging, formatting, cleanup, triggering downstream actions

**Example**: Format code after writing
```json
{
  "PostToolUse": [
    {
      "matcher": "Write|Edit",
      "hooks": [
        {
          "type": "command",
          "command": "prettier --write \"$file_path\""
        }
      ]
    }
  ]
}
```

### UserPromptSubmit
**When**: User submits prompt, before Claude processes it
**Matchers**: None (applies to all prompts)
**Use for**: Prompt validation, context injection, user guidance, blocking prompts

**Example**: Add project context to prompts
```json
{
  "UserPromptSubmit": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/inject-context.sh"
        }
      ]
    }
  ]
}
```

### SessionStart
**When**: Session startup, resume, clear, or compact
**Matchers**: `startup`, `resume`, `clear`, `compact`
**Use for**: Environment setup, dependency checks, loading context, setting variables

**Example**: Load development environment
```json
{
  "SessionStart": [
    {
      "matcher": "startup|resume",
      "hooks": [
        {
          "type": "command",
          "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/setup-env.sh"
        }
      ]
    }
  ]
}
```

### SessionEnd
**When**: Session ends (cannot block termination)
**Matchers**: `clear`, `logout`, `prompt_input_exit`, `other`
**Use for**: Cleanup, saving state, notifications

**Example**: Save session metrics
```json
{
  "SessionEnd": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/save-metrics.sh"
        }
      ]
    }
  ]
}
```

### Stop
**When**: Main Claude agent finishes responding (not on user interrupt)
**Matchers**: None
**Use for**: Validation before completion, triggering follow-up tasks, logging

**Example**: Validate work completion
```json
{
  "Stop": [
    {
      "hooks": [
        {
          "type": "prompt",
          "prompt": "Review the session and determine if all tasks are complete: $ARGUMENTS",
          "timeout": 30
        }
      ]
    }
  ]
}
```

### SubagentStop
**When**: SubAgent (Task tool) finishes responding
**Matchers**: None
**Use for**: Orchestration coordination, result validation, event publishing

**Example**: Log subagent completion
```json
{
  "SubagentStop": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "echo 'Subagent completed' >> agent-log.txt"
        }
      ]
    }
  ]
}
```

### Notification
**When**: Claude Code sends notification (permission request, idle waiting)
**Matchers**: None
**Use for**: Custom notification handling, logging, external alerts

**Example**: Send to external system
```json
{
  "Notification": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "curl -X POST https://api.example.com/notify -d \"$ARGUMENTS\""
        }
      ]
    }
  ]
}
```

### PreCompact
**When**: Before compact operation
**Matchers**: `manual` (from /compact), `auto` (from auto-compact)
**Use for**: Pre-compact validation, backup, logging

**Example**: Backup before compacting
```json
{
  "PreCompact": [
    {
      "matcher": "manual|auto",
      "hooks": [
        {
          "type": "command",
          "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/backup-transcript.sh"
        }
      ]
    }
  ]
}
```

## Hook Types

### Command Hooks
Execute bash commands:
```json
{
  "type": "command",
  "command": "bash-command",
  "timeout": 60
}
```

### Prompt Hooks
Send to Claude Haiku for LLM evaluation (Stop and SubagentStop only):
```json
{
  "type": "prompt",
  "prompt": "Evaluate if action should proceed: $ARGUMENTS",
  "timeout": 30
}
```

## Matcher Patterns

### Exact Match
```json
"matcher": "Write"  // Matches only Write tool
```

### Regex Pattern
```json
"matcher": "Edit|Write"  // Matches Edit OR Write
"matcher": "Notebook.*"  // Matches NotebookEdit, etc.
```

### Wildcard (All)
```json
"matcher": "*"   // Matches all tools
"matcher": ""    // Also matches all
```

### MCP Tools
```json
"matcher": "mcp__memory__.*"  // All memory server tools
"matcher": "mcp__.*__read.*"  // All read operations across MCP servers
```

## Hook Input

Hooks receive JSON via stdin:

```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/transcript.jsonl",
  "cwd": "/current/working/directory",
  "permission_mode": "default|plan|acceptEdits|bypassPermissions",
  "hook_event_name": "EventName"
}
```

### Event-Specific Fields

**PreToolUse / PostToolUse**:
```json
{
  "tool_name": "Write",
  "tool_input": {"file_path": "/path", "content": "..."},
  "tool_response": {...}  // PostToolUse only
}
```

**UserPromptSubmit**:
```json
{
  "prompt": "User's prompt text"
}
```

**SessionStart**:
```json
{
  "matcher": "startup"  // or resume, clear, compact
}
```

**SessionEnd**:
```json
{
  "reason": "clear"  // or logout, prompt_input_exit, other
}
```

## Hook Output

### Exit Codes

| Code | Meaning | Behavior |
|------|---------|----------|
| **0** | Success | stdout shown to user (or added to context for UserPromptSubmit/SessionStart) |
| **2** | Blocking error | stderr fed to Claude, operation may be blocked |
| **Other** | Non-blocking error | stderr shown to user, execution continues |

### Exit Code 2 Behavior by Event

| Event | Effect |
|-------|--------|
| PreToolUse | Blocks tool call, shows error to Claude |
| PostToolUse | Shows error to Claude |
| UserPromptSubmit | Blocks prompt, erases it, shows error to user |
| Stop | Blocks stoppage, shows error to Claude |
| SubagentStop | Blocks stoppage, shows error to subagent |
| Notification | Shows error to user only |
| PreCompact | Shows error to user only |
| SessionStart | Shows error to user only |
| SessionEnd | Shows error to user only |

### JSON Output Format

Return structured JSON for advanced control:

```json
{
  "continue": true,
  "stopReason": "Optional message when continue=false",
  "suppressOutput": false,
  "systemMessage": "Optional warning to user",
  "hookSpecificOutput": {}
}
```

### PreToolUse Decision Control

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow|deny|ask",
    "permissionDecisionReason": "Explanation",
    "updatedInput": {"field": "new_value"}
  }
}
```

- **`allow`**: Bypass permission system, execute immediately
- **`deny`**: Block tool execution completely
- **`ask`**: Request user confirmation
- **`updatedInput`**: Modify tool parameters before execution

### PostToolUse Decision Control

```json
{
  "decision": "block",
  "reason": "Explanation",
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "Context for Claude"
  }
}
```

### UserPromptSubmit Decision Control

```json
{
  "decision": "block",
  "reason": "Shown to user",
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "Context added to flow"
  }
}
```

### Stop/SubagentStop Decision Control

```json
{
  "decision": "block",
  "reason": "Must provide when blocking"
}
```

## Environment Variables

### Always Available
- **`CLAUDE_PROJECT_DIR`**: Project root directory path
- **`CLAUDE_CODE_REMOTE`**: "true" for web, empty for CLI
- Standard shell environment variables

### SessionStart Only
- **`CLAUDE_ENV_FILE`**: Path to persist environment variables

**Example**: Persisting variables
```bash
#!/bin/bash
if [ -n "$CLAUDE_ENV_FILE" ]; then
  echo 'export NODE_ENV=production' >> "$CLAUDE_ENV_FILE"
  echo 'export API_KEY=xxx' >> "$CLAUDE_ENV_FILE"
fi
```

### Plugin Hooks Only
- **`CLAUDE_PLUGIN_ROOT`**: Plugin directory path

## Hook Patterns

### Pattern 1: Validation Hook
Validate before operations:
```json
{
  "PreToolUse": [
    {
      "matcher": "Write|Edit",
      "hooks": [
        {
          "type": "command",
          "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/validate.sh"
        }
      ]
    }
  ]
}
```

### Pattern 2: Notification Hook
Alert on important events:
```json
{
  "PostToolUse": [
    {
      "matcher": "Write|Edit",
      "hooks": [
        {
          "type": "command",
          "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/notify.sh"
        }
      ]
    }
  ]
}
```

### Pattern 3: Context Injection Hook
Add context automatically:
```json
{
  "UserPromptSubmit": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/inject-context.sh"
        }
      ]
    }
  ]
}
```

### Pattern 4: Orchestration Hook
Coordinate multi-agent workflows (IndyDevDan pattern):
```json
{
  "SubagentStop": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/publish-event.sh"
        }
      ]
    }
  ]
}
```

### Pattern 5: Security Hook
Enforce security policies:
```json
{
  "PreToolUse": [
    {
      "matcher": "Write",
      "hooks": [
        {
          "type": "command",
          "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/security-check.sh"
        }
      ]
    }
  ]
}
```

## Security Best Practices

### Critical: Use at Your Own Risk

Hooks execute arbitrary shell commands automatically. You bear sole responsibility for configured commands. Hooks can modify, delete, or access any files your account can reach. Poorly written or malicious hooks risk data loss or system damage.

### Security Checklist

**✅ Always**:
1. **Validate inputs** - Never trust input data blindly
2. **Quote variables** - Use `"$VAR"` not `$VAR` to prevent injection
3. **Block path traversal** - Check for `..` in file paths
4. **Use absolute paths** - Specify full paths for hook scripts
5. **Skip sensitive files** - Block `.env`, `.git/`, keys, credentials
6. **Test in safe environment** - Test thoroughly before production
7. **Use minimal permissions** - Grant only necessary access
8. **Review plugin hooks** - Audit hooks from third-party plugins

**❌ Never**:
1. Execute unvalidated user input
2. Use relative paths for critical scripts
3. Skip input sanitization
4. Trust external data sources
5. Expose credentials in hook commands
6. Ignore error handling
7. Run hooks with elevated privileges unnecessarily

### Validation Example

```bash
#!/bin/bash
# Safe file validation hook

# Read JSON input
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path')

# Validate: no path traversal
if [[ "$FILE_PATH" == *".."* ]]; then
  echo "Error: Path traversal attempt blocked" >&2
  exit 2
fi

# Validate: not sensitive file
SENSITIVE_PATTERNS=(".env" ".git/" "id_rsa" "credentials")
for pattern in "${SENSITIVE_PATTERNS[@]}"; do
  if [[ "$FILE_PATH" == *"$pattern"* ]]; then
    echo "Error: Cannot modify sensitive file: $FILE_PATH" >&2
    exit 2
  fi
done

exit 0
```

### Quoting Best Practices

**✅ Correct**:
```bash
# Properly quoted
"$CLAUDE_PROJECT_DIR"/.claude/hooks/script.sh
echo "Processing file: $file_path"
```

**❌ Incorrect**:
```bash
# Unquoted - vulnerable to injection
$CLAUDE_PROJECT_DIR/.claude/hooks/script.sh
echo Processing file: $file_path
```

## Configuration Safety

Hook configurations don't take effect immediately:

1. Claude Code captures hook snapshot at session startup
2. Uses snapshot throughout session
3. Warns if hooks modified externally during session
4. Requires `/hooks` menu review for changes to apply
5. Restart session or review changes to activate

This prevents unexpected behavior from external hook modifications.

## Examples in This Directory

| Template | Purpose | Complexity |
|----------|---------|------------|
| `hooks-template.json` | Complete hooks.json with all event types | Reference |
| `scripts/pre-tool-use.sh` | Validation and security example | Simple |
| `scripts/post-tool-use.sh` | Notification pattern | Simple |
| `scripts/session-start.sh` | Environment setup | Simple |
| `scripts/user-prompt-submit.sh` | Context injection | Simple |
| `examples/validation-hook.json` | Complete validation example | Medium |
| `examples/notification-hook.json` | Complete notification example | Medium |

## Integration with Other Features

### Hooks + Commands
Commands trigger hooks via SlashCommand tool:
```json
{
  "PreToolUse": [
    {
      "matcher": "SlashCommand",
      "hooks": [{"type": "command", "command": "log-command-usage.sh"}]
    }
  ]
}
```

### Hooks + SubAgents (Orchestration Pattern)
Coordinate multi-agent workflows using hooks:

**SubagentStop hook publishes events**:
```json
{
  "SubagentStop": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/publish-agent-complete.sh"
        }
      ]
    }
  ]
}
```

**External orchestrator coordinates based on events** (IndyDevDan pattern).

### Hooks + Skills
Skills can be monitored via Skill tool matcher:
```json
{
  "PreToolUse": [
    {
      "matcher": "Skill",
      "hooks": [{"type": "command", "command": "log-skill-usage.sh"}]
    }
  ]
}
```

## Common Use Cases

### 1. Code Formatting
Auto-format after file changes:
```json
{
  "PostToolUse": [
    {
      "matcher": "Write|Edit",
      "hooks": [
        {
          "type": "command",
          "command": "prettier --write \"$file_path\" 2>/dev/null || true"
        }
      ]
    }
  ]
}
```

### 2. Git Auto-Commit
Track changes automatically:
```json
{
  "PostToolUse": [
    {
      "matcher": "Write|Edit",
      "hooks": [
        {
          "type": "command",
          "command": "cd \"$CLAUDE_PROJECT_DIR\" && git add . && git commit -m 'Auto-commit from Claude' || true"
        }
      ]
    }
  ]
}
```

### 3. Test Running
Run tests after code changes:
```json
{
  "PostToolUse": [
    {
      "matcher": "Write|Edit",
      "hooks": [
        {
          "type": "command",
          "command": "cd \"$CLAUDE_PROJECT_DIR\" && npm test",
          "timeout": 300
        }
      ]
    }
  ]
}
```

### 4. Security Scanning
Scan for secrets before writing:
```json
{
  "PreToolUse": [
    {
      "matcher": "Write",
      "hooks": [
        {
          "type": "command",
          "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/scan-secrets.sh"
        }
      ]
    }
  ]
}
```

### 5. Multi-Agent Observability
Publish events for orchestration (IndyDevDan pattern):
```json
{
  "SubagentStop": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/webhook-publish.sh"
        }
      ]
    }
  ]
}
```

## Debugging

### View Active Hooks
```bash
# In Claude Code
/hooks
```

### Debug Mode
```bash
# Start with debug logging
claude --debug
```

Shows:
- Hook execution start
- Commands executed
- Timeouts and status codes
- Output and errors

### Common Issues

1. **Unescaped quotes**: Use `\"` inside JSON strings
2. **Wrong matcher**: Tool names are case-sensitive
3. **Missing paths**: Use full paths for scripts (`"$CLAUDE_PROJECT_DIR"/...`)
4. **Timeout issues**: Increase timeout for slow operations
5. **Exit code confusion**: Review exit code meanings above
6. **JSON parsing errors**: Validate JSON format
7. **Permission errors**: Ensure scripts are executable (`chmod +x`)

### Testing Hooks

1. Create hook in settings file
2. Create script file with proper permissions
3. Test script manually first: `bash script.sh < test-input.json`
4. Verify JSON output format if using structured output
5. Review hooks with `/hooks` command
6. Test in safe environment
7. Monitor with `--debug` flag
8. Validate exit codes and error handling

## Best Practices

### ✅ Do
- Keep hooks focused and single-purpose
- Validate all inputs thoroughly
- Use absolute paths for scripts
- Handle errors gracefully
- Test in safe environment first
- Document hook purpose in comments
- Use proper exit codes
- Quote all variables
- Set appropriate timeouts
- Version control project hooks

### ❌ Don't
- Execute unvalidated input
- Use relative paths
- Skip error handling
- Ignore security implications
- Modify sensitive files without checks
- Use overly broad matchers unnecessarily
- Run long operations without timeouts
- Expose credentials in commands
- Deploy untested hooks to production

## Plugin Distribution

To distribute hooks via plugin:

1. Create `plugins/{plugin-name}/hooks/hooks.json`
2. Reference in plugin.json:
   ```json
   {
     "name": "my-plugin",
     "hooks": "./hooks/hooks.json"
   }
   ```
3. Hooks merge with user/project hooks when plugin enabled
4. Use `${CLAUDE_PLUGIN_ROOT}` for plugin-relative paths

## Additional Resources

- **Claude Code Docs**: `@docs/claude-code/hooks.md`
- **IndyDevDan Patterns**: `@docs/indydevdan/agentic-orchestration-patterns.md`
- **CARL Examples**: `@plugins/carl/hooks/`
- **Workflow Patterns**: `@.claude/.carl/templates/workflows/`

---

**Next Steps**:
1. Review template files in this directory
2. Copy relevant template for your use case
3. Modify for your specific needs
4. Test thoroughly in safe environment
5. Deploy to team or plugin
