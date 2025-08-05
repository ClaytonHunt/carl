#!/bin/bash

# migrate-sessions.sh - Convert verbose session files to compact format
# Part of session file compaction optimization feature
# Converts work_periods YAML arrays to pipe-delimited format

set -euo pipefail

# Use CLAUDE_PROJECT_DIR for all paths
if [[ -z "${CLAUDE_PROJECT_DIR:-}" ]]; then
    echo "Error: CLAUDE_PROJECT_DIR environment variable not set" >&2
    exit 1
fi

# Source required libraries (with fallbacks)
if [[ -f "${CLAUDE_PROJECT_DIR}/.carl/hooks/lib/carl-validation.sh" ]]; then
    source "${CLAUDE_PROJECT_DIR}/.carl/hooks/lib/carl-validation.sh"
else
    echo "Warning: carl-validation.sh not found, schema validation disabled" >&2
    validate_carl_file() { return 0; }  # No-op fallback
fi

if [[ -f "${CLAUDE_PROJECT_DIR}/.carl/hooks/lib/carl-time.sh" ]]; then
    source "${CLAUDE_PROJECT_DIR}/.carl/hooks/lib/carl-time.sh"
fi

# Configuration
SESSIONS_DIR="${CLAUDE_PROJECT_DIR}/.carl/sessions"
USE_GIT_COMMITS=true
DRY_RUN=false
VERBOSE=false

# Statistics tracking
declare -g files_processed=0
declare -g files_converted=0
declare -g total_original_size=0
declare -g total_converted_size=0
declare -g conversion_errors=0

# Usage information
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Convert CARL session files from verbose YAML format to compact pipe-delimited format.

OPTIONS:
    --dry-run          Show what would be converted without making changes
    --verbose          Show detailed conversion progress
    --help             Show this usage information
    --target-dir DIR   Target directory (default: .carl/sessions)
    --no-git           Skip git commit before conversion (not recommended)

EXAMPLES:
    $0                          # Convert all session files
    $0 --dry-run               # Preview conversion without changes
    $0 --verbose --dry-run     # Verbose preview mode

EOF
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            --target-dir)
                if [[ -n "${2:-}" ]]; then
                    SESSIONS_DIR="$2"
                    shift 2
                else
                    echo "Error: --target-dir requires a directory argument" >&2
                    exit 1
                fi
                ;;
            --no-git)
                USE_GIT_COMMITS=false
                shift
                ;;
            *)
                echo "Error: Unknown option $1" >&2
                show_usage
                exit 1
                ;;
        esac
    done
}

# Log message based on verbosity
log_message() {
    local level="$1"
    shift
    if [[ "$VERBOSE" == "true" || "$level" == "INFO" || "$level" == "ERROR" ]]; then
        echo "[$level] $*" >&2
    fi
}

# Check if file is already in compact format
is_compact_format() {
    local file="$1"
    
    # Look for compact_work_periods field
    if grep -q "^compact_work_periods:" "$file" 2>/dev/null; then
        return 0
    fi
    
    # Look for pipe-delimited format lines
    if grep -qE "^[a-z][a-z0-9_-]*\|[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z\|[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$" "$file" 2>/dev/null; then
        return 0
    fi
    
    return 1
}

# Extract work periods from verbose YAML format
extract_work_periods() {
    local file="$1"
    local temp_file
    temp_file=$(mktemp)
    
    # Extract work periods using awk to handle YAML structure
    awk '
    BEGIN { 
        in_work_periods = 0
        in_period = 0
        current_period = ""
        start_time = ""
        focus = ""
    }
    
    # Detect start of work_periods section
    /^work_periods:/ { 
        in_work_periods = 1
        next
    }
    
    # End of work_periods section (next top-level key or end of file)
    /^[a-zA-Z_][^:]*:/ && in_work_periods == 1 && !/^  / {
        in_work_periods = 0
        next
    }
    
    # Within work_periods section
    in_work_periods == 1 {
        # Start of new period (array item)
        if (/^  - /) {
            # Output previous period if complete
            if (focus != "" && start_time != "") {
                printf "%s|%s|%s\n", focus, start_time, end_time > "'"$temp_file"'"
            }
            
            # Reset for new period
            focus = ""
            start_time = ""
            end_time = ""
            in_period = 1
            next
        }
        
        # Extract fields within period
        if (in_period == 1) {
            if (/^    start_time:/) {
                gsub(/^    start_time: *"?/, "")
                gsub(/".*$/, "")
                start_time = $0
            }
            else if (/^    end_time:/) {
                gsub(/^    end_time: *"?/, "")
                gsub(/".*$/, "")
                end_time = $0
            }
            else if (/^    focus:/) {
                gsub(/^    focus: *"?/, "")
                gsub(/".*$/, "")
                focus = $0
            }
            # Handle active_items array (extract first item as focus)
            else if (/^    active_items:/) {
                getline
                if (/^      - "?([^"]*)"?/) {
                    gsub(/^      - "?/, "")
                    gsub(/".*$/, "")
                    if (focus == "") focus = $0
                }
            }
        }
    }
    
    END {
        # Output final period if complete
        if (focus != "" && start_time != "") {
            printf "%s|%s|%s\n", focus, start_time, end_time > "'"$temp_file"'"
        }
    }
    ' "$file"
    
    # Return the temp file path for the caller to read
    echo "$temp_file"
}

# Create git commit before conversion
create_pre_conversion_commit() {
    if [[ "$USE_GIT_COMMITS" == "true" && "$DRY_RUN" == "false" ]]; then
        log_message "DEBUG" "Creating pre-conversion git commit"
        
        # Stage session files
        git add .carl/sessions/ 2>/dev/null || true
        
        # Create commit
        git commit -m "backup: Session files before compaction migration

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>" 2>/dev/null || {
            log_message "WARNING" "Git commit failed - continuing without backup"
        }
    fi
}

# Convert session file to compact format
convert_session_file() {
    local file="$1"
    local temp_converted
    temp_converted=$(mktemp)
    
    log_message "DEBUG" "Converting: $(basename "$file")"
    
    # Check if already converted
    if is_compact_format "$file"; then
        log_message "DEBUG" "Already in compact format: $(basename "$file")"
        rm -f "$temp_converted"
        return 0
    fi
    
    # Extract work periods
    local work_periods_file
    work_periods_file=$(extract_work_periods "$file")
    
    # Count extracted periods
    local period_count=0
    if [[ -f "$work_periods_file" ]]; then
        period_count=$(wc -l < "$work_periods_file" 2>/dev/null || echo 0)
    fi
    
    log_message "DEBUG" "Extracted $period_count work periods"
    
    # Generate compact format
    {
        # Preserve basic session metadata
        echo "developer: \"$(grep '^developer:' "$file" | cut -d'"' -f2 2>/dev/null || echo 'unknown')\""
        echo "date: \"$(grep '^date:' "$file" | cut -d'"' -f2 2>/dev/null || echo '$(date +%Y-%m-%d)')\""
        echo "session_summary:"
        echo "  start_time: \"$(grep 'start_time:' "$file" | head -1 | cut -d'"' -f2 2>/dev/null || echo '')\""
        echo "  end_time: \"$(grep 'end_time:' "$file" | head -1 | cut -d'"' -f2 2>/dev/null || echo '')\""
        echo "  total_active_time: \"$(grep 'total_active_time:' "$file" | head -1 | cut -d'"' -f2 2>/dev/null || echo '')\""
        echo ""
        
        # Add compact work periods if any exist
        if [[ $period_count -gt 0 ]]; then
            echo "compact_work_periods:"
            while IFS= read -r period; do
                if [[ -n "$period" ]]; then
                    echo "  - \"$period\""
                fi
            done < "$work_periods_file"
            echo ""
        else
            echo "compact_work_periods: []"
            echo ""
        fi
        
        # Preserve cleanup log if present
        if grep -q "^cleanup_log:" "$file"; then
            echo "cleanup_log:"
            grep -A 10 "^cleanup_log:" "$file" | tail -n +2
            echo ""
        fi
    } > "$temp_converted"
    
    # Clean up work periods temp file
    rm -f "$work_periods_file"
    
    # Calculate size difference
    local original_size converted_size
    original_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo 0)
    converted_size=$(stat -f%z "$temp_converted" 2>/dev/null || stat -c%s "$temp_converted" 2>/dev/null || echo 0)
    
    # Update statistics
    ((total_original_size += original_size))
    ((total_converted_size += converted_size))
    
    local size_reduction=$((original_size - converted_size))
    local reduction_percent=0
    if [[ $original_size -gt 0 ]]; then
        reduction_percent=$(( (size_reduction * 100) / original_size ))
    fi
    
    log_message "DEBUG" "Size: $original_size -> $converted_size bytes (-$reduction_percent%)"
    
    # Validate converted file if validation is available
    if command -v validate_carl_file >/dev/null 2>&1; then
        if ! validate_carl_file "$temp_converted" >/dev/null 2>&1; then
            log_message "ERROR" "Converted file failed schema validation: $(basename "$file")"
            rm -f "$temp_converted"
            return 1
        fi
    fi
    
    # Replace original file if not in dry-run mode
    if [[ "$DRY_RUN" == "false" ]]; then
        if ! mv "$temp_converted" "$file"; then
            log_message "ERROR" "Failed to replace original file: $file"
            return 1
        fi
        log_message "INFO" "Converted: $(basename "$file") (-$reduction_percent% size)"
    else
        log_message "INFO" "Would convert: $(basename "$file") (-$reduction_percent% size)"
        rm -f "$temp_converted"
    fi
    
    ((files_converted++))
    return 0
}

# Find session files to convert
find_session_files() {
    local search_dir="$1"
    
    if [[ ! -d "$search_dir" ]]; then
        log_message "ERROR" "Sessions directory not found: $search_dir"
        return 1
    fi
    
    # Find .carl files in sessions directory and subdirectories
    find "$search_dir" -name "session-*.carl" -type f 2>/dev/null | sort
}

# Display conversion statistics
show_statistics() {
    local space_saved=$((total_original_size - total_converted_size))
    local overall_reduction=0
    
    if [[ $total_original_size -gt 0 ]]; then
        overall_reduction=$(( (space_saved * 100) / total_original_size ))
    fi
    
    echo ""
    echo "=== Migration Statistics ==="
    echo "Files processed: $files_processed"
    echo "Files converted: $files_converted"
    echo "Conversion errors: $conversion_errors"
    echo "Original total size: $total_original_size bytes"
    echo "Converted total size: $total_converted_size bytes"
    echo "Space saved: $space_saved bytes ($overall_reduction%)"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        echo ""
        echo "*** DRY RUN MODE - No files were actually modified ***"
    fi
}

# Main migration function
main() {
    parse_arguments "$@"
    
    echo "CARL Session File Migration Tool"
    echo "Converting verbose session files to compact format..."
    echo ""
    
    if [[ "$DRY_RUN" == "true" ]]; then
        echo "*** DRY RUN MODE - No files will be modified ***"
        echo ""
    fi
    
    # Find session files
    local session_files
    readarray -t session_files < <(find_session_files "$SESSIONS_DIR")
    
    if [[ ${#session_files[@]} -eq 0 ]]; then
        echo "No session files found in: $SESSIONS_DIR"
        exit 0
    fi
    
    echo "Found ${#session_files[@]} session files to process"
    echo ""
    
    # Create git commit before conversion (unless disabled)
    create_pre_conversion_commit
    
    # Convert each file
    for file in "${session_files[@]}"; do
        ((files_processed++))
        
        if ! convert_session_file "$file"; then
            ((conversion_errors++))
            log_message "ERROR" "Failed to convert: $(basename "$file")"
        fi
    done
    
    # Show final statistics
    show_statistics
    
    # Exit with error code if there were conversion errors
    if [[ $conversion_errors -gt 0 ]]; then
        echo ""
        echo "Warning: $conversion_errors files failed to convert"
        exit 1
    fi
    
    echo ""
    echo "Migration completed successfully!"
    exit 0
}

# Execute if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi