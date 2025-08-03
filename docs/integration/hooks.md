# CARL Hook System v2 - Production Ready

CARL operates through Claude Code's hook system providing **automated workflow management** with intelligent, self-healing capabilities.

## System Status: ✅ Production Ready

The CARL hook system is fully operational with these core capabilities:
- **Auto-fixing schema validation** with proactive error correction
- **Intelligent progress tracking** based on activity patterns  
- **Automated completion handling** with file organization
- **Accurate session duration** tracking with UTC timezone support
- **Cross-platform audio notifications** for user interaction

## Prerequisites

Review the official Claude Code hooks documentation:
- **[Hooks Overview](https://docs.anthropic.com/en/docs/claude-code/hooks)** - Core concepts and hook types
- **[Hooks Getting Started Guide](https://docs.anthropic.com/en/docs/claude-code/hooks-guide)** - Setup and configuration examples

## Hook Architecture Principles
- **Zero Dependencies**: Pure bash scripts, no external packages
- **Single Responsibility**: Each hook script has one clear responsibility
- **Multiple Hooks Per Type**: Use multiple focused scripts rather than monolithic hooks
- **Blocking vs Non-blocking**: Gate hooks run synchronously, informational hooks run async with `&`
- **Performance Optimized**: Async execution for non-critical operations to stay under 60-second timeout
- **Token Efficient**: Minimal context injection, maximum value
- **Built-in Logging**: Leverage Claude Code's native JSON logging capabilities for metrics

## Production Hook System

### 1. SessionStart Hook ✅ **OPERATIONAL**
**File**: `.carl/hooks/session-start.sh`
- Initializes daily session file (`session-YYYY-MM-DD-{git-user}.carl`)
- Git user detection and session metadata setup
- Handles session recovery and continuation
- **Status**: Fully implemented and tested

### 2. Stop Hook ✅ **OPERATIONAL** 
**File**: `.carl/hooks/stop.sh`
- **Accurate session duration tracking** with UTC timezone support
- Captures meaningful work context (active items, git commits, modified files)
- Work period aggregation and activity counting
- **Key Features**:
  - Fixed session duration calculation (was showing 11h instead of 7.5h)
  - Robust `calculate_time_duration()` function with proper UTC handling
  - Context detection for git commits and CARL file modifications
- **Status**: Production ready with recent duration calculation fixes

### 3. PostToolUse Hook Array ✅ **OPERATIONAL**
**Triggered after**: Write/Edit/MultiEdit operations  
**Execution**: Sequential processing with individual error handling

#### 3a. Schema Validation Hook 🔧 **AUTO-FIXING**
**File**: `.carl/hooks/schema-validate.sh`
- **Proactive auto-fixing** instead of just error reporting
- **Auto-fixes applied**:
  - Missing `last_updated` timestamps
  - Invalid enum values (`in_progress` → `active`)
  - Missing required sections (`technical_details`, `feature_details`)
  - YAML formatting corrections
- **Smart reporting**: Logs `fixes_applied` count and creates backups
- **Mode**: Strict validation with auto-remediation

#### 3b. Progress Tracking Hook 📈 **INTELLIGENT**  
**File**: `.carl/hooks/progress-track.sh`
- **Activity-based progress increments**:
  - Schema validation activity: +5% progress
  - Git commits: +10% progress  
  - Testing activity: +15% progress
  - Documentation: +8% progress
- **Milestone detection**: Notifications at 25%, 50%, 75%, 90%, 100%
- **Session metrics**: Aggregates work periods and velocity tracking
- **Status**: Tested and working (test item went 25% → 40% → 55% → 70% → 85% → 100%)

#### 3c. Completion Handler Hook 🎯 **AUTOMATED**
**File**: `.carl/hooks/completion-handler.sh`  
- **Automatic completion detection** based on percentage thresholds
- **File organization**: Moves completed items to `completed/` subdirectories
- **Session logging**: Records completion events with proper YAML escaping
- **Orphan cleanup**: Finds and organizes misplaced completed items
- **Status**: Fully tested (automatically moved test items to completed/)

### 4. Notification Hook ✅ **CROSS-PLATFORM**
**File**: `.carl/hooks/notify-attention.sh`
- Cross-platform audio alerts (macOS/Linux/Windows)
- ElevenLabs integration for enhanced voice notifications
- Project-aware messaging with context
- **Status**: Operational with WSL2 and audio system support

## Production Library Scripts ✅ **IMPLEMENTED**

All utility scripts are implemented and tested in production:

### Core Libraries
- **`carl-session.sh`** ✅ - Session file operations, git user detection
- **`carl-validation.sh`** ✅ - Schema validation with auto-fix capabilities  
- **`carl-git.sh`** ✅ - Git operations and commit tracking
- **`carl-work.sh`** ✅ - Work item management and completion tracking
- **`carl-platform.sh`** ✅ - Cross-platform TTS and WSL2 audio support
- **`carl-time.sh`** ✅ - UTC timezone handling and duration calculations
- **`carl-settings.sh`** ✅ - CARL settings management and configuration
- **`carl-project-root.sh`** ✅ - Robust project root detection

### Specialized Libraries  
- **`carl-simple-root.sh`** ✅ - Lightweight root detection fallback

**Architecture Benefits:**
- **Production Tested**: All libraries operational with real workloads
- **Error Handling**: Graceful fallbacks and robust error management
- **Performance**: Optimized for Claude Code's 60-second timeout
- **Maintainability**: Clear separation of concerns and dependencies

## What NOT to Include in Hooks
- **Complex Audio System**: Keep notification hook simple, elaborate personalities for future
- **Complex Analysis**: Delegate to specialist agents
- **Feature Discovery**: Belongs in /carl:analyze command
- **Extensive File Operations**: Keep it minimal
- **External Dependencies**: No npm packages, no pip installs
- **Large Context Dumps**: Smart selection only

## Production Hook Configuration ✅ **ACTIVE**

**File**: `.claude/settings.json`
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
    "Notification": [{
      "matcher": ".*",
      "hooks": [{
        "type": "command",
        "command": "bash ${CLAUDE_PROJECT_DIR}/.carl/hooks/notify-attention.sh"
      }]
    }],
    "Stop": [{
      "matcher": ".*",
      "hooks": [{
        "type": "command",
        "command": "bash ${CLAUDE_PROJECT_DIR}/.carl/hooks/stop.sh"
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
        }
      ]
    }]
  }
}
```

### Configuration Notes
- **Production Ready**: All hooks are tested and operational
- **Sequential PostToolUse**: Schema validation → Progress tracking → Completion handling
- **Cross-Platform**: Works on Windows WSL2, macOS, and Linux
- **Auto-Fixing**: Schema validation proactively corrects common issues
- **Real-Time Metrics**: All hooks log detailed metrics to session files

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
- **Path validation**: Always use robust project root detection (see Project Root Guidelines below)
- **Minimal processing**: Keep hooks lightweight for performance
- **Error handling**: Fail gracefully, don't break Claude Code flow
- **Dependencies**: `yq` recommended for full monorepo support (graceful fallback to grep/sed parsing if not available)

## Production Architecture ✅ **BATTLE-TESTED**

### Project Root Detection
All hooks use **CLAUDE_PROJECT_DIR** for robust path resolution:
```bash
#!/bin/bash
set -euo pipefail

# Use CLAUDE_PROJECT_DIR which is guaranteed by Claude Code
if [[ -z "${CLAUDE_PROJECT_DIR:-}" ]]; then
    echo "Error: CLAUDE_PROJECT_DIR not set. This hook must be run by Claude Code." >&2
    exit 1
fi

# Source libraries using CLAUDE_PROJECT_DIR
source "${CLAUDE_PROJECT_DIR}/.carl/hooks/lib/carl-platform.sh"
```

### Fallback Detection (carl-project-root.sh)
For standalone execution, robust detection with multiple methods:
1. **CLAUDE_PROJECT_DIR**: Primary method when run by Claude Code
2. **Find .carl directory**: Search current and parent directories  
3. **Git repository root**: Use git root if .carl directory exists there
4. **Directory traversal**: Walk up directory tree looking for .carl

## Performance Metrics 📊

### Real Production Data
Based on current session (session-2025-08-03-clayton_hunt.carl):
- **Session Duration**: Accurate UTC tracking (7.5 hours vs previous 11+ hour bug)
- **Auto-Fixes Applied**: 1 fix per file on average (missing fields, enum corrections)
- **Progress Tracking**: Automatic increments from 25% → 100% based on activity
- **Completion Handling**: 3 work items automatically moved to completed/
- **Hook Execution**: Sequential PostToolUse processing with individual error handling

### Error Recovery
- **Schema validation**: Auto-fixes applied with backup creation
- **YAML syntax**: Proper escaping prevents session file corruption
- **Duration calculation**: UTC timezone handling prevents time drift
- **File organization**: Orphan cleanup ensures proper work item placement

## System Status Summary 🚀

**CARL Hook System v2 is production ready** with:
- ✅ **Zero manual intervention** required for common workflow tasks
- ✅ **Self-healing** schema validation with proactive fixes
- ✅ **Intelligent automation** for progress tracking and completion
- ✅ **Accurate metrics** for session duration and work velocity
- ✅ **Cross-platform compatibility** (Windows WSL2, macOS, Linux)
- ✅ **Error resilience** with graceful fallbacks and recovery

The system now provides **complete workflow automation** while maintaining simplicity and reliability.