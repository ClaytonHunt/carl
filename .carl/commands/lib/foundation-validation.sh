#!/bin/bash

# Foundation Validation Library
# Shared validation functions for CARL foundation prerequisites

# Set up paths (commands run from project root)
CARL_DIR=".carl"

# Validate CARL foundation structure
validate_carl_foundation() {
    local errors=()
    
    # Check core directory structure
    [[ ! -d "$CARL_DIR" ]] && errors+=("Missing .carl directory")
    [[ ! -d "$CARL_DIR/project" ]] && errors+=("Missing .carl/project directory")
    [[ ! -d "$CARL_DIR/project/epics" ]] && errors+=("Missing .carl/project/epics directory")
    [[ ! -d "$CARL_DIR/project/features" ]] && errors+=("Missing .carl/project/features directory")
    [[ ! -d "$CARL_DIR/project/stories" ]] && errors+=("Missing .carl/project/stories directory")
    [[ ! -d "$CARL_DIR/project/technical" ]] && errors+=("Missing .carl/project/technical directory")
    [[ ! -d "$CARL_DIR/schemas" ]] && errors+=("Missing .carl/schemas directory")
    [[ ! -d "$CARL_DIR/sessions" ]] && errors+=("Missing .carl/sessions directory")
    
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

# Validate schema files exist
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
        [[ ! -f "$CARL_DIR/schemas/$schema" ]] && missing+=("$schema")
    done
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        echo "❌ Missing required schemas:"
        printf "  - %s\n" "${missing[@]}"
        return 1
    fi
    
    echo "✅ Schema validation passed"
    return 0
}

# Validate git repository state
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

# Create missing foundation directories
create_foundation_structure() {
    echo "🔧 Creating missing CARL foundation directories..."
    
    mkdir -p "$CARL_DIR/project"/{epics,features,stories,technical}
    mkdir -p "$CARL_DIR"/{schemas,sessions,commands,hooks}
    
    echo "✅ Foundation structure created"
    return 0
}