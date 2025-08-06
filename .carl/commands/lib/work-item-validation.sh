#!/bin/bash

# Work Item Validation Library
# Shared validation functions for CARL work item integrity and relationships

# Set up paths (commands run from project root)
CARL_DIR=".carl"

# Validate work item file structure and content
validate_work_item_file() {
    local file_path="$1"
    local expected_scope="${2:-auto}"
    local errors=()
    
    # Check file existence
    if [[ ! -f "$file_path" ]]; then
        errors+=("Work item file does not exist: $file_path")
        echo "❌ Work item validation failed:"
        printf "  - %s\n" "${errors[@]}"
        return 1
    fi
    
    # Check YAML syntax
    if ! yq eval '.' "$file_path" &>/dev/null; then
        errors+=("Invalid YAML syntax in: $file_path")
    fi
    
    # Check required fields based on scope
    local scope_type
    scope_type=$(basename "$file_path" | grep -o '\.\(epic\|feature\|story\|tech\)\.carl$' | sed 's/^\.\(.*\)\.carl$/\1/')
    
    case "$scope_type" in
        "epic")
            validate_epic_fields "$file_path" || errors+=("Missing required epic fields")
            ;;
        "feature")
            validate_feature_fields "$file_path" || errors+=("Missing required feature fields")
            ;;
        "story")
            validate_story_fields "$file_path" || errors+=("Missing required story fields")
            ;;
        "tech")
            validate_technical_fields "$file_path" || errors+=("Missing required technical fields")
            ;;
        *)
            errors+=("Unknown scope type or invalid file naming: $file_path")
            ;;
    esac
    
    if [[ ${#errors[@]} -gt 0 ]]; then
        echo "❌ Work item validation failed:"
        printf "  - %s\n" "${errors[@]}"
        return 1
    fi
    
    echo "✅ Work item validation passed: $file_path"
    return 0
}

# Validate epic-specific required fields
validate_epic_fields() {
    local file_path="$1"
    local required_fields=(
        "id"
        "name"
        "description"
        "status"
        "timeline.estimated_duration"
        "acceptance_criteria"
        "business_value"
    )
    
    for field in "${required_fields[@]}"; do
        if ! yq eval ".${field}" "$file_path" &>/dev/null || [[ $(yq eval ".${field}" "$file_path") == "null" ]]; then
            echo "Missing required field: $field"
            return 1
        fi
    done
    return 0
}

# Validate feature-specific required fields
validate_feature_fields() {
    local file_path="$1"
    local required_fields=(
        "id"
        "name"
        "description"
        "status"
        "t_shirt_size"
        "user_stories"
        "acceptance_criteria"
        "timeline.estimated_duration"
    )
    
    for field in "${required_fields[@]}"; do
        if ! yq eval ".${field}" "$file_path" &>/dev/null || [[ $(yq eval ".${field}" "$file_path") == "null" ]]; then
            echo "Missing required field: $field"
            return 1
        fi
    done
    return 0
}

# Validate story-specific required fields
validate_story_fields() {
    local file_path="$1"
    local required_fields=(
        "id"
        "name"
        "status"
        "parent_feature"
        "story_description"
        "acceptance_criteria"
        "estimate.story_points"
        "estimate.time_guidance"
    )
    
    for field in "${required_fields[@]}"; do
        if ! yq eval ".${field}" "$file_path" &>/dev/null || [[ $(yq eval ".${field}" "$file_path") == "null" ]]; then
            echo "Missing required field: $field"
            return 1
        fi
    done
    return 0
}

# Validate technical work item required fields
validate_technical_fields() {
    local file_path="$1"
    local required_fields=(
        "id"
        "name"
        "status"
        "description"
        "acceptance_criteria"
        "technical_requirements"
        "estimate.complexity"
    )
    
    for field in "${required_fields[@]}"; do
        if ! yq eval ".${field}" "$file_path" &>/dev/null || [[ $(yq eval ".${field}" "$file_path") == "null" ]]; then
            echo "Missing required field: $field"
            return 1
        fi
    done
    return 0
}

# Validate naming conventions
validate_naming_conventions() {
    local file_path="$1"
    local filename
    filename=$(basename "$file_path")
    
    # Check file naming (kebab-case.scope.carl)
    if [[ ! "$filename" =~ ^[a-z0-9]+(-[a-z0-9]+)*\.(epic|feature|story|tech)\.carl$ ]]; then
        echo "❌ Invalid file naming convention: $filename"
        echo "   Expected: kebab-case.scope.carl"
        return 1
    fi
    
    # Check ID naming (snake_case)
    local id
    id=$(yq eval '.id' "$file_path" 2>/dev/null)
    if [[ ! "$id" =~ ^[a-z0-9]+(_[a-z0-9]+)*$ ]]; then
        echo "❌ Invalid ID naming convention: $id"
        echo "   Expected: snake_case_format"
        return 1
    fi
    
    echo "✅ Naming conventions validated"
    return 0
}

# Find work item by ID across all scopes
find_work_item_by_id() {
    local item_id="$1"
    
    # Search all CARL files for matching ID
    find "$CARL_DIR/project" -name "*.carl" -not -path "*/completed/*" -exec yq eval 'select(.id == "'$item_id'")' {} + 2>/dev/null | head -1
}

# Get work item file path by ID
get_work_item_path() {
    local item_id="$1"
    
    find "$CARL_DIR/project" -name "*${item_id}*.carl" -not -path "*/completed/*" 2>/dev/null | head -1
}