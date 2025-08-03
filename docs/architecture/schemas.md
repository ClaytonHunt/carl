# CARL File Schema Definitions

**Schema Validation**: All CARL files are validated against strict YAML schemas located in `.carl/schemas/`. The schemas enforce:
- **No additional properties** - Only documented fields are allowed
- **Strict enum validation** - Phase, priority, and status values must match exactly
- **Pattern enforcement** - IDs must be snake_case, dates must be YYYY-MM-DD format
- **Required field validation** - Critical fields like `completion_percentage` and `acceptance_criteria` are mandatory
- **Type safety** - All fields have strict type constraints

## Epic Files (`.epic.carl`)
**Schema**: `.carl/schemas/epic.schema.yaml`

```yaml
id: snake_case_id                    # Required: ^[a-z][a-z0-9_]*[a-z0-9]$ pattern
name: "Human readable name"          # Required: 1-100 characters
completion_percentage: 0-100         # Required for hooks: integer 0-100
current_phase: enum[planning|development|testing|integration|complete]  # Required
epic_objectives: ["objective1", "objective2", ...]     # Required: min 1 item
features: [{id: child_feature_id, status: enum[pending|active|complete]}, ...]  # Required
acceptance_criteria: ["criteria1", "criteria2", ...]  # Required for TDD hook: min 1 item
dependencies: [external_epic_ids, ...]         # Required: array of snake_case IDs
timeline: {start_date: YYYY-MM-DD, target_date: YYYY-MM-DD}  # Required: strict date format
estimate:                           # Required
  t_shirt_size: enum[S|M|L|XL|XXL|XXXL]        # Required: strategic planning estimate
  calculated_story_points: 0-N      # Optional: auto-calculated from child features
  time_guidance: "3-6 months"       # Optional: time guidance for reference
```

## Feature Files (`.feature.carl`)
**Schema**: `.carl/schemas/feature.schema.yaml`

```yaml
id: snake_case_id                    # Required: ^[a-z][a-z0-9_]*[a-z0-9]$ pattern
name: "Human readable name"          # Required: 1-100 characters
completion_percentage: 0-100         # Required for hooks: integer 0-100
current_phase: enum[planning|development|testing|integration|complete]  # Required
parent_epic: parent_epic_id          # Required: snake_case pattern
feature_description: "User-facing capability description"  # Required
stories: [{id: child_story_id, status: enum[pending|active|complete]}, ...]  # Required
acceptance_criteria: ["criteria1", "criteria2", ...]  # Required for TDD hook: min 1 item
user_stories: ["As a X, I want Y, so that Z", ...]  # Required: validates As-I-so format
dependencies: [other_feature_ids, ...]         # Required: array of snake_case IDs
estimate:                           # Required
  t_shirt_size: enum[XS|S|M|L|XL|XXL]          # Required: feature complexity estimate
  calculated_story_points: 0-N      # Optional: auto-calculated from child stories
  time_guidance: "2-4 weeks"        # Optional: time guidance for reference
```

## Story Files (`.story.carl`)
**Schema**: `.carl/schemas/story.schema.yaml`

```yaml  
id: snake_case_id                    # Required: ^[a-z][a-z0-9_]*[a-z0-9]$ pattern
name: "Human readable name"          # Required: 1-100 characters
completion_percentage: 0-100         # Required for hooks: integer 0-100
current_phase: enum[planning|development|testing|complete]  # Required
parent_feature: parent_feature_id    # Required: snake_case pattern
story_description: "Implementation task description"  # Required
acceptance_criteria: ["criteria1", "criteria2", ...]  # Required for TDD hook: min 1 item
technical_requirements: ["req1", "req2", ...]  # Required
test_scenarios: [{scenario: "desc", status: enum[pending|passing|failing]}, ...]  # Required
dependencies: [other_story_ids, ...]          # Required: array of snake_case IDs
estimate:                           # Required
  story_points: enum[1|2|3|5|8|13|21|34|55|89] # Required: Fibonacci sequence
  time_guidance: "2-5 days"         # Optional: time guidance for reference
  complexity_notes: "API integration complexity" # Optional: complexity factors
```

## Technical Files (`.tech.carl`)
**Schema**: `.carl/schemas/tech.schema.yaml`

```yaml
id: snake_case_id                    # Required: ^[a-z][a-z0-9_]*[a-z0-9]$ pattern
name: "Human readable name"          # Required: 1-100 characters
completion_percentage: 0-100         # Required for hooks: integer 0-100
current_phase: enum[planning|development|testing|complete]  # Required
tech_type: enum[infrastructure|refactoring|process|tooling|security]  # Required
description: "Technical work description"  # Required
acceptance_criteria: ["criteria1", "criteria2", ...]  # Required for TDD hook: min 1 item
technical_specs: ["spec1", "spec2", ...]     # Required
impact_scope: [affected_components, ...]     # Required
estimate:                           # Required
  story_points: enum[1|2|3|5|8|13|21|34|55|89] # Required: Fibonacci sequence (implementation-focused)
  time_guidance: "Varies by type"   # Optional: time guidance based on work type
  complexity_notes: "Legacy system integration" # Optional: technical complexity factors
```

## Active Work File (`active.work.carl`)
**Schema**: `.carl/schemas/active-work.schema.yaml`

```yaml
active_intent:                       # Required
  id: current_work_item_id          # Required for hooks: snake_case pattern
  completion: 0-100                 # Required for hooks: integer 0-100
  current_phase: phase_name         # Required
work_queue:                         # Required
  ready_for_work: [{id: work_id, priority: enum[critical|high|medium|low]}, ...]  # Required
  in_progress: [{id: work_id, status: current_status}, ...]     # Required
  blocked: [{id: work_id, blocker: reason}, ...]               # Required
```

## Process File (`process.carl`)
**Schema**: `.carl/schemas/process.schema.yaml`

```yaml
# .carl/project/process.carl
default_methodology: "TDD"          # Required
monorepo: true                      # Required: boolean

applications:                       # Required
  frontend:                         # Key pattern: ^[a-z][a-z0-9_-]*[a-z0-9]$
    path: "apps/frontend"           # Required: filesystem path pattern
    methodology: "TDD"              # Required
    test_command: "npm test"        # Required: min 1 character
    quality_requirements:           # Required
      code_coverage_goal: 85        # Required: integer 0-100
    
  backend:
    path: "apps/backend"
    methodology: "TDD"
    test_command: "go test ./..."
    quality_requirements:
      code_coverage_goal: 90
```

## Session Files (`session-YYYY-MM-DD-{user}.carl`)
**Schema**: `.carl/schemas/session.schema.yaml`

```yaml
developer: "clayton"                 # Required: from git config user.name
date: "2025-08-03"                  # Required: YYYY-MM-DD format
session_summary:                    # Required
  start_time: "08:30:00Z"          # Required: HH:MM:SSZ format
  end_time: "17:45:00Z"            # Required: HH:MM:SSZ format
  total_active_time: "7.5 hours"   # Required: validates time format
work_periods:                       # Required array
  - start: "08:30:00Z"             # Required: HH:MM:SSZ format
    end: "12:00:00Z"               # Required: HH:MM:SSZ format
    focus: "user-auth.feature.carl" # Required: validates .carl file pattern
    context: "Implementing JWT"     # Required
    commits: ["abc123f"]           # Required: validates git hash pattern
agent_performance:                  # Required array
  - agent: "carl-requirements-analyst"  # Required: agent name pattern
    invocation_time: "08:32:15Z"   # Required: HH:MM:SSZ format
    duration: "2.3s"               # Required: validates duration format
    task: "scope classification"   # Required
    success: true                  # Required: boolean
    context_tokens: 1200           # Required: integer >= 0
command_metrics:                    # Required array
  - command: "/carl:plan user-auth" # Required: validates CARL command pattern
    execution_time: "14.2s"        # Required: validates duration format
    success: true                  # Required: boolean
    agents_used: ["carl-requirements-analyst"]  # Required: array of agent names
active_context_carryover: {}        # Required: object for next day's context
cleanup_log:                       # Required array
  - cleaned_date: "2025-07-01"     # Required: YYYY-MM-DD format
    retention_period: "90_days"    # Required: enum validation
```

## Technical Debt File (`tech-debt.carl`)
**Schema**: `.carl/schemas/tech-debt.schema.yaml`

```yaml
metadata:                           # Required
  last_updated: "2025-08-03T10:30:00Z"  # Required: ISO 8601 format
  total_items: 15                   # Required: integer >= 0
  sources: ["src/auth.js", "lib/utils.js"]  # Required: array of file paths

debt_items:                         # Required array
  - id: "debt_abc12345"            # Required: debt_[8-char-hex] pattern
    type: "TODO"                   # Required: enum[TODO|FIXME|HACK]
    file_path: "src/auth.js"       # Required
    line_number: 42                # Required: integer >= 1
    content: "TODO: Add rate limiting"  # Required
    priority: "medium"             # Required: enum[low|medium|high|critical]
    discovered_date: "2025-08-01"  # Required: YYYY-MM-DD format
    status: "active"               # Required: enum[active|resolved|obsolete]
    context: "Security enhancement" # Optional
    resolution_date: "2025-08-05"  # Optional: YYYY-MM-DD format
    resolution_notes: "Implemented with middleware"  # Optional
```

## Estimation Strategy

CARL uses a dual estimation approach combining story points and t-shirt sizes for different work levels:

### Story Points (Implementation-Focused)
- **Stories & Technical Work**: Use Fibonacci sequence (1, 2, 3, 5, 8, 13, 21, 34, 55, 89)
- **Relative Sizing**: Points compare complexity/effort relative to other work
- **Velocity Tracking**: Enables sprint planning and velocity calculations
- **Team Calibration**: Teams establish their own point-to-effort mapping

### T-shirt Sizes (Strategic Planning)
- **Epics**: S, M, L, XL, XXL, XXXL (strategic initiatives)
- **Features**: XS, S, M, L, XL, XXL (user capabilities)
- **High-Level Planning**: Enables roadmap and capacity planning
- **Stakeholder Communication**: Non-technical sizing for executives

### Calculated Story Points
- **Auto-Aggregation**: Features/epics automatically sum child story points
- **Planning Hierarchy**: Provides both strategic (t-shirt) and tactical (points) views
- **Consistency**: Ensures estimates align across work hierarchy

### Time Guidance (Optional)
- **Reference Only**: Time estimates serve as guidelines, not commitments
- **Context Preservation**: Maintains original time-based thinking for reference
- **Team Learning**: Helps calibrate story points against actual delivery time

## Schema Implementation Notes

- **Strict Validation**: Schemas use `additionalProperties: false` to prevent undocumented fields
- **Pattern Enforcement**: All IDs must match snake_case regex: `^[a-z][a-z0-9_]*[a-z0-9]$`
- **Date Validation**: All dates must be YYYY-MM-DD format with regex validation
- **Required Fields**: Critical fields for hooks and TDD are marked as required
- **Enum Constraints**: All status, phase, and estimation values are strictly enumerated
- **Type Safety**: Numbers, booleans, arrays, and objects have strict type constraints
- **Estimation Validation**: Story points limited to Fibonacci sequence, t-shirt sizes to defined enums