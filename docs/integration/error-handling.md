# Error Handling & Recovery

## CARL File Validation

### Automatic Schema Validation (Built into PostToolUse Hook)
- **Trigger**: Every time a `.carl` file is modified via Write/Edit/MultiEdit tools
- **Validation Checks**: Required fields, field value ranges, enum validation
- **Failure Response**: Hook exits with error message and schema guidance → Claude Code receives error → User fixes file
- **Success Response**: Proceeds with completion processing and quality gates

### Schema Validation Logic
```bash
# Schema-based validation using .carl/schemas/ directory
carl_file_type=$(basename "$carl_file" | cut -d'.' -f2)  # epic, feature, story, tech
schema_file=".carl/schemas/${carl_file_type}.schema.yaml"

# Use yq to validate against schema (with fallback to grep)
if command -v yq >/dev/null 2>&1 && [[ -f "$schema_file" ]]; then
  # Formal schema validation with yq
  if ! yq eval-all 'select(fileIndex == 0) as $schema | select(fileIndex == 1) | validate($schema)' \
       "$schema_file" "$carl_file" >/dev/null 2>&1; then
    validation_error="File does not match schema: $schema_file"
  fi
else
  # Fallback to basic field validation (existing logic)
  required_fields=("id" "name" "completion_percentage" "current_phase" "acceptance_criteria")
  for field in "${required_fields[@]}"; do
    if ! grep -q "^${field}:" "$carl_file"; then
      validation_error="Missing required field: $field"
      break
    fi
  done
fi
```

### Schema Error Response Strategy
1. **Hook Validation Failure** → Error message with schema file reference displayed to user
2. **Claude Code Context** → Specific schema file (`.carl/schemas/[type].schema.yaml`) automatically loaded for fixing
3. **User Correction** → Edit file according to schema guidance from `.carl/schemas/`  
4. **Re-validation** → Hook validates again on next file save using same schema
5. **Success Path** → Proceed with normal completion processing

### Schema Integration Benefits
- **Centralized Schema Management**: All validation rules in `.carl/schemas/` directory
- **Consistent Validation**: Hooks, commands, and agents use same schema files
- **Context-Rich Errors**: Specific schema file provided for fixing validation failures
- **Version Control**: Schema files tracked in git alongside CARL files
- **Agent Integration**: Sub-agents can reference schemas for consistent CARL file generation

### Schema Usage Throughout CARL System
- **PostToolUse Hook**: Validates CARL files against schemas before processing
- **Commands**: Reference schemas when creating new CARL files
- **Sub-agents**: Use schemas to ensure consistent file generation (`carl-requirements-analyst`, etc.)
- **Error Recovery**: Schema files provide context for automatic error correction

## Hook Failure Handling

### Hook Timeout (60 seconds)
- **Graceful Degradation**: System continues without hook output if timeout exceeded
- **Logging**: Hook failures logged to `.carl/system/hook-errors.log`
- **Retry Strategy**: No automatic retry - hook failures should not block Claude Code

### Hook Error Recovery
- **Non-blocking**: Hook failures never prevent command execution
- **Error Isolation**: One hook failure doesn't affect other hooks
- **Fallback Behavior**: Commands work without hook-provided context (reduced functionality)

## Agent Error Handling

### Agent Invocation Failures
- **Missing Agent Definitions**: Commands continue with reduced functionality, log missing agent
- **Agent Execution Errors**: Graceful fallback to manual processing, error logging
- **Context Loading Failures**: Agents work with partial context, request manual input when needed

### Agent Recovery Protocol
```
1. Detect agent failure (timeout, error response, missing agent)
2. Log failure details to session file
3. Continue command execution with fallback behavior
4. Notify user of reduced functionality
5. Suggest manual verification of results
```

## Command Error Handling

### File Access Errors
- **Missing CARL Files**: Create from template with user confirmation
- **Permission Errors**: Clear error message with suggested filesystem fixes
- **Lock File Conflicts**: Retry with exponential backoff, manual override option

### Workflow Interruption Recovery
- **Partial Completion**: Save intermediate state to work item files
- **Resume Capability**: Commands detect partial work and offer to continue
- **Rollback Option**: Undo partial changes when user requests

## System Health Monitoring

### Health Check Indicators
- **CARL File Integrity**: Schema validation across all files
- **Hook Functionality**: Test hooks with dummy data
- **Agent Availability**: Verify core agent definitions exist
- **File System Health**: Check `.carl/` directory structure and permissions

### Automatic Recovery Actions
- **Missing Directories**: Auto-create `.carl/project/`, `.carl/sessions/` structure
- **Corrupted Templates**: Regenerate from built-in schemas
- **Permission Issues**: Clear instructions for manual filesystem repair
- **Agent Definition Repair**: `carl-agent-builder` can recreate missing core agents

## Error Logging Strategy

### Error Categories
- **FATAL**: System cannot continue (missing .carl directory, permission denied)
- **ERROR**: Feature degraded (hook failure, agent unavailable, file corruption)
- **WARNING**: Minor issues (validation warnings, performance concerns)
- **INFO**: Normal operation logging (work item updates, session tracking)

### Log Locations
- **Hook Errors**: `.carl/system/hook-errors.log`
- **Session Activity**: `.carl/sessions/session-YYYY-MM-DD-{user}.carl`
- **System Health**: `.carl/system/health-check.log`
- **Agent Errors**: Individual agent execution logs in session files