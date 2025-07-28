#!/bin/bash

# CARL Helper Functions
# Core utility functions for CARL (Context-Aware Requirements Language) system

# Get CARL root directory
carl_get_root() {
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    echo "$(cd "$script_dir/../.." && pwd)"
}

# Configuration management
carl_get_json_value() {
    local json_file="$1"
    local key_path="$2"
    local default_value="$3"
    
    if [ ! -f "$json_file" ]; then
        echo "$default_value"
        return
    fi
    
    # Use python if available for reliable JSON parsing
    if command -v python3 >/dev/null 2>&1; then
        python3 -c "
import json, sys
try:
    with open('$json_file') as f:
        data = json.load(f)
    keys = '$key_path'.split('.')
    value = data
    for key in keys:
        value = value.get(key, {})
    if value == {} or value is None:
        print('$default_value')
    else:
        print(value)
except:
    print('$default_value')
" 2>/dev/null
    else
        # Fallback to grep/sed for basic JSON parsing
        local value=$(grep -A 10 "\"$(echo "$key_path" | cut -d'.' -f1)\"" "$json_file" 2>/dev/null | 
                     grep "\"$(echo "$key_path" | cut -d'.' -f2)\"" | 
                     sed 's/.*".*":[[:space:]]*\(.*\)/\1/' | 
                     sed 's/[,}]$//' | 
                     sed 's/^[[:space:]]*"//' | 
                     sed 's/"[[:space:]]*$//')
        if [ -n "$value" ]; then
            echo "$value"
        else
            echo "$default_value"
        fi
    fi
}

carl_get_setting() {
    local setting="$1"
    local carl_root="$(carl_get_root)"
    local config_file="$carl_root/.carl/config/carl-settings.json"
    
    # Map old setting names to new JSON structure
    case "$setting" in
        "quiet_mode")
            carl_get_json_value "$config_file" "audio_settings.quiet_mode" "true"
            ;;
        "audio_enabled")
            carl_get_json_value "$config_file" "audio_settings.audio_enabled" "false"
            ;;
        "auto_update")
            carl_get_json_value "$config_file" "analysis_settings.auto_update_on_git_pull" "true"
            ;;
        "context_injection")
            carl_get_json_value "$config_file" "development_settings.auto_context_injection" "true"
            ;;
        "analysis_depth")
            # Map to comprehensive_scanning boolean as closest equivalent
            local comprehensive=$(carl_get_json_value "$config_file" "analysis_settings.comprehensive_scanning" "true")
            if [ "$comprehensive" = "true" ]; then
                echo "comprehensive"
            else
                echo "balanced"
            fi
            ;;
        "carl_persona")
            # This was related to audio/TTS, map to audio_enabled
            carl_get_json_value "$config_file" "audio_settings.audio_enabled" "false"
            ;;
        "volume_level")
            carl_get_json_value "$config_file" "audio_settings.volume_level" "75"
            ;;
        "quiet_hours_enabled")
            carl_get_json_value "$config_file" "audio_settings.quiet_hours_enabled" "false"
            ;;
        "quiet_hours_start")
            carl_get_json_value "$config_file" "audio_settings.quiet_hours_start" "22:00"
            ;;
        "quiet_hours_end")
            carl_get_json_value "$config_file" "audio_settings.quiet_hours_end" "08:00"
            ;;
        "session_tracking")
            carl_get_json_value "$config_file" "development_settings.session_tracking" "true"
            ;;
        "progress_monitoring")
            carl_get_json_value "$config_file" "development_settings.progress_monitoring" "true"
            ;;
        "parallel_analysis")
            carl_get_json_value "$config_file" "analysis_settings.parallel_analysis" "true"
            ;;
        "specialist_agents_enabled")
            carl_get_json_value "$config_file" "development_settings.specialist_agents_enabled" "true"
            ;;
        *) 
            echo "false"
            ;;
    esac
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
    
    # Add current process and workflow context
    if [ -f "$carl_root/.carl/process.carl" ]; then
        context+="## Current Process Context\n"
        context+="$(head -15 "$carl_root/.carl/process.carl")\n\n"
    fi
    
    # Add current session context using new session manager
    local session_manager="$carl_root/.carl/scripts/carl-session-manager.sh"
    if [ -f "$session_manager" ]; then
        source "$session_manager"
        local session_context="$(carl_get_session_context)"
        if [ -n "$session_context" ]; then
            context+="$session_context\n"
        fi
    fi
    
    # Add recent CARL file updates (top 5 most recent) - updated file extensions
    local recent_files=$(find "$carl_root/.carl" -name "*.intent.carl" -o -name "*.state.carl" -o -name "*.context.carl" | xargs ls -t 2>/dev/null | head -5)
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

# Strategic context extraction functions
carl_extract_vision_essence() {
    local vision_file="$1"
    
    if [ ! -f "$vision_file" ]; then
        return 0
    fi
    
    # Extract only the core vision elements (not full template)
    {
        grep -A 2 "mission_statement:" "$vision_file" 2>/dev/null | grep -v "^--$"
        grep -A 3 "value_proposition:" "$vision_file" 2>/dev/null | grep -v "^--$"
        grep -A 2 "target_impact:" "$vision_file" 2>/dev/null | grep -v "^--$"
    } | head -15
}

carl_extract_roadmap_current_context() {
    local roadmap_file="$1"
    
    if [ ! -f "$roadmap_file" ]; then
        return 0
    fi
    
    # Extract only current phase + immediate next steps
    {
        grep -A 10 "current_focus:" "$roadmap_file" 2>/dev/null | grep -v "^--$"
        grep -A 5 "active_phase:" "$roadmap_file" 2>/dev/null | grep -v "^--$"
        grep -A 3 "immediate_actions:" "$roadmap_file" 2>/dev/null | grep -v "^--$"
    } | head -20
}

carl_extract_recent_strategic_decisions() {
    local decisions_file="$1"
    local count="${2:-3}"
    
    if [ ! -f "$decisions_file" ]; then
        return 0
    fi
    
    # Get only recent accepted decisions (not entire history)
    grep -B 1 -A 8 "status: accepted" "$decisions_file" 2>/dev/null | grep -v "^--$" | tail -n $((count * 10))
}

carl_get_strategic_context() {
    local prompt="$1"
    local carl_root="$(carl_get_root)"
    local context=""
    
    # Determine context depth needed based on prompt content
    if echo "$prompt" | grep -qE "/carl:plan|/carl:analyze|major|strategic|roadmap|vision|decision"; then
        # DEEP CONTEXT - for planning and analysis commands
        context+="## Vision Context\n"
        context+="$(carl_extract_vision_essence "$carl_root/.carl/vision.carl")\n\n"
        
        context+="## Current Roadmap Phase\n" 
        context+="$(carl_extract_roadmap_current_context "$carl_root/.carl/roadmap.carl")\n\n"
        
        context+="## Recent Strategic Decisions\n"
        context+="$(carl_extract_recent_strategic_decisions "$carl_root/.carl/decisions.carl" 5)\n\n"
        
    elif echo "$prompt" | grep -qE "feature|requirement|priority|epic|story"; then
        # MEDIUM CONTEXT - for feature work
        context+="## Current Focus\n"
        context+="$(carl_extract_roadmap_current_context "$carl_root/.carl/roadmap.carl")\n\n"
        
        context+="## Vision Goals\n"
        context+="$(grep -A 3 'success_criteria:' "$carl_root/.carl/vision.carl" 2>/dev/null)\n\n"
        
    else
        # LIGHT CONTEXT - for general development
        context+="## Current Priority\n"
        context+="$(grep -A 5 'current_focus:' "$carl_root/.carl/roadmap.carl" 2>/dev/null)\n\n"
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

# Index management - DEPRECATED: Session data now handled separately
# This function is kept for backward compatibility but no longer modifies index.carl
carl_update_index_with_session_data() {
    local carl_root="$(carl_get_root)"
    local session_manager="$carl_root/.carl/scripts/carl-session-manager.sh"
    
    # Use new session manager instead of polluting index.carl
    if [ -f "$session_manager" ]; then
        source "$session_manager"
        carl_update_session_metrics
    fi
    
    # Legacy behavior disabled to prevent index.carl pollution
    # Index.carl should only contain project structure and requirements
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