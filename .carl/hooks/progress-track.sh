#!/bin/bash

# progress-track.sh - PostToolUse hook for CARL progress tracking
# Triggered after Write/Edit/MultiEdit operations
# Aggregates stop events into work periods and tracks completion metrics

set -euo pipefail

# Use CLAUDE_PROJECT_DIR for all paths
if [[ -z "${CLAUDE_PROJECT_DIR:-}" ]]; then
    echo "Error: CLAUDE_PROJECT_DIR environment variable not set" >&2
    exit 1
fi

# Source libraries using project root
source "${CLAUDE_PROJECT_DIR}/.carl/hooks/lib/carl-work.sh"
source "${CLAUDE_PROJECT_DIR}/.carl/hooks/lib/carl-settings.sh"
source "${CLAUDE_PROJECT_DIR}/.carl/hooks/lib/carl-session.sh"
source "${CLAUDE_PROJECT_DIR}/.carl/hooks/lib/carl-git.sh"
source "${CLAUDE_PROJECT_DIR}/.carl/hooks/lib/carl-time.sh"

# Check if progress tracking is enabled
is_progress_tracking_enabled() {
    local auto_update
    auto_update=$(get_carl_setting "hooks.progress_tracking.auto_update_percentages" "true")
    [[ "$auto_update" == "true" ]]
}

# Get milestone thresholds from settings
get_milestone_thresholds() {
    # Default milestone thresholds if not in settings
    echo "25 50 75 90 100"
}

# Analyze recent activity to determine progress updates
analyze_recent_activity() {
    local hours_ago="${1:-1}"
    local activity_summary=""
    
    # Get recently modified work items
    local modified_items
    readarray -t modified_items < <(get_recently_modified_work_items "$hours_ago")
    
    if [[ ${#modified_items[@]} -gt 0 ]]; then
        activity_summary="Modified ${#modified_items[@]} work items: "
        
        for item in "${modified_items[@]}"; do
            if [[ -f "$item" ]]; then
                local item_summary
                item_summary=$(get_work_item_summary "$item")
                activity_summary+="$item_summary; "
            fi
        done
    fi
    
    echo "$activity_summary"
}

# Update work item progress based on activity patterns
update_work_item_progress() {
    local work_item_file="$1"
    local activity_indicators="$2"
    
    if [[ ! -f "$work_item_file" ]]; then
        return 1
    fi
    
    local current_completion
    current_completion=$(get_work_item_details "$work_item_file" "completion_percentage")
    current_completion=${current_completion:-0}
    
    local current_status
    current_status=$(get_work_item_details "$work_item_file" "status")
    
    # Calculate progress increment based on activity
    local progress_increment=0
    
    # Activity-based progress increments
    if [[ "$activity_indicators" == *"schema validation"* ]]; then
        progress_increment=5  # Schema work indicates structure completion
    fi
    
    if [[ "$activity_indicators" == *"git commit"* ]]; then
        progress_increment=10  # Commits indicate significant progress
    fi
    
    if [[ "$activity_indicators" == *"test"* ]]; then
        progress_increment=15  # Testing indicates near completion
    fi
    
    if [[ "$activity_indicators" == *"documentation"* ]]; then
        progress_increment=8   # Documentation indicates work solidification
    fi
    
    # Apply progress increment
    if [[ $progress_increment -gt 0 && $current_completion -lt 100 ]]; then
        local new_completion=$((current_completion + progress_increment))
        
        # Cap at 100%
        if [[ $new_completion -gt 100 ]]; then
            new_completion=100
        fi
        
        # Check milestone thresholds
        local milestones
        milestones=$(get_milestone_thresholds)
        
        for milestone in $milestones; do
            if [[ $current_completion -lt $milestone && $new_completion -ge $milestone ]]; then
                echo "📈 Milestone reached: ${milestone}% for $(get_work_item_details "$work_item_file" "title")"
            fi
        done
        
        # Update completion percentage
        update_work_item_completion "$work_item_file" "$new_completion"
        
        # Auto-complete if we hit 100%
        if [[ $new_completion -eq 100 && "$current_status" != "completed" ]]; then
            update_work_item_status "$work_item_file" "completed"
            echo "🎉 Work item completed: $(get_work_item_details "$work_item_file" "title")"
        fi
        
        return 0
    fi
    
    return 1
}

# Aggregate stop events into work periods
aggregate_stop_events_to_work_periods() {
    local git_user
    git_user=$(get_git_user)
    local date_str
    date_str=$(get_date_string)
    local session_file="${CLAUDE_PROJECT_DIR}/.carl/sessions/session-${date_str}-${git_user}.carl"
    
    if [[ ! -f "$session_file" ]]; then
        return 0
    fi
    
    # Count recent stop events (since last aggregation)
    local stop_event_count
    stop_event_count=$(grep -c "# Stop Event" "$session_file" 2>/dev/null || echo "0")
    
    if [[ $stop_event_count -gt 0 ]]; then
        # Create or update work period entry
        local timestamp
        timestamp=$(get_iso_timestamp)
        
        # Get active work context
        local active_work_items
        readarray -t active_work_items < <(find_active_work_items)
        
        local work_period_entry=""
        if [[ ${#active_work_items[@]} -gt 0 ]]; then
            work_period_entry="work_periods:\n"
            work_period_entry+="  - start_time: \"$timestamp\"\n"
            work_period_entry+="    activity_count: $stop_event_count\n"
            work_period_entry+="    active_items:\n"
            
            for item in "${active_work_items[@]}"; do
                if [[ -f "$item" ]]; then
                    local item_id
                    item_id=$(get_work_item_details "$item" "id")
                    work_period_entry+="      - \"${item_id:-$(basename "$item")}\"\n"
                fi
            done
        fi
        
        # Append work period to session file if we have active items
        if [[ -n "$work_period_entry" ]]; then
            cat >> "$session_file" << EOF

# Progress Tracking - $timestamp
$work_period_entry

EOF
        fi
    fi
}

# Generate progress metrics for session (only when meaningful)
generate_progress_metrics() {
    local git_user
    git_user=$(get_git_user)
    local date_str
    date_str=$(get_date_string)
    local session_file="${CLAUDE_PROJECT_DIR}/.carl/sessions/session-${date_str}-${git_user}.carl"
    
    # Get project progress statistics
    local progress_stats
    progress_stats=$(get_project_progress_stats)
    
    # Skip logging if no work items exist (meaningless "total: 0" spam)
    if [[ "$progress_stats" == *"total: 0"* ]]; then
        return 0
    fi
    
    # Check if stats have changed since last entry (prevent duplicate logging)
    if [[ -f "$session_file" ]]; then
        local last_stats
        last_stats=$(grep "project_stats:" "$session_file" | tail -1 | cut -d'"' -f2 2>/dev/null)
        if [[ "$progress_stats" == "$last_stats" ]]; then
            # Stats unchanged, skip logging
            return 0
        fi
    fi
    
    local timestamp
    timestamp=$(get_iso_timestamp)
    
    # Add progress metrics to session file (compact format)
    cat >> "$session_file" << EOF

# Progress Metrics - $timestamp
progress_metrics:
  - $timestamp: "$progress_stats"

EOF
}

# Main progress tracking function
main() {
    # Check if progress tracking is enabled
    if ! is_progress_tracking_enabled; then
        echo "Progress tracking disabled in settings"
        return 0
    fi
    
    echo "📊 Tracking progress for CARL work items..."
    
    # Analyze recent activity
    local activity_summary
    activity_summary=$(analyze_recent_activity 1)
    
    # Update progress for active work items based on activity
    local progress_updates=0
    local active_items
    readarray -t active_items < <(find_active_work_items)
    
    for item in "${active_items[@]}"; do
        if [[ -f "$item" ]]; then
            if update_work_item_progress "$item" "$activity_summary"; then
                progress_updates=$((progress_updates + 1))
            fi
        fi
    done
    
    # Aggregate stop events into work periods
    aggregate_stop_events_to_work_periods
    
    # Generate progress metrics
    generate_progress_metrics
    
    if [[ $progress_updates -gt 0 ]]; then
        echo "✅ Updated progress for $progress_updates work items"
    else
        echo "📝 No progress updates needed"
    fi
    
    return 0
}

# Execute if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi