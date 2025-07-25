#!/bin/bash

# CARL Helper Functions
# Core utility functions for CARL (Context-Aware Requirements Language) system

# Get CARL root directory
carl_get_root() {
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    echo "$(cd "$script_dir/../.." && pwd)"
}

# Configuration management
carl_get_setting() {
    local setting="$1"
    local carl_root="$(carl_get_root)"
    local config_file="$carl_root/.carl/config/user.conf"
    
    # Default settings
    case "$setting" in
        "quiet_mode") echo "false" ;;
        "audio_enabled") echo "true" ;;
        "auto_update") echo "true" ;;
        "context_injection") echo "true" ;;
        "analysis_depth") echo "balanced" ;;
        "carl_persona") echo "true" ;;
        *) echo "false" ;;
    esac
    
    # Override with user settings if available
    if [ -f "$config_file" ]; then
        local value=$(grep "^$setting=" "$config_file" 2>/dev/null | cut -d'=' -f2)
        if [ -n "$value" ]; then
            echo "$value"
        fi
    fi
}

# Context management functions
carl_get_active_context() {
    local carl_root="$(carl_get_root)"
    local context=""
    
    # Add CARL index for quick AI reference
    if [ -f "$carl_root/.carl/index.carl" ]; then
        context+="## CARL Project Index\n"
        context+="$(cat "$carl_root/.carl/index.carl")\n\n"
    fi
    
    # Add current session context
    if [ -f "$carl_root/.carl/sessions/current.session" ]; then
        context+="## Current Session Context\n"
        context+="$(head -20 "$carl_root/.carl/sessions/current.session")\n\n"
    fi
    
    # Add recent CARL file updates (top 5 most recent)
    local recent_files=$(find "$carl_root/.carl" -name "*.intent" -o -name "*.state" -o -name "*.context" | xargs ls -t 2>/dev/null | head -5)
    if [ -n "$recent_files" ]; then
        context+="## Recently Updated CARL Files\n"
        echo "$recent_files" | while read file; do
            if [ -f "$file" ]; then
                local filename=$(basename "$file")
                context+="### $filename\n"
                context+="$(head -10 "$file")\n\n"
            fi
        done
    fi
    
    echo -e "$context"
}

carl_get_targeted_context() {
    local prompt="$1"
    local carl_root="$(carl_get_root)"
    local context=""
    
    # Extract keywords from prompt to find relevant CARL files
    local keywords=$(echo "$prompt" | tr '[:upper:]' '[:lower:]' | grep -oE '\b[a-z]{3,}\b' | sort -u)
    local relevant_files=""
    
    # Search for CARL files matching keywords
    for keyword in $keywords; do
        local matches=$(find "$carl_root/.carl" -name "*$keyword*" -type f 2>/dev/null)
        relevant_files="$relevant_files $matches"
    done
    
    # Remove duplicates and get top 3 most relevant files
    relevant_files=$(echo "$relevant_files" | tr ' ' '\n' | sort -u | head -3)
    
    if [ -n "$relevant_files" ]; then
        context+="## Relevant CARL Context for: $(echo "$keywords" | head -3 | tr '\n' ' ')\n"
        echo "$relevant_files" | while read file; do
            if [ -f "$file" ]; then
                local filename=$(basename "$file")
                context+="### $filename\n"
                context+="$(head -15 "$file")\n\n"
            fi
        done
    fi
    
    echo -e "$context"
}

# State management functions
carl_update_state_from_changes() {
    local carl_root="$(carl_get_root)"
    
    # Get list of recently changed files
    local changed_files=$(git diff --name-only HEAD~1 2>/dev/null || echo "")
    
    if [ -z "$changed_files" ]; then
        return 0
    fi
    
    # Update relevant CARL state files based on changes
    echo "$changed_files" | while read file; do
        if [ -f "$file" ]; then
            carl_update_context_for_file "$file"
        fi
    done
}

carl_update_context_for_file() {
    local file_path="$1"
    local carl_root="$(carl_get_root)"
    
    # Determine which CARL files might be affected by this change
    local file_dir=$(dirname "$file_path")
    local file_name=$(basename "$file_path")
    
    # Look for related CARL files based on file path patterns
    local related_contexts=$(find "$carl_root/.carl/contexts" -name "*$(echo "$file_dir" | tr '/' '-')*" -o -name "*$(echo "$file_name" | cut -d'.' -f1)*" 2>/dev/null)
    
    # Update context files with change timestamp
    for context_file in $related_contexts; do
        if [ -f "$context_file" ]; then
            echo "# Updated: $(date -Iseconds) - File change detected: $file_path" >> "$context_file"
        fi
    done
}

# Session management functions
carl_save_session_state() {
    local carl_root="$(carl_get_root)"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local session_file="$carl_root/.carl/sessions/$timestamp.session"
    
    # Create session state file
    cat > "$session_file" << EOF
session_id: $timestamp
timestamp: $(date -Iseconds)
working_directory: $(pwd)
git_branch: $(git branch --show-current 2>/dev/null || echo "unknown")
git_commit: $(git rev-parse HEAD 2>/dev/null || echo "unknown")

active_features:
$(carl_get_active_features)

context_snapshot:
$(carl_get_active_context | head -20)
EOF
    
    # Update current session symlink
    ln -sf "$session_file" "$carl_root/.carl/sessions/current.session"
}

carl_get_active_features() {
    local carl_root="$(carl_get_root)"
    
    # Find intent files that indicate active features
    find "$carl_root/.carl/intents" -name "*.intent" 2>/dev/null | while read intent_file; do
        if [ -f "$intent_file" ]; then
            local feature_id=$(basename "$intent_file" .intent)
            local status=$(grep "^status:" "$intent_file" 2>/dev/null | cut -d':' -f2 | tr -d ' ')
            echo "  - id: $feature_id"
            echo "    status: ${status:-unknown}"
            echo "    file: $intent_file"
        fi
    done
}

# Activity logging functions
carl_log_activity() {
    local activity_type="$1"
    local tool_name="$2"
    local carl_root="$(carl_get_root)"
    local log_file="$carl_root/.carl/sessions/current.activity"
    
    echo "$(date -Iseconds) - $activity_type - $tool_name" >> "$log_file"
}

carl_log_milestone() {
    local milestone_type="$1"
    local description="$2"
    local carl_root="$(carl_get_root)"
    local milestone_file="$carl_root/.carl/sessions/current.milestones"
    
    echo "$(date -Iseconds) - $milestone_type - $description" >> "$milestone_file"
}

# Progress tracking functions
carl_get_session_activities() {
    local carl_root="$(carl_get_root)"
    local activity_file="$carl_root/.carl/sessions/current.activity"
    
    if [ -f "$activity_file" ]; then
        tail -10 "$activity_file" | cut -d'-' -f2- | sed 's/^ *//'
    fi
}

carl_get_session_milestones() {
    local carl_root="$(carl_get_root)"
    local milestone_file="$carl_root/.carl/sessions/current.milestones"
    
    if [ -f "$milestone_file" ]; then
        tail -5 "$milestone_file" | cut -d'-' -f2- | sed 's/^ *//'
    fi
}

carl_get_session_progress() {
    local carl_root="$(carl_get_root)"
    
    # Count activities and milestones for progress assessment
    local activities=$(carl_get_session_activities | wc -l)
    local milestones=$(carl_get_session_milestones | wc -l)
    local files_modified=$(carl_count_modified_files)
    
    echo "Activities completed: $activities"
    echo "Milestones achieved: $milestones" 
    echo "Files modified: $files_modified"
}

# Code change analysis functions
carl_count_modified_files() {
    git diff --name-only HEAD~1 2>/dev/null | wc -l || echo "0"
}

carl_count_added_lines() {
    git diff --stat HEAD~1 2>/dev/null | tail -1 | grep -oE '[0-9]+ insertions?' | cut -d' ' -f1 || echo "0"
}

carl_count_removed_lines() {
    git diff --stat HEAD~1 2>/dev/null | tail -1 | grep -oE '[0-9]+ deletions?' | cut -d' ' -f1 || echo "0"
}

# Session duration calculation
carl_calculate_session_duration() {
    local carl_root="$(carl_get_root)"
    local current_session="$carl_root/.carl/sessions/current.session"
    
    if [ -f "$current_session" ]; then
        local start_time=$(grep "start_time:" "$current_session" 2>/dev/null | cut -d':' -f2- | tr -d ' ')
        if [ -n "$start_time" ]; then
            local start_epoch=$(date -d "$start_time" +%s 2>/dev/null || echo "0")
            local current_epoch=$(date +%s)
            local duration_seconds=$((current_epoch - start_epoch))
            
            if [ "$duration_seconds" -gt 3600 ]; then
                echo "$((duration_seconds / 3600))h $((duration_seconds % 3600 / 60))m"
            elif [ "$duration_seconds" -gt 60 ]; then
                echo "$((duration_seconds / 60))m"
            else
                echo "${duration_seconds}s"
            fi
        else
            echo "unknown"
        fi
    else
        echo "no session"
    fi
}

# Milestone detection and celebration
carl_check_and_celebrate_milestones() {
    local carl_root="$(carl_get_root)"
    
    # Check for common milestone patterns
    local files_modified=$(carl_count_modified_files)
    local lines_added=$(carl_count_added_lines)
    
    # Major code contribution milestone
    if [ "$files_modified" -ge 5 ] && [ "$lines_added" -ge 100 ]; then
        carl_log_milestone "major_contribution" "Modified $files_modified files, added $lines_added lines"
    fi
    
    # Check for test-related milestones
    if git log --oneline -1 2>/dev/null | grep -qi "test"; then
        carl_log_milestone "test_improvement" "Added or improved tests"
    fi
    
    # Check for feature completion patterns
    if git log --oneline -1 2>/dev/null | grep -qiE "complete|finish|done|implement"; then
        carl_log_milestone "feature_progress" "Feature implementation milestone"
    fi
}

# Recommendations generation
carl_generate_next_session_recommendations() {
    local carl_root="$(carl_get_root)"
    
    # Analyze current state to provide intelligent recommendations
    local modified_files=$(carl_count_modified_files)
    local recent_activities=$(carl_get_session_activities | wc -l)
    
    if [ "$modified_files" -gt 0 ]; then
        echo "• Run tests to validate recent code changes"
        echo "• Consider updating documentation for modified features"
    fi
    
    if [ "$recent_activities" -gt 5 ]; then
        echo "• Review and commit current changes before starting new work"
    fi
    
    # Check for incomplete work
    if find "$carl_root/.carl/states" -name "*.state" -exec grep -l "in_progress" {} \; 2>/dev/null | head -1 > /dev/null; then
        echo "• Continue work on in-progress features tracked in CARL"
    fi
    
    echo "• Use /status to check overall project health"
    echo "• Use /analyze --sync to refresh CARL context if needed"
}

# Index management
carl_update_index_with_session_data() {
    local carl_root="$(carl_get_root)"
    local index_file="$carl_root/.carl/index.carl"
    
    # Update index with session information
    if [ -f "$index_file" ]; then
        echo "" >> "$index_file"
        echo "# Last Session: $(date -Iseconds)" >> "$index_file"
        echo "session_duration: $(carl_calculate_session_duration)" >> "$index_file"
        echo "activities_completed: $(carl_get_session_activities | wc -l)" >> "$index_file"
        echo "milestones_achieved: $(carl_get_session_milestones | wc -l)" >> "$index_file"
    fi
}

# Update session activity tracking
carl_update_session_activity() {
    local tool="$1"
    local phase="$2"
    local carl_root="$(carl_get_root)"
    
    # Update current session with tool usage
    if [ -f "$carl_root/.carl/sessions/current.session" ]; then
        echo "tool_usage: $(date -Iseconds) - $tool ($phase)" >> "$carl_root/.carl/sessions/current.session"
    fi
}

# Progress metrics update
carl_update_progress_metrics() {
    local carl_root="$(carl_get_root)"
    
    # Update progress metrics based on current session data
    local metrics_file="$carl_root/.carl/sessions/current.metrics"
    
    cat > "$metrics_file" << EOF
timestamp: $(date -Iseconds)
files_modified: $(carl_count_modified_files)
lines_added: $(carl_count_added_lines)
lines_removed: $(carl_count_removed_lines)
activities_count: $(carl_get_session_activities | wc -l)
milestones_count: $(carl_get_session_milestones | wc -l)
session_duration: $(carl_calculate_session_duration)
EOF
}

# Test results tracking
carl_get_latest_test_results() {
    # Try to get latest test results from common test output patterns
    if [ -f "test-results.xml" ]; then
        echo "XML results available"
    elif git log --oneline -1 2>/dev/null | grep -qi "test"; then
        echo "Recent test-related commit"
    else
        echo ""
    fi
}