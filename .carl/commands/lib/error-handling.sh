#!/bin/bash

# Error Handling Library
# Standardized error handling and messaging for all CARL commands

# Handle validation errors with standardized messages
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

# Handle execution errors
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

# Show warning messages
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

# Show info messages
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