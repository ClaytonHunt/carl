---
allowed-tools: Task(carl-requirements-analyst), Read, Write, Glob, Grep
description: Interactive CARL planning with context gathering and expert analysis
argument-hint: [requirement description] | --from-intent [file] | --details [file] | --epic | --feature | --story | --technical
---

# CARL Interactive Planning

🚨 **MANDATORY WORKFLOW ENFORCEMENT** 🚨

## ⚠️ CRITICAL RULES - NEVER DEVIATE

**MANDATORY**: For new requirements - ASK QUESTIONS ONE AT A TIME before any analysis
**MANDATORY**: Wait for user response to each question before proceeding
**MANDATORY**: NO analysis until ALL questions answered and context compiled

## Planning Modes

**New Requirement Planning**: Ask context questions ONE AT A TIME → Pass to requirements analyst
**Existing Intent Operations**: 
- `--from-intent [name]` → Breakdown or modify existing intent
- `--details [name]` → Explain intent with work planned/completed

## 🔒 ENFORCED WORKFLOW EXECUTION

**For New Requirements - MANDATORY SEQUENCE:**
1. **MANDATORY**: Ask ONE question, wait for response
2. **MANDATORY**: Ask next question based on previous answer, wait for response  
3. **MANDATORY**: Continue one-at-a-time until context complete
4. **MANDATORY**: Only after ALL answers collected → invoke analyst

**MANDATORY Questions (ask ONE at a time):**
- Question 1: "What specific outcome or capability should this deliver?"
- Question 2: "Who are the primary users/stakeholders?" 
- Question 3: "What constraints or requirements must we consider?"
- Question 4: "How will we know this is successful?"

**MANDATORY**: After ALL questions answered → Task: carl-requirements-analyst with COMPLETE context

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