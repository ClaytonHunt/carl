#!/bin/bash

# Progress Tracking Library
# Work item progress and session integration functions

# Set up paths (commands run from project root)
CARL_DIR=".carl"

# Initialize work item tracking
initialize_work_item_tracking() {
    local work_item_path="$1"
    local command_context="$2"
    local current_time
    current_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Update work item status
    yq eval ".status = \"in_progress\" | 
             .execution_started = \"$current_time\" | 
             .last_updated = \"$current_time\" | 
             .completion_percentage = 5 | 
             .current_phase = \"initialization\"" -i "$work_item_path"
    
    echo "✅ Progress tracking initialized for $(basename "$work_item_path")"
}

# Update work item progress
update_work_item_progress() {
    local work_item_path="$1"
    local percentage="$2"
    local phase="$3"
    local notes="${4:-}"
    local current_time
    current_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Validate percentage
    if [[ ! "$percentage" =~ ^[0-9]+$ ]] || [[ "$percentage" -lt 0 ]] || [[ "$percentage" -gt 100 ]]; then
        echo "❌ Invalid percentage: $percentage (must be 0-100)"
        return 1
    fi
    
    # Update work item
    local update_expr=".completion_percentage = $percentage | .last_updated = \"$current_time\""
    [[ -n "$phase" ]] && update_expr="$update_expr | .current_phase = \"$phase\""
    
    if [[ -n "$notes" ]]; then
        update_expr="$update_expr | .implementation_notes += [\"$current_time: $notes\"]"
    fi
    
    yq eval "$update_expr" -i "$work_item_path"
    
    echo "📊 Progress updated: $(basename "$work_item_path") → ${percentage}% ($phase)"
}

# Complete work item
complete_work_item() {
    local work_item_path="$1"
    local completion_notes="${2:-Implementation completed successfully}"
    local current_time
    current_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Update work item to completed
    yq eval ".status = \"completed\" | 
             .completion_percentage = 100 | 
             .current_phase = \"completed\" | 
             .completion_date = \"$current_time\" | 
             .last_updated = \"$current_time\" | 
             .implementation_notes += [\"$current_time: $completion_notes\"]" -i "$work_item_path"
    
    echo "✅ Work item completed: $(basename "$work_item_path")"
}

# Calculate duration between two ISO timestamps
calculate_duration() {
    local start_time="$1"
    local end_time="$2"
    
    # Convert ISO timestamps to epoch seconds
    local start_epoch end_epoch duration_seconds
    start_epoch=$(date -d "$start_time" +%s 2>/dev/null || echo "0")
    end_epoch=$(date -d "$end_time" +%s 2>/dev/null || echo "0")
    
    if [[ "$start_epoch" -eq 0 || "$end_epoch" -eq 0 ]]; then
        echo "unknown"
        return 1
    fi
    
    duration_seconds=$((end_epoch - start_epoch))
    
    # Format duration
    if [[ $duration_seconds -lt 60 ]]; then
        echo "${duration_seconds}s"
    elif [[ $duration_seconds -lt 3600 ]]; then
        echo "$((duration_seconds / 60))m $((duration_seconds % 60))s"
    else
        local hours=$((duration_seconds / 3600))
        local minutes=$(((duration_seconds % 3600) / 60))
        echo "${hours}h ${minutes}m"
    fi
}

# Get current session file path
get_current_session_file() {
    local current_date
    current_date=$(date +"%Y-%m-%d")
    
    # Get git user for session identification
    local git_user
    git_user=$(git config user.name 2>/dev/null | tr ' ' '_' | tr '[:upper:]' '[:lower:]')
    
    if [[ -z "$git_user" ]]; then
        git_user="unknown_user"
    fi
    
    local session_file="$CARL_DIR/sessions/session-${current_date}-${git_user}.carl"
    echo "$session_file"
}