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
- **Execution Mode**: Check for `--yolo` flag in arguments

## Yolo Mode Detection

### Check for --yolo Flag
Parse $ARGUMENTS for `--yolo` flag:
- If present: Set EXECUTION_MODE="yolo" (ephemeral - this execution only)
- If absent: Set EXECUTION_MODE="standard"
- Remove flag from work item path/name parsing

### Yolo Mode Warnings
When yolo mode detected, display:
```
🚀 YOLO MODE ACTIVATED
⚠️  Rapid prototyping - will skip breakdown requirements
📝 Technical debt will be tracked automatically
```

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
   - Incomplete features: Auto-invoke `/carl:plan --from [feature]` first (unless --yolo)
4. **Epic Orchestration**: Coordinate feature completion toward epic objectives

#### Yolo Mode Epic Execution
When --yolo flag is present:
1. **Gap Analysis**: Identify existing vs missing breakdowns
2. **Hybrid Execution**:
   - Execute existing features/stories normally
   - Yolo-implement missing features
   - Yolo-implement incomplete features (missing stories)
3. **Coverage Reporting**: Show % structured vs % yolo
4. **Debt Creation**: Auto-create technical debt items for gaps

### Auto-Planning Integration
When missing breakdown detected:
1. **Gap Detection**: Identify missing child items (stories for features, features for epics)
2. **Mode-Based Handling**:
   - Standard Mode: Call `/carl:plan --from [work-item]` to create missing breakdown
   - Yolo Mode: Skip planning, implement gaps directly
3. **Execution Transition**: 
   - Standard: Switch to appropriate execution workflow once planning complete
   - Yolo: Proceed with hybrid execution immediately

### Yolo Gap Analysis
When --yolo flag present and gaps detected:
```yaml
# Example gap analysis output
gap_analysis:
  work_item: "user-auth.epic.carl"
  total_expected_features: 3
  existing_features: 
    - login.feature.carl (complete - 3 stories)
    - registration.feature.carl (incomplete - 0 stories)
  missing_features:
    - password-reset (will be yolo'd)
  coverage:
    structured: "33%"  # 1 complete feature out of 3
    yolo: "67%"       # 2 features need yolo
```

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

# Yolo mode execution
/carl:task user-auth.epic.carl --yolo
/carl:task payment.feature.carl --yolo
```

### Yolo Mode User Interaction
When --yolo detected with epic/feature:

#### 1. Gap Analysis Display
```
🔍 Analyzing 'user-auth' epic structure...

📊 Breakdown Analysis:
✅ login.feature.carl (complete: 3/3 stories)
⚠️  registration.feature.carl (incomplete: 0 stories)
❌ password-reset (missing feature)

📈 Coverage: 33% structured, 67% will be yolo'd

⚠️  YOLO MODE will:
- Execute login feature normally (structured)
- Yolo implement registration feature
- Yolo implement password-reset functionality
- Create 2 technical debt items

Proceed with hybrid yolo execution? (y/N): 
```

#### 2. Confirmation Required
- User must explicitly confirm yolo execution
- Default is NO to prevent accidental yolo
- Clear explanation of what will happen

### File Location Logic
1. **Exact Path**: Use provided path if valid CARL file
2. **Name Search**: Search all scope directories for matching name
3. **Scope Detection**: Try different extensions (.story.carl, .feature.carl, .tech.carl, .epic.carl)
4. **Fuzzy Matching**: Find closest match if exact name not found
5. **Flag Extraction**: Remove --yolo from path before resolution

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
When TDD enabled in process.carl (skipped in yolo mode):
1. **Red Phase**: Write failing tests first
2. **Green Phase**: Implement minimal code to pass tests
3. **Refactor Phase**: Improve code quality while maintaining tests
4. **Validation**: Ensure full test coverage and quality standards

### Yolo Mode Execution
When --yolo flag active:
1. **Skip TDD**: Direct implementation allowed
2. **Relaxed Gates**: Basic syntax/integration checks only
3. **Fast Progress**: 25/50/75/100% milestones
4. **Debt Tracking**: Auto-create tech debt items

### Quality Gates
Automated validation at each phase:

#### Standard Mode:
- **Syntax**: Code compiles/parses correctly
- **Tests**: All tests pass including new functionality
- **Coverage**: Meets minimum coverage requirements
- **Standards**: Follows project coding standards
- **Integration**: Works with existing system components

#### Yolo Mode:
- **Syntax**: Code compiles/parses correctly ✅
- **Tests**: Run if exist, but don't block ⚠️
- **Coverage**: Not enforced ❌
- **Standards**: Best effort ⚠️
- **Integration**: Basic compatibility check ✅

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
1. **Feature Verification**: All child features completed (or yolo'd)
2. **Epic Integration**: Overall epic achieves strategic objectives
3. **Epic Validation**: Comprehensive testing across all features
4. **Strategic Value**: Confirm epic delivers business goals

### Yolo Mode Completion
When work item completed via yolo:
1. **Debt Item Creation**: Auto-generate technical debt CARL files
2. **Gap Documentation**: Record what was yolo'd vs structured
3. **Session Tracking**: Mark execution as yolo mode
4. **Completion Notes**: Add yolo metadata to work item

#### Technical Debt Auto-Creation
For each yolo'd gap, create:
```yaml
# .carl/project/technical/[parent]-yolo-debt.tech.carl
title: "Formalize [Feature/Story] Breakdown"
description: "[Work item] was implemented via yolo mode. Needs proper breakdown."
priority: medium
tags: ["yolo-debt", "planning-needed"]
yolo_metadata:
  parent_item: "[parent].carl"
  yolo_date: "2024-01-15T10:00:00Z"
  execution_mode: "yolo"
  gap_type: "missing-breakdown"
acceptance_criteria:
  - Create proper story/feature breakdown
  - Review implementation for refactoring needs
  - Add comprehensive tests if missing
  - Update documentation
```

## Error Handling

### Dependency Failures
- **Blocking Dependencies**: Stop execution, report required dependencies
- **Circular Dependencies**: Fail fast with clear cycle description
- **Missing Dependencies**: Attempt cross-scope search, fail if not found

### Execution Failures

#### Standard Mode:
- **Test Failures**: Stop execution, provide clear failure details
- **Quality Gate Failures**: Block completion, provide improvement guidance
- **Integration Failures**: Roll back changes, report integration issues

#### Yolo Mode:
- **Test Failures**: Log but continue execution ⚠️
- **Quality Gate Failures**: Log as technical debt, continue
- **Integration Failures**: Still block (must maintain system stability)

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
- **Session Tracking**: Record yolo execution in session files

#### Yolo Mode Session Tracking
Session file will record:
```yaml
commands:
  - command: "task"
    arguments: "user-auth.epic.carl --yolo"
    timestamp: "2024-01-15T10:00:00Z"
    execution_details:
      mode: "hybrid-yolo"
      work_item: "user-auth.epic.carl"
      structured_items:
        - "login.feature.carl (3 stories)"
      yolo_items:
        - "registration.feature.carl (no stories)"
        - "password-reset (missing)"
      coverage:
        structured: "33%"
        yolo: "67%"
      debt_created:
        - "registration-yolo-debt.tech.carl"
        - "password-reset-yolo-debt.tech.carl"
```

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

# Execute an epic (standard - requires breakdown)
/carl:task user-management.epic.carl

# Execute an epic in yolo mode (rapid prototype)
/carl:task user-management.epic.carl --yolo

# Execute incomplete feature in yolo mode
/carl:task payment-processing.feature.carl --yolo
```

## Quality Standards

### Before Execution
- ✅ **Valid Work Item**: File exists and schema-compliant
- ✅ **Dependencies Met**: All required dependencies completed
- ✅ **Context Complete**: Full requirements and constraints loaded
- ✅ **Environment Ready**: Development environment properly configured

### During Execution  
- ✅ **Progress Updates**: Real-time status tracking in work item
- ✅ **TDD Compliance**: Follow Red-Green-Refactor when enabled (skip in yolo)
- ✅ **Quality Gates**: Pass all validation checkpoints (relaxed in yolo)
- ✅ **Integration Testing**: Verify compatibility throughout

### After Execution
- ✅ **Completion Verification**: All acceptance criteria met
- ✅ **Test Coverage**: Comprehensive test validation
- ✅ **Documentation**: Updated relevant documentation
- ✅ **Hook Integration**: Completion properly recorded via hooks

## Error Prevention

### Standard Mode:
- ❌ Never execute work items with unmet dependencies
- ❌ Never skip quality gates or TDD requirements
- ❌ Never mark items complete without proper validation
- ❌ Never proceed with circular dependency chains
- ✅ Always validate work items before execution
- ✅ Always track progress and handle failures gracefully
- ✅ Always maintain data integrity and schema compliance
- ✅ Always provide clear error messages and recovery guidance

### Yolo Mode:
- ⚠️ Skip breakdown requirements but track as debt
- ⚠️ Relax quality gates but maintain integration safety
- ❌ Never compromise system stability or security
- ❌ Never execute without user confirmation
- ✅ Always create technical debt items for gaps
- ✅ Always record yolo execution in session tracking
- ✅ Always maintain CARL file schema compliance
- ✅ Always provide clear yolo vs structured execution summary

## Yolo Mode Best Practices

### When to Use Yolo:
- 🚀 **Rapid Prototyping**: Exploring feasibility or building MVPs
- ⏰ **Time-Boxed Work**: Hackathons, demos, urgent fixes
- 👤 **Solo Development**: When you're the only developer
- 🔬 **Exploratory Coding**: Learning problem space before formal planning
- 📦 **Small Features**: When breakdown would be overkill

### When NOT to Use Yolo:
- 👥 **Team Development**: Multiple developers need coordination
- 🏢 **Production Systems**: Critical business functionality
- 📋 **Complex Features**: High interdependency or integration risk
- 🔒 **Security-Critical**: Authentication, authorization, data handling
- 📊 **Long-Term Projects**: Where maintainability is key

### Yolo Mode Limitations:
- **Ephemeral**: Only affects single execution, no persistence
- **Technical Debt**: Creates cleanup work for later
- **Reduced Traceability**: Less detailed progress tracking
- **Quality Trade-offs**: Relaxed standards increase risk
- **Team Coordination**: Other developers won't have detailed breakdown

Remember: Yolo mode is a tool for specific situations. Default to structured execution for sustainable development. Intelligent execution prevents technical debt - use yolo judiciously.