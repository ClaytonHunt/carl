#!/bin/bash

# documentation-scanner-v2.sh - Simplified Documentation Scanner
# Clean implementation focusing on reliability

set -euo pipefail

# Configuration
CLAUDE_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-}"
if [[ -z "$CLAUDE_PROJECT_DIR" ]]; then
    echo "Error: CLAUDE_PROJECT_DIR environment variable not set" >&2
    exit 1
fi

SCAN_ROOT="$CLAUDE_PROJECT_DIR"
INCLUDE_INLINE_DOCS=true
VERBOSE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-inline)
            INCLUDE_INLINE_DOCS=false
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [--no-inline] [--verbose] [--help]"
            exit 0
            ;;
        *)
            echo "Error: Unknown option $1" >&2
            exit 1
            ;;
    esac
done

# Logging function
log_msg() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo "[$1] $2" >&2
    fi
}

# Safe JSON string escaping
json_escape() {
    echo "$1" | sed 's/\\/\\\\/g; s/"/\\"/g; s/	/\\t/g; s/$/\\n/' | tr -d '\n'
}

# Get relative path
get_relative_path() {
    local file="$1"
    realpath --relative-to="$SCAN_ROOT" "$file" 2>/dev/null || echo "$file"
}

# Classify file type
get_file_type() {
    local file="$1"
    local basename_file
    basename_file=$(basename "$file")
    
    case "$basename_file" in
        README*|readme*) echo "documentation_readme" ;;
        CLAUDE*) echo "documentation_claude" ;;
        CONTRIBUTING*) echo "documentation_contributing" ;;
        LICENSE*|COPYING*) echo "documentation_license" ;;
        CHANGELOG*) echo "documentation_changelog" ;;
        *.md|*.markdown) echo "documentation_markdown" ;;
        *.sh) echo "source_bash" ;;
        *.yml|*.yaml) echo "source_yaml" ;;
        *) echo "unknown" ;;
    esac
}

# Get file metadata as JSON
get_file_json() {
    local file="$1"
    
    if [[ ! -f "$file" || ! -r "$file" ]]; then
        return 1
    fi
    
    # Basic file info
    local size
    size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null || echo 0)
    
    local modified_time
    modified_time=$(stat -c%Y "$file" 2>/dev/null || stat -f%m "$file" 2>/dev/null || echo 0)
    local modified_iso
    modified_iso=$(date -d "@$modified_time" -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -r "$modified_time" -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo "")
    
    # Paths
    local rel_path
    rel_path=$(get_relative_path "$file")
    
    # File type
    local file_type
    file_type=$(get_file_type "$file")
    
    # Git info (simplified)
    local git_tracked="false"
    local git_commit=""
    local git_author=""
    local git_date=""
    
    if git rev-parse --git-dir >/dev/null 2>&1; then
        if git ls-files --error-unmatch "$rel_path" >/dev/null 2>&1; then
            git_tracked="true"
            git_commit=$(git log -1 --format="%H" -- "$rel_path" 2>/dev/null || echo "")
            git_author=$(git log -1 --format="%an" -- "$rel_path" 2>/dev/null || echo "")
            git_date=$(git log -1 --format="%aI" -- "$rel_path" 2>/dev/null || echo "")
        fi
    fi
    
    # Generate JSON
    cat << EOF
{
  "path": "$(json_escape "$rel_path")",
  "absolute_path": "$(json_escape "$file")",
  "size": $size,
  "modified_date": "$modified_iso",
  "type": "$file_type",
  "git_info": {
    "tracked": $git_tracked,
    "last_commit": "$(json_escape "$git_commit")",
    "last_author": "$(json_escape "$git_author")",
    "last_commit_date": "$git_date"
  }
}
EOF
}

# Find documentation files
find_docs() {
    local files=()
    
    # Root documentation files
    for pattern in "README*" "CLAUDE*" "CONTRIBUTING*" "LICENSE*" "CHANGELOG*"; do
        while IFS= read -r -d '' file; do
            [[ -f "$file" && -r "$file" ]] && files+=("$file")
        done < <(find "$SCAN_ROOT" -maxdepth 2 -name "$pattern" -type f -print0 2>/dev/null || true)
    done
    
    # Docs directory
    if [[ -d "$SCAN_ROOT/docs" ]]; then
        while IFS= read -r -d '' file; do
            [[ -f "$file" && -r "$file" ]] && files+=("$file")
        done < <(find "$SCAN_ROOT/docs" -name "*.md" -type f -print0 2>/dev/null || true)
    fi
    
    # Remove duplicates and output
    printf '%s\n' "${files[@]}" | sort -u
}

# Main scanning function
main() {
    local start_time
    start_time=$(date +%s)
    
    log_msg "INFO" "Starting documentation scan of: $SCAN_ROOT"
    
    # Find files
    local files
    readarray -t files < <(find_docs)
    
    log_msg "INFO" "Found ${#files[@]} documentation files"
    
    # Process files
    local file_results=()
    local files_processed=0
    local files_successful=0
    
    for file in "${files[@]}"; do
        ((files_processed++))
        log_msg "DEBUG" "Processing: $(basename "$file")"
        
        if file_json=$(get_file_json "$file"); then
            file_results+=("$file_json")
            ((files_successful++))
        else
            log_msg "ERROR" "Failed to process: $file"
        fi
    done
    
    # Generate final output
    local end_time
    end_time=$(date +%s)
    local exec_time
    exec_time=$((end_time - start_time))
    
    # Create complete JSON output
    cat << EOF
{
  "metadata": {
    "scan_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "scan_root": "$(json_escape "$SCAN_ROOT")",
    "files_scanned": $files_processed,
    "files_found": $files_successful,
    "scan_errors": $((files_processed - files_successful)),
    "execution_time_seconds": $exec_time,
    "performance_budget_seconds": 15,
    "within_budget": $([ $exec_time -le 15 ] && echo "true" || echo "false"),
    "inline_docs_enabled": $INCLUDE_INLINE_DOCS
  },
  "files": [$(IFS=, ; echo "${file_results[*]}")]
}
EOF
    
    log_msg "INFO" "Scan completed in ${exec_time}s"
    log_msg "INFO" "Files processed: $files_successful/$files_processed"
}

# Execute
main "$@"