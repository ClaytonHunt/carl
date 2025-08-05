#!/bin/bash

# completion-handler.sh - Minimal PostToolUse hook for CARL completion
# COMPACT FORMAT: Only tracks work completion timing, no verbose logging
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

# Handle work item completion in compact format
handle_compact_completion() {
    local file_path="$1"
    
    if [[ ! -f "$file_path" ]]; then
        return 1
    fi
    
    # Check if item should be completed (100% or status=completed)
    local completion status
    completion=$(get_work_item_details "$file_path" "completion_percentage" 2>/dev/null || echo "0")
    status=$(get_work_item_details "$file_path" "status" 2>/dev/null || echo "")
    
    if [[ $completion -ge 100 || "$status" == "completed" ]]; then
        # Move to completed directory silently
        move_to_completed "$file_path" 2>/dev/null
        
        # Log compact completion event
        local work_id
        work_id=$(get_work_item_details "$file_path" "id" 2>/dev/null)
        local timestamp
        timestamp=$(get_iso_timestamp 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%SZ)
        
        # Update session file with completion timing
        local git_user date_str session_file
        git_user=$(get_git_user 2>/dev/null || echo "unknown")
        date_str=$(get_date_string 2>/dev/null || date +%Y-%m-%d)
        session_file="${CLAUDE_PROJECT_DIR}/.carl/sessions/session-${date_str}-${git_user}.carl"
        
        if [[ -f "$session_file" && -n "$work_id" ]]; then
            # Update the last incomplete entry for this work_id with end time
            sed -i "s/${work_id}|\\([^|]*\\)|$/${work_id}|\\1|${timestamp}/" "$session_file" 2>/dev/null
        fi
    fi
}

# Main completion handler
main() {
    # Always use compact handling to avoid backup file creation
    # If compact mode is disabled, this still does the right work without verbose logging
    
    # Get list of recently modified CARL files
    local modified_files
    readarray -t modified_files < <(get_recently_modified_work_items 1 2>/dev/null)
    
    # Handle completion for each file
    for file in "${modified_files[@]}"; do
        if [[ -f "$file" ]]; then
            handle_compact_completion "$file"
        fi
    done
    
    exit 0
}

# Execute if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi