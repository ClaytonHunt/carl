#!/bin/bash

# carl-project-root.sh - Project root detection utilities
# Provides robust project root detection with multiple fallback methods

# Get the CARL project root directory
get_carl_project_root() {
    local project_root=""
    
    # Method 1: Use CLAUDE_PROJECT_DIR if available
    if [[ -n "${CLAUDE_PROJECT_DIR:-}" ]]; then
        project_root="$CLAUDE_PROJECT_DIR"
    
    # Method 2: Look for .carl directory in current or parent directories
    elif project_root=$(find_carl_directory); then
        : # project_root is already set
    
    # Method 3: Check CARL settings for stored project root
    elif project_root=$(get_stored_project_root); then
        : # project_root is already set
    
    # Method 4: Use git root if in a git repository
    elif command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        project_root=$(git rev-parse --show-toplevel)
        
        # Verify it has a .carl directory
        if [[ ! -d "$project_root/.carl" ]]; then
            project_root=""
        fi
    
    # Method 5: Look up from current directory
    else
        project_root=$(find_carl_directory_upward "$(pwd)")
    fi
    
    # Validate the found project root
    if [[ -n "$project_root" && -d "$project_root/.carl" ]]; then
        # Store the found root for future use
        store_project_root "$project_root"
        echo "$project_root"
        return 0
    else
        echo "Error: Could not determine CARL project root directory" >&2
        echo "  - CLAUDE_PROJECT_DIR not set" >&2
        echo "  - No .carl directory found in current or parent directories" >&2
        echo "  - Current directory: $(pwd)" >&2
        return 1
    fi
}

# Find .carl directory in current or parent directories
find_carl_directory() {
    local dir="$(pwd)"
    while [[ "$dir" != "/" ]]; do
        if [[ -d "$dir/.carl" ]]; then
            echo "$dir"
            return 0
        fi
        dir="$(dirname "$dir")"
    done
    return 1
}

# Find .carl directory upward from a specific directory
find_carl_directory_upward() {
    local start_dir="$1"
    local dir="$start_dir"
    
    while [[ "$dir" != "/" ]]; do
        if [[ -d "$dir/.carl" ]]; then
            echo "$dir"
            return 0
        fi
        dir="$(dirname "$dir")"
    done
    return 1
}

# Get stored project root from CARL settings
get_stored_project_root() {
    local settings_file=""
    
    # Try to find carl-settings.json in common locations
    for location in \
        "${CLAUDE_PROJECT_DIR:-}/.carl/carl-settings.json" \
        "$(pwd)/.carl/carl-settings.json" \
        "$(find_carl_directory 2>/dev/null)/.carl/carl-settings.json"; do
        
        if [[ -n "$location" && -f "$location" ]]; then
            settings_file="$location"
            break
        fi
    done
    
    if [[ -n "$settings_file" ]] && command -v jq >/dev/null 2>&1; then
        jq -r '.system.project_root // empty' "$settings_file" 2>/dev/null
    fi
}

# Store project root in CARL settings for future use
store_project_root() {
    local project_root="$1"
    local settings_file="$project_root/.carl/carl-settings.json"
    
    if [[ -f "$settings_file" ]] && command -v jq >/dev/null 2>&1; then
        # Update the settings file with the project root
        local temp_file=$(mktemp)
        jq --arg root "$project_root" '.system.project_root = $root' "$settings_file" > "$temp_file" && \
        mv "$temp_file" "$settings_file"
    fi
}

# Set CARL_PROJECT_ROOT environment variable
set_carl_project_root() {
    if [[ -z "${CARL_PROJECT_ROOT:-}" ]]; then
        export CARL_PROJECT_ROOT=$(get_carl_project_root)
    fi
}

# Get project root with caching
get_project_root() {
    # Use cached value if available
    if [[ -n "${CARL_PROJECT_ROOT:-}" ]]; then
        echo "$CARL_PROJECT_ROOT"
        return 0
    fi
    
    # Set and return the project root
    set_carl_project_root
    echo "${CARL_PROJECT_ROOT:-}"
}