#!/bin/bash

# schema-validate.sh - PostToolUse hook for CARL schema validation
# Triggered after Write/Edit/MultiEdit operations
# Validates CARL files against their schemas

set -euo pipefail

# Get project root with robust detection
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/carl-project-root.sh"

PROJECT_ROOT=$(get_project_root)
if [[ $? -ne 0 ]]; then
    echo "Error: Could not determine CARL project root" >&2
    exit 1
fi

# Source libraries using project root
source "${PROJECT_ROOT}/.carl/hooks/lib/carl-validation.sh"
source "${PROJECT_ROOT}/.carl/hooks/lib/carl-settings.sh"

# Check if schema validation is enabled (always enabled, but check strict mode)
is_validation_enabled() {
    return 0  # Always enabled - use strict_mode to control behavior
}

# Get validation mode (strict/permissive)
get_validation_mode() {
    local strict_mode
    strict_mode=$(get_carl_setting "hooks.schema_validation.strict_mode" "true")
    if [[ "$strict_mode" == "true" ]]; then
        echo "strict"
    else
        echo "permissive"
    fi
}

# Check if file should be validated
should_validate_file() {
    local file_path="$1"
    
    # Only validate CARL files and settings
    case "$file_path" in
        *.carl|*/carl-settings.json)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Get files to validate from environment
get_modified_files() {
    # Claude Code provides modified files in CLAUDE_MODIFIED_FILES
    if [[ -n "${CLAUDE_MODIFIED_FILES:-}" ]]; then
        echo "$CLAUDE_MODIFIED_FILES" | tr ',' '\n'
    
    # Fallback: check recently modified CARL files
    else
        find "${PROJECT_ROOT}/.carl" -name "*.carl" -o -name "carl-settings.json" | \
        while read -r file; do
            if [[ -f "$file" ]] && needs_validation "$file"; then
                echo "$file"
            fi
        done
    fi
}

# Validate modified files
validate_modified_files() {
    local validation_errors=0
    local validation_mode
    validation_mode=$(get_validation_mode)
    
    echo "🔍 Validating modified CARL files..."
    
    # Get list of modified files
    local modified_files
    readarray -t modified_files < <(get_modified_files)
    
    if [[ ${#modified_files[@]} -eq 0 ]]; then
        echo "No CARL files to validate"
        return 0
    fi
    
    # Validate each file
    for file in "${modified_files[@]}"; do
        if [[ -n "$file" ]] && should_validate_file "$file"; then
            echo "Validating: $(basename "$file")"
            
            if validate_carl_file "$file"; then
                update_validation_cache "$file" "valid"
            else
                validation_errors=$((validation_errors + 1))
                update_validation_cache "$file" "invalid"
                
                # In strict mode, fail immediately
                if [[ "$validation_mode" == "strict" ]]; then
                    echo "❌ Schema validation failed in strict mode"
                    return 1
                fi
            fi
        fi
    done
    
    # Report results
    if [[ $validation_errors -eq 0 ]]; then
        echo "✅ All CARL files passed validation"
        return 0
    else
        if [[ "$validation_mode" == "permissive" ]]; then
            echo "⚠️  Found $validation_errors validation warning(s) (permissive mode)"
            return 0
        else
            echo "❌ Found $validation_errors validation error(s)"
            return 1
        fi
    fi
}

# Log validation results to session
log_validation_results() {
    local validation_status="$1"
    local error_count="$2"
    
    # Source session management
    if [[ -f "${PROJECT_ROOT}/.carl/hooks/lib/carl-session.sh" ]]; then
        source "${PROJECT_ROOT}/.carl/hooks/lib/carl-session.sh"
        source "${PROJECT_ROOT}/.carl/hooks/lib/carl-git.sh"
        source "${PROJECT_ROOT}/.carl/hooks/lib/carl-time.sh"
        
        local git_user
        git_user=$(get_git_user)
        local date_str
        date_str=$(get_date_string)
        local session_file="${PROJECT_ROOT}/.carl/sessions/session-${date_str}-${git_user}.carl"
        
        if [[ -f "$session_file" ]]; then
            local timestamp
            timestamp=$(get_iso_timestamp)
            
            cat >> "$session_file" << EOF

# Schema Validation - $timestamp
validation_events:
  - timestamp: "$timestamp"
    status: "$validation_status"
    error_count: $error_count
    mode: "$(get_validation_mode)"

EOF
        fi
    fi
}

# Main validation function
main() {
    # Check if validation is enabled
    if ! is_validation_enabled; then
        echo "Schema validation disabled in settings"
        return 0
    fi
    
    # Validate modified files
    local validation_errors=0
    if ! validate_modified_files; then
        validation_errors=1
    fi
    
    # Log results to session
    if [[ $validation_errors -eq 0 ]]; then
        log_validation_results "success" 0
    else
        log_validation_results "failure" $validation_errors
    fi
    
    return $validation_errors
}

# Execute if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi