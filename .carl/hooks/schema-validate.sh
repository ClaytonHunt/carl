#!/bin/bash

# schema-validate.sh - Minimal PostToolUse hook for CARL schema validation
# COMPACT FORMAT: Only logs critical validation failures, no verbose events
# Triggered after Write/Edit/MultiEdit operations

# Use CLAUDE_PROJECT_DIR for all paths
if [[ -z "${CLAUDE_PROJECT_DIR:-}" ]]; then
    exit 0  # Fail silently to avoid breaking Claude Code
fi

# Source minimal libraries
source "${CLAUDE_PROJECT_DIR}/.carl/hooks/lib/carl-validation.sh" 2>/dev/null || exit 0
source "${CLAUDE_PROJECT_DIR}/.carl/hooks/lib/carl-settings.sh" 2>/dev/null || exit 0

# Check if compact mode is enabled
is_compact_mode_enabled() {
    local compact_mode
    compact_mode=$(get_carl_setting "session.compact_format" "false" 2>/dev/null)
    [[ "$compact_mode" == "true" ]]
}

# Validate files silently in compact mode
validate_files_compact() {
    local modified_files
    readarray -t modified_files < <(get_recently_modified_work_items 0.1 2>/dev/null)
    
    for file in "${modified_files[@]}"; do
        if [[ -f "$file" && "$file" =~ \.carl$ ]]; then
            # Validate and auto-fix silently
            validate_carl_file "$file" 2>/dev/null
        fi
    done
}

# Main schema validation
main() {
    # Skip verbose logging if compact mode enabled
    if is_compact_mode_enabled; then
        validate_files_compact
        exit 0
    fi
    
    # If compact mode is disabled, fall back to basic validation without verbose logging
    # This avoids creating backup files since we're under git source control
    validate_files_compact  # Use the same compact validation logic
    exit 0
}

# Execute if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi