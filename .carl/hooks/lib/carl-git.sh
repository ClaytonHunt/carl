#!/bin/bash
# carl-git.sh - Git utilities for CARL hooks
# Dependencies: None (pure bash + git)

# Get current git user name for session files
get_git_user() {
    local user=$(git config user.name 2>/dev/null)
    if [[ -z "$user" ]]; then
        # Fallback to system user if no git user configured
        user=$(whoami 2>/dev/null || echo "unknown")
    fi
    # Sanitize for filesystem (replace spaces/special chars with underscores)
    echo "$user" | sed 's/[^a-zA-Z0-9]/_/g' | tr '[:upper:]' '[:lower:]'
}

# Get current git user email
get_git_email() {
    git config user.email 2>/dev/null || echo ""
}

# Get current branch name
get_current_branch() {
    git branch --show-current 2>/dev/null || echo "unknown"
}

# Get recent commit hashes (last N commits)
get_recent_commits() {
    local count=${1:-5}
    git log --format="%h" -n "$count" 2>/dev/null || echo ""
}

# Get commit hash for a specific time range
get_commits_since() {
    local since_time="$1"  # Format: "2025-08-03 08:00:00"
    git log --since="$since_time" --format="%h" 2>/dev/null || echo ""
}

# Check if we're in a git repository
is_git_repo() {
    git rev-parse --git-dir >/dev/null 2>&1
}

# Get project root directory (git root)
get_project_root() {
    if is_git_repo; then
        git rev-parse --show-toplevel 2>/dev/null
    else
        pwd
    fi
}

# Get current commit hash
get_current_commit() {
    git rev-parse HEAD 2>/dev/null || echo ""
}

# Check if working directory is clean
is_working_directory_clean() {
    [[ -z "$(git status --porcelain 2>/dev/null)" ]]
}