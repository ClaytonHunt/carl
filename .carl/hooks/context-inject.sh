#!/bin/bash

# context-inject.sh - UserPromptSubmit hook for CARL context injection
# Injects minimal context (<100 tokens) before user prompts
# Provides: current date, yesterday, active work, session info

# Use CLAUDE_PROJECT_DIR for all paths
if [[ -z "${CLAUDE_PROJECT_DIR:-}" ]]; then
    echo "Error: CLAUDE_PROJECT_DIR environment variable not set" >&2
    exit 1
fi

# Source libraries
source "${CLAUDE_PROJECT_DIR}/.carl/hooks/lib/carl-work.sh"
source "${CLAUDE_PROJECT_DIR}/.carl/hooks/lib/carl-session.sh"
source "${CLAUDE_PROJECT_DIR}/.carl/hooks/lib/carl-git.sh"
source "${CLAUDE_PROJECT_DIR}/.carl/hooks/lib/carl-time.sh"

# Get current dates
current_date=$(get_date_string)
# Calculate yesterday's date (cross-platform)
if date --version >/dev/null 2>&1; then
    # GNU date (Linux)
    yesterday_date=$(date -d "yesterday" +%Y-%m-%d)
else
    # BSD date (macOS)
    yesterday_date=$(date -v-1d +%Y-%m-%d)
fi
current_time=$(get_iso_timestamp)

# Get session info
git_user=$(get_git_user)
session_file="session-${current_date}-${git_user}.carl"

# Get active work if exists
active_work_id=""
active_completion=""
active_title=""

if [[ -f "${CLAUDE_PROJECT_DIR}/.carl/project/active.work.carl" ]]; then
    active_work_id=$(get_work_item_details "${CLAUDE_PROJECT_DIR}/.carl/project/active.work.carl" "id")
    active_completion=$(get_work_item_details "${CLAUDE_PROJECT_DIR}/.carl/project/active.work.carl" "completion_percentage")
    active_title=$(get_work_item_details "${CLAUDE_PROJECT_DIR}/.carl/project/active.work.carl" "name")
fi

# Build minimal context injection (target: <100 tokens)
context_injection="
## CARL Context
- **Date**: ${current_date} (Yesterday: ${yesterday_date})
- **Session**: ${session_file}
- **Active Work**: ${active_work_id:-none}"

# Add completion percentage if work is active
if [[ -n "$active_work_id" && -n "$active_completion" ]]; then
    context_injection="${context_injection} (${active_completion}% complete)"
fi

# Output the context injection
echo "${context_injection}"
echo ""

# Log context injection to session file (for tracking/debugging)
session_path="${CLAUDE_PROJECT_DIR}/.carl/sessions/${session_file}"
if [[ -f "$session_path" ]]; then
    # Only log periodically to avoid session file bloat
    last_injection=$(grep -oP '(?<=last_context_injection: ").*(?=")' "$session_path" 2>/dev/null | tail -1)
    
    # Check if we should log (every 10 minutes)
    # For now, always log until we fix the time duration calculation
    if [[ -z "$last_injection" ]] || true; then
        cat >> "$session_path" << EOF

# Context Injection - $current_time
context_injections:
  - timestamp: "$current_time"
    last_context_injection: "$current_time"
    active_work: "${active_work_id:-none}"
    completion: "${active_completion:-0}"

EOF
    fi
fi

exit 0