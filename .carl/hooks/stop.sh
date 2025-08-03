#!/bin/bash

# CARL Stop Hook
# Called when Claude Code operations complete
# Logs activity and provides audio notifications

set -euo pipefail

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source libraries
source "$SCRIPT_DIR/lib/carl-platform.sh"
source "$SCRIPT_DIR/lib/carl-git.sh"
source "$SCRIPT_DIR/lib/carl-session.sh"
source "$SCRIPT_DIR/lib/carl-settings.sh"
source "$SCRIPT_DIR/lib/carl-time.sh"

# Configuration
SESSION_FILE=""

# Get session file
get_session_file() {
    local git_user
    git_user=$(get_git_user)
    local date_str
    date_str=$(date +%Y-%m-%d)
    SESSION_FILE="$SCRIPT_DIR/../sessions/session-${date_str}-${git_user}.carl"
}

# Log stop event (removed separate log file - only use session logging)

# Update session file with stop event
update_session_stop() {
    ensure_session_file_exists "$SESSION_FILE"
    
    local timestamp
    timestamp=$(get_iso_timestamp)
    
    # Add stop event to session file
    cat >> "$SESSION_FILE" << EOF

# Stop Event - $timestamp
stop_events:
  - timestamp: "$timestamp"
    type: "operation_complete"
    context: "Claude Code session ended"

EOF
}

# Send notification
send_notification() {
    local settings_enabled
    settings_enabled=$(get_setting "audio.enabled" "true")
    
    local notification_enabled
    notification_enabled=$(get_setting "audio.notifications.stop.enabled" "true")
    
    if [[ "$settings_enabled" == "true" && "$notification_enabled" == "true" ]]; then
        local project_name
        project_name=$(basename "$(pwd)")
        
        local message_template
        message_template=$(get_setting "audio.notifications.stop.message_template" "{project} operation completed")
        
        local fallback_message
        fallback_message=$(get_setting "audio.notifications.stop.fallback_message" "carl operation completed")
        
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