---
description: Intelligent CARL work item planning with scope detection
argument-hint: [requirement description] or --from [work-item.carl]
allowed-tools: Task, Read, Write, Glob, Grep, LS, MultiEdit
---

# CARL Planning Command

You are implementing intelligent work item planning with checklist-driven validation.

## Execution Checklist

- [ ] **Start Session Activity Tracking**
  - [ ] Use Bash tool to start planning activity: `export CLAUDE_PROJECT_DIR=$(pwd) && source .carl/hooks/lib/carl-session-compact.sh && ACTIVITY_ID=$(start_planning_activity "$(get_current_session_file)") && echo "Planning activity started: $ACTIVITY_ID"`
  - [ ] Store ACTIVITY_ID for completion tracking

- [ ] **Load Shared Validation Framework**
  - [ ] Source foundation validation: `.carl/commands/shared/foundation-validation.md`
  - [ ] Source work item validation: `.carl/commands/shared/work-item-validation.md`
  - [ ] Source error handling: `.carl/commands/shared/error-handling.md`
  - [ ] Source progress tracking: `.carl/commands/shared/progress-tracking.md`

- [ ] **Validate Prerequisites**
  - [ ] Validate CARL foundation exists (vision.carl, process.carl, roadmap.carl)
  - [ ] Validate project directory structure
  - [ ] Handle validation failures with standardized error messages

- [ ] **Determine Planning Mode**
  - [ ] Check for `--from` argument → Route to **Breakdown Mode**
  - [ ] Check for requirement description → Route to **New Item Mode**
  - [ ] Handle invalid arguments with clear usage guidance

- [ ] **Execute Planning Mode**
  - [ ] New Item Creation: `.carl/commands/plan/new-item.md`
  - [ ] Breakdown Mode: `.carl/commands/plan/breakdown.md`

- [ ] **Validate Results**
  - [ ] Verify all created files are schema-compliant
  - [ ] Check parent-child relationships are bidirectional
  - [ ] Confirm no circular dependencies created

- [ ] **Complete Session Activity Tracking**
  - [ ] Use Bash tool to end planning activity with created files: `export CLAUDE_PROJECT_DIR=$(pwd) && source .carl/hooks/lib/carl-session-compact.sh && end_planning_activity "$(get_current_session_file)" "$ACTIVITY_ID" "$(echo [created_file_list_comma_separated])" && echo "Planning activity completed"`

## Mode Detection Process

### Argument Analysis
- [ ] **Breakdown Mode Detection**:
  - [ ] `--from` flag present in arguments
  - [ ] Extract work item file path from arguments
  - [ ] Validate source work item exists and is readable
  - [ ] **Decision**: Route to Breakdown Mode processing

- [ ] **New Item Mode Detection**:
  - [ ] No `--from` flag present
  - [ ] Requirements description provided in arguments
  - [ ] **Decision**: Route to New Item Creation processing

- [ ] **Error Conditions**:
  - [ ] No arguments provided → Show usage guidance
  - [ ] Invalid `--from` file path → Handle file not found error
  - [ ] Ambiguous arguments → Request clarification

## Mode-Specific Processing

Each planning mode follows detailed checklists in carl commands:

### New Item Creation Mode
**Reference**: `.carl/commands/plan/new-item.md`
- Requirements gathering and validation
- Scope classification (epic/feature/story/technical)
- Agent-driven analysis with carl-requirements-analyst
- Schema-compliant file creation and verification

### Breakdown Mode  
**Reference**: `.carl/commands/plan/breakdown.md`
- Source work item analysis and validation
- Child item generation with proper relationships
- Parent-child link management
- Coverage validation and quality assurance

## File Creation Standards

**CRITICAL**: All file creation follows these requirements:
- [ ] **Agent Analysis First**: Use carl-requirements-analyst for specifications
- [ ] **Extract Specifications**: Parse file paths and YAML content from agent response
- [ ] **Create Files**: Use Write tool to create CARL files in proper directories
- [ ] **Verify Creation**: Use Read tool to confirm file contents match specifications
- [ ] **Schema Validation**: Allow hooks to validate automatically, handle failures

## File Organization Standards

File creation uses standard CARL directory structure:
- `.carl/project/epics/` → Epic files (3-6 months scope)
- `.carl/project/features/` → Feature files (2-4 weeks scope)  
- `.carl/project/stories/` → Story files (2-5 days scope)
- `.carl/project/technical/` → Technical work items (variable scope)

## Quality Standards

All planning operations use shared validation framework:
- **Schema Compliance**: `.carl/commands/shared/work-item-validation.md`
- **Naming Conventions**: kebab-case files, snake_case IDs
- **Content Quality**: Measurable acceptance criteria, realistic estimates
- **Relationship Integrity**: Proper parent-child links, dependency validation

## Error Handling

Error handling uses shared standardized framework:
- **Validation Errors**: `.carl/commands/shared/error-handling.md`
- **Recovery Operations**: Automatic file validation and correction guidance
- **User Guidance**: Clear error messages with actionable next steps

## Execution Standards

### Validation Requirements
- [ ] **MANDATORY**: Use shared validation framework for all prerequisite checks
- [ ] **MANDATORY**: Route to appropriate mode based on argument analysis
- [ ] **MANDATORY**: Use commandlib references for mode-specific processing
- [ ] **MANDATORY**: Extract agent specifications and create files with Write tool
- [ ] **MANDATORY**: Verify file creation with Read tool and handle validation failures
- [ ] **MANDATORY**: Update session tracking with planning results

### Success Criteria
- ✅ Smart mode detection eliminates user confusion
- ✅ Checklist validation ensures schema compliance  
- ✅ Agent integration provides comprehensive analysis
- ✅ File creation verification prevents incomplete operations

## Usage Examples

```bash
# Create new work item from requirement
/carl:plan "User authentication system with OAuth integration"

# Break down existing work item into child items
/carl:plan --from user-authentication-system.feature.carl

# Results in schema-compliant CARL files with proper relationships
```

Remember: Planning quality directly impacts execution success. Use checklists to ensure complete requirements gathering and proper file creation.