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
            if [[ -f "$file" ]]; then
                echo "$file"
            fi
        done
    fi
}

# Auto-fix common CARL file issues
auto_fix_carl_file() {
    local file_path="$1"
    local fixes_applied=0
    
    if [[ ! -f "$file_path" ]]; then
        return 1
    fi
    
    # Skip auto-fix for session files (different schema and structure)
    if [[ "$file_path" == *"session-"*.carl ]]; then
        return 1
    fi
    
    # Create backup
    cp "$file_path" "${file_path}.backup"
    
    # Fix 1: Add missing last_updated field
    if ! grep -q "last_updated:" "$file_path"; then
        local timestamp
        timestamp=$(date -u +%Y-%m-%dT%H:%M:%S)
        sed -i "/^completion_percentage:/a last_updated: \"$timestamp\"" "$file_path"
        fixes_applied=$((fixes_applied + 1))
        echo "  ✅ Added missing last_updated field"
    fi
    
    # Fix 2: Ensure required fields exist based on file type
    case "$file_path" in
        *.feature.carl)
            if ! grep -q "feature_details:" "$file_path"; then
                echo "feature_details:" >> "$file_path"
                echo "  category: general" >> "$file_path"
                echo "  complexity: medium" >> "$file_path"
                fixes_applied=$((fixes_applied + 1))
                echo "  ✅ Added missing feature_details section"
            fi
            ;;
        *.tech.carl)
            if ! grep -q "technical_details:" "$file_path"; then
                echo "technical_details:" >> "$file_path"
                echo "  category: general" >> "$file_path"
                echo "  complexity: medium" >> "$file_path"
                fixes_applied=$((fixes_applied + 1))
                echo "  ✅ Added missing technical_details section"
            fi
            ;;
    esac
    
    # Fix 3: Fix invalid enum values
    sed -i 's/status: in_progress/status: active/g' "$file_path"
    if [[ $? -eq 0 ]]; then
        fixes_applied=$((fixes_applied + 1))
        echo "  ✅ Fixed status: in_progress -> active"
    fi
    
    # If no fixes were needed, remove backup
    if [[ $fixes_applied -eq 0 ]]; then
        rm -f "${file_path}.backup"
        return 1
    fi
    
    echo "  🔧 Applied $fixes_applied auto-fixes to $(basename "$file_path")"
    return 0
}

# Provide specific guidance to Claude Code for fixing validation errors
provide_claude_code_guidance() {
    local file_path="$1"
    local validation_output="$2"
    
    echo "  📋 Claude Code Action Required:"
    echo "  File: $file_path"
    echo "  Schema: $(basename "$(dirname "$file_path")")/*.schema.yaml"
    
    # Parse common YAML errors and provide specific guidance
    if echo "$validation_output" | grep -q "YAML syntax error"; then
        echo "  Issue: YAML syntax error detected"
        echo "  Fix: Check for unbalanced quotes, incorrect indentation, or invalid YAML structure"
        
        # Check for specific syntax issues
        if echo "$validation_output" | grep -q "unbalanced"; then
            echo "  Specific: Look for unmatched quotes or brackets"
        fi
        if echo "$validation_output" | grep -q "indentation"; then
            echo "  Specific: Use consistent 2-space indentation, no tabs"
        fi
    fi
    
    # Check for missing required fields
    if echo "$validation_output" | grep -q "Missing required field"; then
        local missing_field
        missing_field=$(echo "$validation_output" | grep "Missing required field" | cut -d':' -f2 | tr -d ' ')
        echo "  Issue: Missing required field: $missing_field"
        echo "  Fix: Add the required field '$missing_field' to the CARL file"
        
        # Provide field-specific guidance
        case "$missing_field" in
            id)
                echo "  Example: id: \"unique_identifier_here\""
                ;;
            title)
                echo "  Example: title: \"Descriptive title here\""
                ;;
            description)
                echo "  Example: description: \"Detailed description here\""
                ;;
            status)
                echo "  Example: status: not_started  # or active, completed, blocked, cancelled"
                ;;
        esac
    fi
    
    # Check for invalid enum values
    if echo "$validation_output" | grep -q "invalid.*status"; then
        echo "  Issue: Invalid status value"
        echo "  Fix: Use one of: not_started, active, completed, blocked, cancelled"
    fi
    
    echo "  Action: Use Claude Code's Edit tool to fix the issues above"
    echo ""
}

# Validate modified files
validate_modified_files() {
    local validation_errors=0
    local validation_mode
    validation_mode=$(get_validation_mode)
    local auto_fix_enabled
    auto_fix_enabled=$(get_carl_setting "hooks.schema_validation.auto_fix" "true")
    
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
            
            # Capture validation output for analysis
            local validation_output
            validation_output=$(validate_carl_file "$file" 2>&1)
            local validation_exit_code=$?
            
            if [[ $validation_exit_code -eq 0 ]]; then
                echo "  ✅ Validation passed"
            else
                validation_errors=$((validation_errors + 1))
                echo "  ❌ Validation failed"
                
                # Provide specific guidance to Claude Code
                provide_claude_code_guidance "$file" "$validation_output"
                
                # Try auto-fix if enabled
                if [[ "$auto_fix_enabled" == "true" ]]; then
                    echo "  🔧 Attempting auto-fix..."
                    if auto_fix_carl_file "$file"; then
                        # Re-validate after fixes
                        echo "  🔄 Re-validating after auto-fix..."
                        if validate_carl_file "$file"; then
                            echo "  ✅ Auto-fix successful - validation now passes"
                            validation_errors=$((validation_errors - 1))
                        else
                            echo "  ⚠️  Auto-fix applied but validation still fails"
                            # Provide updated guidance after auto-fix attempt
                            local post_fix_output
                            post_fix_output=$(validate_carl_file "$file" 2>&1)
                            provide_claude_code_guidance "$file" "$post_fix_output"
                        fi
                    else
                        echo "  ⚠️  No auto-fixes available for this validation error"
                    fi
                fi
                
                # In strict mode, fail immediately if still invalid
                if [[ "$validation_mode" == "strict" ]] && [[ $validation_errors -gt 0 ]]; then
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
    local fixes_applied="${3:-0}"
    
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
    fixes_applied: $fixes_applied
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
    
    # Track fixes applied
    local total_fixes=0
    
    # Validate modified files
    local validation_errors=0
    if ! validate_modified_files; then
        validation_errors=1
    fi
    
    # Count fixes applied by checking for backup files
    total_fixes=$(find "${PROJECT_ROOT}/.carl" -name "*.backup" 2>/dev/null | wc -l)
    
    # Clean up backup files if validation passed
    if [[ $validation_errors -eq 0 && $total_fixes -gt 0 ]]; then
        find "${PROJECT_ROOT}/.carl" -name "*.backup" -delete 2>/dev/null
        echo "🧹 Cleaned up backup files after successful auto-fixes"
    fi
    
    # Log results to session
    if [[ $validation_errors -eq 0 ]]; then
        log_validation_results "success" 0 $total_fixes
        if [[ $total_fixes -gt 0 ]]; then
            echo "✅ Schema validation passed after applying $total_fixes auto-fixes"
        fi
    else
        log_validation_results "failure" $validation_errors $total_fixes
        if [[ $total_fixes -gt 0 ]]; then
            echo "⚠️ Applied $total_fixes auto-fixes but $validation_errors errors remain"
        fi
    fi
    
    return $validation_errors
}

# Execute if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi