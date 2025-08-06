# Progress Tracking Framework

Standardized progress tracking for CARL work item execution with session integration.

## Progress Tracking Components

### Work Item Progress
- **Status Transitions** - Track status changes (pending → in_progress → completed)
- **Completion Percentage** - Quantify progress (0-100%)
- **Phase Tracking** - Current implementation phase
- **Milestone Markers** - Key achievement points
- **Time Tracking** - Start, update, and completion timestamps

### Session Integration
- **Command Tracking** - Record all command executions
- **Progress Events** - Log significant progress milestones
- **Error Recovery** - Track failed attempts and recoveries
- **Performance Metrics** - Execution time and efficiency data

### Multi-Item Coordination
- **Feature Progress** - Aggregate child story completion
- **Epic Progress** - Track feature completion within epics
- **Dependency Progress** - Monitor dependency completion chains
- **Parallel Execution** - Track concurrent work item progress

## Core Progress Functions

### `initialize_work_item_tracking()`
```bash
initialize_work_item_tracking() {
    local work_item_path="$1"
    local command_context="$2"
    local current_time
    current_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Update work item status
    yq eval ".status = \"in_progress\" | 
             .execution_started = \"$current_time\" | 
             .last_updated = \"$current_time\" | 
             .completion_percentage = 5 | 
             .current_phase = \"initialization\"" -i "$work_item_path"
    
    # Log to session
    log_progress_event "$work_item_path" "started" "$command_context" 5
    
    echo "✅ Progress tracking initialized for $(basename "$work_item_path")"
}
```

### `update_work_item_progress()`
```bash
update_work_item_progress() {
    local work_item_path="$1"
    local percentage="$2"
    local phase="$3"
    local notes="${4:-}"
    local current_time
    current_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Validate percentage
    if [[ ! "$percentage" =~ ^[0-9]+$ ]] || [[ "$percentage" -lt 0 ]] || [[ "$percentage" -gt 100 ]]; then
        echo "❌ Invalid percentage: $percentage (must be 0-100)"
        return 1
    fi
    
    # Update work item
    local update_expr=".completion_percentage = $percentage | .last_updated = \"$current_time\""
    [[ -n "$phase" ]] && update_expr="$update_expr | .current_phase = \"$phase\""
    
    if [[ -n "$notes" ]]; then
        update_expr="$update_expr | .implementation_notes += [\"$current_time: $notes\"]"
    fi
    
    yq eval "$update_expr" -i "$work_item_path"
    
    # Log significant progress milestones
    if [[ "$percentage" -ge 25 && "$percentage" -le 30 ]] || 
       [[ "$percentage" -ge 50 && "$percentage" -le 55 ]] || 
       [[ "$percentage" -ge 75 && "$percentage" -le 80 ]] ||
       [[ "$percentage" -eq 100 ]]; then
        log_progress_event "$work_item_path" "milestone" "$phase" "$percentage"
    fi
    
    echo "📊 Progress updated: $(basename "$work_item_path") → ${percentage}% ($phase)"
}
```

### `complete_work_item()`
```bash
complete_work_item() {
    local work_item_path="$1"
    local completion_notes="${2:-Implementation completed successfully}"
    local current_time
    current_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Update work item to completed
    yq eval ".status = \"completed\" | 
             .completion_percentage = 100 | 
             .current_phase = \"completed\" | 
             .completion_date = \"$current_time\" | 
             .last_updated = \"$current_time\" | 
             .implementation_notes += [\"$current_time: $completion_notes\"]" -i "$work_item_path"
    
    # Log completion
    log_progress_event "$work_item_path" "completed" "completed" 100
    
    # Calculate execution time
    local start_time
    start_time=$(yq eval '.execution_started' "$work_item_path" 2>/dev/null)
    if [[ "$start_time" != "null" && -n "$start_time" ]]; then
        local duration
        duration=$(calculate_duration "$start_time" "$current_time")
        echo "⏱️  Execution time: $duration"
        
        # Add duration to work item
        yq eval ".execution_duration = \"$duration\"" -i "$work_item_path"
    fi
    
    echo "✅ Work item completed: $(basename "$work_item_path")"
}
```

### `log_progress_event()`
```bash
log_progress_event() {
    local work_item_path="$1"
    local event_type="$2"      # started, milestone, completed, failed
    local context="$3"
    local percentage="$4"
    local current_time
    current_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Determine session file
    local session_file
    session_file=$(get_current_session_file)
    
    if [[ -z "$session_file" ]]; then
        echo "⚠️  Warning: Could not determine session file for progress logging"
        return 1
    fi
    
    # Create progress event entry
    local work_item_id
    work_item_id=$(yq eval '.id' "$work_item_path" 2>/dev/null || echo "unknown")
    
    local event_entry
    event_entry=$(cat <<EOF
  - timestamp: "$current_time"
    work_item: "$work_item_id"
    file: "$(basename "$work_item_path")"
    event: "$event_type"
    context: "$context"
    percentage: $percentage
EOF
)
    
    # Add to session file progress events
    if yq eval '.progress_events' "$session_file" &>/dev/null; then
        echo "$event_entry" | yq eval '.progress_events += [.]' -i "$session_file"
    else
        echo "$event_entry" | yq eval '.progress_events = [.]' -i "$session_file"
    fi
}
```

### `calculate_feature_progress()`
```bash
calculate_feature_progress() {
    local feature_path="$1"
    local feature_id
    feature_id=$(yq eval '.id' "$feature_path" 2>/dev/null)
    
    if [[ -z "$feature_id" || "$feature_id" == "null" ]]; then
        echo "❌ Cannot determine feature ID from $feature_path"
        return 1
    fi
    
    # Find all child stories
    local child_stories=()
    while IFS= read -r -d '' story_file; do
        local parent_feature
        parent_feature=$(yq eval '.parent_feature' "$story_file" 2>/dev/null)
        if [[ "$parent_feature" == "$feature_id" ]]; then
            child_stories+=("$story_file")
        fi
    done < <(find .carl/project/stories -name "*.story.carl" -not -path "*/completed/*" -print0 2>/dev/null)
    
    if [[ ${#child_stories[@]} -eq 0 ]]; then
        echo "⚠️  No child stories found for feature: $feature_id"
        return 0
    fi
    
    # Calculate aggregate progress
    local total_progress=0
    local story_count=${#child_stories[@]}
    local completed_stories=0
    
    for story in "${child_stories[@]}"; do
        local story_percentage
        story_percentage=$(yq eval '.completion_percentage // 0' "$story" 2>/dev/null)
        total_progress=$((total_progress + story_percentage))
        
        local story_status
        story_status=$(yq eval '.status' "$story" 2>/dev/null)
        [[ "$story_status" == "completed" ]] && ((completed_stories++))
    done
    
    # Calculate feature progress
    local feature_progress=$((total_progress / story_count))
    
    # Determine feature phase
    local feature_phase="planning"
    if [[ $completed_stories -eq $story_count ]]; then
        feature_phase="completed"
    elif [[ $completed_stories -gt 0 ]] || [[ $feature_progress -gt 0 ]]; then
        feature_phase="implementation"
    fi
    
    # Update feature progress
    update_work_item_progress "$feature_path" "$feature_progress" "$feature_phase" \
        "Aggregate progress from $story_count child stories (${completed_stories} completed)"
    
    echo "📊 Feature progress calculated: ${feature_progress}% (${completed_stories}/${story_count} stories completed)"
    return 0
}
```

### `calculate_epic_progress()`
```bash
calculate_epic_progress() {
    local epic_path="$1"
    local epic_id
    epic_id=$(yq eval '.id' "$epic_path" 2>/dev/null)
    
    if [[ -z "$epic_id" || "$epic_id" == "null" ]]; then
        echo "❌ Cannot determine epic ID from $epic_path"
        return 1
    fi
    
    # Find all child features
    local child_features=()
    while IFS= read -r -d '' feature_file; do
        local parent_epic
        parent_epic=$(yq eval '.parent_epic_id' "$feature_file" 2>/dev/null)
        if [[ "$parent_epic" == "$epic_id" ]]; then
            child_features+=("$feature_file")
        fi
    done < <(find .carl/project/features -name "*.feature.carl" -not -path "*/completed/*" -print0 2>/dev/null)
    
    if [[ ${#child_features[@]} -eq 0 ]]; then
        echo "⚠️  No child features found for epic: $epic_id"
        return 0
    fi
    
    # Calculate aggregate progress from features
    local total_progress=0
    local feature_count=${#child_features[@]}
    local completed_features=0
    
    for feature in "${child_features[@]}"; do
        # Ensure feature progress is up to date
        calculate_feature_progress "$feature" >/dev/null
        
        local feature_percentage
        feature_percentage=$(yq eval '.completion_percentage // 0' "$feature" 2>/dev/null)
        total_progress=$((total_progress + feature_percentage))
        
        local feature_status
        feature_status=$(yq eval '.status' "$feature" 2>/dev/null)
        [[ "$feature_status" == "completed" ]] && ((completed_features++))
    done
    
    # Calculate epic progress
    local epic_progress=$((total_progress / feature_count))
    
    # Determine epic phase
    local epic_phase="planning"
    if [[ $completed_features -eq $feature_count ]]; then
        epic_phase="completed"
    elif [[ $completed_features -gt 0 ]] || [[ $epic_progress -gt 0 ]]; then
        epic_phase="implementation"
    fi
    
    # Update epic progress
    update_work_item_progress "$epic_path" "$epic_progress" "$epic_phase" \
        "Aggregate progress from $feature_count child features (${completed_features} completed)"
    
    echo "📊 Epic progress calculated: ${epic_progress}% (${completed_features}/${feature_count} features completed)"
    return 0
}
```

## Session Integration Functions

### `get_current_session_file()`
```bash
get_current_session_file() {
    local current_date
    current_date=$(date +"%Y-%m-%d")
    
    # Get git user for session identification
    local git_user
    git_user=$(git config user.name 2>/dev/null | tr ' ' '_' | tr '[:upper:]' '[:lower:]')
    
    if [[ -z "$git_user" ]]; then
        git_user="unknown_user"
    fi
    
    local session_file=".carl/sessions/session-${current_date}-${git_user}.carl"
    
    # Create session file if it doesn't exist
    if [[ ! -f "$session_file" ]]; then
        initialize_session_file "$session_file"
    fi
    
    echo "$session_file"
}
```

### `initialize_session_file()`
```bash
initialize_session_file() {
    local session_file="$1"
    local current_time
    current_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Create basic session structure
    cat > "$session_file" <<EOF
session_date: "$(date +"%Y-%m-%d")"
developer: "$(git config user.name 2>/dev/null || echo "Unknown")"
start_time: "$current_time"
commands: []
progress_events: []
work_items: []
summary:
  commands_executed: 0
  items_completed: 0
  total_progress_time: "0"
EOF
    
    echo "📝 Session file initialized: $(basename "$session_file")"
}
```

### `update_session_summary()`
```bash
update_session_summary() {
    local session_file="$1"
    
    # Calculate summary statistics
    local commands_count
    commands_count=$(yq eval '.commands | length' "$session_file" 2>/dev/null || echo "0")
    
    local completed_count
    completed_count=$(yq eval '[.progress_events[] | select(.event == "completed")] | length' "$session_file" 2>/dev/null || echo "0")
    
    # Update session summary
    yq eval ".summary.commands_executed = $commands_count | 
             .summary.items_completed = $completed_count" -i "$session_file"
    
    echo "📊 Session summary updated: $commands_count commands, $completed_count items completed"
}
```

## Utility Functions

### `calculate_duration()`
```bash
calculate_duration() {
    local start_time="$1"
    local end_time="$2"
    
    # Convert ISO timestamps to epoch seconds
    local start_epoch end_epoch duration_seconds
    start_epoch=$(date -d "$start_time" +%s 2>/dev/null || echo "0")
    end_epoch=$(date -d "$end_time" +%s 2>/dev/null || echo "0")
    
    if [[ "$start_epoch" -eq 0 || "$end_epoch" -eq 0 ]]; then
        echo "unknown"
        return 1
    fi
    
    duration_seconds=$((end_epoch - start_epoch))
    
    # Format duration
    if [[ $duration_seconds -lt 60 ]]; then
        echo "${duration_seconds}s"
    elif [[ $duration_seconds -lt 3600 ]]; then
        echo "$((duration_seconds / 60))m $((duration_seconds % 60))s"
    else
        local hours=$((duration_seconds / 3600))
        local minutes=$(((duration_seconds % 3600) / 60))
        echo "${hours}h ${minutes}m"
    fi
}
```

### `format_progress_percentage()`
```bash
format_progress_percentage() {
    local percentage="$1"
    local width="${2:-20}"
    
    # Calculate filled and empty portions
    local filled=$((percentage * width / 100))
    local empty=$((width - filled))
    
    # Create progress bar
    local bar=""
    for ((i = 0; i < filled; i++)); do bar+="█"; done
    for ((i = 0; i < empty; i++)); do bar+="░"; done
    
    echo "[${bar}] ${percentage}%"
}
```

## Usage Examples

### In Command Execution
```bash
# Source progress tracking
source .carl/commandlib/shared/progress-tracking.md

# Initialize tracking
initialize_work_item_tracking "$work_item_path" "/carl:task"

# Update progress at key points
update_work_item_progress "$work_item_path" 25 "analysis" "Requirements analyzed"
update_work_item_progress "$work_item_path" 50 "implementation" "Core functionality implemented"
update_work_item_progress "$work_item_path" 75 "testing" "Tests written and passing"

# Complete work item
complete_work_item "$work_item_path" "All acceptance criteria met"

# Update parent progress
if [[ "$scope_type" == "story" ]]; then
    parent_feature=$(yq eval '.parent_feature' "$work_item_path")
    feature_file=$(find .carl/project/features -name "*${parent_feature}*.carl")
    [[ -n "$feature_file" ]] && calculate_feature_progress "$feature_file"
fi
```

### Progress Monitoring
```bash
# Check current progress across all work items
for work_item in .carl/project/{stories,features,epics}/*.carl; do
    [[ ! -f "$work_item" ]] && continue
    
    local name percentage phase
    name=$(yq eval '.name' "$work_item")
    percentage=$(yq eval '.completion_percentage // 0' "$work_item")
    phase=$(yq eval '.current_phase // "unknown"' "$work_item")
    
    echo "$(format_progress_percentage "$percentage") $name ($phase)"
done
```

## Integration with Commands

All CARL commands use this framework:

- **`/carl:task`** - Primary progress tracking for work item execution
- **`/carl:plan`** - Track planning progress and file creation
- **`/carl:status`** - Display progress summaries and analytics
- **`/carl:analyze`** - Track analysis and setup progress

## Performance Considerations

- Progress updates are lightweight YAML modifications
- Session logging is append-only for performance
- Aggregate calculations are cached where possible
- Progress events are batched for efficiency