#!/bin/bash
# carl-session-compact.sh - Streamlined session management for CARL
# Implements compact session format with only planning and work activities
# Dependencies: carl-git.sh, carl-time.sh

# Use CLAUDE_PROJECT_DIR which is guaranteed when hooks run
if [[ -z "${CLAUDE_PROJECT_DIR:-}" ]]; then
    echo "Error: CLAUDE_PROJECT_DIR not set. This library requires Claude Code environment." >&2
    exit 1
fi

# Source required libraries using CLAUDE_PROJECT_DIR
source "${CLAUDE_PROJECT_DIR}/.carl/hooks/lib/carl-git.sh"
source "${CLAUDE_PROJECT_DIR}/.carl/hooks/lib/carl-time.sh"

# Get session file path for a specific date and user
get_session_file_path() {
    local date="${1:-$(date +%Y-%m-%d)}"
    local user="${2:-$(get_git_user)}"
    echo ".carl/sessions/session-${date}-${user}.carl"
}

# Create a new session file with compact structure
create_compact_session_file() {
    local session_file="$1"
    local user="$(get_git_user)"
    local date="$(date +%Y-%m-%d)"
    local start_time="$(date +%H:%M:%SZ)"
    
    # Ensure sessions directory exists
    mkdir -p "$(dirname "$session_file")"
    
    cat > "$session_file" << EOF
developer: "$user"
date: "$date"
session_summary:
  start_time: "$start_time"

# Planning activities - when work items are created via /carl:plan
planning_activities: []

# Work activities - when work items are executed via /carl:task  
work_activities: []

# Session cleanup metadata
cleanup_log:
  - cleaned_date: "$date"
    retention_period: "7_days"
EOF
}

# Check if session file exists for today
session_exists_today() {
    local session_file=$(get_session_file_path)
    [[ -f "$session_file" ]]
}

# Get current session file path
get_current_session_file() {
    get_session_file_path
}

# Initialize or update today's session with compact format
init_compact_session() {
    local session_file=$(get_current_session_file)
    
    # Create session file if it doesn't exist
    if ! session_exists_today; then
        create_compact_session_file "$session_file"
        echo "Created compact session file: $session_file"
        
        # Run compaction on first session of the day
        compact_old_sessions
    fi
    
    echo "$session_file"
}

# Start a planning activity
start_planning_activity() {
    local session_file="$1"
    local timestamp="$(get_iso_timestamp)"
    local activity_id="planning_$(date +%H%M%S)"
    
    if [[ -f "$session_file" ]]; then
        # Check if there's already an active planning session
        local active_planning=$(grep -A2 "start_time.*$(date +%Y-%m-%d)" "$session_file" | grep -v "end_time" | tail -1)
        
        if [[ -z "$active_planning" ]]; then
            # Check if planning_activities array exists and is empty
            if grep -q "^planning_activities: \[\]" "$session_file"; then
                # Replace empty array with first activity
                sed -i "s/^planning_activities: \[\]/planning_activities:\n  - id: \"$activity_id\"\n    start_time: \"$timestamp\"\n    end_time: null\n    created_items: []/" "$session_file"
            elif grep -q "^planning_activities:" "$session_file"; then
                # Add to existing non-empty array
                sed -i "/^planning_activities:/a\\  - id: \"$activity_id\"\n    start_time: \"$timestamp\"\n    end_time: null\n    created_items: []" "$session_file"
            else
                # Create new section if none exists
                cat >> "$session_file" << EOF

# Planning Activity Started - $timestamp
planning_activities:
  - id: "$activity_id"
    start_time: "$timestamp"
    end_time: null
    created_items: []
EOF
            fi
        fi
    fi
    
    echo "$activity_id"
}

# End a planning activity and record created items
end_planning_activity() {
    local session_file="$1"
    local activity_id="$2"
    local created_items="$3"  # Comma-separated list of created work items
    local timestamp="$(get_iso_timestamp)"
    
    if [[ -f "$session_file" && -n "$activity_id" ]]; then
        # Convert comma-separated items to YAML array format
        local yaml_items=""
        if [[ -n "$created_items" ]]; then
            IFS=',' read -ra ITEMS <<< "$created_items"
            for item in "${ITEMS[@]}"; do
                item=$(echo "$item" | xargs)  # Trim whitespace
                yaml_items="${yaml_items}      - \"$item\"\n"
            done
        fi
        
        # Update the planning activity with end time and created items
        # Use a temporary file for the update
        local temp_file=$(mktemp)
        awk -v id="$activity_id" -v end_time="$timestamp" -v items="$yaml_items" '
            /id: "'"$activity_id"'"/ { in_activity = 1; print; next }
            in_activity && /end_time: null/ { 
                print "    end_time: \"" end_time "\""
                if (items != "") {
                    print "    created_items:"
                    printf "%s", items
                }
                in_activity = 0
                next 
            }
            in_activity && /created_items: \[\]/ && items != "" {
                print "    created_items:"
                printf "%s", items
                next
            }
            { print }
        ' "$session_file" > "$temp_file"
        
        mv "$temp_file" "$session_file"
    fi
}

# Start a work activity
start_work_activity() {
    local session_file="$1"
    local work_item_scope="$2"  # The .carl file being worked on
    local timestamp="$(get_iso_timestamp)"
    local activity_id="work_$(date +%H%M%S)"
    
    if [[ -f "$session_file" ]]; then
        # Check if work_activities array exists and is empty
        if grep -q "^work_activities: \[\]" "$session_file"; then
            # Replace empty array with first activity
            sed -i "s/^work_activities: \[\]/work_activities:\n  - id: \"$activity_id\"\n    start_time: \"$timestamp\"\n    end_time: null\n    work_item_scope: \"$work_item_scope\"/" "$session_file"
        elif grep -q "^work_activities:" "$session_file"; then
            # Add to existing non-empty array
            sed -i "/^work_activities:/a\\  - id: \"$activity_id\"\n    start_time: \"$timestamp\"\n    end_time: null\n    work_item_scope: \"$work_item_scope\"" "$session_file"
        else
            # Create new section if none exists
            cat >> "$session_file" << EOF

# Work Activity Started - $timestamp  
work_activities:
  - id: "$activity_id"
    start_time: "$timestamp"
    end_time: null
    work_item_scope: "$work_item_scope"
EOF
        fi
    fi
    
    echo "$activity_id"
}

# End a work activity
end_work_activity() {
    local session_file="$1"
    local activity_id="$2"
    local timestamp="$(get_iso_timestamp)"
    
    if [[ -f "$session_file" && -n "$activity_id" ]]; then
        # Update the work activity with end time
        local temp_file=$(mktemp)
        awk -v id="$activity_id" -v end_time="$timestamp" '
            /id: "'"$activity_id"'"/ { in_activity = 1; print; next }
            in_activity && /end_time: null/ { 
                print "    end_time: \"" end_time "\""
                in_activity = 0
                next 
            }
            { print }
        ' "$session_file" > "$temp_file"
        
        mv "$temp_file" "$session_file"
    fi
}

# Update session end time
update_session_end_time() {
    local session_file="$1"
    local end_time="$(date +%H:%M:%SZ)"
    
    if [[ -f "$session_file" ]]; then
        # Check if end_time already exists and update it, otherwise add it
        if grep -q "^[[:space:]]*end_time:" "$session_file"; then
            # Replace existing end_time
            sed -i "s/^[[:space:]]*end_time:.*/  end_time: \"$end_time\"/" "$session_file"
        else
            # Add end_time after start_time in session_summary
            sed -i '/session_summary:/,/^[^ ]/ {
                /start_time:/a\
  end_time: "'"$end_time"'"
            }' "$session_file"
        fi
    fi
}

# Compact old sessions (reuse existing logic)
compact_old_sessions() {
    local user="$(get_git_user)"
    
    # Ensure archive directory exists
    mkdir -p ".carl/sessions/archive"
    
    # Same compaction logic as original but for compact format
    find .carl/sessions -name "session-*-${user}.carl" -mtime +7 2>/dev/null | while read -r daily; do
        if [[ -f "$daily" ]]; then
            local file_timestamp=$(stat -c %Y "$daily" 2>/dev/null || echo "0")
            local week=$(date -d "@$file_timestamp" +%Y-%V 2>/dev/null || echo "unknown")
            local weekly_file=".carl/sessions/archive/week-${week}-${user}.carl"
            
            # Append to weekly file
            echo "# Compacted from: $(basename "$daily")" >> "$weekly_file"
            cat "$daily" >> "$weekly_file"
            echo "" >> "$weekly_file"
            
            # Remove daily file
            rm "$daily"
        fi
    done
}

# Log cleanup activity
log_cleanup() {
    local session_file="$1"
    local cleaned_date="$(date +%Y-%m-%d)"
    local retention_period="$2"
    
    if [[ -f "$session_file" ]]; then
        # Update cleanup_log entry
        sed -i "s/cleaned_date: .*/cleaned_date: \"$cleaned_date\"/" "$session_file"
        sed -i "s/retention_period: .*/retention_period: \"$retention_period\"/" "$session_file"
    fi
}

# Get last documentation check timestamp from session
get_last_doc_check_time() {
    local session_file="$1"
    
    if [[ -f "$session_file" ]]; then
        # Look for documentation check timestamp (will be added by doc-quality-check.sh)
        grep "last_doc_check:" "$session_file" | tail -1 | sed 's/.*last_doc_check: "\(.*\)".*/\1/'
    fi
}

# Set documentation check timestamp in session
set_doc_check_time() {
    local session_file="$1"
    local timestamp="$(get_iso_timestamp)"
    
    if [[ -f "$session_file" ]]; then
        # Add or update last_doc_check in cleanup_log section
        if grep -q "last_doc_check:" "$session_file"; then
            sed -i "s/last_doc_check: .*/last_doc_check: \"$timestamp\"/" "$session_file"
        else
            # Add after cleanup_log section
            sed -i '/cleanup_log:/a\
  last_doc_check: "'"$timestamp"'"' "$session_file"
        fi
    fi
}

# Trigger documentation quality check if 2+ hour interval has elapsed
trigger_doc_quality_check_if_needed() {
    local session_file="$1"
    local current_time=$(date +%s)
    
    if [[ -f "$session_file" ]]; then
        local last_check_time=$(get_last_doc_check_time "$session_file")
        
        if [[ -n "$last_check_time" ]]; then
            # Convert ISO timestamp to epoch seconds for comparison
            local last_check_epoch=$(date -d "$last_check_time" +%s 2>/dev/null || echo "0")
            local time_diff=$((current_time - last_check_epoch))
            
            # Only trigger if more than 2 hours (7200 seconds) since last check
            if [[ $time_diff -ge 7200 ]]; then
                echo "📚 Documentation quality check needed (last check: $last_check_time)"
                # Set the check time immediately to prevent duplicate runs
                set_doc_check_time "$session_file"
                # Signal Claude Code to launch documentation quality agent
                return 2
            fi
        else
            # No previous check recorded, trigger first check
            echo "📚 Initial documentation quality check scheduled"
            set_doc_check_time "$session_file" 
            # Signal Claude Code to launch documentation quality agent
            return 2
        fi
    fi
}