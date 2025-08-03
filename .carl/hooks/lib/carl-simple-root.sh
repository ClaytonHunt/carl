#!/bin/bash

# carl-simple-root.sh - Simplified project root detection
# Since hooks are always in .carl/hooks/, we can calculate root directly

# Get CARL project root (simple version for hooks)
get_project_root_simple() {
    # Hooks are always in PROJECT_ROOT/.carl/hooks/
    # So project root is always ../../ from hook location
    local hook_dir="$(cd "$(dirname "${BASH_SOURCE[1]}")" && pwd)"
    
    # Check if we're in a hook directory
    if [[ "$hook_dir" == *"/.carl/hooks" ]]; then
        # Go up two levels: hooks -> .carl -> project root
        echo "${hook_dir%/.carl/hooks}"
        return 0
    fi
    
    # Fallback to CLAUDE_PROJECT_DIR if available
    if [[ -n "${CLAUDE_PROJECT_DIR:-}" ]]; then
        echo "$CLAUDE_PROJECT_DIR"
        return 0
    fi
    
    # Error - not in expected location
    return 1
}

# Export for use in hooks
export PROJECT_ROOT=$(get_project_root_simple)