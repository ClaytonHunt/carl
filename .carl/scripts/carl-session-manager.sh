#!/bin/bash

# CARL Session Manager
# Handles session tracking separately from index.carl to prevent pollution

# Get CARL root directory
carl_session_get_root() {
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    echo "$(cd "$script_dir/../.." && pwd)"
}

# Ensure session directories exist
carl_ensure_session_dirs() {
    local carl_root="$(carl_session_get_root)"
    
    mkdir -p "$carl_root/.carl/sessions"
    mkdir -p "$carl_root/.carl/sessions/archive"
    mkdir -p "$carl_root/.carl/sessions/active"
}

# Create new session tracking
carl_start_session() {
    local carl_root="$(carl_session_get_root)"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local session_id="session_${timestamp}"
    
    carl_ensure_session_dirs
    
    # Create session tracking file
    local session_file="$carl_root/.carl/sessions/active/${session_id}.session.carl"
    
    cat > "$session_file" << EOF
# CARL Session Tracking
# Session ID: $session_id
# Created: $(date -Iseconds)

session_metadata:
  session_id: "$session_id"
  start_time: "$(date -Iseconds)"
  working_directory: "$(pwd)"
  git_branch: "$(git branch --show-current 2>/dev/null || echo 'unknown')"
  git_commit: "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')"
  user: "$(git config user.name 2>/dev/null || echo "${USER:-unknown}")"

session_activities:
  # Activities will be appended here during the session

session_milestones:
  # Milestones will be tracked here

progress_metrics:
  files_modified: 0
  lines_added: 0
  lines_removed: 0
  activities_count: 0
  milestones_count: 0
EOF

    # Update current session pointer
    echo "$session_id" > "$carl_root/.carl/sessions/current.session"
    
    echo "$session_file"
}

# Get current session file
carl_get_current_session_file() {
    local carl_root="$(carl_session_get_root)"
    local current_session_file="$carl_root/.carl/sessions/current.session"
    
    if [ -f "$current_session_file" ]; then
        local session_id=$(cat "$current_session_file")
        local session_file="$carl_root/.carl/sessions/active/${session_id}.session.carl"
        
        if [ -f "$session_file" ]; then
            echo "$session_file"
            return 0
        fi
    fi
    
    # No active session, create one
    carl_start_session
}

# Log activity to current session
carl_log_session_activity() {
    local activity_type="$1"
    local tool_name="$2"
    local description="$3"
    local session_file="$(carl_get_current_session_file)"
    
    if [ -f "$session_file" ]; then
        echo "  - timestamp: \"$(date -Iseconds)\"" >> "$session_file"
        echo "    type: \"$activity_type\"" >> "$session_file"
        echo "    tool: \"$tool_name\"" >> "$session_file"
        echo "    description: \"$description\"" >> "$session_file"
        echo "" >> "$session_file"
    fi
}

# Log milestone to current session
carl_log_session_milestone() {
    local milestone_type="$1"
    local description="$2"
    local session_file="$(carl_get_current_session_file)"
    
    if [ -f "$session_file" ]; then
        # Append to milestones section
        echo "  - timestamp: \"$(date -Iseconds)\"" >> "$session_file"
        echo "    type: \"$milestone_type\"" >> "$session_file"
        echo "    description: \"$description\"" >> "$session_file"
        echo "" >> "$session_file"
    fi
}

# Update session progress metrics
carl_update_session_metrics() {
    local session_file="$(carl_get_current_session_file)"
    
    if [ -f "$session_file" ]; then
        # Calculate current metrics
        local files_modified=$(git diff --name-only HEAD~1 2>/dev/null | wc -l || echo "0")
        local lines_added=$(git diff --stat HEAD~1 2>/dev/null | tail -1 | grep -oE '[0-9]+ insertions?' | cut -d' ' -f1 || echo "0")
        local lines_removed=$(git diff --stat HEAD~1 2>/dev/null | tail -1 | grep -oE '[0-9]+ deletions?' | cut -d' ' -f1 || echo "0")
        local activities_count=$(grep -c "type:" "$session_file" 2>/dev/null || echo "0")
        local milestones_count=$(grep -c "milestone" "$session_file" 2>/dev/null || echo "0")
        
        # Update metrics section using sed to replace existing values
        sed -i.bak "s/files_modified: [0-9]*/files_modified: $files_modified/" "$session_file"
        sed -i.bak "s/lines_added: [0-9]*/lines_added: $lines_added/" "$session_file"
        sed -i.bak "s/lines_removed: [0-9]*/lines_removed: $lines_removed/" "$session_file"
        sed -i.bak "s/activities_count: [0-9]*/activities_count: $activities_count/" "$session_file"
        sed -i.bak "s/milestones_count: [0-9]*/milestones_count: $milestones_count/" "$session_file"
        
        # Clean up backup file
        rm -f "${session_file}.bak"
    fi
}

# End current session and archive it
carl_end_session() {
    local carl_root="$(carl_session_get_root)"
    local current_session_file="$carl_root/.carl/sessions/current.session"
    
    if [ -f "$current_session_file" ]; then
        local session_id=$(cat "$current_session_file")
        local session_file="$carl_root/.carl/sessions/active/${session_id}.session.carl"
        
        if [ -f "$session_file" ]; then
            # Update final metrics
            carl_update_session_metrics
            
            # Add end timestamp
            echo "" >> "$session_file"
            echo "session_end:" >> "$session_file"
            echo "  end_time: \"$(date -Iseconds)\"" >> "$session_file"
            echo "  duration: \"$(carl_calculate_session_duration_from_file "$session_file")\"" >> "$session_file"
            
            # Archive the session
            mv "$session_file" "$carl_root/.carl/sessions/archive/"
            
            # Clear current session pointer
            rm -f "$current_session_file"
            
            echo "Session $session_id archived successfully"
        fi
    fi
}

# Get session summary for context injection
carl_get_session_context() {
    local session_file="$(carl_get_current_session_file)"
    
    if [ -f "$session_file" ]; then
        # Extract key session information for context
        echo "## Current Session Context"
        echo ""
        
        # Session metadata
        grep -A 10 "session_metadata:" "$session_file" | grep -E "(session_id|start_time|git_branch)" | sed 's/^  //'
        echo ""
        
        # Recent activities (last 5)
        echo "### Recent Activities"
        grep -A 3 -B 1 "type:" "$session_file" | tail -20 | grep -E "(timestamp|type|tool|description)" | sed 's/^  //' | tail -15
        echo ""
        
        # Progress metrics
        echo "### Session Progress"
        grep -A 10 "progress_metrics:" "$session_file" | grep -E "(files_modified|activities_count|milestones_count)" | sed 's/^  //'
        echo ""
    fi
}

# Calculate session duration from file
carl_calculate_session_duration_from_file() {
    local session_file="$1"
    
    if [ -f "$session_file" ]; then
        local start_time=$(grep "start_time:" "$session_file" | cut -d'"' -f2)
        if [ -n "$start_time" ]; then
            local start_epoch=$(date -d "$start_time" +%s 2>/dev/null || echo "0")
            local current_epoch=$(date +%s)
            local duration_seconds=$((current_epoch - start_epoch))
            
            if [ "$duration_seconds" -gt 3600 ]; then
                echo "$((duration_seconds / 3600))h $((duration_seconds % 3600 / 60))m"
            elif [ "$duration_seconds" -gt 60 ]; then
                echo "$((duration_seconds / 60))m"
            else
                echo "${duration_seconds}s"
            fi
        else
            echo "unknown"
        fi
    else
        echo "no session"
    fi
}

# Clean up old archived sessions (keep last 30)
carl_cleanup_old_sessions() {
    local carl_root="$(carl_session_get_root)"
    local archive_dir="$carl_root/.carl/sessions/archive"
    
    if [ -d "$archive_dir" ]; then
        # Keep only the most recent 30 sessions
        find "$archive_dir" -name "*.session.carl" -type f | sort | head -n -30 | xargs rm -f 2>/dev/null
    fi
}

# Get list of recent sessions for analysis
carl_get_recent_sessions() {
    local carl_root="$(carl_session_get_root)"
    local count="${1:-5}"
    
    find "$carl_root/.carl/sessions/archive" -name "*.session.carl" -type f | sort -r | head -n "$count"
}

# Auto-cleanup function to be called periodically
carl_maintain_sessions() {
    carl_cleanup_old_sessions
    carl_update_session_metrics
}