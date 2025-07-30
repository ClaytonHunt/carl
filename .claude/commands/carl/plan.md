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
1. **Context Gathering**: Review any input the user may have given. Ask 2-3 focused questions about goal, stakeholders, constraints. Ask questions one at a time to avoid overwhelming the user.
2. **Expert Analysis**: Task: carl-requirements-analyst → "Complete CARL analysis for: [USER_CONTEXT]. Include scope, business value, technical approach, and generate appropriate .intent.carl file."

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

Execute streamlined workflow with token-efficient context gathering:
- Detect scope from keywords or arguments
- Ask minimal essential questions for context
- Compile complete context for analyst
- Generate appropriate CARL files based on analysis
- Update active work queue

Link to detailed workflow: `.carl/system/workflows/plan.workflow.carl` (when needed)