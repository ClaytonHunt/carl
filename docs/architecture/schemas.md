# CARL File Schema Definitions

## Epic Files (`.epic.carl`)
```yaml
id: snake_case_id
name: "Human readable name"
completion_percentage: 0-100  # Required for hooks
current_phase: enum[planning|development|testing|integration|complete]
epic_objectives: ["objective1", "objective2", ...]
features: [{id: child_feature_id, status: enum[pending|active|complete]}, ...]
acceptance_criteria: ["criteria1", "criteria2", ...]  # Required for TDD hook
dependencies: [external_epic_ids, ...]
timeline: {start_date: YYYY-MM-DD, target_date: YYYY-MM-DD}
```

## Feature Files (`.feature.carl`)
```yaml
id: snake_case_id
name: "Human readable name" 
completion_percentage: 0-100  # Required for hooks
current_phase: enum[planning|development|testing|integration|complete]
parent_epic: parent_epic_id
feature_description: "User-facing capability description"
stories: [{id: child_story_id, status: enum[pending|active|complete]}, ...]
acceptance_criteria: ["criteria1", "criteria2", ...]  # Required for TDD hook
user_stories: ["As a X, I want Y, so that Z", ...]
dependencies: [other_feature_ids, ...]
```

## Story Files (`.story.carl`)
```yaml  
id: snake_case_id
name: "Human readable name"
completion_percentage: 0-100  # Required for hooks
current_phase: enum[planning|development|testing|complete]
parent_feature: parent_feature_id
story_description: "Implementation task description"
acceptance_criteria: ["criteria1", "criteria2", ...]  # Required for TDD hook
technical_requirements: ["req1", "req2", ...] 
test_scenarios: [{scenario: "desc", status: enum[pending|passing|failing]}, ...]
dependencies: [other_story_ids, ...]
```

## Technical Files (`.tech.carl`)
```yaml
id: snake_case_id  
name: "Human readable name"
completion_percentage: 0-100  # Required for hooks
current_phase: enum[planning|development|testing|complete]
tech_type: enum[infrastructure|refactoring|process|tooling|security]
description: "Technical work description"
acceptance_criteria: ["criteria1", "criteria2", ...]  # Required for TDD hook
technical_specs: ["spec1", "spec2", ...]
impact_scope: [affected_components, ...]
```

## Active Work File (`active.work.carl`)
```yaml
active_intent:
  id: current_work_item_id  # Required for hooks
  completion: 0-100  # Required for hooks
  current_phase: phase_name
work_queue:
  ready_for_work: [{id: work_id, priority: enum[critical|high|medium|low]}, ...]
  in_progress: [{id: work_id, status: current_status}, ...]
  blocked: [{id: work_id, blocker: reason}, ...]
```

## Process File Example
```yaml
# .carl/project/process.carl
# Global/default settings
default_methodology: "TDD"
monorepo: true

# Application-specific processes
applications:
  frontend:
    path: "apps/frontend"
    methodology: "TDD"
    test_command: "npm test"
    quality_requirements:
      code_coverage_goal: 85
    
  backend:
    path: "apps/backend"
    methodology: "TDD"
    test_command: "go test ./..."
    quality_requirements:
      code_coverage_goal: 90
```