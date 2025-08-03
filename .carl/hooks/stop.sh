#!/bin/bash

# CARL Stop Hook v2
# Called when Claude Code operations complete
# Logs activity and provides audio notifications
# Version: 2.0 - With robust project root detection

set -euo pipefail

# Use CLAUDE_PROJECT_DIR which is guaranteed by Claude Code
if [[ -z "${CLAUDE_PROJECT_DIR:-}" ]]; then
    echo "Error: CLAUDE_PROJECT_DIR not set. This hook must be run by Claude Code." >&2
    exit 1
fi

# Source libraries using CLAUDE_PROJECT_DIR
source "${CLAUDE_PROJECT_DIR}/.carl/hooks/lib/carl-platform.sh"
source "${CLAUDE_PROJECT_DIR}/.carl/hooks/lib/carl-git.sh"
source "${CLAUDE_PROJECT_DIR}/.carl/hooks/lib/carl-session.sh"
source "${CLAUDE_PROJECT_DIR}/.carl/hooks/lib/carl-settings.sh"
source "${CLAUDE_PROJECT_DIR}/.carl/hooks/lib/carl-time.sh"

# Configuration
SESSION_FILE=""

# Get session file
get_session_file() {
    local git_user
    git_user=$(get_git_user)
    local date_str
    date_str=$(date +%Y-%m-%d)
    SESSION_FILE="${CLAUDE_PROJECT_DIR}/.carl/sessions/session-${date_str}-${git_user}.carl"
}

# Log stop event (removed separate log file - only use session logging)

# Get meaningful context for what was worked on
get_work_context() {
    local context_parts=()
    
    # Check for active CARL work items
    local active_work=$(find_active_work 2>/dev/null)
    if [[ -n "$active_work" ]]; then
        context_parts+=("active: $active_work")
    fi
    
    # Check for recent git commits (last 30 minutes)
    if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        local recent_commits
        recent_commits=$(git log --since="30 minutes ago" --oneline --no-merges 2>/dev/null | head -3)
        if [[ -n "$recent_commits" ]]; then
            local commit_summary=$(echo "$recent_commits" | head -1 | cut -d' ' -f2- | cut -c1-50)
            context_parts+=("committed: $commit_summary")
        fi
    fi
    
    # Check for modified CARL files
    local modified_carl_files
    modified_carl_files=$(find "${CLAUDE_PROJECT_DIR}/.carl" -name "*.carl" -newer "${CLAUDE_PROJECT_DIR}/.carl/hooks/stop.sh" 2>/dev/null | head -3)
    if [[ -n "$modified_carl_files" ]]; then
        local file_count=$(echo "$modified_carl_files" | wc -l)
        context_parts+=("updated $file_count CARL files")
    fi
    
    # Check for Claude Code tool usage (if environment variables are available)
    if [[ -n "${CLAUDE_TOOLS_USED:-}" ]]; then
        context_parts+=("tools: ${CLAUDE_TOOLS_USED}")
    fi
    
    # Combine context parts
    if [[ ${#context_parts[@]} -gt 0 ]]; then
        local IFS=", "
        echo "${context_parts[*]}"
    else
        echo "general development work"
    fi
}

# Find active CARL work items
find_active_work() {
    # Look for active work in project files
    for dir in "${CLAUDE_PROJECT_DIR}/.carl/project"/{epics,features,stories,technical}; do
        if [[ -d "$dir" ]]; then
            find "$dir" -name "*.carl" -exec grep -l "status.*in_progress\|status.*active" {} \; 2>/dev/null | head -3
        fi
    done | while read -r file; do
        if [[ -f "$file" ]]; then
            # Extract title from CARL file
            grep "^title:" "$file" 2>/dev/null | head -1 | cut -d':' -f2- | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//'
        fi
    done | head -3 | tr '\n' '; ' | sed 's/; $//'
}

# Update session file with stop event
update_session_stop() {
    # Ensure session file exists
    if [[ ! -f "$SESSION_FILE" ]]; then
        # Create session file if it doesn't exist
        mkdir -p "$(dirname "$SESSION_FILE")"
        init_daily_session >/dev/null 2>&1 || true
    fi
    
    local timestamp
    timestamp=$(get_iso_timestamp)
    
    # Get meaningful context
    local work_context
    work_context=$(get_work_context)
    
    # Add stop event to session file
    cat >> "$SESSION_FILE" << EOF

# Stop Event - $timestamp
stop_events:
  - timestamp: "$timestamp"
    type: "operation_complete"
    context: "$work_context"
    session_duration: "$(get_session_duration)"

EOF
}

# Calculate session duration since last start
get_session_duration() {
    if [[ -f "$SESSION_FILE" ]]; then
        # Find the session start time from the header
        local start_time
        start_time=$(grep "^  start_time:" "$SESSION_FILE" | head -1 | cut -d'"' -f2 2>/dev/null)
        
        if [[ -n "$start_time" ]]; then
            # Calculate duration between start and now
            local duration_text
            duration_text=$(calculate_time_duration "$start_time")
            echo "$duration_text"
        else
            # Fallback: find the first timestamp in the file
            local first_event
            first_event=$(grep -E "timestamp:|start_time:" "$SESSION_FILE" | head -1 | grep -o '"[^"]*"' | tr -d '"' 2>/dev/null)
            
            if [[ -n "$first_event" ]]; then
                local duration_text
                duration_text=$(calculate_time_duration "$first_event")
                echo "$duration_text"
            else
                echo "unknown duration"
            fi
        fi
    else
        echo "new session"
    fi
}

# Calculate human-readable duration between two times
calculate_time_duration() {
    local start_time="$1"
    local end_time="${2:-$(date -u +%Y-%m-%dT%H:%M:%S)}"
    
    # Convert times to seconds since epoch
    local start_seconds end_seconds
    if command -v date >/dev/null 2>&1; then
        # Try GNU date format first
        start_seconds=$(date -d "$start_time" +%s 2>/dev/null)
        if [[ -z "$start_seconds" ]]; then
            # Try BSD date format
            start_seconds=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${start_time%%Z*}" +%s 2>/dev/null)
        fi
        
        end_seconds=$(date -d "$end_time" +%s 2>/dev/null)
        if [[ -z "$end_seconds" ]]; then
            end_seconds=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${end_time%%Z*}" +%s 2>/dev/null)
        fi
        
        if [[ -n "$start_seconds" && -n "$end_seconds" ]]; then
            local duration=$((end_seconds - start_seconds))
            
            # Convert to human-readable format
            local hours=$((duration / 3600))
            local minutes=$(((duration % 3600) / 60))
            local seconds=$((duration % 60))
            
            if [[ $hours -gt 0 ]]; then
                echo "${hours}h ${minutes}m"
            elif [[ $minutes -gt 0 ]]; then
                echo "${minutes}m ${seconds}s"
            else
                echo "${seconds}s"
            fi
        else
            echo "duration calculation error"
        fi
    else
        echo "duration unavailable"
    fi
}

# Send notification
send_notification() {
    local settings_enabled
    settings_enabled=$(get_carl_setting "audio.enabled" "true")
    
    local notification_enabled
    notification_enabled=$(get_carl_setting "audio.notifications.stop.enabled" "true")
    
    if [[ "$settings_enabled" == "true" && "$notification_enabled" == "true" ]]; then
        local project_name
        project_name=$(basename "$(pwd)")
        
        local message_template
        message_template=$(get_carl_setting "audio.notifications.stop.message_template" "{project} operation completed")
        
        local fallback_message
        fallback_message=$(get_carl_setting "audio.notifications.stop.fallback_message" "carl operation completed")
        
        # Try template substitution
        local message="$message_template"
        message="${message//\{project\}/$project_name}"
        message="${message//\{task_description\}/operation}"
        
        # Use fallback if template failed
        if [[ "$message" == *"{"* ]]; then
            message="$fallback_message"
            message="${message//\{project\}/$project_name}"
        fi
        
        speak_message "$message"
        
# Notification logging removed - notifications are tracked in session files
    fi
}

# Main execution
main() {
    get_session_file
    update_session_stop
    send_notification
}

# Execute if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi