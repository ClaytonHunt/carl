# Claude Code Hooks

CARL operates through Claude Code's hook system with minimal, focused shell scripts:

## Hook Architecture Principles
- **Zero Dependencies**: Pure bash scripts, no external packages
- **Single Responsibility**: Each hook script has one clear responsibility
- **Multiple Hooks Per Type**: Use multiple focused scripts rather than monolithic hooks
- **Blocking vs Non-blocking**: Gate hooks run synchronously, informational hooks run async with `&`
- **Performance Optimized**: Async execution for non-critical operations to stay under 60-second timeout
- **Token Efficient**: Minimal context injection, maximum value
- **Built-in Logging**: Leverage Claude Code's native JSON logging capabilities for metrics

## Core Hooks (Minimal Set)

### 1. SessionStart Hook
- Initialize daily session file (`session-YYYY-MM-DD-{git-user}.carl`)
- Progressive session compaction (daily→weekly→monthly→quarterly→yearly)
- Carry over active context from previous day if needed
- ~40 lines including compaction logic

### 2. UserPromptSubmit Hook
- Inject active work context for CARL commands only
- Smart detection: Skip injection if not CARL-related
- Minimal context: Just active work and relevant scope files
- ~25 lines of intelligent context loading

### 3. PostToolUse Hooks (Write/Edit tools only - Async-optimized execution)
- **Schema Validation Hook**: Validate CARL files against `.carl/schemas/` definitions (BLOCKING)
- **Quality Gate Hook**: Conditional TDD gate enforcement when TDD enabled (BLOCKING)
- **Progress Tracking Hook**: Update progress tracking in daily session files (ASYNC)
- **Completion Handler Hook**: Move completed items to `completed/` subdirectory (ASYNC)
- **Tech Debt Extraction Hook**: Extract TODO/FIXME/HACK comments to `tech-debt.carl` (ASYNC)
- **Hook Execution Pattern**: Blocking hooks → Async hooks with `&` → `wait` for completion

### 4. Stop Hook
- Log completed work to daily session file
- Update work item progress if changes detected
- Track time spent on current work item
- ~15 lines of activity logging

### 5. Notification Hook (Cross-platform audio alerts)
- Alert when Claude Code needs user input
- Cross-platform TTS: macOS (say), Linux (espeak/spd-say), Windows (PowerShell)
- Project-aware messages: "[project-name] needs your attention"
- ~15 lines main script + 5 lines per platform

## Shared Functions (`carl-functions.sh`)
Single sourced file with core utilities:
- `get_git_user()` - Get current git user for session files
- `get_active_work()` - Extract current work item ID
- `update_progress()` - Update completion percentage
- `move_completed()` - Move completed files
- `detect_platform()` - Return platform (macos/linux/windows)
- `speak_message()` - Cross-platform TTS wrapper
- ~60 lines total, sourced by all hooks

## What NOT to Include in Hooks
- **Complex Audio System**: Keep notification hook simple, elaborate personalities for future
- **Complex Analysis**: Delegate to specialist agents
- **Feature Discovery**: Belongs in /carl:analyze command
- **Extensive File Operations**: Keep it minimal
- **External Dependencies**: No npm packages, no pip installs
- **Large Context Dumps**: Smart selection only

## Hook Configuration (`.claude/settings.json`)
```json
{
  "hooks": {
    "SessionStart": [{
      "matcher": ".*",
      "hooks": [{
        "type": "command",
        "command": "bash ${CLAUDE_PROJECT_DIR}/.carl/hooks/session-start.sh"
      }]
    }],
    "UserPromptSubmit": [{
      "matcher": ".*carl:.*",
      "hooks": [{
        "type": "command",
        "command": "bash ${CLAUDE_PROJECT_DIR}/.carl/hooks/context-inject.sh"
      }]
    }],
    "PostToolUse": [{
      "matcher": "Write|Edit|MultiEdit",
      "hooks": [
        {
          "type": "command", 
          "command": "bash ${CLAUDE_PROJECT_DIR}/.carl/hooks/post-tool-orchestrator.sh"
        }
      ]
    }],
    "Stop": [{
      "matcher": ".*",
      "hooks": [{
        "type": "command",
        "command": "bash ${CLAUDE_PROJECT_DIR}/.carl/hooks/activity-log.sh"
      }]
    }],
    "Notification": [{
      "matcher": ".*",
      "hooks": [{
        "type": "command",
        "command": "bash ${CLAUDE_PROJECT_DIR}/.carl/hooks/notify-attention.sh"
      }]
    }]
  }
}
```

## Hook Execution Patterns

### Async Hook Orchestration (`post-tool-orchestrator.sh`)
- **Purpose**: Single entry point for PostToolUse processing with optimized async execution
- **Pattern**: Blocking hooks execute first, async hooks run in parallel, `wait` ensures completion
- **Implementation**:
  ```bash
  #!/bin/bash
  # Blocking hooks (must complete before continuing)
  bash ${CLAUDE_PROJECT_DIR}/.carl/hooks/schema-validate.sh
  if [[ $? -ne 0 ]]; then exit 1; fi  # Block on validation failure
  
  bash ${CLAUDE_PROJECT_DIR}/.carl/hooks/quality-gate.sh
  if [[ $? -ne 0 ]]; then exit 1; fi  # Block on quality failure
  
  # Async hooks (can run in parallel)
  bash ${CLAUDE_PROJECT_DIR}/.carl/hooks/progress-track.sh &
  bash ${CLAUDE_PROJECT_DIR}/.carl/hooks/completion-handler.sh &
  bash ${CLAUDE_PROJECT_DIR}/.carl/hooks/tech-debt-extract.sh &
  
  # Wait for all async hooks to complete
  wait
  ```

### Performance Logging Integration
- **Agent Performance**: Session files capture agent invocation times and success rates
- **Hook Execution**: Claude Code's built-in JSON logging captures hook performance automatically
- **Command Metrics**: Session files track `/carl:plan`, `/carl:task`, `/carl:status` execution patterns
- **Access Pattern**: Use `jq` to parse hook execution logs for performance analysis

## Hook Security & Performance
- **60-second timeout**: All hooks must complete within timeout
- **Parallel execution**: Hooks run in parallel, design accordingly
- **Path validation**: Always use `CLAUDE_PROJECT_DIR` for paths
- **Minimal processing**: Keep hooks lightweight for performance
- **Error handling**: Fail gracefully, don't break Claude Code flow
- **Dependencies**: `yq` recommended for full monorepo support (graceful fallback to grep/sed parsing if not available)