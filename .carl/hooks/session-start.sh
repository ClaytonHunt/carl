#!/bin/bash
# session-start.sh - SessionStart hook for CARL session management
# Triggered when Claude Code session starts
# Dependencies: carl-session.sh, carl-git.sh

# Get script directory and source required libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/carl-session.sh"

# Main session initialization function
initialize_session() {
    # Check if we're in a CARL project (has .carl directory)
    if [[ ! -d ".carl" ]]; then
        # Not a CARL project, exit silently
        exit 0
    fi
    
    # Initialize or update today's session file
    local session_file=$(init_daily_session)
    
    # Log session start (basic logging)
    local start_time=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$start_time] Claude Code session started" >> "${SCRIPT_DIR}/session-start.log" 2>/dev/null || true
    
    # Optional: Print session file path for debugging
    # echo "Session file: $session_file" >&2
}

# Execute session initialization
initialize_session