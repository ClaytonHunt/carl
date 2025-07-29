---
allowed-tools: Task(carl-backend-analyst), Task(carl-frontend-analyst), Task(carl-architecture-analyst), Task(carl-requirements-analyst), Task(carl-debt-analyst), Read, Write, Edit, MultiEdit, Bash, Glob, Grep
description: Execute development tasks with comprehensive CARL context integration
argument-hint: [task description] | --from-intent [file] | --fix-debt [item] | --tdd
---

# CARL Task Execution Instructions

Execute development tasks with full CARL (Context-Aware Requirements Language) context by:

## 1. Load CARL Context for Task
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

## 6. Update CARL State Files
Continuously track implementation progress:
- **Update State Files**: Record completed components and test coverage
- **Track Quality Metrics**: Update code quality and performance measurements  
- **Document Technical Debt**: Note any debt introduced or resolved
- **Record Session Context**: Maintain implementation notes and next steps
- **Link to Intent**: Ensure traceability to original requirements

## 7. Validate Implementation Quality
Ensure implementation meets CARL standards:
- **Run All Tests**: Verify test suite passes with new implementation
- **Check Coverage**: Ensure test coverage meets CARL quality requirements
- **Validate Integration**: Confirm proper integration with existing systems
- **Security Review**: Verify security constraints from CARL intent files are met
- **Performance Check**: Validate performance criteria are achieved

## Example Usage
- `/carl:task "implement user dashboard"` → Auto-loads relevant CARL context
- `/carl:task --from-intent user-profile.intent.carl` → Direct implementation from CARL file
- `/carl:task --tdd "shopping cart logic"` → Enhanced TDD workflow
- `/carl:task --fix-debt authentication-complexity` → Technical debt focus

Execute development tasks with perfect CARL context integration, ensuring implementation aligns with requirements, constraints, and quality standards while maintaining comprehensive progress tracking.

