# Work Item Validation Framework

Shared validation functions for CARL work item integrity and relationships.

## Work Item Validation

### Schema Compliance Check
- [ ] File exists and is readable
- [ ] YAML syntax is valid
- [ ] All required fields are present per scope type
- [ ] Field values meet type and format requirements
- [ ] Naming conventions are followed (kebab-case files, snake_case IDs)

### Relationship Validation
- [ ] Parent-child relationships are valid and exist
- [ ] Dependency chains are acyclic (no circular dependencies)
- [ ] Referenced work items exist and are accessible
- [ ] Status transitions are logical and permitted

### Content Quality Check
- [ ] Acceptance criteria are measurable and testable
- [ ] Estimates are realistic and within scope boundaries
- [ ] Descriptions provide sufficient context for implementation
- [ ] Technical requirements are specific and actionable

## Validation Functions

### `validate_work_item_file()`
```bash
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
```

### `validate_epic_fields()`
```bash
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
```

### `validate_feature_fields()`
```bash
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
```

### `validate_story_fields()`
```bash
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
```

### `validate_technical_fields()`
```bash
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
```

### `validate_naming_conventions()`
```bash
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
```

## Dependency Analysis Functions

### `validate_dependencies()`
```bash
validate_dependencies() {
    local file_path="$1"
    local errors=()
    
    # Get dependencies from work item
    local deps
    deps=$(yq eval '.dependencies[]' "$file_path" 2>/dev/null)
    
    if [[ -n "$deps" ]]; then
        while IFS= read -r dep; do
            # Parse dependency (could be ID or filename)
            local dep_file
            if [[ "$dep" =~ \.carl$ ]]; then
                # Full filename provided
                dep_file=$(find .carl/project -name "$dep" 2>/dev/null)
            else
                # ID provided, find matching file
                dep_file=$(find .carl/project -name "*${dep}*.carl" 2>/dev/null)
            fi
            
            if [[ -z "$dep_file" ]]; then
                errors+=("Dependency not found: $dep")
                continue
            fi
            
            # Check dependency status
            local dep_status
            dep_status=$(yq eval '.status' "$dep_file" 2>/dev/null)
            if [[ "$dep_status" != "completed" ]]; then
                errors+=("Dependency not completed: $dep (status: $dep_status)")
            fi
        done <<< "$deps"
    fi
    
    if [[ ${#errors[@]} -gt 0 ]]; then
        echo "❌ Dependency validation failed:"
        printf "  - %s\n" "${errors[@]}"
        return 1
    fi
    
    echo "✅ Dependencies validated"
    return 0
}
```

### `check_circular_dependencies()`
```bash
check_circular_dependencies() {
    local start_item="$1"
    local visited=()
    local path=()
    
    _check_circular_recursive() {
        local current="$1"
        local current_path=("${@:2}")
        
        # Check if we've returned to start of path
        for item in "${current_path[@]}"; do
            if [[ "$item" == "$current" ]]; then
                echo "❌ Circular dependency detected:"
                printf "   %s -> " "${current_path[@]}" "$current"
                echo ""
                return 1
            fi
        done
        
        # Get dependencies of current item
        local deps
        deps=$(yq eval '.dependencies[]' "$current" 2>/dev/null)
        
        if [[ -n "$deps" ]]; then
            while IFS= read -r dep; do
                local dep_file
                dep_file=$(find .carl/project -name "*${dep}*.carl" 2>/dev/null)
                if [[ -n "$dep_file" ]]; then
                    _check_circular_recursive "$dep_file" "${current_path[@]}" "$current"
                fi
            done <<< "$deps"
        fi
    }
    
    _check_circular_recursive "$start_item"
    return $?
}
```

## Quality Assessment Functions

### `assess_work_item_quality()`
```bash
assess_work_item_quality() {
    local file_path="$1"
    local warnings=()
    local score=100
    
    # Check acceptance criteria quality
    local criteria_count
    criteria_count=$(yq eval '.acceptance_criteria | length' "$file_path" 2>/dev/null)
    if [[ "$criteria_count" -lt 3 ]]; then
        warnings+=("Few acceptance criteria (${criteria_count}), consider adding more detail")
        ((score -= 15))
    fi
    
    # Check description length and detail
    local desc_length
    desc_length=$(yq eval '.description | length' "$file_path" 2>/dev/null)
    if [[ "$desc_length" -lt 100 ]]; then
        warnings+=("Short description (${desc_length} chars), consider adding more context")
        ((score -= 10))
    fi
    
    # Check for technical requirements (stories/technical items)
    local scope_type
    scope_type=$(basename "$file_path" | grep -o '\.\(story\|tech\)\.carl$')
    if [[ -n "$scope_type" ]] && ! yq eval '.technical_requirements' "$file_path" &>/dev/null; then
        warnings+=("Missing technical requirements for implementation guidance")
        ((score -= 20))
    fi
    
    # Report quality assessment
    echo "📊 Work Item Quality Score: ${score}/100"
    if [[ ${#warnings[@]} -gt 0 ]]; then
        echo "⚠️  Quality warnings:"
        printf "  - %s\n" "${warnings[@]}"
    fi
    
    return 0
}
```

## Usage Example

```bash
# In command files
source .carl/commandlib/shared/work-item-validation.md

# Validate work item before processing
if ! validate_work_item_file "$work_item_path"; then
    echo "Work item validation failed. Please check the file structure and content."
    exit 1
fi

# Check dependencies before execution
if ! validate_dependencies "$work_item_path"; then
    echo "Dependency validation failed. Complete required dependencies first."
    exit 1
fi

# Assess quality and provide feedback
assess_work_item_quality "$work_item_path"
```

## Integration Points

This validation framework integrates with:
- **Schema validation** - Uses YAML schemas for structure validation
- **Dependency analysis** - Builds dependency graphs for execution planning
- **Progress tracking** - Validates status transitions during updates
- **Quality gates** - Ensures work items meet quality standards before processing