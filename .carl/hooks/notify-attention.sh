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
    
    # Use CARL settings-aware notification
    local message=$(send_carl_notification "attention" "$project_name needs your attention" "$project_name")
    
# Notification logging removed - notifications are tracked in session files
}

# Execute notification
notify_user