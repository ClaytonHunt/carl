# Error Handling Framework

Standardized error handling and messaging for all CARL commands.

## Error Categories

### Validation Errors
- **Foundation Missing** - CARL structure not initialized
- **Schema Invalid** - Work item doesn't meet schema requirements  
- **Dependencies Unmet** - Required dependencies not completed
- **Circular Dependencies** - Dependency cycles detected
- **File Not Found** - Referenced work item doesn't exist

### Execution Errors
- **Command Failed** - External command execution failed
- **Test Failures** - Tests failed during TDD workflow
- **Quality Gate Failed** - Code quality requirements not met
- **Integration Failed** - System integration checks failed
- **Rollback Failed** - Recovery operation failed

### System Errors
- **Git Error** - Git operations failed
- **File System Error** - File operations failed
- **Permission Error** - Insufficient permissions
- **Network Error** - Remote operations failed
- **Resource Error** - System resource constraints

## Error Message Formats

### Standard Error Format
```
❌ [ERROR_CATEGORY] Command: /carl:command-name
   Problem: Brief description of what went wrong
   Context: Specific details about the failure
   Solution: Clear steps to resolve the issue
   
   For more help: /help or https://docs.anthropic.com/claude-code
```

### Warning Format
```
⚠️  [WARNING_CATEGORY] Command: /carl:command-name
   Issue: Description of the potential problem
   Impact: What might happen if not addressed
   Recommendation: Suggested action to take
```

### Info Format
```
ℹ️  [INFO_CATEGORY] Command: /carl:command-name
   Status: Current operation status
   Details: Additional context information
```

## Error Handling Functions

### `handle_validation_error()`
```bash
handle_validation_error() {
    local error_type="$1"
    local context="$2"
    local file_path="${3:-}"
    local command="${4:-unknown}"
    
    case "$error_type" in
        "foundation_missing")
            cat << EOF
❌ FOUNDATION_MISSING Command: /carl:$command
   Problem: CARL project structure not found or incomplete
   Context: $context
   Solution: Run '/carl:analyze' to initialize project structure
   
   Required directories:
   - .carl/project/epics/
   - .carl/project/features/
   - .carl/project/stories/
   - .carl/project/technical/
   
   For more help: /help or https://docs.anthropic.com/claude-code
EOF
            ;;
            
        "schema_invalid")
            cat << EOF
❌ SCHEMA_INVALID Command: /carl:$command
   Problem: Work item does not meet schema requirements
   Context: $context
   File: ${file_path:-"not specified"}
   Solution: Review and fix the following issues:
   
   Common fixes:
   - Ensure all required fields are present
   - Check YAML syntax is valid
   - Verify field types match schema
   - Use snake_case for IDs, kebab-case for filenames
   
   For more help: /help or https://docs.anthropic.com/claude-code
EOF
            ;;
            
        "dependencies_unmet")
            cat << EOF
❌ DEPENDENCIES_UNMET Command: /carl:$command
   Problem: Required dependencies are not completed
   Context: $context
   File: ${file_path:-"not specified"}
   Solution: Complete the following dependencies first:
   
   Then retry: /carl:$command
   
   For more help: /help or https://docs.anthropic.com/claude-code
EOF
            ;;
            
        "circular_dependencies")
            cat << EOF
❌ CIRCULAR_DEPENDENCIES Command: /carl:$command
   Problem: Circular dependency chain detected
   Context: $context
   Solution: Review and break the dependency cycle:
   
   1. Identify which dependencies form the cycle
   2. Remove or reorganize unnecessary dependencies
   3. Consider splitting work items to break cycles
   
   For more help: /help or https://docs.anthropic.com/claude-code
EOF
            ;;
            
        "file_not_found")
            cat << EOF
❌ FILE_NOT_FOUND Command: /carl:$command
   Problem: Referenced work item file does not exist
   Context: $context
   File: ${file_path:-"not specified"}
   Solution: Check the following:
   
   1. Verify file path is correct
   2. Check file exists in expected directory
   3. Ensure proper naming convention (kebab-case.scope.carl)
   4. Run '/carl:status' to see available work items
   
   For more help: /help or https://docs.anthropic.com/claude-code
EOF
            ;;
            
        *)
            cat << EOF
❌ VALIDATION_ERROR Command: /carl:$command
   Problem: $error_type
   Context: $context
   File: ${file_path:-"not specified"}
   Solution: Please review the error details and try again
   
   For more help: /help or https://docs.anthropic.com/claude-code
EOF
            ;;
    esac
    
    return 1
}
```

### `handle_execution_error()`
```bash
handle_execution_error() {
    local error_type="$1"
    local context="$2"
    local command="${3:-unknown}"
    local exit_code="${4:-1}"
    
    case "$error_type" in
        "command_failed")
            cat << EOF
❌ COMMAND_FAILED Command: /carl:$command
   Problem: External command execution failed
   Context: $context
   Exit Code: $exit_code
   Solution: Review the command output above and fix any issues
   
   Common causes:
   - Missing dependencies or tools
   - Invalid command syntax
   - Permission issues
   - Resource constraints
   
   For more help: /help or https://docs.anthropic.com/claude-code
EOF
            ;;
            
        "test_failures")
            cat << EOF
❌ TEST_FAILURES Command: /carl:$command
   Problem: Tests failed during execution
   Context: $context
   Solution: Fix failing tests before continuing
   
   TDD workflow:
   1. Review test failure output
   2. Fix implementation to pass tests
   3. Ensure all tests pass
   4. Retry command execution
   
   For more help: /help or https://docs.anthropic.com/claude-code
EOF
            ;;
            
        "quality_gate_failed")
            cat << EOF
❌ QUALITY_GATE_FAILED Command: /carl:$command
   Problem: Code quality requirements not met
   Context: $context
   Solution: Address quality issues before continuing
   
   Common quality checks:
   - Code style and formatting
   - Test coverage requirements
   - Complexity metrics
   - Documentation standards
   
   For more help: /help or https://docs.anthropic.com/claude-code
EOF
            ;;
            
        "integration_failed")
            cat << EOF
❌ INTEGRATION_FAILED Command: /carl:$command
   Problem: System integration checks failed
   Context: $context
   Solution: Fix integration issues
   
   Integration checks:
   1. API compatibility
   2. Database schema changes
   3. Service dependencies
   4. Configuration validation
   
   For more help: /help or https://docs.anthropic.com/claude-code
EOF
            ;;
            
        *)
            cat << EOF
❌ EXECUTION_ERROR Command: /carl:$command
   Problem: $error_type
   Context: $context
   Exit Code: $exit_code
   Solution: Review error details and retry
   
   For more help: /help or https://docs.anthropic.com/claude-code
EOF
            ;;
    esac
    
    return "$exit_code"
}
```

### `handle_system_error()`
```bash
handle_system_error() {
    local error_type="$1"
    local context="$2"
    local command="${3:-unknown}"
    local system_info="${4:-}"
    
    case "$error_type" in
        "git_error")
            cat << EOF
❌ GIT_ERROR Command: /carl:$command
   Problem: Git operation failed
   Context: $context
   System: $system_info
   Solution: Check git configuration and repository state
   
   Common fixes:
   - Verify git repository is valid
   - Check git user configuration
   - Ensure proper file permissions
   - Resolve merge conflicts if any
   
   For more help: /help or https://docs.anthropic.com/claude-code
EOF
            ;;
            
        "filesystem_error")
            cat << EOF
❌ FILESYSTEM_ERROR Command: /carl:$command
   Problem: File system operation failed
   Context: $context
   System: $system_info
   Solution: Check file system permissions and space
   
   Common causes:
   - Insufficient disk space
   - Permission denied
   - File or directory locked
   - Path too long
   
   For more help: /help or https://docs.anthropic.com/claude-code
EOF
            ;;
            
        "permission_error")
            cat << EOF
❌ PERMISSION_ERROR Command: /carl:$command
   Problem: Insufficient permissions
   Context: $context
   System: $system_info
   Solution: Check file and directory permissions
   
   Common fixes:
   - Verify read/write permissions on .carl/ directory
   - Check execute permissions on scripts
   - Ensure proper ownership of project files
   
   For more help: /help or https://docs.anthropic.com/claude-code
EOF
            ;;
            
        *)
            cat << EOF
❌ SYSTEM_ERROR Command: /carl:$command
   Problem: $error_type
   Context: $context
   System: $system_info
   Solution: Check system resources and configuration
   
   For more help: /help or https://docs.anthropic.com/claude-code
EOF
            ;;
    esac
    
    return 1
}
```

### `show_warning()`
```bash
show_warning() {
    local warning_type="$1"
    local context="$2"
    local command="${3:-unknown}"
    local recommendation="${4:-Review and consider addressing}"
    
    cat << EOF
⚠️  ${warning_type^^} Command: /carl:$command
   Issue: $context
   Impact: This may affect command execution or results
   Recommendation: $recommendation
EOF
    
    return 0
}
```

### `show_info()`
```bash
show_info() {
    local info_type="$1"
    local message="$2"
    local command="${3:-unknown}"
    local details="${4:-}"
    
    cat << EOF
ℹ️  ${info_type^^} Command: /carl:$command
   Status: $message
EOF

    if [[ -n "$details" ]]; then
        echo "   Details: $details"
    fi
    
    return 0
}
```

## Recovery Functions

### `attempt_recovery()`
```bash
attempt_recovery() {
    local error_type="$1"
    local context="$2"
    local recovery_data="${3:-}"
    
    show_info "RECOVERY" "Attempting automatic recovery for $error_type"
    
    case "$error_type" in
        "foundation_missing")
            show_info "RECOVERY" "Creating missing CARL directories"
            mkdir -p .carl/project/{epics,features,stories,technical}
            mkdir -p .carl/{schemas,sessions,commandlib}
            echo "Basic structure created. Run /carl:analyze for full initialization."
            ;;
            
        "git_error")
            show_info "RECOVERY" "Attempting git recovery"
            # Basic git recovery attempts
            git status &>/dev/null || {
                show_warning "RECOVERY" "Cannot recover git state automatically"
                return 1
            }
            ;;
            
        "permission_error")
            show_info "RECOVERY" "Checking permission recovery options"
            # Check if we can fix permissions
            if [[ -w "$(dirname "$recovery_data")" ]]; then
                chmod u+rw "$recovery_data" 2>/dev/null || {
                    show_warning "RECOVERY" "Cannot fix permissions automatically"
                    return 1
                }
            fi
            ;;
            
        *)
            show_warning "RECOVERY" "No automatic recovery available for $error_type"
            return 1
            ;;
    esac
    
    show_info "RECOVERY" "Recovery attempt completed"
    return 0
}
```

### `rollback_changes()`
```bash
rollback_changes() {
    local checkpoint="$1"
    local work_item="${2:-}"
    
    show_warning "ROLLBACK" "Rolling back changes to checkpoint: $checkpoint"
    
    # Git-based rollback for tracked changes
    if [[ -n "$checkpoint" ]] && git rev-parse --verify "$checkpoint" &>/dev/null; then
        git reset --hard "$checkpoint" || {
            handle_system_error "git_error" "Failed to rollback to checkpoint $checkpoint"
            return 1
        }
    fi
    
    # Work item status rollback
    if [[ -n "$work_item" && -f "$work_item" ]]; then
        # Reset work item status if it was modified
        if yq eval '.status' "$work_item" 2>/dev/null | grep -q "in_progress"; then
            yq eval '.status = "pending" | .completion_percentage = 0' -i "$work_item"
            show_info "ROLLBACK" "Work item status reset to pending"
        fi
    fi
    
    show_info "ROLLBACK" "Rollback completed"
    return 0
}
```

## Usage Examples

### In Command Files
```bash
# Source the error handling framework
source .carl/commandlib/shared/error-handling.md

# Validation error example
if ! validate_work_item_file "$work_item"; then
    handle_validation_error "schema_invalid" "Missing required fields: id, name" "$work_item" "task"
    exit 1
fi

# Execution error example
if ! run_tests; then
    handle_execution_error "test_failures" "3 unit tests failed" "task" "$?"
    exit 1
fi

# Warning example
if [[ $quality_score -lt 80 ]]; then
    show_warning "quality_concern" "Code quality score below recommended threshold" "task" "Review and improve code quality"
fi

# Recovery example
if ! validate_foundation; then
    if attempt_recovery "foundation_missing"; then
        show_info "recovery_success" "Foundation structure recovered, retrying command"
        # Retry the operation
    else
        handle_validation_error "foundation_missing" "Could not recover foundation structure" "" "task"
        exit 1
    fi
fi
```

## Error Code Standards

### Exit Codes
- `0` - Success
- `1` - General error
- `2` - Validation error
- `3` - Dependency error
- `4` - Execution error
- `5` - System error
- `130` - User interruption (Ctrl+C)

### Error Logging
All errors are logged to session files with:
- Timestamp
- Command context
- Error type and details
- Resolution attempts
- Final outcome

## Integration with Session Management

Errors are automatically tracked in session files:
```yaml
errors:
  - timestamp: "2025-08-06T15:30:00Z"
    command: "/carl:task"
    error_type: "dependencies_unmet"
    context: "story depends on incomplete feature"
    resolution: "none"
    exit_code: 3
```

This enables error pattern analysis and debugging support through `/carl:status` command.