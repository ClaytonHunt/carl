---
allowed-tools: Task(carl-requirements-analyst), Task(carl-architecture-analyst), Task(carl-backend-analyst), Task(carl-frontend-analyst), Task(carl-debt-analyst), Read, Write, Glob, Grep
description: Interactive CARL planning with expert requirements analysis and guided template generation
argument-hint: [requirement description] | --from-intent [file] | --epic | --feature | --story | --technical
---

# CARL Interactive Planning Instructions

Generate comprehensive CARL (Context-Aware Requirements Language) planning files through interactive requirements gathering:

## 1. Determine Planning Mode

**A. New Requirement Planning**
If `$ARGUMENTS` contains a requirement description:
- **Epic keywords**: "system", "platform", "complete", "entire" → Epic-scale planning
- **Feature keywords**: "feature", "capability", "functionality" → Feature-scale planning  
- **Story keywords**: "fix", "update", "modify", "add" → Story-scale planning
- **Technical keywords**: "refactor", "improve", "optimize" → Technical initiative planning

**B. Existing Intent Breakdown**
If `$ARGUMENTS` contains `--from-intent [file]`:
- Load existing intent file from `.carl/project/` hierarchy
- Analyze current breakdown level and completion status
- Offer breakdown options based on intent type and current state

## 2. Load CARL Project Context
Use existing CARL project files for context, following master process definition:
- Read `.carl/system/master.process.carl` for authoritative command workflow reference
- Read `.carl/index.carl` for project overview
- Read `.carl/project/process.carl` for development standards
- Search `.carl/project/` hierarchy for related existing intent files
- Follow `carl_plan` workflow sequence from master process definition
- Load `.carl/project/active.work.carl` for current work context
- Check state files for implementation status and dependencies

## 3. Sequential Interactive Requirements Gathering

**CRITICAL**: Ask ONE question at a time and wait for user response before proceeding. DO NOT continue to analyst phase until ALL questions are answered.

### Pseudocode Function Structure

```bash
# Main planning workflow
carl_plan_workflow() {
    local session_id="planning_$(date +%s)"
    local session_file="/tmp/carl_planning_${session_id}.state"
    
    # Phase 1: Initialize
    carl_initialize_planning_session "$session_file"
    
    # Phase 2: Sequential Gathering (ONE QUESTION AT A TIME)
    carl_ask_business_value_question "$session_file"
    carl_ask_stakeholder_question "$session_file" 
    carl_ask_constraints_question "$session_file"
    carl_ask_success_criteria_question "$session_file"
    carl_ask_dependencies_question "$session_file"
    
    # Phase 3: Analysis (ONLY after all questions answered)
    carl_compile_complete_context "$session_file"
    carl_launch_requirements_analyst_with_full_context "$session_file"
    
    # Phase 4: Generation
    carl_generate_intent_files_from_analysis
}
```

**For New Requirements:** Execute sequential questioning workflow:

**Step 1: Business Value Question**
```
CARL Planning Assistant 🎯

I detected this as a [SCOPE_LEVEL] level requirement.

**Question 1 of 5: What problem does this solve?** (Business Value)
Help me understand the core problem or opportunity this addresses.

> [WAIT FOR USER RESPONSE - DO NOT PROCEED UNTIL ANSWERED]
```

**Step 2: Stakeholder Question** (After Step 1 answered)
```
**Question 2 of 5: Who will use or benefit from this?** (Stakeholders)
Who are the primary users, stakeholders, or systems affected?

> [WAIT FOR USER RESPONSE - DO NOT PROCEED UNTIL ANSWERED]
```

**Step 3: Constraints Question** (After Step 2 answered)
```
**Question 3 of 5: What constraints or requirements exist?** (Constraints)
Are there technical, business, timeline, or resource constraints?

> [WAIT FOR USER RESPONSE - DO NOT PROCEED UNTIL ANSWERED]
```

**Step 4: Success Criteria Question** (After Step 3 answered)
```
**Question 4 of 5: How will we know it's successful?** (Success Criteria)
What measurable outcomes indicate this is working well?

> [WAIT FOR USER RESPONSE - DO NOT PROCEED UNTIL ANSWERED]
```

**Step 5: Dependencies Question** (After Step 4 answered)
```
**Question 5 of 5: What depends on this or what does this depend on?** (Dependencies)
Are there existing features, systems, or future work this relates to?

> [WAIT FOR USER RESPONSE - DO NOT PROCEED UNTIL ANSWERED]
```

**IMPORTANT**: Only proceed to analysis phase after ALL 5 questions have been answered and context is compiled.

### Implementation Functions

```bash
# Session state management functions
carl_initialize_planning_session() {
    local session_file="$1"
    echo "{
        \"session_id\": \"planning_$(date +%s)\",
        \"initial_input\": \"$ARGUMENTS\",
        \"detected_scope\": \"$(detect_scope_level)\",
        \"responses\": {},
        \"current_question\": 1,
        \"complete\": false
    }" > "$session_file"
}

carl_ask_business_value_question() {
    local session_file="$1"
    
    echo "CARL Planning Assistant 🎯"
    echo ""
    echo "I detected this as a $(get_detected_scope "$session_file") level requirement."
    echo ""
    echo "**Question 1 of 5: What problem does this solve?** (Business Value)"
    echo "Help me understand the core problem or opportunity this addresses."
    echo ""
    echo "> [Please provide your response, then run the command again to continue]"
    
    # Check if response provided via arguments
    if [[ "$RESPONSE" ]]; then
        save_response "business_value" "$RESPONSE" "$session_file"
        update_question_progress 2 "$session_file"
        carl_ask_stakeholder_question "$session_file"
    fi
}

carl_ask_stakeholder_question() {
    local session_file="$1"
    
    echo "**Question 2 of 5: Who will use or benefit from this?** (Stakeholders)"
    echo "Who are the primary users, stakeholders, or systems affected?"
    echo ""
    echo "> [Please provide your response, then run the command again to continue]"
    
    if [[ "$RESPONSE" ]]; then
        save_response "stakeholders" "$RESPONSE" "$session_file"
        update_question_progress 3 "$session_file"
        carl_ask_constraints_question "$session_file"
    fi
}

carl_ask_constraints_question() {
    local session_file="$1"
    
    echo "**Question 3 of 5: What constraints or requirements exist?** (Constraints)"
    echo "Are there technical, business, timeline, or resource constraints?"
    echo ""
    echo "> [Please provide your response, then run the command again to continue]"
    
    if [[ "$RESPONSE" ]]; then
        save_response "constraints" "$RESPONSE" "$session_file"
        update_question_progress 4 "$session_file"
        carl_ask_success_criteria_question "$session_file"
    fi
}

carl_ask_success_criteria_question() {
    local session_file="$1"
    
    echo "**Question 4 of 5: How will we know it's successful?** (Success Criteria)"
    echo "What measurable outcomes indicate this is working well?"
    echo ""
    echo "> [Please provide your response, then run the command again to continue]"
    
    if [[ "$RESPONSE" ]]; then
        save_response "success_criteria" "$RESPONSE" "$session_file"
        update_question_progress 5 "$session_file"
        carl_ask_dependencies_question "$session_file"
    fi
}

carl_ask_dependencies_question() {
    local session_file="$1"
    
    echo "**Question 5 of 5: What depends on this or what does this depend on?** (Dependencies)"
    echo "Are there existing features, systems, or future work this relates to?"
    echo ""
    echo "> [Please provide your response, then run the command again to continue]"
    
    if [[ "$RESPONSE" ]]; then
        save_response "dependencies" "$RESPONSE" "$session_file"
        mark_questions_complete "$session_file"
        carl_compile_complete_context "$session_file"
        carl_launch_requirements_analyst_with_full_context "$session_file"
    fi
}

# Helper functions
save_response() {
    local key="$1"
    local value="$2"
    local session_file="$3"
    
    # Update JSON with response (simplified - would need proper JSON handling)
    jq --arg key "$key" --arg value "$value" '.responses[$key] = $value' "$session_file" > "${session_file}.tmp"
    mv "${session_file}.tmp" "$session_file"
}

get_response() {
    local key="$1"
    local session_file="$2"
    jq -r ".responses.$key // \"\"" "$session_file"
}
```

**For Existing Intent Breakdown:** Present breakdown options:

```
Current Status: [INTENT_TYPE] with [COMPLETION_STATUS]
Breakdown Level: [CURRENT_LEVEL]

This [INTENT_TYPE] can be broken down further:
1. Break down into [CHILD_TYPE] (recommended)
2. Add parallel [SIBLING_TYPE] to parent
3. Review and update current requirements
4. Check implementation readiness

Which option would you like to pursue?
> [Wait for user selection]
```

## 4. Launch CARL Specialists with Complete Context

**CRITICAL CHANGE**: Only launch analysts AFTER all questions are answered and complete context is compiled.

**Context Compilation Before Analysis:**
```bash
# Compile complete context including all user responses
carl_compile_complete_context() {
    local session_file="$1"
    local complete_context="Initial Request: $ARGUMENTS

Business Value: $(get_response business_value "$session_file")
Stakeholders: $(get_response stakeholders "$session_file") 
Constraints: $(get_response constraints "$session_file")
Success Criteria: $(get_response success_criteria "$session_file")
Dependencies: $(get_response dependencies "$session_file")

Project Context: $(load_carl_project_context)"
    
    echo "$complete_context" > "${session_file}.complete"
}
```

**Enhanced Analysis with Full Context:**
- Task: carl-requirements-analyst → "Comprehensive CARL requirements analysis with complete user responses for: [COMPLETE_CONTEXT_FROM_ALL_QUESTIONS]. Analyze scope, stakeholder needs, business value, technical constraints, and recommend optimal CARL file structure and integration approach."

**Secondary Analysis (Based on Scope):**

**For Epic-Scale Planning:**
- Task: carl-architecture-analyst → "Analyze system architecture and component relationships for: $ARGUMENTS"
- Task: carl-backend-analyst → "Assess backend system requirements and service architecture for: $ARGUMENTS"
- Task: carl-frontend-analyst → "Analyze user experience and interface architecture for: $ARGUMENTS"

**For Feature-Scale Planning:**
- Task: carl-backend-analyst → "Analyze API and data requirements for: $ARGUMENTS"
- Task: carl-frontend-analyst → "Map user journeys and interface requirements for: $ARGUMENTS"

**For Story-Scale Planning:**
- Task: carl-debt-analyst → "Assess technical debt impact and improvement opportunities for: $ARGUMENTS"

**For Technical Initiatives:**
- Task: carl-debt-analyst → "Comprehensive technical debt analysis and refactoring strategy for: $ARGUMENTS"
- Task: carl-architecture-analyst → "Analyze architectural improvements and system impact for: $ARGUMENTS"

## 5. Generate CARL Files Using Scope-Specific Templates

Use appropriate templates from `.carl/templates/intent/` directory:

**For Epic Planning:** Use `.carl/templates/intent/epic.intent.template.carl` to create:
- File location: `.carl/project/epics/{epic-name}.intent.carl`
- Epic breakdown with child features
- Architectural requirements and constraints  
- Success metrics and business value
- Rollout strategy and phases

**For Feature Planning:** Use `.carl/templates/intent/feature.intent.template.carl` to create:
- File location: `.carl/project/features/{feature-name}.intent.carl`
- User stories with acceptance criteria
- Technical requirements (APIs, data, security)
- Performance and quality requirements
- Integration points and dependencies

**For Story Planning:** Use `.carl/templates/intent/story.intent.template.carl` to create:
- File location: `.carl/project/stories/{story-name}.intent.carl`
- Specific acceptance criteria
- Definition of done checklist
- Test scenarios and edge cases
- Technical approach and affected components

**For Technical Initiatives:** Use `.carl/templates/intent/technical.intent.template.carl` to create:
- File location: `.carl/project/technical/{initiative-name}.intent.carl`
- Technical debt reduction goals
- Refactoring plan with phases
- Quality improvements and metrics
- Business benefits and success criteria

## 6. Update CARL System
After generating intent files:

1. **Create State Files:** Generate corresponding `.state.carl` files using `.carl/templates/state.template.carl`
   - Same directory as intent file with `.state.carl` extension
   - Initialize with planning phase completed, implementation pending
   
2. **Update Active Work:** Add new intent to `.carl/project/active.work.carl` ready queue
   - Set priority based on user input and dependencies
   - Update dependency relationships
   
3. **Update Index:** Add new planning entries to `.carl/index.carl`
   - Include new intent in project overview
   - Update completion percentages for parent items
   
4. **Session Tracking:** Record planning session in current session file

## 7. Validation and Output
Ensure generated files:
- Follow CARL template structure exactly using scope-specific templates
- Include all required sections for detected scope
- Have valid YAML syntax and proper indentation
- Reference existing project context appropriately
- Include actionable, testable requirements
- Are placed in correct `.carl/project/` subdirectory

## Example Usage

**New Requirement Planning:**
- `/carl:plan "user authentication system"` → Interactive feature planning
- `/carl:plan --epic "complete mobile redesign"` → Interactive epic planning  
- `/carl:plan --technical "refactor API layer"` → Interactive technical initiative

**Existing Intent Breakdown:**
- `/carl:plan --from-intent epics/user-management` → Break epic into features
- `/carl:plan --from-intent features/user-login` → Break feature into stories

**Interactive Flow Examples:**
```
> /carl:plan "add user dashboard"

CARL Planning Assistant 🎯
I detected this as a FEATURE level requirement.

1. What problem does this solve?
> Users need a centralized view of their account information and recent activity

2. Who will use this?  
> Registered users after login, customer support team

[Continue interactive gathering...]

🔍 Launching CARL Requirements Analyst for comprehensive analysis...

CARL Requirements Analysis Complete:
• Scope Recommendation: Feature-level (confirmed)
• Business Value: High - improves user engagement and support efficiency
• Technical Complexity: Medium - requires data aggregation and visualization
• CARL Integration: Aligns with existing user management systems
• Dependencies: User authentication, activity tracking systems

Based on expert analysis, I'll create:
📁 .carl/project/features/user-dashboard.intent.carl
📁 .carl/project/features/user-dashboard.state.carl

Would you also like me to break this down into user stories? (y/n)
```

```
> /carl:plan --from-intent features/user-authentication

Current Status: FEATURE with 80% completion
Breakdown Level: Feature ready for story breakdown

This feature can be broken down further:
1. Break down into user stories (recommended)
2. Add parallel feature to parent epic
3. Review and update current requirements
4. Check implementation readiness

Which option would you like to pursue?
> 1

I'll analyze the existing feature and create user stories...
[Interactive story creation process]
```

## Command Integration Notes

**Context Loading:** Before starting interactive planning, load project context:
- Check `.carl/project/active.work.carl` for current work
- Load parent epic/feature context if breaking down existing intent
- Reference related requirements for consistency

**Template Selection:** Choose template based on scope detection:
- Epic keywords → `.carl/templates/intent/epic.intent.template.carl`
- Feature keywords → `.carl/templates/intent/feature.intent.template.carl`
- Story keywords → `.carl/templates/intent/story.intent.template.carl`
- Technical keywords → `.carl/templates/intent/technical.intent.template.carl`

**File Management:** Ensure proper file structure:
- Intent files: `.carl/project/{scope}/{name}.intent.carl`
- State files: `.carl/project/{scope}/{name}.state.carl`
- Update active work queue when creating new requirements
- Link parent/child relationships in existing files

Generate comprehensive, actionable CARL planning files through guided requirements gathering that integrate seamlessly with the project hierarchy while providing AI-optimized structure for implementation guidance.