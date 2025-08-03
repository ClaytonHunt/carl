# Claude Code Hooks

CARL operates through Claude Code's hook system with minimal, focused shell scripts.

## Prerequisites

Before implementing CARL hooks, review the official Claude Code hooks documentation:
- **[Hooks Overview](https://docs.anthropic.com/en/docs/claude-code/hooks)** - Core concepts and hook types
- **[Hooks Getting Started Guide](https://docs.anthropic.com/en/docs/claude-code/hooks-guide)** - Setup and configuration examples

CARL builds on these foundations with project-specific implementations:

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

### 3. PostToolUse Hook Array (Write/Edit tools only)
Multiple focused hooks that run in sequence for different responsibilities:
- **Schema Validation Hook**: Validate CARL files against `.carl/schemas/` definitions
- **Progress Tracking Hook**: Update progress tracking in daily session files  
- **Completion Handler Hook**: Move completed items to `completed/` subdirectory
- **Tech Debt Extraction Hook**: Extract TODO/FIXME/HACK comments to `tech-debt.carl`

Each hook is small, focused, and handles one specific responsibility following Claude Code best practices.

### 4. Stop Hook
- Log work completed during current Claude Code operations
- Record accomplishments and context from this specific run
- Update work period information (NOT session end)
- Avoid duplicate logging with other CARL hooks
- ~15 lines of activity logging

### 5. Notification Hook (Cross-platform audio alerts)
- Alert when Claude Code needs user input
- Cross-platform TTS: macOS (say), Linux (espeak/spd-say), Windows (PowerShell)
- Project-aware messages: "[project-name] needs your attention"
- ~15 lines main script + 5 lines per platform

## Focused Library Scripts (Just-In-Time Creation)
Domain-specific utility scripts created as needed during hook implementation:

- **`carl-session.sh`** - Session file operations (create, update, compact)
- **`carl-validation.sh`** - Schema validation and error handling helpers
- **`carl-git.sh`** - Git user detection, commit tracking, branch utilities
- **`carl-work.sh`** - Work item management (active work, completion tracking)
- **`carl-platform.sh`** - Cross-platform utilities (TTS, path handling)
- **`carl-context.sh`** - Context injection and CARL command detection

**Design Principles:**
- **Single Responsibility**: Each script focuses on one domain
- **Just-In-Time**: Create functions only when implementing hooks that need them
- **Focused Testing**: Smaller scripts are easier to test and maintain
- **Clear Dependencies**: Explicit sourcing shows which hooks use which utilities

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
          "command": "bash ${CLAUDE_PROJECT_DIR}/.carl/hooks/schema-validate.sh"
        },
        {
          "type": "command", 
          "command": "bash ${CLAUDE_PROJECT_DIR}/.carl/hooks/progress-track.sh"
        },
        {
          "type": "command", 
          "command": "bash ${CLAUDE_PROJECT_DIR}/.carl/hooks/completion-handler.sh"
        },
        {
          "type": "command", 
          "command": "bash ${CLAUDE_PROJECT_DIR}/.carl/hooks/tech-debt-extract.sh"
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

### PostToolUse Hook Array Execution
- **Sequential Execution**: Claude Code runs hooks in array order automatically
- **Individual Responsibility**: Each hook handles one specific concern
- **Error Handling**: Individual hooks can fail without affecting others
- **Simplicity**: No orchestration needed - Claude Code manages execution

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