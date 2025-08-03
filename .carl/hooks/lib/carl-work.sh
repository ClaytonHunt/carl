#!/bin/bash

# carl-work.sh - Work item management utilities for CARL hooks
# Provides work item operations, progress tracking, and completion handling

# Get project root with robust detection
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/carl-project-root.sh"

PROJECT_ROOT=$(get_project_root)
if [[ $? -ne 0 ]]; then
    echo "Error: Could not determine CARL project root" >&2
    exit 1
fi

# Source required libraries
source "${PROJECT_ROOT}/.carl/hooks/lib/carl-time.sh"

# Find all CARL work items
find_all_work_items() {
    local work_items=()
    
    # Search all work item directories
    for dir in "${PROJECT_ROOT}/.carl/project"/{epics,features,stories,technical}; do
        if [[ -d "$dir" ]]; then
            find "$dir" -name "*.carl" -type f | while read -r file; do
                echo "$file"
            done
        fi
    done
}

# Find active work items (in_progress status)
find_active_work_items() {
    find_all_work_items | while read -r file; do
        if [[ -f "$file" ]]; then
            # Check if status is in_progress or active
            if grep -q "status.*in_progress\|status.*active" "$file" 2>/dev/null; then
                echo "$file"
            fi
        fi
    done
}

# Get work item details
get_work_item_details() {
    local file_path="$1"
    local detail_type="$2"  # id, title, status, completion_percentage, etc.
    
    if [[ ! -f "$file_path" ]]; then
        return 1
    fi
    
    case "$detail_type" in
        "id")
            grep "^id:" "$file_path" 2>/dev/null | head -1 | cut -d':' -f2- | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//'
            ;;
        "title")
            grep "^title:" "$file_path" 2>/dev/null | head -1 | cut -d':' -f2- | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//'
            ;;
        "status")
            grep "^status:" "$file_path" 2>/dev/null | head -1 | cut -d':' -f2- | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//'
            ;;
        "completion_percentage")
            grep "^completion_percentage:" "$file_path" 2>/dev/null | head -1 | cut -d':' -f2- | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//'
            ;;
        "estimate")
            grep -A 2 "^estimate:" "$file_path" 2>/dev/null | grep "story_points\|time_guidance" | head -1 | cut -d':' -f2- | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//'
            ;;
        *)
            echo "Unknown detail type: $detail_type" >&2
            return 1
            ;;
    esac
}

# Update work item completion percentage
update_work_item_completion() {
    local file_path="$1"
    local new_percentage="$2"
    
    if [[ ! -f "$file_path" ]]; then
        echo "Work item file not found: $file_path" >&2
        return 1
    fi
    
    # Validate percentage (0-100)
    if [[ ! "$new_percentage" =~ ^[0-9]+$ ]] || [[ "$new_percentage" -lt 0 ]] || [[ "$new_percentage" -gt 100 ]]; then
        echo "Invalid completion percentage: $new_percentage (must be 0-100)" >&2
        return 1
    fi
    
    # Update completion percentage in file
    if grep -q "^completion_percentage:" "$file_path"; then
        # Replace existing percentage
        sed -i "s/^completion_percentage:.*/completion_percentage: $new_percentage/" "$file_path"
    else
        # Add completion percentage after status line
        sed -i "/^status:/a\\completion_percentage: $new_percentage" "$file_path"
    fi
    
    # Update last_updated timestamp
    local timestamp
    timestamp=$(get_iso_timestamp)
    if grep -q "^last_updated:" "$file_path"; then
        sed -i "s/^last_updated:.*/last_updated: \"$timestamp\"/" "$file_path"
    else
        sed -i "/^completion_percentage:/a\\last_updated: \"$timestamp\"" "$file_path"
    fi
}

# Update work item status
update_work_item_status() {
    local file_path="$1"
    local new_status="$2"
    
    if [[ ! -f "$file_path" ]]; then
        echo "Work item file not found: $file_path" >&2
        return 1
    fi
    
    # Validate status
    case "$new_status" in
        "not_started"|"in_progress"|"completed"|"blocked"|"cancelled")
            ;;
        *)
            echo "Invalid status: $new_status" >&2
            return 1
            ;;
    esac
    
    # Update status in file
    if grep -q "^status:" "$file_path"; then
        sed -i "s/^status:.*/status: $new_status/" "$file_path"
    else
        echo "No status field found in $file_path" >&2
        return 1
    fi
    
    # Update last_updated timestamp
    local timestamp
    timestamp=$(get_iso_timestamp)
    if grep -q "^last_updated:" "$file_path"; then
        sed -i "s/^last_updated:.*/last_updated: \"$timestamp\"/" "$file_path"
    else
        sed -i "/^status:/a\\last_updated: \"$timestamp\"" "$file_path"
    fi
    
    # Auto-complete if status is completed
    if [[ "$new_status" == "completed" ]]; then
        update_work_item_completion "$file_path" 100
    fi
}

# Get work items modified recently
get_recently_modified_work_items() {
    local hours_ago="${1:-1}"  # Default to last hour
    
    find_all_work_items | while read -r file; do
        if [[ -f "$file" ]]; then
            # Check if file was modified in the last N hours
            if find "$file" -mtime -"$(echo "$hours_ago" | awk '{print $1/24}')" 2>/dev/null | grep -q .; then
                echo "$file"
            fi
        fi
    done
}

# Calculate work item progress velocity
calculate_work_velocity() {
    local file_path="$1"
    local time_period="${2:-7}"  # Default to 7 days
    
    if [[ ! -f "$file_path" ]]; then
        return 1
    fi
    
    # Get creation date and current completion
    local created_date
    created_date=$(grep "^created:" "$file_path" 2>/dev/null | cut -d':' -f2- | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//' | tr -d '"')
    
    local completion
    completion=$(get_work_item_details "$file_path" "completion_percentage")
    
    if [[ -n "$created_date" && -n "$completion" ]]; then
        # Basic velocity calculation (completion % per day)
        local days_elapsed
        days_elapsed=$(( ($(date +%s) - $(date -d "$created_date" +%s)) / 86400 ))
        
        if [[ $days_elapsed -gt 0 ]]; then
            echo "$(( completion / days_elapsed ))"
        else
            echo "$completion"
        fi
    else
        echo "0"
    fi
}

# Move completed work item to completed directory
move_to_completed() {
    local file_path="$1"
    
    if [[ ! -f "$file_path" ]]; then
        echo "Work item file not found: $file_path" >&2
        return 1
    fi
    
    # Skip if already in a completed directory (prevent infinite nesting)
    if [[ "$file_path" == */completed/* ]]; then
        echo "Work item already in completed directory: $file_path"
        return 0
    fi
    
    # Check if already completed
    local status
    status=$(get_work_item_details "$file_path" "status")
    if [[ "$status" != "completed" ]]; then
        echo "Work item not marked as completed: $file_path" >&2
        return 1
    fi
    
    # Determine source directory and create completed subdirectory
    local source_dir
    source_dir=$(dirname "$file_path")
    local completed_dir="${source_dir}/completed"
    
    mkdir -p "$completed_dir"
    
    # Move file to completed directory
    local filename
    filename=$(basename "$file_path")
    mv "$file_path" "${completed_dir}/${filename}"
    
    echo "Moved completed work item: ${completed_dir}/${filename}"
}

# Get work item summary for reporting
get_work_item_summary() {
    local file_path="$1"
    
    if [[ ! -f "$file_path" ]]; then
        return 1
    fi
    
    local id title status completion
    id=$(get_work_item_details "$file_path" "id")
    title=$(get_work_item_details "$file_path" "title")
    status=$(get_work_item_details "$file_path" "status")
    completion=$(get_work_item_details "$file_path" "completion_percentage")
    
    echo "${id:-unknown}: ${title:-untitled} (${status:-unknown}, ${completion:-0}%)"
}

# Find work items by status
find_work_items_by_status() {
    local target_status="$1"
    
    find_all_work_items | while read -r file; do
        if [[ -f "$file" ]]; then
            local status
            status=$(get_work_item_details "$file" "status")
            if [[ "$status" == "$target_status" ]]; then
                echo "$file"
            fi
        fi
    done
}

# Get overall project progress statistics
get_project_progress_stats() {
    local total_items=0
    local completed_items=0
    local in_progress_items=0
    local total_completion=0
    
    find_all_work_items | while read -r file; do
        if [[ -f "$file" ]]; then
            total_items=$((total_items + 1))
            
            local status completion
            status=$(get_work_item_details "$file" "status")
            completion=$(get_work_item_details "$file" "completion_percentage")
            completion=${completion:-0}
            
            case "$status" in
                "completed")
                    completed_items=$((completed_items + 1))
                    ;;
                "in_progress")
                    in_progress_items=$((in_progress_items + 1))
                    ;;
            esac
            
            total_completion=$((total_completion + completion))
        fi
    done
    
    if [[ $total_items -gt 0 ]]; then
        local average_completion=$((total_completion / total_items))
        echo "total: $total_items, completed: $completed_items, in_progress: $in_progress_items, avg_completion: ${average_completion}%"
    else
        echo "total: 0, completed: 0, in_progress: 0, avg_completion: 0%"
    fi
}