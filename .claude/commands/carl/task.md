---
allowed-tools: Task(carl-backend-analyst), Task(carl-frontend-analyst), Task(carl-architecture-analyst), Task(carl-requirements-analyst), Task(carl-debt-analyst), Read, Write, Edit, MultiEdit, Bash, Glob, Grep
description: Execute development tasks with intelligent work suggestions and comprehensive CARL context integration
argument-hint: [task description] | --from-intent [file] | --fix-debt [item] | --tdd | --continue | --next | --suggest
---

# CARL Intelligent Task Execution Instructions

Execute development tasks with intelligent work queue management and full CARL (Context-Aware Requirements Language) context by:

## 1. Intelligent Work Suggestion (When No Task Provided)

**A. Check for Empty or Suggestion Arguments**
If `$ARGUMENTS` is empty, contains only flags (--continue, --next, --suggest), or is unclear:

1. **Load Active Work Context**:
   - Read `.carl/system/master.process.carl` for authoritative task execution workflow
   - Read `.carl/project/active.work.carl` for current work queue status
   - Load active intent progress and current substep
   - Check ready_for_work queue for available tasks
   - Review intelligent_suggestions for next logical tasks
   - Follow `carl_task` workflow sequence from master process definition

2. **Present Intelligent Suggestions**:
   ```
   CARL Task Assistant 🎯
   
   Current Context: [ACTIVE_INTENT_NAME] ([COMPLETION]% complete)
   Current Phase: [CURRENT_PHASE]
   
   Based on your work patterns and current progress, here are my suggestions:
   
   🔥 Continue Current Work:
   1. [CURRENT_SUBSTEP_DESCRIPTION] (Est: [TIME])
      ↳ You were working on this in your last session
   
   ⚡ Next Logical Tasks:
   2. [NEXT_LOGICAL_TASK] (Est: [TIME])
      ↳ [REASONING_FOR_SUGGESTION]
   3. [ALTERNATIVE_TASK] (Est: [TIME])
      ↳ [REASONING_FOR_SUGGESTION]
   
   📋 Available from Queue:
   4. [QUEUED_TASK_1] (Priority: [PRIORITY], Est: [TIME])
   5. [QUEUED_TASK_2] (Priority: [PRIORITY], Est: [TIME])
   
   🚀 Quick Wins:
   6. [QUICK_WIN_TASK] (Est: [TIME])
      ↳ Small task to build momentum
   
   Which task would you like to work on?
   Or describe what you'd like to do: [Wait for user input]
   ```

3. **Handle User Selection**:
   - If user selects numbered option, load that task context
   - If user provides new task description, proceed with normal workflow
   - If user wants to continue current work, load active substep context

**B. Flag-Based Suggestions**
- `--continue`: Automatically load and continue current active substep
- `--next`: Show next logical task in current epic/feature workflow
- `--suggest`: Show comprehensive suggestion menu as above

## 1B. Session State Integration and Active Work Updates

**CRITICAL ENHANCEMENT**: Integrate with session state persistence and active work tracking:

**Session State Management**:
```
# Task execution with session state tracking
execute_task_with_session_state() {
    // Load current session and active work context
    current_session = load_current_session_state()
    active_work = load_active_work_context()
    
    // Update active work status when starting task
    update_active_work_task_status("in_progress")
    
    // Execute task with full context integration
    execute_task_with_carl_context()
    
    // Update session state and active work progress
    update_session_progress_and_active_work()
}
```

**Active Work Integration**:
- Update `.carl/project/active.work.carl` when starting/completing tasks
- Track task progress in session context
- Maintain work queue status and intelligent suggestions
- Integrate with epic/feature completion tracking

## 2. Load CARL Context for Task
Automatic context loading based on `$ARGUMENTS`:
- **Search Related Files**: Find `.intent.carl`, `.state.carl`, and `.context.carl` files related to task
- **Load Requirements**: Extract constraints, success criteria, and business rules from CARL files
- **Check Dependencies**: Identify affected components and integration points
- **Assess Current State**: Load implementation progress and technical debt from state files

## 2. Select Implementation Approach
Based on task type and arguments:
- **Feature Implementation**: Use TDD with comprehensive test coverage
- **Bug Fixes**: Focus on root cause analysis and regression prevention
- **Technical Debt**: Apply refactoring with quality improvements
- **--tdd Flag**: Enhanced Test-Driven Development workflow
- **--from-intent**: Direct implementation from CARL intent file

## 3. Launch Contextual Specialists
Deploy appropriate CARL specialists based on task requirements:

**For Backend Tasks:**
- Task: carl-backend-analyst → "Provide API implementation context and data requirements for: $ARGUMENTS"
- Task: carl-architecture-analyst → "Ensure service integration compliance for: $ARGUMENTS"

**For Frontend Tasks:**
- Task: carl-frontend-analyst → "Supply UI/UX requirements and component patterns for: $ARGUMENTS"
- Task: carl-requirements-analyst → "Extract user journey and interaction requirements for: $ARGUMENTS"

**For Technical Debt:**
- Task: carl-debt-analyst → "Analyze refactoring approach and quality improvements for: $ARGUMENTS"
- Task: carl-architecture-analyst → "Assess architectural impact and consistency for: $ARGUMENTS"

## 4. Apply Test-Driven Development (TDD)
When implementing features, follow Red-Green-Refactor cycle:

**RED Phase**: Write failing test with CARL context
- Use security constraints from CARL intent files
- Apply performance criteria from success criteria
- Include integration requirements from context files
- Define expected behavior from business rules

**GREEN Phase**: Write minimal passing implementation
- Use existing components identified in CARL context
- Follow integration patterns from CARL analysis
- Implement just enough to satisfy failing tests

**REFACTOR Phase**: Improve with CARL quality standards
- Apply security patterns from CARL requirements
- Follow architectural patterns from context files
- Add proper error handling and logging
- Optimize performance to meet CARL criteria

## 5. Implement with CARL Context
Generate implementation using loaded CARL context:
- **Follow Existing Patterns**: Use established code conventions from project analysis
- **Respect Constraints**: Implement within security, performance, and business constraints
- **Integrate Properly**: Connect with existing components and services correctly
- **Meet Quality Standards**: Achieve test coverage and code quality requirements
- **Document Changes**: Update relevant CARL state files with implementation progress

## 6. Update CARL State Files and Active Work
Continuously track implementation progress:
- **Update State Files**: Record completed components and test coverage
- **Track Quality Metrics**: Update code quality and performance measurements  
- **Document Technical Debt**: Note any debt introduced or resolved
- **Update Active Work**: Mark current task progress in `.carl/project/active.work.carl`
- **Record Session Context**: Maintain implementation notes and next steps
- **Link to Intent**: Ensure traceability to original requirements
- **Queue Next Tasks**: Add discovered follow-up work to ready_for_work queue

## 7. Validate Implementation Quality
Ensure implementation meets CARL standards:
- **Run All Tests**: Verify test suite passes with new implementation
- **Check Coverage**: Ensure test coverage meets CARL quality requirements
- **Validate Integration**: Confirm proper integration with existing systems
- **Security Review**: Verify security constraints from CARL intent files are met
- **Performance Check**: Validate performance criteria are achieved

## Example Usage

**Intelligent Work Suggestions:**
- `/carl:task` → Shows intelligent suggestions based on active work and queue
- `/carl:task --continue` → Automatically continues current active substep
- `/carl:task --next` → Shows next logical task in current workflow
- `/carl:task --suggest` → Comprehensive suggestion menu with context

**Direct Task Execution:**
- `/carl:task "implement user dashboard"` → Auto-loads relevant CARL context
- `/carl:task --from-intent user-profile.intent.carl` → Direct implementation from CARL file
- `/carl:task --tdd "shopping cart logic"` → Enhanced TDD workflow
- `/carl:task --fix-debt authentication-complexity` → Technical debt focus

**Interactive Example:**
```
> /carl:task

CARL Task Assistant 🎯

Current Context: Requirements-Driven Workflow (35% complete)
Current Phase: foundation

Based on your work patterns and current progress, here are my suggestions:

🔥 Continue Current Work:
1. Complete example intent/state context files (Est: 30 min)
   ↳ You were working on this in your last session

⚡ Next Logical Tasks:
2. Update /carl:plan for interactive workflow (Est: 2 hours)
   ↳ Next critical path item after foundation
3. Create format specifications for new files (Est: 1 hour)
   ↳ Needed for template validation and tooling

📋 Available from Queue:
4. Interactive Planning System (Priority: high, Est: 4 hours)
5. Intelligent Task Management (Priority: high, Est: 4 hours)

🚀 Quick Wins:
6. Update documentation for new structure (Est: 30 min)
   ↳ Small task to build momentum

Which task would you like to work on?
Or describe what you'd like to do: > 1

Loading context for: Complete example intent/state context files...
[Proceeds with task execution]
```

Execute development tasks with intelligent work queue management and perfect CARL context integration, ensuring implementation aligns with requirements, constraints, and quality standards while maintaining comprehensive progress tracking.

---

**Link to detailed workflow:** `.carl/system/workflows/task.workflow.carl` (when needed)

