# Hooks Reference

> **Source:** [Claude Code Documentation - Hooks](https://docs.claude.com/en/docs/claude-code/hooks.md)
>
> **Last Updated:** 2025-11-04

Claude Code hooks are configured in settings files to automate actions during specific events in your workflow.

## Configuration

Hooks are defined in:
- `~/.claude/settings.json` (user level)
- `.claude/settings.json` (project level)
- `.claude/settings.local.json` (local, uncommitted)

### Basic Structure

Hooks organize by event type with matchers that specify which tools they target:

```json
{
  "hooks": {
    "EventName": [
      {
        "matcher": "ToolPattern",
        "hooks": [
          {
            "type": "command",
            "command": "your-command-here"
          }
        ]
      }
    ]
  }
}
```

**Matcher patterns:**
- Exact match: `Write` matches only Write tool
- Regex: `Edit|Write` or `Notebook.*`
- Wildcard: `*` or `""` matches all tools

**Hook configuration:**
- `type`: Either `"command"` for bash or `"prompt"` for LLM evaluation
- `command`: Bash command to execute
- `prompt`: LLM prompt for evaluation
- `timeout`: Optional timeout in seconds

For events without matchers (UserPromptSubmit, Notification, Stop, SubagentStop), omit the matcher field.

### Environment Variables

**Available in hook scripts:**
- `CLAUDE_PROJECT_DIR`: Project root directory path
- `CLAUDE_CODE_REMOTE`: "true" for web environment, empty for CLI
- Standard shell environment variables

**SessionStart only:**
- `CLAUDE_ENV_FILE`: Path to persist environment variables for subsequent commands

### Project-Specific Scripts

Reference scripts in your project using `CLAUDE_PROJECT_DIR`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/check-style.sh"
          }
        ]
      }
    ]
  }
}
```

### Plugin Hooks

Plugins provide hooks through their `hooks/hooks.json` file. When enabled, they merge with your configuration.

**Plugin features:**
- Use `${CLAUDE_PLUGIN_ROOT}` to reference plugin files
- Multiple hooks from different sources run in parallel
- Plugin hooks use the same format as regular hooks

## Prompt-Based Hooks

Instead of executing bash commands, prompt-based hooks send input to Claude Haiku for context-aware decisions. Currently supported for `Stop` and `SubagentStop` events.

### Configuration

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Evaluate if Claude should stop: $ARGUMENTS",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

Use `$ARGUMENTS` as placeholder for hook input JSON.

### LLM Response Schema

The LLM must respond with JSON:

```json
{
  "decision": "approve" | "block",
  "reason": "Explanation for decision",
  "continue": false,
  "stopReason": "Message shown to user",
  "systemMessage": "Warning or context"
}
```

**Response fields:**
- `decision`: "approve" allows action, "block" prevents it
- `reason`: Shown to Claude when blocking
- `continue`: If false, stops Claude entirely
- `stopReason`: Custom stop message for user
- `systemMessage`: Additional message to user

## Hook Events

### PreToolUse
Executes after Claude creates tool parameters, before processing the call.

Supports these tool matchers: Task, Bash, Glob, Grep, Read, Edit, Write, WebFetch, WebSearch

### PostToolUse
Runs immediately after a tool completes successfully. Recognizes same matchers as PreToolUse.

### Notification
Fires when Claude Code sends notifications (permission requests, idle waiting).

### UserPromptSubmit
Executes when user submits a prompt, before Claude processes it. Allows validation, context addition, or blocking.

### Stop
Runs when the main Claude Code agent finishes responding (not on user interrupt).

### SubagentStop
Executes when a Claude Code subagent (Task tool) finishes responding.

### PreCompact
Runs before a compact operation.

Matchers: `manual` (from /compact), `auto` (from auto-compact)

### SessionStart
Runs at session startup or resume. Useful for loading development context or setting environment variables.

Matchers: `startup`, `resume`, `clear`, `compact`

**Persisting environment variables:**

In SessionStart hooks, write to `CLAUDE_ENV_FILE` to persist variables:

```bash
#!/bin/bash
if [ -n "$CLAUDE_ENV_FILE" ]; then
  echo 'export NODE_ENV=production' >> "$CLAUDE_ENV_FILE"
fi
```

### SessionEnd
Executes when a session ends. Cannot block termination.

**Reason field values:**
- `clear`: Session cleared with /clear
- `logout`: User logged out
- `prompt_input_exit`: User exited during input
- `other`: Other exit reasons

## Hook Input

All hooks receive JSON via stdin with session information:

```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/transcript.jsonl",
  "cwd": "/current/working/directory",
  "permission_mode": "default|plan|acceptEdits|bypassPermissions",
  "hook_event_name": "EventName"
}
```

### Event-Specific Input Examples

**PreToolUse:**
```json
{
  "session_id": "abc123",
  "hook_event_name": "PreToolUse",
  "tool_name": "Write",
  "tool_input": {"file_path": "/path/to/file.txt", "content": "..."}
}
```

**PostToolUse:**
```json
{
  "hook_event_name": "PostToolUse",
  "tool_name": "Write",
  "tool_input": {...},
  "tool_response": {"filePath": "...", "success": true}
}
```

**UserPromptSubmit:**
```json
{
  "hook_event_name": "UserPromptSubmit",
  "prompt": "User's prompt text"
}
```

**Stop/SubagentStop:**
```json
{
  "hook_event_name": "Stop",
  "stop_hook_active": false
}
```

## Hook Output

Hooks return status through exit codes and optionally JSON in stdout.

### Exit Codes

- **0**: Success. stdout shown to user (except UserPromptSubmit and SessionStart add to context)
- **2**: Blocking error. stderr fed to Claude for processing
- **Other**: Non-blocking error. stderr shown to user, execution continues

### Exit Code 2 Behavior by Event

| Event | Behavior |
|-------|----------|
| PreToolUse | Blocks tool call, shows error to Claude |
| PostToolUse | Shows error to Claude |
| Notification | Shows error to user only |
| UserPromptSubmit | Blocks prompt, erases it, shows error to user |
| Stop | Blocks stoppage, shows error to Claude |
| SubagentStop | Blocks stoppage, shows error to subagent |
| PreCompact | Shows error to user only |
| SessionStart | Shows error to user only |
| SessionEnd | Shows error to user only |

### JSON Output Format

Hooks can return structured JSON in stdout for advanced control:

```json
{
  "continue": true,
  "stopReason": "Optional message",
  "suppressOutput": false,
  "systemMessage": "Optional warning",
  "hookSpecificOutput": {}
}
```

**Common fields:**
- `continue`: If false, stops Claude execution
- `stopReason`: Message shown when continuing is false
- `suppressOutput`: Hide stdout from transcript
- `systemMessage`: Warning message to user

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

- `"allow"`: Bypass permission system
- `"deny"`: Block tool execution
- `"ask"`: Request user confirmation
- `updatedInput`: Modify tool parameters before execution

### PostToolUse Decision Control

```json
{
  "decision": "block" | undefined,
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
  "decision": "block" | undefined,
  "reason": "Explanation shown to user",
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "Context added to flow"
  }
}
```

### Stop/SubagentStop Decision Control

```json
{
  "decision": "block" | undefined,
  "reason": "Must provide when blocking"
}
```

### SessionStart Decision Control

```json
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "Context added at session start"
  }
}
```

## Working with MCP Tools

Model Context Protocol tools in Claude Code follow naming pattern: `mcp__<server>__<tool>`

Examples:
- `mcp__memory__create_entities`
- `mcp__filesystem__read_file`
- `mcp__github__search_repositories`

### Configuring MCP Tool Hooks

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "mcp__memory__.*",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Memory operation' >> log.txt"
          }
        ]
      }
    ]
  }
}
```

Target specific servers with `mcp__<server>__.*` or specific operations.

## Hook Execution Details

**Timeout:** 60 seconds default, configurable per command. Individual timeouts don't affect other commands.

**Parallelization:** All matching hooks for an event run in parallel.

**Deduplication:** Identical hook commands execute once.

**Environment:** Runs in current directory with Claude Code's environment.

**Input:** JSON via stdin.

**Output visibility:**
- PreToolUse/PostToolUse/Stop/SubagentStop: Progress shown in transcript
- Notification/SessionEnd: Logged to debug only
- UserPromptSubmit/SessionStart: stdout added as context for Claude

## Security Considerations

### Risk Disclaimer

"Use at your own risk: Claude Code hooks execute arbitrary shell commands automatically." You bear sole responsibility for configured commands. Hooks can modify, delete, or access any files your account can reach. Poorly written or malicious hooks risk data loss or system damage.

Always test hooks in safe environments before production use.

### Security Best Practices

1. **Validate inputs** - Never trust input data blindly
2. **Quote variables** - Use `"$VAR"` not `$VAR`
3. **Block traversal** - Check for `..` in file paths
4. **Use absolute paths** - Specify full paths for scripts
5. **Skip sensitive files** - Avoid `.env`, `.git/`, keys, etc.

### Configuration Safety

Direct edits to hooks don't take effect immediately. Claude Code:
1. Captures hook snapshot at startup
2. Uses snapshot throughout session
3. Warns if hooks modified externally
4. Requires `/hooks` menu review for changes to apply

## Debugging

### Basic Troubleshooting

1. Run `/hooks` to verify hook registration
2. Validate JSON syntax in settings files
3. Test commands manually first
4. Ensure scripts are executable
5. Use `claude --debug` to see execution details

### Common Issues

- **Unescaped quotes**: Use `\"` inside JSON strings
- **Wrong matcher**: Tool names are case-sensitive
- **Missing paths**: Use full paths for scripts

### Advanced Debugging

Use `claude --debug` for detailed hook execution information:

```
[DEBUG] Executing hooks for PostToolUse:Write
[DEBUG] Found 1 matching hook
[DEBUG] Executing hook command: <command> with timeout 60000ms
[DEBUG] Hook completed with status 0: <output>
```

Progress messages in transcript mode (Ctrl-R) show which hook is running, the command, and success/failure status.
