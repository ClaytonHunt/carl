#!/bin/bash
# session-start.sh - SessionStart hook for CARL session management
# Triggered when Claude Code session starts
# Dependencies: carl-session.sh, carl-git.sh

# Use CLAUDE_PROJECT_DIR for all paths
if [[ -z "${CLAUDE_PROJECT_DIR:-}" ]]; then
    echo "Error: CLAUDE_PROJECT_DIR environment variable not set" >&2
    exit 1
fi

# Source libraries using project root
source "${CLAUDE_PROJECT_DIR}/.carl/hooks/lib/carl-session-compact.sh"
source "${CLAUDE_PROJECT_DIR}/.carl/hooks/lib/carl-platform.sh"
source "${CLAUDE_PROJECT_DIR}/.carl/hooks/lib/carl-settings.sh"
source "${CLAUDE_PROJECT_DIR}/.carl/hooks/lib/carl-time.sh"

# Main session initialization function
initialize_session() {
    # Check if we're in a CARL project (has .carl directory)
    if [[ ! -d ".carl" ]]; then
        # Not a CARL project, exit silently
        exit 0
    fi
    
    echo "🚀 CARL session starting..."
    
    # Initialize or update today's session file with compact format
    local session_file=$(init_compact_session)
    echo "📝 Session file: $session_file"
    
    # Optional: Trigger documentation quality check if interval elapsed
    # This provides an additional trigger point beyond file modifications
    trigger_doc_quality_check_if_needed "$session_file"
    local doc_check_result=$?
    if [[ $doc_check_result -eq 2 ]]; then
        # Documentation quality check requested - output JSON for agent launch
        cat << EOF
{
  "task": {
    "description": "Documentation quality analysis",
    "prompt": "Analyze project documentation quality and provide improvement recommendations. Focus on completeness, accuracy, freshness, and structure. Provide actionable recommendations with priority rankings.",
    "subagent_type": "carl-documentation-quality-auditor"
  }
}
EOF
        exit 2
    fi
}

# Send audio notification
send_session_start_notification() {
    local settings_enabled
    settings_enabled=$(get_carl_setting "audio.enabled" "true")
    
    local notification_enabled
    notification_enabled=$(get_carl_setting "audio.notifications.session_start.enabled" "true")
    
    if [[ "$settings_enabled" == "true" && "$notification_enabled" == "true" ]]; then
        echo "🔊 Audio notifications enabled - sending TTS..."
        local project_name
        project_name=$(basename "$(pwd)")
        
        local time_of_day
        time_of_day=$(get_time_of_day)
        
        local message_template
        message_template=$(get_carl_setting "audio.notifications.session_start.message_template" "Good {time_of_day}, CARL session started")
        
        local fallback_message
        fallback_message=$(get_carl_setting "audio.notifications.session_start.fallback_message" "Good {time_of_day}, CARL session started")
        
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
        echo "💬 TTS message: '$message'"
    else
        echo "🔇 Audio notifications disabled (audio.enabled=$settings_enabled, session_start.enabled=$notification_enabled)"
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