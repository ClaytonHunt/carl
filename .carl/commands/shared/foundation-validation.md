# Foundation Validation Framework

Shared validation functions for CARL foundation prerequisites.

## Foundation Existence Check

### Basic Foundation Check
- [ ] `.carl/` directory exists and is properly structured
- [ ] `.carl/project/` directory structure exists (epics/, features/, stories/, technical/)
- [ ] `.carl/schemas/` directory exists with validation schemas
- [ ] `.carl/sessions/` directory exists for session tracking

### Process Configuration Check
- [ ] Check for `process.carl` in project root (optional)
- [ ] Validate TDD settings if process.carl exists
- [ ] Check quality gate configuration
- [ ] Verify hook integration settings

### Git Integration Check
- [ ] Project is a git repository (.git directory exists)
- [ ] Git user configuration is valid
- [ ] Working directory is clean for certain operations (when required)
- [ ] Current branch is identifiable for session tracking

## Validation Functions

### `validate_carl_foundation()`
```bash
validate_carl_foundation() {
    local errors=()
    
    # Check core directory structure
    [[ ! -d ".carl" ]] && errors+=("Missing .carl directory")
    [[ ! -d ".carl/project" ]] && errors+=("Missing .carl/project directory")
    [[ ! -d ".carl/project/epics" ]] && errors+=("Missing .carl/project/epics directory")
    [[ ! -d ".carl/project/features" ]] && errors+=("Missing .carl/project/features directory")
    [[ ! -d ".carl/project/stories" ]] && errors+=("Missing .carl/project/stories directory")
    [[ ! -d ".carl/project/technical" ]] && errors+=("Missing .carl/project/technical directory")
    [[ ! -d ".carl/schemas" ]] && errors+=("Missing .carl/schemas directory")
    [[ ! -d ".carl/sessions" ]] && errors+=("Missing .carl/sessions directory")
    
    # Check git integration
    [[ ! -d ".git" ]] && errors+=("Project is not a git repository")
    
    if [[ ${#errors[@]} -gt 0 ]]; then
        echo "❌ Foundation validation failed:"
        printf "  - %s\n" "${errors[@]}"
        return 1
    fi
    
    echo "✅ Foundation validation passed"
    return 0
}
```

### `validate_schemas()`
```bash
validate_schemas() {
    local required_schemas=(
        "epic.schema.yaml"
        "feature.schema.yaml" 
        "story.schema.yaml"
        "technical.schema.yaml"
        "session.schema.yaml"
    )
    
    local missing=()
    for schema in "${required_schemas[@]}"; do
        [[ ! -f ".carl/schemas/$schema" ]] && missing+=("$schema")
    done
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        echo "❌ Missing required schemas:"
        printf "  - %s\n" "${missing[@]}"
        return 1
    fi
    
    echo "✅ Schema validation passed"
    return 0
}
```

### `validate_git_state()`
```bash
validate_git_state() {
    local clean_required=${1:-false}
    local errors=()
    
    # Check git repository
    if ! git rev-parse --git-dir &>/dev/null; then
        errors+=("Not a git repository")
        echo "❌ Git validation failed:"
        printf "  - %s\n" "${errors[@]}"
        return 1
    fi
    
    # Check git user configuration
    if ! git config user.name &>/dev/null || ! git config user.email &>/dev/null; then
        errors+=("Git user configuration missing (name or email)")
    fi
    
    # Check clean state if required
    if [[ "$clean_required" == "true" ]] && [[ -n $(git status --porcelain) ]]; then
        errors+=("Working directory has uncommitted changes (clean state required)")
    fi
    
    if [[ ${#errors[@]} -gt 0 ]]; then
        echo "❌ Git validation failed:"
        printf "  - %s\n" "${errors[@]}"
        return 1
    fi
    
    echo "✅ Git validation passed"
    return 0
}
```

## Usage Example

```bash
# In command file
source .carl/commandlib/shared/foundation-validation.md

# Validate foundation before command execution
if ! validate_carl_foundation; then
    echo "Foundation validation failed. Run /carl:analyze to initialize project."
    exit 1
fi

# Validate schemas if needed
if ! validate_schemas; then
    echo "Schema validation failed. Check .carl/schemas/ directory."
    exit 1
fi
```

## Integration with Commands

All CARL commands should use these validation functions:

- **`/carl:analyze`** - Run foundation validation, create missing structure
- **`/carl:plan`** - Validate foundation exists before creating work items
- **`/carl:task`** - Validate foundation and work item before execution
- **`/carl:status`** - Validate foundation and session directory access

## Error Handling

Foundation validation failures should:
1. Provide clear, actionable error messages
2. Suggest specific remediation steps
3. Fail fast to prevent inconsistent state
4. Use consistent error format across all commands