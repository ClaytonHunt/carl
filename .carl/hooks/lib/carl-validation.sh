#!/bin/bash

# carl-validation.sh - Schema validation utilities for CARL files
# Provides YAML schema validation and error handling

# Get project root with robust detection
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/carl-project-root.sh"

PROJECT_ROOT=$(get_project_root)
if [[ $? -ne 0 ]]; then
    echo "Error: Could not determine CARL project root" >&2
    exit 1
fi

# Validate a CARL file against its schema
validate_carl_file() {
    local file_path="$1"
    local schema_name=""
    local validation_result=""
    
    # Determine schema from file extension
    case "$file_path" in
        *.epic.carl)
            schema_name="epic"
            ;;
        *.feature.carl)
            schema_name="feature"
            ;;
        *.story.carl)
            schema_name="story"
            ;;
        *.tech.carl)
            schema_name="tech"
            ;;
        *session-*.carl)
            schema_name="session"
            ;;
        */carl-settings.json)
            schema_name="carl-settings"
            ;;
        *)
            echo "Unknown CARL file type: $file_path" >&2
            return 1
            ;;
    esac
    
    # Validate the file
    validation_result=$(validate_with_schema "$file_path" "$schema_name")
    local exit_code=$?
    
    if [[ $exit_code -eq 0 ]]; then
        echo "✅ Valid: $file_path"
        return 0
    else
        echo "❌ Invalid: $file_path"
        echo "$validation_result" >&2
        return 1
    fi
}

# Validate a file against a specific schema
validate_with_schema() {
    local file_path="$1"
    local schema_name="$2"
    local schema_path="${PROJECT_ROOT}/.carl/schemas/${schema_name}.schema.yaml"
    
    # Check if file exists
    if [[ ! -f "$file_path" ]]; then
        echo "File not found: $file_path"
        return 1
    fi
    
    # Check if schema exists
    if [[ ! -f "$schema_path" ]]; then
        echo "Schema not found: $schema_path"
        return 1
    fi
    
    # Try yq validation first (preferred)
    if command -v yq >/dev/null 2>&1; then
        validate_with_yq "$file_path" "$schema_path"
        return $?
    
    # Fallback to basic YAML syntax check
    elif command -v python3 >/dev/null 2>&1; then
        validate_with_python "$file_path"
        return $?
    
    # Final fallback - basic syntax check
    else
        validate_basic_yaml "$file_path"
        return $?
    fi
}

# Validate using yq (preferred method)
validate_with_yq() {
    local file_path="$1"
    local schema_path="$2"
    
    # Check YAML syntax first
    if ! yq eval . "$file_path" >/dev/null 2>&1; then
        echo "YAML syntax error in $file_path"
        yq eval . "$file_path" 2>&1
        return 1
    fi
    
    # TODO: Implement full schema validation with yq
    # For now, just check basic structure
    local required_fields=""
    case "$(basename "$schema_path")" in
        "epic.schema.yaml")
            required_fields="id title description scope"
            ;;
        "feature.schema.yaml")
            required_fields="id title description parent_epic"
            ;;
        "story.schema.yaml")
            required_fields="id title description parent_feature"
            ;;
        "technical.schema.yaml")
            required_fields="id title description type"
            ;;
        "session.schema.yaml")
            required_fields="session_id date git_user"
            ;;
    esac
    
    # Check for required fields
    for field in $required_fields; do
        if ! yq eval "has(\"$field\")" "$file_path" 2>/dev/null | grep -q "true"; then
            echo "Missing required field: $field"
            return 1
        fi
    done
    
    return 0
}

# Validate using Python YAML parser
validate_with_python() {
    local file_path="$1"
    
    python3 -c "
import yaml
import sys
try:
    with open('$file_path', 'r') as f:
        yaml.safe_load(f)
    print('YAML syntax valid')
    sys.exit(0)
except yaml.YAMLError as e:
    print(f'YAML syntax error: {e}')
    sys.exit(1)
except Exception as e:
    print(f'Error reading file: {e}')
    sys.exit(1)
"
}

# Basic YAML validation (fallback)
validate_basic_yaml() {
    local file_path="$1"
    
    # Check for basic YAML structure issues
    if grep -q $'\t' "$file_path"; then
        echo "YAML should use spaces, not tabs for indentation"
        return 1
    fi
    
    # Check for balanced quotes
    local single_quotes=$(grep -o "'" "$file_path" | wc -l)
    local double_quotes=$(grep -o '"' "$file_path" | wc -l)
    
    if [[ $((single_quotes % 2)) -ne 0 ]]; then
        echo "Unbalanced single quotes in YAML"
        return 1
    fi
    
    if [[ $((double_quotes % 2)) -ne 0 ]]; then
        echo "Unbalanced double quotes in YAML"
        return 1
    fi
    
    echo "Basic YAML structure appears valid"
    return 0
}

# Validate all CARL files in the project
validate_all_carl_files() {
    local validation_errors=0
    
    echo "🔍 Validating all CARL files in project..."
    
    # Find all CARL files
    local carl_files=(
        $(find "${PROJECT_ROOT}/.carl" -name "*.carl" -type f)
        "${PROJECT_ROOT}/.carl/carl-settings.json"
    )
    
    for file in "${carl_files[@]}"; do
        if [[ -f "$file" ]]; then
            if ! validate_carl_file "$file"; then
                validation_errors=$((validation_errors + 1))
            fi
        fi
    done
    
    if [[ $validation_errors -eq 0 ]]; then
        echo "✅ All CARL files are valid"
        return 0
    else
        echo "❌ Found $validation_errors validation error(s)"
        return 1
    fi
}

# Get validation summary for a file
get_validation_summary() {
    local file_path="$1"
    
    if validate_carl_file "$file_path" >/dev/null 2>&1; then
        echo "valid"
    else
        echo "invalid"
    fi
}

# Validation cache functions removed - validation runs on every PostToolUse
# No caching needed since we validate-on-save with auto-fixing