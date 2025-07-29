#!/bin/bash

# Project Detection Script
# Automatically detects project type and updates CARL configuration

detect_project_type() {
    local project_dir="$1"
    
    # Check for common project files
    if [ -f "$project_dir/package.json" ]; then
        echo "nodejs"
    elif [ -f "$project_dir/requirements.txt" ] || [ -f "$project_dir/setup.py" ]; then
        echo "python"
    elif [ -f "$project_dir/Cargo.toml" ]; then
        echo "rust"
    elif [ -f "$project_dir/go.mod" ]; then
        echo "go"
    elif [ -f "$project_dir/pom.xml" ] || [ -f "$project_dir/build.gradle" ]; then
        echo "java"
    elif [ -f "$project_dir/Gemfile" ]; then
        echo "ruby"
    elif [ -f "$project_dir/composer.json" ]; then
        echo "php"
    elif [ -f "$project_dir/*.csproj" ] || [ -f "$project_dir/*.sln" ]; then
        echo "dotnet"
    else
        echo "unknown"
    fi
}

# Update CARL index with detected information
update_carl_index() {
    local project_type="$1"
    local carl_index="$2"
    
    # Update project type in index
    sed -i.bak "s/project_type: unknown/project_type: $project_type/" "$carl_index" 2>/dev/null || true
    sed -i.bak "s/last_analysis: never/last_analysis: $(date -u +"%Y-%m-%dT%H:%M:%SZ")/" "$carl_index" 2>/dev/null || true
    
    # Clean up backup file
    rm "$carl_index.bak" 2>/dev/null || true
}

# Main execution
if [ $# -eq 0 ]; then
    PROJECT_DIR="$(pwd)"
else
    PROJECT_DIR="$1"
fi

PROJECT_TYPE=$(detect_project_type "$PROJECT_DIR")
CARL_INDEX="$PROJECT_DIR/.carl/index.carl"

if [ -f "$CARL_INDEX" ]; then
    update_carl_index "$PROJECT_TYPE" "$CARL_INDEX"
    echo "Detected project type: $PROJECT_TYPE"
else
    echo "CARL index not found at $CARL_INDEX"
    exit 1
fi
