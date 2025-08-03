#!/bin/bash
# session-start.sh - SessionStart hook for CARL session management
# Triggered when Claude Code session starts
# Dependencies: carl-session.sh, carl-git.sh

# Get script directory and source required libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/carl-session.sh"
source "${SCRIPT_DIR}/lib/carl-platform.sh"
source "${SCRIPT_DIR}/lib/carl-settings.sh"
source "${SCRIPT_DIR}/lib/carl-time.sh"

# Main session initialization function
initialize_session() {
    # Check if we're in a CARL project (has .carl directory)
    if [[ ! -d ".carl" ]]; then
        # Not a CARL project, exit silently
        exit 0
    fi
    
    # Initialize or update today's session file
    local session_file=$(init_daily_session)
    
# Send audio notification
send_session_start_notification() {
    local settings_enabled
    settings_enabled=$(get_setting "audio.enabled" "true")
    
    local notification_enabled
    notification_enabled=$(get_setting "audio.notifications.session_start.enabled" "true")
    
    if [[ "$settings_enabled" == "true" && "$notification_enabled" == "true" ]]; then
        local project_name
        project_name=$(basename "$(pwd)")
        
        local time_of_day
        time_of_day=$(get_time_of_day)
        
        local message_template
        message_template=$(get_setting "audio.notifications.session_start.message_template" "Good {time_of_day}, CARL session started")
        
        local fallback_message
        fallback_message=$(get_setting "audio.notifications.session_start.fallback_message" "Good {time_of_day}, CARL session started")
        
        # Try template substitution
        local message="$message_template"
        message="${message//\{time_of_day\}/$time_of_day}"
        message="${message//\{project\}/$project_name}"
        
        # Use fallback if template substitution failed
        if [[ "$message" == *"{"* ]]; then
            message="$fallback_message"
            message="${message//\{time_of_day\}/$time_of_day}"
            message="${message//\{project\}/$project_name}"
        fi
        
        speak_message "$message"
    fi
}

# Execute session initialization and notification
main() {
    initialize_session
    send_session_start_notification
}

# Execute if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi