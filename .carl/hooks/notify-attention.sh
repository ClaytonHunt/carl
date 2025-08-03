#!/bin/bash
# notify-attention.sh - Notification hook for Claude Code attention requests
# Triggered when Claude Code needs user input
# Dependencies: carl-platform.sh

# Get script directory and source platform utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/carl-platform.sh"

# Main notification function
notify_user() {
    local project_name=$(get_project_name)
    local message="$project_name needs your attention"
    
    # Only speak if TTS is available
    if tts_available; then
        speak_message "$message"
    fi
    
    # Log the notification (optional)
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Notification sent: $message" >> "${SCRIPT_DIR}/notify.log" 2>/dev/null || true
}

# Execute notification
notify_user