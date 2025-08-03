---
description: Intelligent CARL work execution with dependency analysis and scope handling
argument-hint: [work-item.carl] or [work-item-name]
allowed-tools: Task, Read, Write, Glob, Grep, LS, MultiEdit, Bash, TodoWrite
---

# CARL Task Execution Command

You are implementing intelligent work execution for the CARL system with context-aware dependency handling.

## Current Context
- **Project Structure**: `.carl/project/` directory structure
- **Active Work**: @.carl/project/active.work.carl (if exists)  
- **Arguments**: $ARGUMENTS

## Command Modes

### Direct Execution (Story/Technical Items)
For ready-to-implement work items:
1. **Load Work Item**: Read the specified CARL file
2. **Validate Dependencies**: Ensure all dependencies are completed
3. **Context Integration**: Load full project context and requirements
4. **TDD Enforcement**: Implement Red-Green-Refactor when TDD enabled
5. **Progress Tracking**: Update work item status throughout execution
6. **Quality Gates**: Run tests, validation, and completion checks
7. **Completion Handling**: Mark complete and trigger hook system

### Feature Execution (Multiple Stories)
When executing features with child stories:
1. **Child Discovery**: Find all stories belonging to the feature
2. **Dependency Analysis**: Build dependency graph using topological sort
3. **Execution Planning**: Calculate parallel execution layers
4. **Layer Execution**: Run independent stories in parallel, dependent stories sequentially
5. **Feature Validation**: Verify all stories complete and feature objectives met

### Epic Execution (Multiple Features)
When executing epics with child features:
1. **Feature Inventory**: Identify all features belonging to the epic
2. **Completeness Check**: Verify each feature has necessary child stories
3. **Mixed Mode Handling**:
   - Complete features: Execute using Feature Execution workflow
   - Incomplete features: Auto-invoke `/carl:plan --from [feature]` first
4. **Epic Orchestration**: Coordinate feature completion toward epic objectives

### Auto-Planning Integration
When missing breakdown detected:
1. **Gap Detection**: Identify missing child items (stories for features, features for epics)
2. **Auto-Plan Invocation**: Call `/carl:plan --from [work-item]` to create missing breakdown
3. **Execution Transition**: Switch to appropriate execution workflow once planning complete

## Dependency Analysis Implementation

### Discovery Process
```bash
# Find child items
find_child_stories() {
    local parent_feature="$1"
    local feature_id=$(basename "$parent_feature" .feature.carl)
    find ".carl/project/stories" -name "*.story.carl" -exec grep -l "parent_feature: $feature_id" {} \;
}

find_child_features() {
    local parent_epic="$1" 
    local epic_id=$(basename "$parent_epic" .epic.carl)
    find ".carl/project/features" -name "*.feature.carl" -exec grep -l "parent_epic: $epic_id" {} \;
}
```

### Topological Sort for Execution Order
```bash
# Calculate execution layers for parallel processing
calculate_execution_layers() {
    # Group work items by dependency depth
    # Layer 0: No dependencies (execute in parallel)
    # Layer 1: Depends only on Layer 0 items (execute in parallel after Layer 0)
    # Layer N: Execute after all previous layers complete
}
```

### Parallel Execution Strategy
- **Independent Items**: Execute simultaneously using background processes
- **Dependent Items**: Execute in topological order (sequential)
- **Mixed Dependencies**: Group into parallel batches by dependency layer

## Work Item Resolution

### Argument Processing
Handle flexible work item specification:
```bash
# Direct file path
/carl:task .carl/project/stories/user-login.story.carl

# Work item name (search for matching file)
/carl:task user-login.story
/carl:task user-login

# Auto-detect scope from name
/carl:task implement-authentication  # Find matching CARL file
```

### File Location Logic
1. **Exact Path**: Use provided path if valid CARL file
2. **Name Search**: Search all scope directories for matching name
3. **Scope Detection**: Try different extensions (.story.carl, .feature.carl, .tech.carl, .epic.carl)
4. **Fuzzy Matching**: Find closest match if exact name not found

## Execution Workflow

### Context Loading
Load comprehensive execution context:
- Work item requirements and acceptance criteria
- Project architectural patterns and constraints  
- Related work items and dependencies
- TDD settings from process.carl
- Quality gates and completion criteria

### Progress Tracking Integration
Update work item status in real-time:
```yaml
status: in_progress
progress_percentage: 45
current_phase: "implementation"
last_updated: "2024-01-15T14:30:00Z"
implementation_notes:
  - started: "2024-01-15T14:00:00Z"
  - phase: "API endpoint creation"
  - next: "Add validation and tests"
```

### TDD Enforcement
When TDD enabled in process.carl:
1. **Red Phase**: Write failing tests first
2. **Green Phase**: Implement minimal code to pass tests
3. **Refactor Phase**: Improve code quality while maintaining tests
4. **Validation**: Ensure full test coverage and quality standards

### Quality Gates
Automated validation at each phase:
- **Syntax**: Code compiles/parses correctly
- **Tests**: All tests pass including new functionality
- **Coverage**: Meets minimum coverage requirements
- **Standards**: Follows project coding standards
- **Integration**: Works with existing system components

## Completion and Validation

### Story/Technical Completion
1. **Acceptance Criteria**: Verify all criteria met
2. **Test Validation**: Ensure comprehensive test coverage
3. **Integration Testing**: Verify compatibility with existing system
4. **Documentation**: Update relevant documentation
5. **Status Update**: Mark as completed with completion timestamp

### Feature Completion  
1. **Child Story Verification**: All child stories completed
2. **Feature Integration**: Overall feature functions as designed
3. **Feature Testing**: End-to-end feature validation
4. **Business Value**: Confirm feature delivers intended value

### Epic Completion
1. **Feature Verification**: All child features completed
2. **Epic Integration**: Overall epic achieves strategic objectives
3. **Epic Validation**: Comprehensive testing across all features
4. **Strategic Value**: Confirm epic delivers business goals

## Error Handling

### Dependency Failures
- **Blocking Dependencies**: Stop execution, report required dependencies
- **Circular Dependencies**: Fail fast with clear cycle description
- **Missing Dependencies**: Attempt cross-scope search, fail if not found

### Execution Failures
- **Test Failures**: Stop execution, provide clear failure details
- **Quality Gate Failures**: Block completion, provide improvement guidance
- **Integration Failures**: Roll back changes, report integration issues

### Recovery Options
- **Retry**: Attempt execution again after fixes
- **Skip**: Continue with warning (dependencies may be affected)
- **Manual Override**: Mark complete with warning (use sparingly)

## Integration Points

### Hook System Integration
Leverage existing CARL hooks:
- **Progress Tracking**: Automatic status updates via progress-track.sh
- **Completion Handling**: Automatic completion via completion-handler.sh  
- **Schema Validation**: Ensure CARL file integrity via schema-validate.sh

### Agent System Integration
Use specialized agents when needed:
- **carl-requirements-analyst**: For auto-planning of missing breakdowns
- **Project-specific agents**: For domain-specific implementation guidance

## Usage Examples

```bash
# Execute a specific story
/carl:task user-registration.story.carl

# Execute by name (auto-resolve)
/carl:task user-registration

# Execute a feature (with dependency analysis)
/carl:task authentication.feature.carl

# Execute an epic (with mixed planning/execution)
/carl:task user-management.epic.carl
```

## Quality Standards

### Before Execution
- ✅ **Valid Work Item**: File exists and schema-compliant
- ✅ **Dependencies Met**: All required dependencies completed
- ✅ **Context Complete**: Full requirements and constraints loaded
- ✅ **Environment Ready**: Development environment properly configured

### During Execution  
- ✅ **Progress Updates**: Real-time status tracking in work item
- ✅ **TDD Compliance**: Follow Red-Green-Refactor when enabled
- ✅ **Quality Gates**: Pass all validation checkpoints
- ✅ **Integration Testing**: Verify compatibility throughout

### After Execution
- ✅ **Completion Verification**: All acceptance criteria met
- ✅ **Test Coverage**: Comprehensive test validation
- ✅ **Documentation**: Updated relevant documentation
- ✅ **Hook Integration**: Completion properly recorded via hooks

## Error Prevention

- ❌ Never execute work items with unmet dependencies
- ❌ Never skip quality gates or TDD requirements
- ❌ Never mark items complete without proper validation
- ❌ Never proceed with circular dependency chains
- ✅ Always validate work items before execution
- ✅ Always track progress and handle failures gracefully
- ✅ Always maintain data integrity and schema compliance
- ✅ Always provide clear error messages and recovery guidance

Remember: Intelligent execution prevents technical debt. Comprehensive dependency analysis and quality gates ensure reliable, maintainable code delivery.