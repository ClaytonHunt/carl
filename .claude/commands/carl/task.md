---
description: Intelligent CARL work execution with dependency analysis and scope handling
argument-hint: [work-item.carl] or [work-item-name]
allowed-tools: Task, Read, Write, Glob, Grep, LS, MultiEdit, Bash, TodoWrite
---

# CARL Task Execution Command

You are implementing intelligent work item execution with checklist-driven validation and scope-based processing.

## Execution Checklist

- [ ] **Load Shared Validation Framework**
  - [ ] Source work item validation: `.carl/commands/shared/work-item-validation.md`
  - [ ] Source dependency validation: `.carl/commands/shared/dependency-validation.md`
  - [ ] Source error handling: `.carl/commands/shared/error-handling.md`
  - [ ] Source progress tracking: `.carl/commands/shared/progress-tracking.md`

- [ ] **Resolve Work Item**
  - [ ] Parse arguments and extract work item specification
  - [ ] Resolve work item file path: `.carl/commands/task/work-item-resolution.md`
  - [ ] Validate work item file exists and is schema-compliant
  - [ ] Handle resolution failures with clear guidance

- [ ] **Start Session Activity Tracking**
  - [ ] Use Bash tool to start work activity: `export CLAUDE_PROJECT_DIR=$(pwd) && source .carl/hooks/lib/carl-session-compact.sh && WORK_ACTIVITY_ID=$(start_work_activity "$(get_current_session_file)" "[resolved_work_item_file_path]") && echo "Work activity started: $WORK_ACTIVITY_ID"`
  - [ ] Store WORK_ACTIVITY_ID for completion tracking

- [ ] **Detect Execution Mode**
  - [ ] Check for `--yolo` flag in arguments → Route to **YOLO Mode**
  - [ ] Determine work item scope (epic/feature/story/technical)
  - [ ] Route to appropriate scope-based execution mode

- [ ] **Execute Scope-Based Processing**
  - [ ] Epic Execution: `.carl/commands/task/epic-execute.md`
  - [ ] Feature Execution: `.carl/commands/task/feature-execute.md`
  - [ ] Story Execution: `.carl/commands/task/story-execute.md`
  - [ ] Technical Execution: `.carl/commands/task/technical-execute.md`
  - [ ] YOLO Execution: `.carl/commands/task/yolo-execute.md`

- [ ] **Track Progress and Complete**
  - [ ] Real-time progress updates: `.carl/commands/task/progress-tracking.md`
  - [ ] Quality gate validation: `.carl/commands/task/quality-gates.md`
  - [ ] Completion handling and hook integration

- [ ] **Complete Session Activity Tracking**
  - [ ] Use Bash tool to end work activity: `export CLAUDE_PROJECT_DIR=$(pwd) && source .carl/hooks/lib/carl-session-compact.sh && end_work_activity "$(get_current_session_file)" "$WORK_ACTIVITY_ID" && echo "Work activity completed"`

## Mode Detection Process

### YOLO Mode Detection
- [ ] **Flag Analysis**: Parse `--yolo` flag from arguments
- [ ] **Mode Setup**: If present, set EXECUTION_MODE="yolo" (ephemeral)
- [ ] **User Confirmation**: Display warnings and request confirmation
- [ ] **Argument Cleanup**: Remove `--yolo` flag from work item resolution

### Scope Detection Process
- [ ] **File Extension Analysis**:
  - [ ] `.epic.carl` → Route to Epic Execution
  - [ ] `.feature.carl` → Route to Feature Execution  
  - [ ] `.story.carl` → Route to Story Execution
  - [ ] `.tech.carl` → Route to Technical Execution
- [ ] **Content Analysis**: If extension unclear, analyze CARL file content
- [ ] **Error Handling**: Invalid scope detection triggers clear error message

## Execution Standards

### Dependency Validation (BLOCKING)
All execution modes include mandatory dependency validation:
- **CRITICAL**: Execution is BLOCKED if dependencies are missing or incomplete
- **Validation Process**: Check all dependencies before starting implementation
- **Error Handling**: Clear error messages with remediation guidance
- **Recovery Options**: Provide specific commands to resolve dependency issues

### Progress Tracking (MANDATORY)
- [ ] **Start Tracking**: Update work item status to "in_progress" before execution
- [ ] **Milestone Updates**: Real-time progress updates at 25%, 50%, 75%
- [ ] **Phase Transitions**: Update current_phase throughout execution
- [ ] **Completion Tracking**: Mark "completed" with final timestamp

### Quality Assurance
- [ ] **Standard Mode**: Full TDD enforcement and quality gates
- [ ] **YOLO Mode**: Relaxed validation with automatic debt tracking
- [ ] **Integration Testing**: Verify compatibility with existing system
- [ ] **Completion Validation**: All acceptance criteria met before completion

## Error Prevention and Recovery

### Critical Requirements
- [ ] **MANDATORY**: Use Edit/MultiEdit tools to update CARL file progress
- [ ] **MANDATORY**: Validate all dependencies before execution starts
- [ ] **MANDATORY**: Handle all error conditions with clear user guidance
- [ ] **MANDATORY**: Never mark items complete without proper validation

### Standard Mode Error Handling
- [ ] **Dependency Failures**: Stop execution, report required dependencies
- [ ] **Test Failures**: Block completion, provide improvement guidance  
- [ ] **Quality Gate Failures**: Roll back changes, report specific issues
- [ ] **Integration Failures**: Maintain system stability, clear error messages

### YOLO Mode Error Handling
- [ ] **Relaxed Validation**: Log issues but continue execution where safe
- [ ] **Debt Creation**: Auto-create technical debt items for shortcuts taken
- [ ] **Safety Boundaries**: Still block on integration failures and security issues
- [ ] **Documentation**: Record all yolo decisions for later formalization

## Integration Points

### Hook System Integration
- [ ] **Progress Tracking**: Leverage automatic status updates via progress-track.sh
- [ ] **Completion Handling**: Automatic file movement via completion-handler.sh
- [ ] **Schema Validation**: Ensure CARL file integrity via schema-validate.sh
- [ ] **Session Tracking**: Record execution details in session files

### Agent System Integration
- [ ] **Requirements Analysis**: Use carl-requirements-analyst for missing breakdowns
- [ ] **Project Agents**: Leverage domain-specific agents when available
- [ ] **Context Loading**: Comprehensive project context integration

## Usage Examples

```bash
# Execute story by name
/carl:task user-registration

# Execute by direct file path
/carl:task .carl/project/stories/user-login.story.carl

# Execute feature with child story coordination
/carl:task authentication.feature.carl

# Execute epic in standard mode (requires breakdown)
/carl:task user-management.epic.carl

# Execute in rapid prototyping mode
/carl:task user-management.epic.carl --yolo

# Execute technical work item
/carl:task database-optimization.tech.carl
```

## Quality Standards

### Before Execution
- ✅ **Valid Work Item**: File exists and passes schema validation
- ✅ **Dependencies Met**: All required dependencies are completed
- ✅ **Context Loaded**: Full requirements and project constraints available
- ✅ **Environment Ready**: Development environment properly configured

### During Execution
- ✅ **Real-time Updates**: Progress tracking using Edit/MultiEdit tools
- ✅ **Quality Gates**: Validation checkpoints throughout execution
- ✅ **Error Handling**: Graceful handling of all failure conditions
- ✅ **Integration Safety**: Continuous compatibility verification

### After Execution
- ✅ **Completion Verification**: All acceptance criteria validated
- ✅ **File Updates**: CARL file marked complete with proper timestamps
- ✅ **Hook Processing**: Completion automatically handled by hook system
- ✅ **Session Recording**: Execution details recorded for project tracking

## Advanced Features

### Parallel Execution (Epic/Feature Level)
- [ ] **Dependency Analysis**: Build dependency graph using topological sort
- [ ] **Layer Calculation**: Group independent items for parallel processing
- [ ] **Execution Coordination**: Sequential execution of dependent items

### Auto-Planning Integration
- [ ] **Gap Detection**: Identify missing child items (stories for features, etc.)
- [ ] **Standard Mode**: Auto-invoke `/carl:plan --from [work-item]` for missing breakdown
- [ ] **YOLO Mode**: Skip planning, implement gaps directly with debt tracking

### Context-Aware Execution
- [ ] **Requirements Integration**: Load full project context and architectural patterns
- [ ] **Constraint Awareness**: Respect project coding standards and patterns
- [ ] **Pattern Matching**: Follow established implementation patterns from codebase

Remember: Task execution is the core implementation workflow. Quality validation and dependency management prevent technical debt while maintaining development velocity. Use YOLO mode judiciously for appropriate rapid prototyping scenarios.