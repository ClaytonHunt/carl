---
allowed-tools: Task(carl-backend-analyst), Task(carl-frontend-analyst), Task(carl-architecture-analyst), Task(carl-requirements-analyst), Task(carl-debt-analyst), Read, Write, Edit, MultiEdit, Bash, Glob, Grep
description: Execute development tasks with intelligent work suggestions and comprehensive CARL context integration
argument-hint: [task description] | --from-intent [file] | --fix-debt [item] | --tdd | --continue | --next | --suggest
---

# CARL Intelligent Task Execution

Streamlined task execution with intelligent work management and comprehensive CARL context integration.

## Task Modes

**Intelligent Work Suggestions**: No arguments or flags → Show smart task recommendations
**Direct Task Execution**: Task description provided → Execute with full CARL context
**Flag-Based Operations**: 
- `--continue` → Resume current active substep
- `--next` → Show next logical task in workflow
- `--suggest` → Comprehensive suggestion menu
- `--from-intent [file]` → Direct implementation from CARL intent
- `--tdd` → Enhanced Test-Driven Development workflow
- `--fix-debt [item]` → Technical debt focused execution

## Workflow Execution

**For Intelligent Suggestions:**
1. **Load Active Work Context**: Read master process, active work queue, and intelligent suggestions
2. **Present Smart Recommendations**: Context-aware task suggestions with reasoning and time estimates
3. **Handle User Selection**: Load selected task context and proceed with execution

**For Direct Tasks:**
1. **Load CARL Context**: Search related intent/state/context files for task requirements
2. **Alignment Validation**: Validate task alignment against project vision (if available)
3. **Deploy Specialists**: Launch appropriate analysts based on task requirements
4. **Execute with Context**: Apply TDD, follow patterns, respect constraints, update progress

**For Flag Operations:**
```
Load workflow from .carl/system/workflows/task.workflow.carl
Apply specific flag-based execution pattern
Integrate with active work tracking and session management
```

## Implementation

Execute tasks with intelligent work queue management:
- Detect task mode from arguments and flags
- Load comprehensive CARL context for execution
- Apply workflow enforcement and validation
- Deploy contextual specialists as needed
- Update state files and active work progress
- Ensure quality standards and requirements traceability

Link to detailed workflow: `.carl/system/workflows/task.workflow.carl` (when needed)