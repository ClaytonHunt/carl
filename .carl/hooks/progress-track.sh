#!/bin/bash

# progress-track.sh - Minimal PostToolUse hook for CARL work timing
# COMPACT FORMAT: Only logs work_id|start|end for maximum efficiency
# Triggered after Write/Edit/MultiEdit operations

# Use CLAUDE_PROJECT_DIR for all paths
if [[ -z "${CLAUDE_PROJECT_DIR:-}" ]]; then
    exit 0  # Fail silently to avoid breaking Claude Code
fi

# Source minimal libraries
source "${CLAUDE_PROJECT_DIR}/.carl/hooks/lib/carl-work.sh" 2>/dev/null || exit 0
source "${CLAUDE_PROJECT_DIR}/.carl/hooks/lib/carl-session.sh" 2>/dev/null || exit 0
source "${CLAUDE_PROJECT_DIR}/.carl/hooks/lib/carl-time.sh" 2>/dev/null || exit 0

# Check if compact mode is enabled
is_compact_mode_enabled() {
    local compact_mode
    compact_mode=$(get_carl_setting "session.compact_format" "false" 2>/dev/null)
    [[ "$compact_mode" == "true" ]]
}

# Get current work items being modified
get_current_work_items() {
    local modified_items
    readarray -t modified_items < <(get_recently_modified_work_items 0.1 2>/dev/null)
    
    for item in "${modified_items[@]}"; do
        if [[ -f "$item" && "$item" =~ \.carl$ ]]; then
            local work_id
            work_id=$(basename "$item" | sed 's/\.[^.]*\.carl$//')
            echo "$work_id"
        fi
    done
}

# Log work session in compact format
log_compact_work_session() {
    local work_id="$1"
    local timestamp="$2"
    
    # Get session file
    local git_user
    git_user=$(get_git_user 2>/dev/null || echo "unknown")
    local date_str
    date_str=$(get_date_string 2>/dev/null || date +%Y-%m-%d)
    local session_file="${CLAUDE_PROJECT_DIR}/.carl/sessions/session-${date_str}-${git_user}.carl"
    
    # For now, append work session entry - will be optimized later
    if [[ -f "$session_file" ]]; then
        echo "$work_id|$timestamp|" >> "$session_file"  # End time to be filled later
    fi
}

# Main compact progress tracking
main() {
    # Skip if compact mode not enabled
    if ! is_compact_mode_enabled; then
        exit 0
    fi
    
    # Get current timestamp
    local current_time
    current_time=$(get_iso_timestamp 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%SZ)
    
    # Get work items being modified
    local work_items
    readarray -t work_items < <(get_current_work_items)
    
    # Log compact work sessions
    for work_id in "${work_items[@]}"; do
        if [[ -n "$work_id" ]]; then
            log_compact_work_session "$work_id" "$current_time"
        fi
    done
    
    exit 0
}

# Execute if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi