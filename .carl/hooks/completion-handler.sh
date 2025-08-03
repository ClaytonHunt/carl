#!/bin/bash

# completion-handler.sh - PostToolUse hook for CARL completion handling
# Triggered after Write/Edit/MultiEdit operations
# Moves completed work items to completed/ subdirectories

set -euo pipefail

# Get project root with robust detection
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/carl-project-root.sh"

PROJECT_ROOT=$(get_project_root)
if [[ $? -ne 0 ]]; then
    echo "Error: Could not determine CARL project root" >&2
    exit 1
fi

# Source libraries using project root
source "${PROJECT_ROOT}/.carl/hooks/lib/carl-work.sh"
source "${PROJECT_ROOT}/.carl/hooks/lib/carl-settings.sh"
source "${PROJECT_ROOT}/.carl/hooks/lib/carl-session.sh"
source "${PROJECT_ROOT}/.carl/hooks/lib/carl-git.sh"
source "${PROJECT_ROOT}/.carl/hooks/lib/carl-time.sh"

# Check if completion handling is enabled
is_completion_handling_enabled() {
    local auto_move
    auto_move=$(get_carl_setting "hooks.completion_handler.auto_move_completed" "true")
    [[ "$auto_move" == "true" ]]
}

# Get completion threshold from settings
get_completion_threshold() {
    get_carl_setting "hooks.completion_handler.completion_threshold" "100"
}

# Check if a work item should be completed
should_complete_work_item() {
    local file_path="$1"
    
    if [[ ! -f "$file_path" ]]; then
        return 1
    fi
    
    # Check completion percentage
    local completion
    completion=$(get_work_item_details "$file_path" "completion_percentage")
    completion=${completion:-0}
    
    local threshold
    threshold=$(get_completion_threshold)
    
    # Check if completion meets threshold
    if [[ $completion -ge $threshold ]]; then
        return 0
    fi
    
    # Check if status is already completed
    local status
    status=$(get_work_item_details "$file_path" "status")
    if [[ "$status" == "completed" ]]; then
        return 0
    fi
    
    return 1
}

# Handle completion of a work item
handle_work_item_completion() {
    local file_path="$1"
    
    if [[ ! -f "$file_path" ]]; then
        return 1
    fi
    
    # Get work item details
    local id title
    id=$(get_work_item_details "$file_path" "id")
    title=$(get_work_item_details "$file_path" "title")
    
    echo "🎉 Completing work item: ${title:-$id}"
    
    # Update status to completed if not already
    local status
    status=$(get_work_item_details "$file_path" "status")
    if [[ "$status" != "completed" ]]; then
        update_work_item_status "$file_path" "completed"
    fi
    
    # Move to completed directory
    move_to_completed "$file_path"
    
    # Log completion to session
    log_completion_event "$id" "$title"
    
    return 0
}

# Log completion event to session file
log_completion_event() {
    local work_id="$1"
    local work_title="$2"
    
    # Get session file
    local git_user
    git_user=$(get_git_user)
    local date_str
    date_str=$(get_date_string)
    local session_file="${PROJECT_ROOT}/.carl/sessions/session-${date_str}-${git_user}.carl"
    
    if [[ -f "$session_file" ]]; then
        local timestamp
        timestamp=$(get_iso_timestamp)
        
        # Escape quotes in title for YAML
        work_title="${work_title//\"/\\\"}"
        
        cat >> "$session_file" << EOF

# Work Completion - $timestamp
completion_events:
  - timestamp: "$timestamp"
    work_id: "$work_id"
    title: "$work_title"
    handler: "automatic"

EOF
    fi
}

# Check for completed work items in modified files
check_for_completed_items() {
    local completed_count=0
    
    # Get list of recently modified CARL files
    local modified_files
    readarray -t modified_files < <(get_recently_modified_work_items 1)
    
    if [[ ${#modified_files[@]} -eq 0 ]]; then
        return 0
    fi
    
    echo "🔍 Checking ${#modified_files[@]} work items for completion..."
    
    # Check each modified file
    for file in "${modified_files[@]}"; do
        if [[ -f "$file" ]] && should_complete_work_item "$file"; then
            if handle_work_item_completion "$file"; then
                completed_count=$((completed_count + 1))
            fi
        fi
    done
    
    return $completed_count
}

# Check for orphaned completed items (in wrong directory)
check_for_orphaned_completed() {
    local moved_count=0
    
    # Search all work directories for completed items not in completed/ subdirs
    for dir in "${PROJECT_ROOT}/.carl/project"/{epics,features,stories,technical}; do
        if [[ -d "$dir" ]]; then
            # Find completed items not in completed subdirectory
            find "$dir" -maxdepth 1 -name "*.carl" -type f | while read -r file; do
                if [[ -f "$file" ]]; then
                    local status
                    status=$(get_work_item_details "$file" "status")
                    
                    if [[ "$status" == "completed" ]]; then
                        echo "📦 Found orphaned completed item: $(basename "$file")"
                        move_to_completed "$file"
                        moved_count=$((moved_count + 1))
                    fi
                fi
            done
        fi
    done
    
    return $moved_count
}

# Main completion handler function
main() {
    # Check if completion handling is enabled
    if ! is_completion_handling_enabled; then
        echo "Completion handling disabled in settings"
        return 0
    fi
    
    echo "✅ Checking for completed CARL work items..."
    
    # Check for newly completed items
    local completed_count=0
    check_for_completed_items
    completed_count=$?
    
    # Check for orphaned completed items
    local moved_count=0
    check_for_orphaned_completed
    moved_count=$?
    
    # Report results
    if [[ $completed_count -gt 0 || $moved_count -gt 0 ]]; then
        echo "📊 Completion handler results:"
        [[ $completed_count -gt 0 ]] && echo "  - Completed: $completed_count work items"
        [[ $moved_count -gt 0 ]] && echo "  - Organized: $moved_count orphaned items"
    else
        echo "📝 No work items ready for completion"
    fi
    
    return 0
}

# Execute if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi