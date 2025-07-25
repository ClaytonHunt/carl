#!/bin/bash

# CARL Tool Call Hook
# Tracks development progress and provides audio feedback during tool execution

set -e

# Get phase from command line argument (pre/post)
PHASE="$1"

# Read JSON input from stdin
JSON_INPUT=$(cat)

# Extract tool name from JSON
TOOL=$(echo "$JSON_INPUT" | grep -o '"tool"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/"tool"[[:space:]]*:[[:space:]]*"\(.*\)"/\1/')

# For PostToolUse, extract result if available
if [ "$PHASE" = "post" ]; then
    TOOL_OUTPUT=$(echo "$JSON_INPUT" | grep -o '"result"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/"result"[[:space:]]*:[[:space:]]*"\(.*\)"/\1/' | sed 's/\\n/\n/g' | sed 's/\\"/"/g' | sed 's/\\\\/\\/g')
else
    TOOL_OUTPUT=""
fi

# Map phase names
if [ "$PHASE" = "pre" ]; then
    PHASE="before"
elif [ "$PHASE" = "post" ]; then
    PHASE="after"
fi

CARL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Source CARL helper functions
source "$CARL_ROOT/.carl/scripts/carl-helpers.sh" 2>/dev/null || true
source "$CARL_ROOT/.carl/scripts/carl-audio.sh" 2>/dev/null || true

# Tool execution tracking
if [ "$PHASE" = "before" ]; then
    # Pre-tool execution - provide encouragement and context
    case "$TOOL" in
        "Edit"|"Write"|"MultiEdit")
            carl_play_audio "work" "Time to get coding! Let's build something awesome!"
            carl_log_activity "code_editing_started" "$TOOL"
            ;;
        "Bash")
            carl_play_audio "work" "Running some commands! Let's see what happens!"
            carl_log_activity "command_execution_started" "$TOOL"
            ;;
        "Read"|"Glob"|"Grep")
            # Quieter for analysis tools - no audio spam
            carl_log_activity "code_analysis_started" "$TOOL"
            ;;
        "TodoWrite")
            carl_play_audio "progress" "Updating our progress tracking!"
            carl_log_activity "progress_tracking_updated" "$TOOL"
            ;;
    esac
    
elif [ "$PHASE" = "after" ]; then
    # Post-tool execution - update CARL state and celebrate progress
    case "$TOOL" in
        "Edit"|"Write"|"MultiEdit")
            # Update CARL state based on code changes
            carl_update_state_from_changes
            carl_play_audio "progress" "Nice work! CARL's updating the records!"
            carl_log_activity "code_editing_completed" "$TOOL"
            
            # Check if this was a significant code change
            changed_lines=$(echo "$TOOL_OUTPUT" | grep -c "^[+\-]" 2>/dev/null || echo "0")
            if [ "$changed_lines" -gt 20 ]; then
                carl_log_milestone "significant_code_change" "Modified $changed_lines lines"
            fi
            ;;
            
        "Bash")
            carl_log_activity "command_execution_completed" "$TOOL"
            
            # Analyze command output for success/failure patterns
            if echo "$TOOL_OUTPUT" | grep -qiE "test.*pass|all tests pass|✓|success|complete"; then
                carl_play_audio "success" "Tests are passing! Great job!"
                carl_log_milestone "tests_passing" "Test execution successful"
            elif echo "$TOOL_OUTPUT" | grep -qiE "build.*success|compilation successful|deploy.*success"; then
                carl_play_audio "success" "Build successful! Looking good!"
                carl_log_milestone "build_success" "Build completed successfully"
            elif echo "$TOOL_OUTPUT" | grep -qiE "error|fail|exception|✗"; then
                # Don't play error sounds by default (can be annoying)
                carl_log_activity "command_error_encountered" "$TOOL"
            fi
            ;;
            
        "TodoWrite")
            # Parse TodoWrite output to track task progress
            if echo "$TOOL_OUTPUT" | grep -q "completed"; then
                carl_play_audio "success" "Task completed! Way to go!"
                carl_log_milestone "task_completed" "Task marked as completed"
                carl_update_progress_metrics
            elif echo "$TOOL_OUTPUT" | grep -q "in_progress"; then
                carl_log_activity "task_started" "$TOOL" 
            fi
            ;;
            
        "Read"|"Glob"|"Grep")
            # Track analysis activities but don't spam audio
            carl_log_activity "code_analysis_completed" "$TOOL"
            ;;
    esac
    
    # Update session context with recent activity
    carl_update_session_activity "$TOOL" "$PHASE"
fi

# Check for milestone achievements
carl_check_and_celebrate_milestones