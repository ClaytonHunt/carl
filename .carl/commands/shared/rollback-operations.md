# Rollback Operations Framework

Shared rollback and recovery capabilities for CARL command failures.

## Rollback Scenarios

### Command Execution Failures
- **Partial Implementation** - Code changes completed but tests failed
- **Quality Gate Failure** - Implementation complete but quality checks failed
- **Integration Failure** - Implementation works but breaks system integration
- **Dependency Failure** - Required dependency became unavailable during execution
- **User Interruption** - Command interrupted by user (Ctrl+C)

### Work Item State Corruption
- **Invalid Status Transitions** - Work item status became inconsistent
- **Broken Relationships** - Parent-child relationships corrupted
- **Schema Violations** - Work item no longer meets schema requirements
- **File System Issues** - CARL files moved or corrupted unexpectedly

### System State Issues
- **Git State Corruption** - Repository in inconsistent state
- **Session File Corruption** - Session tracking became invalid
- **Permission Changes** - File permissions changed during execution
- **Resource Exhaustion** - System resources depleted during execution

## Rollback Strategies

### Git-Based Rollback
- **Commit Checkpoints** - Create commits at major milestones
- **Stash Recovery** - Use git stash for temporary state preservation
- **Branch Rollback** - Reset branch to known good state
- **File-Level Rollback** - Restore specific files from git history

### Work Item State Rollback
- **Status Restoration** - Reset work item status and progress
- **Relationship Repair** - Restore parent-child relationships
- **Schema Recovery** - Fix work item to meet schema requirements
- **Backup Restoration** - Restore from automatic backups

### System State Recovery
- **Permission Restoration** - Reset file permissions to known state
- **Session Recovery** - Repair or recreate session tracking
- **Resource Cleanup** - Clean up temporary files and processes
- **Configuration Recovery** - Restore system configuration

## Core Rollback Functions

### `create_rollback_checkpoint()`
```bash
create_rollback_checkpoint() {
    local checkpoint_name="$1"
    local work_item_path="${2:-}"
    local checkpoint_id
    
    # Create git checkpoint if in git repository
    if git rev-parse --git-dir &>/dev/null; then
        # Add current changes to git
        git add . >/dev/null 2>&1
        
        # Create checkpoint commit
        local commit_message="CHECKPOINT: $checkpoint_name"
        if [[ -n "$work_item_path" ]]; then
            local work_item_id
            work_item_id=$(yq eval '.id' "$work_item_path" 2>/dev/null || echo "unknown")
            commit_message="$commit_message (work_item: $work_item_id)"
        fi
        
        if git commit -m "$commit_message" >/dev/null 2>&1; then
            checkpoint_id=$(git rev-parse HEAD)
            echo "✅ Rollback checkpoint created: $checkpoint_id"
        else
            echo "⚠️  No changes to checkpoint"
            checkpoint_id=$(git rev-parse HEAD)
        fi
    else
        echo "⚠️  Not a git repository - checkpoint creation limited"
        checkpoint_id="no-git"
    fi
    
    # Store checkpoint info
    local checkpoint_file=".carl/checkpoints.json"
    local current_time
    current_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Ensure checkpoints file exists
    [[ ! -f "$checkpoint_file" ]] && echo "[]" > "$checkpoint_file"
    
    # Add checkpoint entry
    local checkpoint_entry
    checkpoint_entry=$(cat <<EOF
{
  "name": "$checkpoint_name",
  "id": "$checkpoint_id",
  "timestamp": "$current_time",
  "work_item": "$(basename "${work_item_path:-none}")",
  "git_branch": "$(git branch --show-current 2>/dev/null || echo "unknown")"
}
EOF
)
    
    echo "$checkpoint_entry" | jq '.' | yq eval '. as $item | load(".carl/checkpoints.json") + [$item]' > "$checkpoint_file.tmp" && mv "$checkpoint_file.tmp" "$checkpoint_file"
    
    echo "$checkpoint_id"
}
```

### `rollback_to_checkpoint()`
```bash
rollback_to_checkpoint() {
    local checkpoint_id="$1"
    local force_rollback="${2:-false}"
    local work_item_path="${3:-}"
    
    echo "🔄 Initiating rollback to checkpoint: $checkpoint_id"
    
    # Verify checkpoint exists
    if [[ "$checkpoint_id" != "no-git" ]] && ! git rev-parse --verify "$checkpoint_id" &>/dev/null; then
        echo "❌ Checkpoint not found: $checkpoint_id"
        return 1
    fi
    
    # Check for uncommitted changes
    if [[ "$force_rollback" != "true" ]] && [[ -n "$(git status --porcelain)" ]]; then
        echo "⚠️  Uncommitted changes detected. Use force_rollback=true to override."
        echo "   Current changes will be lost in rollback."
        return 1
    fi
    
    # Store current state as emergency backup
    local emergency_checkpoint
    emergency_checkpoint=$(create_rollback_checkpoint "emergency_backup_before_rollback")
    
    # Perform git rollback
    if [[ "$checkpoint_id" != "no-git" ]]; then
        if git reset --hard "$checkpoint_id" >/dev/null 2>&1; then
            echo "✅ Git state rolled back to: $checkpoint_id"
        else
            echo "❌ Git rollback failed"
            # Attempt to recover to emergency backup
            git reset --hard "$emergency_checkpoint" >/dev/null 2>&1
            return 1
        fi
    fi
    
    # Rollback work item status if specified
    if [[ -n "$work_item_path" && -f "$work_item_path" ]]; then
        rollback_work_item_state "$work_item_path"
    fi
    
    # Clean up temporary files
    cleanup_temp_files
    
    echo "✅ Rollback completed successfully"
    return 0
}
```

### `rollback_work_item_state()`
```bash
rollback_work_item_state() {
    local work_item_path="$1"
    local target_status="${2:-pending}"
    local current_time
    current_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    echo "🔄 Rolling back work item state: $(basename "$work_item_path")"
    
    # Reset work item to safe state
    yq eval ".status = \"$target_status\" | 
             .completion_percentage = 0 | 
             .current_phase = \"rollback\" | 
             .last_updated = \"$current_time\" | 
             .implementation_notes += [\"$current_time: Status rolled back due to execution failure\"]" -i "$work_item_path"
    
    # Remove execution timestamps if rolling back to pending
    if [[ "$target_status" == "pending" ]]; then
        yq eval "del(.execution_started) | del(.completion_date)" -i "$work_item_path"
    fi
    
    echo "✅ Work item state rolled back to: $target_status"
}
```

### `rollback_parent_progress()`
```bash
rollback_parent_progress() {
    local work_item_path="$1"
    local scope_type
    scope_type=$(basename "$work_item_path" | sed 's/.*\.\(epic\|feature\|story\|tech\)\.carl$/\1/')
    
    case "$scope_type" in
        "story")
            # Recalculate parent feature progress
            local parent_feature
            parent_feature=$(yq eval '.parent_feature' "$work_item_path" 2>/dev/null)
            if [[ -n "$parent_feature" && "$parent_feature" != "null" ]]; then
                local feature_file
                feature_file=$(find .carl/project/features -name "*${parent_feature}*.carl" 2>/dev/null | head -1)
                if [[ -n "$feature_file" ]]; then
                    echo "🔄 Recalculating parent feature progress"
                    source .carl/commandlib/shared/progress-tracking.md
                    calculate_feature_progress "$feature_file" >/dev/null
                fi
            fi
            ;;
        "feature")
            # Recalculate parent epic progress
            local parent_epic
            parent_epic=$(yq eval '.parent_epic_id' "$work_item_path" 2>/dev/null)
            if [[ -n "$parent_epic" && "$parent_epic" != "null" ]]; then
                local epic_file
                epic_file=$(find .carl/project/epics -name "*${parent_epic}*.carl" 2>/dev/null | head -1)
                if [[ -n "$epic_file" ]]; then
                    echo "🔄 Recalculating parent epic progress"
                    source .carl/commandlib/shared/progress-tracking.md
                    calculate_epic_progress "$epic_file" >/dev/null
                fi
            fi
            ;;
    esac
}
```

### `emergency_recovery()`
```bash
emergency_recovery() {
    local recovery_level="${1:-basic}"  # basic, full, nuclear
    local work_item_path="${2:-}"
    
    echo "🚨 Initiating emergency recovery (level: $recovery_level)"
    
    case "$recovery_level" in
        "basic")
            # Basic recovery - reset work item status only
            if [[ -n "$work_item_path" && -f "$work_item_path" ]]; then
                rollback_work_item_state "$work_item_path" "pending"
                rollback_parent_progress "$work_item_path"
            fi
            cleanup_temp_files
            ;;
            
        "full")
            # Full recovery - reset git state and work items
            local last_checkpoint
            last_checkpoint=$(get_latest_checkpoint)
            if [[ -n "$last_checkpoint" ]]; then
                rollback_to_checkpoint "$last_checkpoint" true "$work_item_path"
            else
                echo "⚠️  No checkpoints available for full recovery"
                emergency_recovery "basic" "$work_item_path"
            fi
            ;;
            
        "nuclear")
            # Nuclear recovery - reset everything to clean state
            echo "⚠️  NUCLEAR RECOVERY - This will reset ALL in-progress work items"
            read -p "Are you sure? Type 'CONFIRM' to proceed: " confirmation
            if [[ "$confirmation" == "CONFIRM" ]]; then
                nuclear_reset
            else
                echo "Nuclear recovery cancelled"
                return 1
            fi
            ;;
    esac
    
    echo "✅ Emergency recovery completed"
}
```

### `nuclear_reset()`
```bash
nuclear_reset() {
    echo "💥 Performing nuclear reset - resetting all work items to pending"
    
    # Reset all in-progress work items
    find .carl/project -name "*.carl" -not -path "*/completed/*" | while read -r file; do
        local status
        status=$(yq eval '.status' "$file" 2>/dev/null)
        if [[ "$status" == "in_progress" ]]; then
            echo "Resetting: $(basename "$file")"
            rollback_work_item_state "$file" "pending"
        fi
    done
    
    # Clean git state (if safe)
    if git rev-parse --git-dir &>/dev/null && [[ -n "$(git status --porcelain)" ]]; then
        git reset --hard HEAD >/dev/null 2>&1
        echo "Git working directory reset to HEAD"
    fi
    
    # Clean temporary files
    cleanup_temp_files
    
    # Reset session tracking
    local session_file
    session_file=$(source .carl/commandlib/shared/progress-tracking.md && get_current_session_file)
    if [[ -n "$session_file" ]]; then
        yq eval '.summary.nuclear_reset = true | .summary.reset_timestamp = "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"' -i "$session_file"
    fi
    
    echo "💥 Nuclear reset completed - all work items reset to pending state"
}
```

## Utility Functions

### `get_latest_checkpoint()`
```bash
get_latest_checkpoint() {
    local checkpoint_file=".carl/checkpoints.json"
    
    if [[ ! -f "$checkpoint_file" ]]; then
        echo ""
        return 1
    fi
    
    # Get most recent checkpoint ID
    yq eval 'sort_by(.timestamp) | last | .id' "$checkpoint_file" 2>/dev/null
}
```

### `cleanup_temp_files()`
```bash
cleanup_temp_files() {
    echo "🧹 Cleaning up temporary files"
    
    # Remove common temp files
    find /tmp -name "*carl*" -type f -mmin +60 -delete 2>/dev/null || true
    find .carl -name "*.tmp" -delete 2>/dev/null || true
    find .carl -name "*.backup" -delete 2>/dev/null || true
    
    # Clean up abandoned lock files
    find .carl -name "*.lock" -type f -mmin +30 -delete 2>/dev/null || true
    
    echo "✅ Temporary files cleaned"
}
```

### `validate_rollback_safety()`
```bash
validate_rollback_safety() {
    local checkpoint_id="$1"
    local work_item_path="${2:-}"
    
    # Check if checkpoint is valid
    if [[ "$checkpoint_id" != "no-git" ]] && ! git rev-parse --verify "$checkpoint_id" &>/dev/null; then
        echo "❌ Invalid checkpoint: $checkpoint_id"
        return 1
    fi
    
    # Check for critical files that shouldn't be rolled back
    local critical_files=(
        ".carl/sessions/"
        ".carl/schemas/"
        ".carl/config/"
    )
    
    for critical_path in "${critical_files[@]}"; do
        if [[ -e "$critical_path" ]]; then
            # Check if critical path would be affected
            if git diff --name-only "$checkpoint_id" HEAD 2>/dev/null | grep -q "$critical_path"; then
                echo "⚠️  Rollback would affect critical path: $critical_path"
                echo "   Consider selective rollback instead of full rollback"
            fi
        fi
    done
    
    # Check work item dependencies
    if [[ -n "$work_item_path" && -f "$work_item_path" ]]; then
        # Check if other work items depend on this one
        local work_item_id
        work_item_id=$(yq eval '.id' "$work_item_path" 2>/dev/null)
        
        if [[ -n "$work_item_id" ]]; then
            local dependent_items
            dependent_items=$(find .carl/project -name "*.carl" -exec grep -l "$work_item_id" {} \; 2>/dev/null)
            
            if [[ -n "$dependent_items" ]]; then
                echo "⚠️  Other work items depend on $(basename "$work_item_path"):"
                echo "$dependent_items" | sed 's|.*/||' | sed 's/^/   - /'
                echo "   Rolling back may affect dependent items"
            fi
        fi
    fi
    
    echo "✅ Rollback safety validation completed"
    return 0
}
```

## Automatic Rollback Triggers

### `setup_rollback_triggers()`
```bash
setup_rollback_triggers() {
    local work_item_path="$1"
    
    # Set up trap for user interruption (Ctrl+C)
    trap 'handle_user_interruption "$work_item_path"' INT
    
    # Set up trap for script exit
    trap 'handle_script_exit "$work_item_path" $?' EXIT
    
    echo "✅ Rollback triggers configured"
}

handle_user_interruption() {
    local work_item_path="$1"
    echo ""
    echo "⚠️  User interruption detected"
    
    # Ask user about rollback
    echo "Options:"
    echo "1. Rollback and restore previous state"
    echo "2. Keep current state and exit"
    echo "3. Continue execution"
    read -p "Choose option (1-3): " choice
    
    case "$choice" in
        1)
            emergency_recovery "basic" "$work_item_path"
            exit 130
            ;;
        2)
            echo "Keeping current state"
            exit 130
            ;;
        3)
            echo "Continuing execution"
            return 0
            ;;
        *)
            echo "Invalid choice. Keeping current state."
            exit 130
            ;;
    esac
}

handle_script_exit() {
    local work_item_path="$1"
    local exit_code="$2"
    
    # Only handle non-zero exit codes (failures)
    if [[ "$exit_code" -ne 0 && "$exit_code" -ne 130 ]]; then
        echo "⚠️  Command failed with exit code: $exit_code"
        
        # Automatic rollback for certain error types
        if [[ "$exit_code" -eq 4 || "$exit_code" -eq 5 ]]; then
            echo "Performing automatic rollback due to execution/system error"
            emergency_recovery "basic" "$work_item_path" >/dev/null 2>&1
        fi
    fi
    
    # Clean up traps
    trap - INT EXIT
}
```

## Usage Examples

### In Command Files
```bash
# Source rollback framework
source .carl/commandlib/shared/rollback-operations.md

# Set up rollback capability
setup_rollback_triggers "$work_item_path"

# Create checkpoint before major operations
checkpoint_id=$(create_rollback_checkpoint "before_implementation" "$work_item_path")

# Perform risky operations
if ! perform_implementation; then
    echo "Implementation failed, rolling back"
    rollback_to_checkpoint "$checkpoint_id" false "$work_item_path"
    exit 1
fi

# Create checkpoint after successful phase
create_rollback_checkpoint "after_implementation" "$work_item_path"

# Continue with next phase
if ! run_tests; then
    echo "Tests failed, rolling back to implementation checkpoint"
    rollback_to_checkpoint "$checkpoint_id" false "$work_item_path"
    exit 1
fi
```

### Manual Recovery
```bash
# Basic recovery for specific work item
emergency_recovery "basic" ".carl/project/stories/my-story.story.carl"

# Full recovery using latest checkpoint
emergency_recovery "full"

# Nuclear option (resets everything)
emergency_recovery "nuclear"
```

## Integration with Error Handling

This rollback framework integrates with the error handling framework:
- Automatic rollback triggers for specific error types
- Rollback attempts logged in error handling system
- Recovery options presented to users during error scenarios
- Session tracking of rollback operations for debugging

## Safety Considerations

- Always validate rollback safety before executing
- Preserve critical system files during rollback
- Maintain rollback logs for audit trails
- Provide clear user feedback during rollback operations
- Test rollback procedures as part of command development