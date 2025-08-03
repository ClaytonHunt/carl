#!/bin/bash
# notify-attention.sh - Notification hook for Claude Code attention requests
# Triggered when Claude Code needs user input
# Dependencies: carl-platform.sh

# Use CLAUDE_PROJECT_DIR for all paths
if [[ -z "${CLAUDE_PROJECT_DIR:-}" ]]; then
    echo "Error: CLAUDE_PROJECT_DIR environment variable not set" >&2
    exit 1
fi

# Source libraries using project root
source "${CLAUDE_PROJECT_DIR}/.carl/hooks/lib/carl-platform.sh"

# Main notification function
notify_user() {
    local project_name=$(get_project_name)
    
    # Use CARL settings-aware notification
    local message=$(send_carl_notification "attention" "$project_name needs your attention" "$project_name")
    
# Notification logging removed - notifications are tracked in session files
}

# Execute notification
notify_user