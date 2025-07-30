---
allowed-tools: Task(carl-requirements-analyst), Read, Write, Glob, Grep
description: Interactive CARL planning with context gathering and expert analysis
argument-hint: [requirement description] | --from-intent [file] | --details [file] | --epic | --feature | --story | --technical
---

# CARL Interactive Planning

Streamlined requirements gathering and expert analysis for CARL project planning.

## Planning Modes

**New Requirement Planning**: Ask context questions → Pass to requirements analyst
**Existing Intent Operations**: 
- `--from-intent [name]` → Breakdown or modify existing intent
- `--details [name]` → Explain intent with work planned/completed

## Workflow Execution

**For New Requirements:**
1. **Initialize Planning Session**: `carl_initialize_planning_session(user_input)` - Detect scope level and load project context for informed questioning
2. **Sequential Question Gathering**: Execute question workflow one at a time, waiting for responses:
   - `carl_ask_business_value_question_and_wait()`
   - `carl_ask_stakeholders_question_informed_by_previous_answers()`
   - `carl_ask_constraints_question_informed_by_context()`
   - `carl_ask_success_criteria_question_with_full_context()`
   - `carl_ask_dependencies_question_with_complete_picture()`
3. **Complete Context Analysis**: `carl_compile_all_answers_with_initial_input()` → Validate requirements completeness → Task: carl-requirements-analyst with COMPLETE context only

**For Existing Intents:**
```
Load intent from .carl/project/{epics|features|stories|technical}/[name].intent.carl
if (scope_level > user_story):
    offer_breakdown_options()
else:
    offer_modification_options()
```

**For Details:**
```
Load intent + state files
Explain: purpose, scope, completion status, next actions
```

## Implementation

Execute pseudocode function-based workflow with session state persistence:
- `carl_initialize_planning_session(user_input)` → Load project context, detect scope
- `carl_execute_sequential_questioning()` → ONE question at a time with session persistence
- `carl_compile_complete_context()` → All answers + initial input before analysis
- `carl_invoke_analyst_with_complete_context()` → NO analysis in vacuum
- `carl_generate_files_and_update_state()` → Create intent files, update active work

**Session State Management**: Persist question-answer state between interactions using `.carl/.tmp/planning_session_[timestamp].json` for incomplete sessions

**Critical Rule**: Requirements analyst is ONLY invoked after ALL questions answered and context compilation validated

Link to detailed workflow: `.carl/system/workflows/plan.workflow.carl` (when needed)