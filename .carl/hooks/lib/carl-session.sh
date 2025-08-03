#!/bin/bash
# carl-session.sh - Session management utilities for CARL hooks
# Dependencies: carl-git.sh

# Source required libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/carl-git.sh"

# Get session file path for a specific date and user
get_session_file_path() {
    local date="${1:-$(date +%Y-%m-%d)}"
    local user="${2:-$(get_git_user)}"
    echo ".carl/sessions/session-${date}-${user}.carl"
}

# Create a new session file with initial structure
create_session_file() {
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
  end_time: ""
  total_active_time: ""
  
work_periods: []

agent_performance: []

command_metrics: []

active_context_carryover: {}

cleanup_log: []
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

# Update session end time
update_session_end_time() {
    local session_file="$1"
    local end_time="$(date +%H:%M:%SZ)"
    
    if [[ -f "$session_file" ]]; then
        # Use sed to update end_time
        sed -i "s/end_time: .*/end_time: \"$end_time\"/" "$session_file"
    fi
}

# Progressive session compaction
compact_old_sessions() {
    local user="$(get_git_user)"
    
    # Ensure archive directory exists
    mkdir -p ".carl/sessions/archive"
    
    # Compact daily sessions older than 7 days into weekly
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
    
    # Compact weekly sessions older than 4 weeks into monthly
    find .carl/sessions/archive -name "week-*-${user}.carl" -mtime +28 2>/dev/null | while read -r weekly; do
        if [[ -f "$weekly" ]]; then
            local file_timestamp=$(stat -c %Y "$weekly" 2>/dev/null || echo "0")
            local month=$(date -d "@$file_timestamp" +%Y-%m 2>/dev/null || echo "unknown")
            local monthly_file=".carl/sessions/archive/month-${month}-${user}.carl"
            
            # Append to monthly file
            echo "# Compacted from: $(basename "$weekly")" >> "$monthly_file"
            cat "$weekly" >> "$monthly_file"
            echo "" >> "$monthly_file"
            
            # Remove weekly file
            rm "$weekly"
        fi
    done
    
    # Compact monthly sessions older than 3 months into quarterly
    find .carl/sessions/archive -name "month-*-${user}.carl" -mtime +90 2>/dev/null | while read -r monthly; do
        if [[ -f "$monthly" ]]; then
            local file_timestamp=$(stat -c %Y "$monthly" 2>/dev/null || echo "0")
            local year=$(date -d "@$file_timestamp" +%Y 2>/dev/null || echo "unknown")
            local quarter=$(date -d "@$file_timestamp" +%q 2>/dev/null || echo "1")
            local quarterly_file=".carl/sessions/archive/quarter-${year}-Q${quarter}-${user}.carl"
            
            # Append to quarterly file
            echo "# Compacted from: $(basename "$monthly")" >> "$quarterly_file"
            cat "$monthly" >> "$quarterly_file"
            echo "" >> "$quarterly_file"
            
            # Remove monthly file
            rm "$monthly"
        fi
    done
    
    # Compact quarterly sessions older than 1 year into yearly
    find .carl/sessions/archive -name "quarter-*-${user}.carl" -mtime +365 2>/dev/null | while read -r quarterly; do
        if [[ -f "$quarterly" ]]; then
            local file_timestamp=$(stat -c %Y "$quarterly" 2>/dev/null || echo "0")
            local year=$(date -d "@$file_timestamp" +%Y 2>/dev/null || echo "unknown")
            local yearly_file=".carl/sessions/archive/year-${year}-${user}.carl"
            
            # Append to yearly file
            echo "# Compacted from: $(basename "$quarterly")" >> "$yearly_file"
            cat "$quarterly" >> "$yearly_file"
            echo "" >> "$yearly_file"
            
            # Remove quarterly file
            rm "$quarterly"
        fi
    done
}

# Log cleanup activity
log_cleanup() {
    local session_file="$1"
    local cleaned_date="$(date +%Y-%m-%d)"
    local retention_period="$2"
    
    if [[ -f "$session_file" ]]; then
        # Replace the empty cleanup_log: [] with actual entry
        sed -i '/cleanup_log: \[\]/c\
cleanup_log:\
  - cleaned_date: "'"$cleaned_date"'"\
    retention_period: "'"$retention_period"'"' "$session_file"
    fi
}

# Initialize or update today's session
init_daily_session() {
    local session_file=$(get_current_session_file)
    
    # Create session file if it doesn't exist
    if ! session_exists_today; then
        create_session_file "$session_file"
        echo "Created new session file: $session_file"
        
        # Run compaction on first session of the day
        compact_old_sessions
        log_cleanup "$session_file" "7_days"
    fi
    
    echo "$session_file"
}