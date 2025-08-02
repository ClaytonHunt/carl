# CARL System Architecture & Principles

**CARL (Context-Aware Requirements Language)** - AI-Optimized Planning System for Claude Code

## Core Philosophy

CARL bridges the gap between human cognitive simplicity and AI context precision through a **dual-layer architecture**:

- **Human Layer**: Simple, memorable commands (`/carl:plan`, `/carl:task`, `/carl:analyze`, `/carl:status`)
- **AI Layer**: Rich, structured CARL files (`[name].epic.carl`, `[name].feature.carl`, `[name].story.carl`, `[name].tech.carl`) providing comprehensive context

## Fundamental Principles

### 1. **Context-First Development**
- Every development activity must have proper CARL context
- AI assistants receive comprehensive, structured context automatically
- No work begins without understanding requirements and current state

### 2. **Hierarchical Organization**
- **Epics** (3-6 months): Strategic initiatives with comprehensive architecture
- **Features** (2-4 weeks): User-facing capabilities with detailed specs
- **Stories** (2-5 days): Implementation tasks with acceptance criteria
- **Technical** (varies): Infrastructure, refactoring, process improvements

### 3. **Single-File System**
Every work item has one comprehensive file:
- **`[name].epic.carl`**, **`[name].feature.carl`**, **`[name].story.carl`**, or **`[name].tech.carl`** - Complete work item definition including:
  - Requirements and user stories (what needs to be built)
  - Progress and implementation status (what's been built)
  - Context and relationships (how it relates to other components)

### 4. **Requirements-Driven Workflow**
- **No implementation without scope files** (epic/feature/story/tech.carl)
- **No deployment without progress validation**
- **No integration without relationship mapping**

### 5. **Session Continuity**
- Daily session files per developer for manageable tracking
- Perfect handoff capabilities between developers and across days
- AI context preserved across interruptions
- Automatic cleanup with configurable retention periods
- Built-in support for daily standups, quarterly reviews, and yearly retrospectives

## Core Workflows

### `/carl:analyze` - Project Understanding & Foundation Setup
**Purpose**: Understand project fundamentals and establish CARL strategic foundation

**Process**:
1. **Technology Stack Analysis**: Identify languages, frameworks, build tools, testing patterns
2. **Architecture Pattern Recognition**: Detect MVC, microservices, monolith, API patterns, etc.
3. **Development Pattern Discovery**: TDD practices, deployment patterns, code organization
4. **Utility and Library Assessment**: Key dependencies, custom utilities, integration patterns
5. **Interactive Validation**: Present findings to developer for confirmation and refinement
6. **Strategic Artifact Generation**: Create/update `vision.carl`, `roadmap.carl`, `process.carl`
   - **Monorepo Detection**: Automatically identifies multiple applications and creates per-app process sections
   - **Process Customization**: Each app gets appropriate test commands and coverage goals
7. **Specialized Agent Creation**: Generate project-specific agents based on technology stack (see Agent Architecture section)

**Modes**:
- `--sync`: Detect code changes that affect strategic artifacts or require new agents
- `--comprehensive`: Deep analysis with full technology assessment and interactive validation

### `/carl:plan` - Intelligent Planning
**Purpose**: Context-aware planning that adapts to scope and complexity

**Modes**:
- `/carl:plan [requirement description]`: Create single work item at determined scope level
- `/carl:plan --from [existing requirement]`: Break down existing work item to next level (Epic → Features, Feature → Stories)

**Auto-Scope Detection Algorithm**:
```
1. Requirements Gathering → Complete understanding of request
2. Effort Estimation → AI estimates completion time/complexity
3. Scope Classification:
   - Epic Level: 3-6 months (architecture changes, major initiatives)
   - Feature Level: 2-4 weeks (user-facing capabilities) 
   - Story Level: 2-5 days (implementation tasks)
   - Technical Level: Variable timing (infrastructure/process work)
4. Validation → Confirm scope with user before file creation
```

**Planning Decision Flow**:
```
Planning Request → Context Loading → Requirements Gathering → Effort Estimation
       ↓
Agent Gap Detection → Create Missing Specialists → Specialist Consultation
       ↓  
Scope Classification → User Validation → CARL Generation → Breakdown (if needed)
```

**Detailed Algorithm**:
1. **Requirements Gathering**: Interactive questioning until complete understanding achieved
2. **Effort Estimation**: AI analyzes complexity, dependencies, technical challenges to estimate completion time
3. **Scope Classification**: Map estimate to scope level (3-6mo=Epic, 2-4wk=Feature, 2-5d=Story, Variable=Technical)
4. **User Validation**: Confirm scope level and approach before creating CARL files
5. **Agent Management**: Deploy specialists for domain expertise during requirements/estimation phases
6. **CARL Generation**: Create files with proper hierarchical relationships and dependencies

**Scope Breakdown Examples**:
- **Epic Breakdown**: `/carl:plan --from user-authentication.epic.carl` → `registration.feature.carl`, `login.feature.carl`, `password-reset.feature.carl`
- **Feature Breakdown**: `/carl:plan --from user-registration.feature.carl` → `email-validation.story.carl`, `password-strength.story.carl`, `user-profile-creation.story.carl`

**Next Step Recommendations**:
- **Further Breakdown Needed**: "Break down `user-authentication.epic.carl` using `/carl:plan --from user-authentication.epic.carl`"
- **Ready for Implementation**: "Start work on `email-validation.story.carl` using `/carl:task email-validation.story.carl`"
- **Dependencies First**: "Complete `database-schema.tech.carl` before starting user registration features"

**Agent Management**:
- **Gap Detection**: Automatically identifies missing domain expertise during planning
- **Dynamic Creation**: Uses `carl-agent-builder` to create specialized agents for research or analysis
- **Lifecycle Management**: Creates temporary agents for research, deletes unneeded definitions after planning decisions
- **Permanent vs Temporary**: Core project stack agents remain, evaluation-only agents are removed

### `/carl:task` - Context-Aware Execution
**Purpose**: Execute development work with full CARL context integration

**Intelligent Scope Handling**:
- **Story/Technical Items**: Direct implementation (planning assumed complete)
- **Feature with Stories**: Analyze dependencies, execute in optimal order (parallel when possible)
- **Feature without Stories**: Invoke planning to break down into stories first
- **Epic with Features**: Check feature completeness, handle mixed planning/execution
- **Epic without Features**: Invoke planning to break down into features first

**Implementation Workflow** (for Story/Technical items):
1. **Context Validation**: Verify scope files exist and dependencies are satisfied
2. **TDD Enforcement**: Red-Green-Refactor cycle required when TDD enabled in process.carl
3. **Progress Tracking**: Real-time progress updates within scope files
4. **Quality Gates**: Automated validation at each phase
5. **Completion Verification**: Comprehensive testing and documentation

**Feature Execution Workflow** (when stories exist):
1. **Child Story Discovery**: Identify all stories belonging to the feature
2. **Dependency Analysis**: Analyze story dependencies and blocking relationships
3. **Execution Planning**: Determine optimal execution order (sequential vs parallel)
4. **Parallel Implementation**: Execute independent stories simultaneously when possible
5. **Sequential Dependencies**: Complete blocking stories before dependent ones
6. **Feature Completion**: Verify all stories complete and feature objectives met

**Epic Execution Workflow** (when features exist):
1. **Feature Inventory**: Identify all features belonging to the epic
2. **Completeness Check**: Verify each feature has necessary stories
3. **Mixed Mode Handling**: 
   - **Complete Features**: Execute using Feature Execution Workflow
   - **Incomplete Features**: Invoke `/carl:plan --from [feature]` to create missing stories
4. **Epic Orchestration**: Coordinate feature completion toward epic objectives
5. **Epic Completion**: Verify all features complete and epic goals achieved

**Auto-Planning Invocation**: When `/carl:task` detects missing breakdown, automatically invoke `/carl:plan --from [work-item]` to create missing child items, then switch to execution workflow

## Dependency Analysis Algorithms

### Dependency Discovery Process
**Step 1: Child Item Enumeration**
```bash
# For Feature execution - find all child stories
parent_feature="user-registration.feature.carl"
child_stories=$(find .carl/project/stories -name "*.story.carl" -exec grep -l "parent_feature: $(basename "$parent_feature" .feature.carl)" {} \;)

# For Epic execution - find all child features  
parent_epic="user-authentication.epic.carl"
child_features=$(find .carl/project/features -name "*.feature.carl" -exec grep -l "parent_epic: $(basename "$parent_epic" .epic.carl)" {} \;)
```

**Step 2: Dependency Relationship Extraction**
```bash
# Extract dependencies field from each work item
for work_item in $child_items; do
  dependencies=$(yq eval '.dependencies[]' "$work_item" 2>/dev/null || echo "")
  echo "$work_item: $dependencies"
done
```

### Dependency Graph Construction
**Graph Representation**:
```
Work Item Dependencies → Directed Acyclic Graph (DAG)
- Nodes: Work items (stories/features)
- Edges: Dependency relationships (A depends on B)
- Validation: Ensure no circular dependencies
```

**Circular Dependency Detection**:
```bash
# Depth-First Search to detect cycles
detect_circular_dependencies() {
  local visited=()
  local recursion_stack=()
  
  for work_item in $all_work_items; do
    if [[ ! " ${visited[@]} " =~ " ${work_item} " ]]; then
      if dfs_cycle_check "$work_item" visited recursion_stack; then
        echo "ERROR: Circular dependency detected involving $work_item"
        return 1
      fi
    fi
  done
  return 0
}
```

### Execution Order Algorithm
**Topological Sort Implementation**:
```bash
# Kahn's Algorithm for dependency ordering
topological_sort() {
  local work_items=("$@")
  local in_degree=()
  local queue=()
  local execution_order=()
  
  # Calculate in-degree for each work item
  for item in "${work_items[@]}"; do
    dependencies=$(yq eval '.dependencies[]?' "$item")
    in_degree["$item"]=$(echo "$dependencies" | wc -l)
    
    # Add items with no dependencies to queue
    if [[ ${in_degree["$item"]} -eq 0 ]]; then
      queue+=("$item")
    fi
  done
  
  # Process queue
  while [[ ${#queue[@]} -gt 0 ]]; do
    current="${queue[0]}"
    queue=("${queue[@]:1}")  # Remove first element
    execution_order+=("$current")
    
    # Reduce in-degree for dependent items
    for item in "${work_items[@]}"; do
      dependencies=$(yq eval '.dependencies[]?' "$item")
      if [[ "$dependencies" =~ $(basename "$current" .carl) ]]; then
        ((in_degree["$item"]--))
        if [[ ${in_degree["$item"]} -eq 0 ]]; then
          queue+=("$item")
        fi
      fi
    done
  done
  
  echo "${execution_order[@]}"
}
```

### Parallel Execution Strategy
**Parallel vs Sequential Decision Matrix**:
```
Independent Work Items (no shared dependencies):
├── Execute in parallel using background processes
├── Monitor completion status simultaneously  
└── Proceed when all parallel items complete

Dependent Work Items (dependency chain):
├── Execute in topological order (sequential)
├── Wait for each item to complete before starting next
└── Handle failures by stopping dependent item execution

Mixed Dependencies:
├── Group independent items into parallel batches
├── Execute batches sequentially based on dependency layers
└── Optimize for maximum parallelism within constraints
```

**Parallel Execution Implementation**:
```bash
execute_parallel_batch() {
  local batch_items=("$@")
  local pids=()
  
  # Start all items in parallel
  for item in "${batch_items[@]}"; do
    execute_work_item "$item" &
    pids+=($!)
  done
  
  # Wait for all to complete
  for pid in "${pids[@]}"; do
    wait $pid
    if [[ $? -ne 0 ]]; then
      echo "ERROR: Parallel execution failed for batch"
      return 1
    fi
  done
  
  echo "✅ Parallel batch completed successfully"
}
```

### Dependency Layer Analysis
**Execution Layer Calculation**:
```bash
# Group work items by dependency depth
calculate_execution_layers() {
  local work_items=("$@")
  local layers=()
  local current_layer=0
  local remaining_items=("${work_items[@]}")
  
  while [[ ${#remaining_items[@]} -gt 0 ]]; do
    local layer_items=()
    local next_remaining=()
    
    # Find items with no dependencies in remaining items
    for item in "${remaining_items[@]}"; do
      dependencies=$(yq eval '.dependencies[]?' "$item")
      local has_unmet_deps=false
      
      for dep in $dependencies; do
        # Check if dependency is still in remaining items
        if [[ " ${remaining_items[@]} " =~ " ${dep} " ]]; then
          has_unmet_deps=true
          break
        fi
      done
      
      if [[ "$has_unmet_deps" == false ]]; then
        layer_items+=("$item")
      else
        next_remaining+=("$item")
      fi
    done
    
    layers[$current_layer]="${layer_items[@]}"
    remaining_items=("${next_remaining[@]}")
    ((current_layer++))
  done
  
  echo "Execution layers calculated: ${#layers[@]} layers"
  for i in "${!layers[@]}"; do
    echo "Layer $i: ${layers[$i]}"
  done
}
```

### Execution Orchestration
**Feature-Level Execution Flow**:
```
1. Enumerate child stories
2. Extract dependencies from each story
3. Detect circular dependencies (fail if found)
4. Calculate execution layers using topological sort
5. Execute layers sequentially:
   - Within each layer: execute stories in parallel
   - Between layers: wait for layer completion before next
6. Validate feature completion when all stories done
```

**Epic-Level Execution Flow**:
```
1. Enumerate child features
2. Check feature completeness (features may need story breakdown)
3. For incomplete features: invoke /carl:plan to create missing stories
4. For complete features: apply Feature-Level Execution Flow
5. Execute feature layers with mixed planning/execution handling
6. Validate epic completion when all features done
```

### Error Handling in Dependency Execution
**Failure Propagation Strategy**:
- **Independent Item Failure**: Other parallel items continue, report failure at end
- **Dependency Chain Failure**: Stop execution of dependent items, report blocking failure
- **Circular Dependency**: Fail fast with clear error message and dependency cycle details
- **Missing Dependency**: Attempt to locate dependency in other scopes, fail if not found

**Recovery Options**:
- **Skip Failed Item**: Continue with remaining items (user confirmation required)
- **Retry Failed Item**: Attempt execution again after user fixes
- **Manual Override**: Mark failed item as complete (with warning) to unblock dependents

**Parallel Execution Examples**:
- **Independent Stories**: `email-validation.story.carl` and `password-strength.story.carl` can run simultaneously
- **Dependent Stories**: `database-schema.story.carl` must complete before `user-model.story.carl`
- **Mixed Dependencies**: Complete blocking stories first, then parallel execution of remaining stories

### `/carl:status` - Project Health Dashboard
**Purpose**: AI-powered progress monitoring with actionable insights

**Performance-Optimized Approach**:
1. **Session-First Data**: Read compacted session files instead of scanning all CARL files
2. **Cached Summaries**: Use weekly/monthly/quarterly summaries for trend analysis
3. **Selective Deep Dive**: Only read specific CARL files when detail requested
4. **Pre-Computed Metrics**: Session files contain pre-aggregated progress data

**Provides**:
- Implementation progress (from session summaries)
- Velocity tracking (from session time data)
- Recent activity (from daily sessions)
- Technical debt tracking (from dedicated tech-debt.carl file)
- Next priorities (from active.work.carl only)

**Technical Debt Optimization**:
- Separate `tech-debt.carl` file updated by PostToolUse hook
- Hook detects TODO/FIXME/HACK comments during edits
- Automatic debt tracking without full codebase scans
- Debt items linked to specific files and line numbers

## File Structure & Organization

### Directory Structure
```
.carl/
├── project/
│   ├── epics/           # Strategic initiatives (3-6 months)
│   │   └── completed/   # Completed epic files
│   ├── features/        # User capabilities (2-4 weeks)
│   │   └── completed/   # Completed feature files
│   ├── stories/         # Implementation tasks (2-5 days)
│   │   └── completed/   # Completed story files
│   ├── technical/       # Infrastructure & process (varies)
│   │   └── completed/   # Completed technical files
│   ├── vision.carl      # Strategic project vision
│   ├── roadmap.carl     # Development roadmap
│   ├── process.carl     # Team processes and standards
│   ├── active.work.carl # Current work queue and priorities
│   └── tech-debt.carl   # Technical debt tracking (TODO/FIXME/HACK comments)
├── sessions/            # Daily session tracking per developer
│   ├── session-YYYY-MM-DD-{user}.carl  # Daily files (7 days)
│   └── archive/         # Compacted: weekly → monthly → quarterly → yearly
└── schemas/             # CARL file schema definitions
    ├── epic.schema.yaml      # Epic file structure and validation rules
    ├── feature.schema.yaml   # Feature file structure and validation rules
    ├── story.schema.yaml     # Story file structure and validation rules
    ├── tech.schema.yaml      # Technical file structure and validation rules
    ├── active-work.schema.yaml  # Active work file structure
    ├── process.schema.yaml   # Process file structure and validation rules
    ├── session.schema.yaml   # Session file structure and validation rules
    └── tech-debt.schema.yaml # Technical debt file structure and validation rules
```

### Critical File Path Rules
**NEVER DEVIATE - Enforced by all agents**:
- Epic files: `.carl/project/epics/[name].epic.carl`
- Feature files: `.carl/project/features/[name].feature.carl`
- Story files: `.carl/project/stories/[name].story.carl`
- Technical files: `.carl/project/technical/[name].tech.carl`
- Completed items: Move completed work items to `completed/` subdirectory within scope directory

### Naming Conventions
- **Epic files**: `kebab-case-descriptive-name.epic.carl`
- **Feature files**: `kebab-case-descriptive-name.feature.carl`
- **Story files**: `kebab-case-descriptive-name.story.carl`
- **Technical files**: `kebab-case-descriptive-name.tech.carl`
- **IDs**: `snake_case_descriptive_id`
- **Scope directories**: `epics/`, `features/`, `stories/`, `technical/`

**Pattern Distinction**:
- **File names**: kebab-case for filesystem compatibility (`user-auth.epic.carl`)
- **Internal IDs**: snake_case for code/YAML compatibility (`user_auth_system`)

### CARL File Schema Definitions

**Epic Files** (`.epic.carl`):
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

**Feature Files** (`.feature.carl`):
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

**Story Files** (`.story.carl`):
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

**Technical Files** (`.tech.carl`):
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

**Active Work File** (`active.work.carl`):
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

## Integration Architecture

### Claude Code Hooks
CARL operates through Claude Code's hook system with minimal, focused shell scripts:

#### **Hook Architecture Principles**
- **Zero Dependencies**: Pure bash scripts, no external packages
- **Single Responsibility**: Each hook script has one clear responsibility
- **Multiple Hooks Per Type**: Use multiple focused scripts rather than monolithic hooks
- **Sequential Execution**: PostToolUse hooks execute in order (validation → progress → quality → completion → extraction)
- **Token Efficient**: Minimal context injection, maximum value
- **Fast Execution**: Well under 60-second timeout per hook

#### **Core Hooks (Minimal Set)**
1. **SessionStart Hook**
   - Initialize daily session file (`session-YYYY-MM-DD-{git-user}.carl`)
   - Progressive session compaction (daily→weekly→monthly→quarterly→yearly)
   - Carry over active context from previous day if needed
   - ~40 lines including compaction logic

2. **UserPromptSubmit Hook**
   - Inject active work context for CARL commands only
   - Smart detection: Skip injection if not CARL-related
   - Minimal context: Just active work and relevant scope files
   - ~25 lines of intelligent context loading

3. **PostToolUse Hooks** (Write/Edit tools only - Multiple focused scripts)
   - **Schema Validation Hook**: Validate CARL files against `.carl/schemas/` definitions
   - **Progress Tracking Hook**: Update progress tracking in daily session files  
   - **Quality Gate Hook**: Conditional TDD gate enforcement (when TDD enabled)
   - **Completion Handler Hook**: Move completed items to `completed/` subdirectory
   - **Tech Debt Extraction Hook**: Extract TODO/FIXME/HACK comments to `tech-debt.carl`
   - Each hook: ~15-20 lines with single responsibility

4. **Stop Hook**
   - Log completed work to daily session file
   - Update work item progress if changes detected
   - Track time spent on current work item
   - ~15 lines of activity logging

5. **Notification Hook** (Cross-platform audio alerts)
   - Alert when Claude Code needs user input
   - Cross-platform TTS: macOS (say), Linux (espeak/spd-say), Windows (PowerShell)
   - Project-aware messages: "[project-name] needs your attention"
   - ~15 lines main script + 5 lines per platform

#### **Shared Functions** (`carl-functions.sh`)
Single sourced file with core utilities:
- `get_git_user()` - Get current git user for session files
- `get_active_work()` - Extract current work item ID
- `update_progress()` - Update completion percentage
- `move_completed()` - Move completed files
- `detect_platform()` - Return platform (macos/linux/windows)
- `speak_message()` - Cross-platform TTS wrapper
- ~60 lines total, sourced by all hooks

#### **What NOT to Include in Hooks**
- **Complex Audio System**: Keep notification hook simple, elaborate personalities for future
- **Complex Analysis**: Delegate to specialist agents
- **Feature Discovery**: Belongs in /carl:analyze command
- **Extensive File Operations**: Keep it minimal
- **External Dependencies**: No npm packages, no pip installs
- **Large Context Dumps**: Smart selection only

#### **Hook Configuration** (`.claude/settings.json`)
```json
{
  "hooks": {
    "SessionStart": [{
      "matcher": ".*",
      "hooks": [{
        "type": "command",
        "command": "bash ${CLAUDE_PROJECT_DIR}/.carl/hooks/session-start.sh"
      }]
    }],
    "UserPromptSubmit": [{
      "matcher": ".*carl:.*",
      "hooks": [{
        "type": "command",
        "command": "bash ${CLAUDE_PROJECT_DIR}/.carl/hooks/context-inject.sh"
      }]
    }],
    "PostToolUse": [{
      "matcher": "Write|Edit|MultiEdit",
      "hooks": [
        {
          "type": "command", 
          "command": "bash ${CLAUDE_PROJECT_DIR}/.carl/hooks/schema-validate.sh"
        },
        {
          "type": "command",
          "command": "bash ${CLAUDE_PROJECT_DIR}/.carl/hooks/progress-track.sh"
        },
        {
          "type": "command",
          "command": "bash ${CLAUDE_PROJECT_DIR}/.carl/hooks/quality-gate.sh"
        },
        {
          "type": "command",
          "command": "bash ${CLAUDE_PROJECT_DIR}/.carl/hooks/completion-handler.sh"
        },
        {
          "type": "command",
          "command": "bash ${CLAUDE_PROJECT_DIR}/.carl/hooks/tech-debt-extract.sh"
        }
      ]
    }],
    "Stop": [{
      "matcher": ".*",
      "hooks": [{
        "type": "command",
        "command": "bash ${CLAUDE_PROJECT_DIR}/.carl/hooks/activity-log.sh"
      }]
    }],
    "Notification": [{
      "matcher": ".*",
      "hooks": [{
        "type": "command",
        "command": "bash ${CLAUDE_PROJECT_DIR}/.carl/hooks/notify-attention.sh"
      }]
    }]
  }
}
```

#### **Key Hook Implementations**

**Context Injection Hook**
- **Purpose**: Inject active work context for CARL commands only
- **Issue Resolved**: Date hallucination - Claude Code gets explicit current date to prevent confusion
- **Token Efficiency**: Stays under 100 tokens for performance
- **Key Implementation**:
  ```bash
  # Read active work (minimal parsing)
  active_work=$(grep -oP '(?<=id: ).*' "${CLAUDE_PROJECT_DIR}/.carl/project/active.work.carl" | head -1)
  active_completion=$(grep -oP '(?<=completion: )\d+' "${CLAUDE_PROJECT_DIR}/.carl/project/active.work.carl" | head -1)
  
  # Get current date info for Claude Code (prevents hallucination)
  current_date=$(date +%Y-%m-%d)
  current_week=$(date +%Y-%V)
  yesterday=$(date -d "yesterday" +%Y-%m-%d)
  
  # Inject minimal context (stays under 100 tokens)
  cat <<EOF
  <carl-context>
  Active Work: ${active_work} (${active_completion}% complete)
  Current Date: ${current_date}
  Yesterday: ${yesterday}
  Current Week: ${current_week}
  Session File: session-${current_date}-$(git config user.name).carl
  </carl-context>
  EOF
  ```
- **Context Strategy**: Strategic context (vision.carl, roadmap.carl) loaded by commands, not hooks
- **Targeted Context**: Specific scope files loaded by commands based on arguments

**Technical Debt Extraction Hook**
- **Purpose**: Automatically track TODO/FIXME/HACK comments during edits
- **Issue Resolved**: Manual tech debt tracking - captures debt markers automatically
- **Key Implementation**:
  ```bash
  # Extract from Write/Edit/MultiEdit tools only
  if [[ "$TOOL_NAME" =~ ^(Write|Edit|MultiEdit)$ ]]; then
    file_path="${TOOL_INPUT_file_path}"
    grep -n "TODO\\|FIXME\\|HACK" "$file_path" | while read -r line; do
      echo "$(date +%Y-%m-%d)|$file_path|$line" >> ".carl/project/tech-debt.carl"
    done
  fi
  ```

**Cross-Platform Notification Hook**
- **Purpose**: Audio alerts when Claude Code needs attention
- **Issue Resolved**: Platform compatibility - works on macOS, Linux, Windows
- **Key Implementation**:
  ```bash
  #!/bin/bash
  project_name=$(basename "${CLAUDE_PROJECT_DIR}")
  message="${project_name} needs your attention"
  
  case "$(uname -s)" in
    Darwin*) say -v "Samantha" "${message}" & ;;
    Linux*) 
      if command -v spd-say >/dev/null; then
        spd-say "${message}" &
      elif command -v espeak >/dev/null; then
        espeak "${message}" &
      fi ;;
    MINGW*|CYGWIN*|MSYS*)
      powershell.exe -Command "Add-Type -AssemblyName System.Speech; \
      \$speak = New-Object System.Speech.Synthesis.SpeechSynthesizer; \
      \$speak.Speak('${message}')" & ;;
  esac
  ```

**Session Management Hook (SessionStart)**
- **Purpose**: Daily session initialization and progressive compaction
- **Issue Resolved**: Session file explosion and manual cleanup burden
- **Key Implementation**:
  ```bash
  user=$(git config user.name)
  current_date=$(date +%Y-%m-%d)
  session_file=".carl/sessions/session-${current_date}-${user}.carl"
  
  # Create daily session if not exists
  if [[ ! -f "$session_file" ]]; then
    cat > "$session_file" <<EOF
  developer: "${user}"
  date: "${current_date}"  
  session_summary:
    start_time: "$(date +%H:%M:%S)Z"
  work_periods: []
  EOF
  fi
  
  # Progressive compaction (daily → weekly → monthly → quarterly → yearly)
  find .carl/sessions -name "session-*-${user}.carl" -mtime +7 | while read daily; do
    week=$(date -d "@$(stat -c %Y "$daily")" +%Y-%V)
    mkdir -p .carl/sessions/archive
    cat "$daily" >> ".carl/sessions/archive/week-${week}-${user}.carl"
    rm "$daily"
  done
  ```

**PostToolUse Hook Chain** (Multiple focused scripts executed in sequence)

**1. Schema Validation Hook** (`schema-validate.sh`)
- **Purpose**: Validate CARL files against schema definitions
- **Issue Resolved**: Ensures all CARL files maintain schema compliance
- **Key Implementation**:
  ```bash
  # Validate and process CARL files when modified
  if [[ "$TOOL_INPUT_file_path" =~ \.carl$ ]]; then
    carl_file="$TOOL_INPUT_file_path"
    
    # Schema validation first
    validation_error=""
    
    # Check required fields based on file type
    if [[ "$carl_file" =~ \.(epic|feature|story|tech)\.carl$ ]]; then
      # Validate required fields exist
      if ! grep -q "^id:" "$carl_file"; then
        validation_error="Missing required field: id"
      elif ! grep -q "^name:" "$carl_file"; then
        validation_error="Missing required field: name"
      elif ! grep -q "^completion_percentage:" "$carl_file"; then
        validation_error="Missing required field: completion_percentage"
      elif ! grep -q "^current_phase:" "$carl_file"; then
        validation_error="Missing required field: current_phase"
      elif ! grep -q "^acceptance_criteria:" "$carl_file"; then
        validation_error="Missing required field: acceptance_criteria"
      else
        # Validate field values
        completion=$(grep -oP '(?<=completion_percentage: )\d+' "$carl_file")
        if ! [[ "$completion" =~ ^[0-9]+$ ]] || [ "$completion" -gt 100 ]; then
          validation_error="Invalid completion_percentage: must be 0-100"
        fi
        
        phase=$(grep -oP '(?<=current_phase: ).*' "$carl_file")
        if ! [[ "$phase" =~ ^(planning|development|testing|integration|complete)$ ]]; then
          validation_error="Invalid current_phase: must be planning|development|testing|integration|complete"
        fi
      fi
    fi
    
    # If validation fails, send back to Claude Code for fixing
    if [[ -n "$validation_error" ]]; then
      echo "⚠️ CARL file validation failed: $validation_error"
      echo "📋 Schema validation error in $carl_file"
      echo "🔧 Please fix the file according to the CARL schema requirements:"
      echo ""
      echo "Required fields for $(basename "$carl_file" | cut -d'.' -f2) files:"
      echo "- id: snake_case_id"
      echo "- name: \"Human readable name\""
      echo "- completion_percentage: 0-100"
      echo "- current_phase: enum[planning|development|testing|integration|complete]"
      echo "- acceptance_criteria: [\"criteria1\", \"criteria2\", ...]"
      echo ""
      echo "Validation error: $validation_error"
      exit 1  # This will cause Claude Code to see the error and fix the file
    fi
    
    # If validation passes, proceed with completion processing
    completion=$(grep -oP '(?<=completion_percentage: )\d+' "$carl_file")
    
    # If 100% complete and TDD project, run tests
    if [[ "$completion" == "100" ]]; then
      process_file=".carl/project/process.carl"
      methodology=$(grep "methodology:" "$process_file" | cut -d'"' -f2)
      
      if [[ "$methodology" == "TDD" ]]; then
        test_cmd=$(grep "test_command:" "$process_file" | cut -d'"' -f2)
        if ! eval "$test_cmd" >/dev/null 2>&1; then
          echo "❌ Tests failing - cannot mark work as complete"
          sed -i 's/completion_percentage: 100/completion_percentage: 95/' "$carl_file"
        else
          echo "✅ Schema validation passed, tests passing - moving to completed/"
          # Move to completed/ subdirectory
          completed_dir="$(dirname "$carl_file")/completed"
          mkdir -p "$completed_dir"
          mv "$carl_file" "$completed_dir/"
        fi
      else
        echo "✅ Schema validation passed - work item complete"
        # Move to completed/ subdirectory (non-TDD project)
        completed_dir="$(dirname "$carl_file")/completed"
        mkdir -p "$completed_dir"
        mv "$carl_file" "$completed_dir/"
      fi
    validation_error="Invalid current_phase: must be planning|development|testing|integration|complete"
  fi
fi

# If validation fails, exit with error (stops hook chain)
if [[ -n "$validation_error" ]]; then
  echo "⚠️ CARL file validation failed: $validation_error"
  echo "📋 Schema file: .carl/schemas/${carl_file_type}.schema.yaml"
  exit 1
fi
```

**2. Progress Tracking Hook** (`progress-track.sh`)
- **Purpose**: Update completion status in session files
- **Issue Resolved**: Automatic progress tracking and session logging
- **Key Implementation**:
```bash
# Update session file with progress when CARL files modified
if [[ "$TOOL_INPUT_file_path" =~ \.carl$ ]]; then
  session_file=".carl/sessions/session-$(date +%Y-%m-%d)-$(git config user.name).carl"
  completion=$(grep -oP '(?<=completion_percentage: )\d+' "$TOOL_INPUT_file_path")
  
  # Log progress update to session
  echo "$(date +%H:%M:%S) - Progress update: $(basename "$TOOL_INPUT_file_path") → ${completion}%" >> "$session_file"
fi
```

**3. Quality Gate Hook** (`quality-gate.sh`)
- **Purpose**: Enforce TDD gates when completion reaches 100%
- **Issue Resolved**: Prevents marking work complete when tests fail
- **Key Implementation**:
```bash
# Only run for 100% complete CARL files in TDD projects
if [[ "$TOOL_INPUT_file_path" =~ \.carl$ ]]; then
  completion=$(grep -oP '(?<=completion_percentage: )\d+' "$TOOL_INPUT_file_path")
  
  if [[ "$completion" == "100" ]]; then
    methodology=$(grep "methodology:" ".carl/project/process.carl" | cut -d'"' -f2)
    
    if [[ "$methodology" == "TDD" ]]; then
      test_cmd=$(grep "test_command:" ".carl/project/process.carl" | cut -d'"' -f2)
      if ! eval "$test_cmd" >/dev/null 2>&1; then
        echo "❌ Tests failing - cannot mark work as complete"
        sed -i 's/completion_percentage: 100/completion_percentage: 95/' "$TOOL_INPUT_file_path"
        exit 1
      fi
    fi
  fi
fi
```

**4. Completion Handler Hook** (`completion-handler.sh`)
- **Purpose**: Move completed work items to completed/ subdirectory
- **Issue Resolved**: Automatic file organization when work items finish
- **Key Implementation**:
```bash
# Move 100% complete CARL files to completed/ subdirectory
if [[ "$TOOL_INPUT_file_path" =~ \.carl$ ]]; then
  completion=$(grep -oP '(?<=completion_percentage: )\d+' "$TOOL_INPUT_file_path")
  
  if [[ "$completion" == "100" ]]; then
    completed_dir="$(dirname "$TOOL_INPUT_file_path")/completed"
    mkdir -p "$completed_dir"
    mv "$TOOL_INPUT_file_path" "$completed_dir/"
    echo "✅ Work item moved to completed: $(basename "$TOOL_INPUT_file_path")"
  fi
fi
```

**5. Tech Debt Extraction Hook** (`tech-debt-extract.sh`)
- **Purpose**: Extract TODO/FIXME/HACK comments from edited files
- **Issue Resolved**: Automatic technical debt tracking
- **Key Implementation**:
```bash
# Extract technical debt markers from any edited file
if [[ "$TOOL_NAME" =~ ^(Write|Edit|MultiEdit)$ ]]; then
  file_path="${TOOL_INPUT_file_path}"
  grep -n "TODO\\|FIXME\\|HACK" "$file_path" | while read -r line; do
    echo "$(date +%Y-%m-%d)|$file_path|$line" >> ".carl/project/tech-debt.carl"
  done
fi
```

#### **Hook Security & Performance**
- **60-second timeout**: All hooks must complete within timeout
- **Parallel execution**: Hooks run in parallel, design accordingly
- **Path validation**: Always use `CLAUDE_PROJECT_DIR` for paths
- **Minimal processing**: Keep hooks lightweight for performance
- **Error handling**: Fail gracefully, don't break Claude Code flow
- **Dependencies**: `yq` recommended for full monorepo support (graceful fallback to grep/sed parsing if not available)

### Context Injection Strategy

**Token Budget Management**:
- **Hook Injection**: 100 tokens maximum (active work + date info only)
- **Command Context**: 500-1000 tokens (strategic files when needed)
- **Agent Context**: 2000+ tokens (deep analysis with full file access)

**Context Loading Hierarchy**:
1. **Minimal Hook Context** (Always - 100 tokens):
   - Active work ID and completion percentage
   - Current date, yesterday, current week (prevents hallucination)
   - Session file reference
   - Injected for all `/carl:*` commands via UserPromptSubmit hook

2. **Strategic Context** (Commands - 300-500 tokens):
   - `vision.carl`, `roadmap.carl`, `process.carl` loaded by `/carl:plan` and `/carl:analyze`
   - NOT injected by hooks (too large for every request)
   - Commands read directly when planning or analysis needed

3. **Targeted Context** (Commands - 200-500 tokens):
   - Specific scope files loaded based on command arguments
   - `/carl:task user-auth.feature.carl` → loads that specific file + dependencies
   - Parent/child relationships loaded intelligently

4. **Deep Context** (Agents - 1000+ tokens):
   - Full CARL file analysis when agents are invoked
   - Cross-reference validation and relationship mapping
   - Complete project context for specialized analysis

**Context Selection Algorithm**:
```bash
# Priority order for context selection when token budget limited:
1. Active work item (always included)
2. Date/session info (prevents hallucination) 
3. Directly referenced files (command arguments)
4. Parent work items (hierarchical context)
5. Related dependencies (if tokens remain)
6. Strategic context (vision/roadmap if relevant)
```

## Session Management System

### Daily Session Files
**Structure**: `session-YYYY-MM-DD-{git-user}.carl`
- **One file per day per developer** - prevents file explosion
- **Git user identification** - automatic developer attribution
- **Automatic cleanup** - removes old sessions on first daily update

### Session File Format
```yaml
# session-2025-08-01-clayton.carl
developer: "clayton"  # From git config user.name
date: "2025-08-01"
session_summary:
  start_time: "08:30:00Z"
  end_time: "17:45:00Z"
  total_active_time: "7.5 hours"
  
work_periods:
  - start: "08:30:00Z"
    end: "12:00:00Z"
    focus: "user-authentication.feature.carl"
    context: "Implementing JWT validation"
    commits: ["abc123f", "def456g"]
    
  - start: "13:00:00Z"
    end: "17:45:00Z"
    focus: "password-reset.story.carl"
    context: "Email template integration"
    commits: ["ghi789h"]

active_context_carryover:
  # Context preserved for next day's session
  
cleanup_log:
  - cleaned_date: "2025-07-01"
    retention_period: "90_days"
```

### Session Compaction & Retention
- **Daily Sessions**: Individual files for 7 days
- **Weekly Summaries**: Compact 7+ day old sessions into `week-YYYY-WW-{git-user}.carl`
- **Monthly Summaries**: Compact 4+ week old weeklies into `month-YYYY-MM-{git-user}.carl`
- **Quarterly Summaries**: Compact 3+ month old monthlies into `quarter-YYYY-Q#-{git-user}.carl`
- **Yearly Archives**: Compact 4+ quarter old quarterlies into `year-YYYY-{git-user}.carl`
- **Never Delete**: Year files are kept permanently (small and valuable)

### Compaction Strategy
- **Trigger**: First session update of each day (SessionStart hook)
- **Process**: Progressive compaction using simple bash aggregation
- **Content Preserved**: Work summaries, time tracking, key accomplishments
- **File Structure**: Organized by time period in `.carl/sessions/archive/`
- **Minimal Code**: ~40 lines of bash can handle all compaction

### Example Compaction (in hook):
```bash
# Compact daily sessions older than 7 days into weekly
find .carl/sessions -name "session-*-${user}.carl" -mtime +7 | while read daily; do
  week=$(date -d "@$(stat -c %Y "$daily")" +%Y-%V)
  cat "$daily" >> ".carl/sessions/archive/week-${week}-${user}.carl"
  rm "$daily"
done
```

### Review Capabilities
- **Yesterday**: `/carl:status --yesterday` - Reads specific daily session file
- **Last Week**: `/carl:status --week` - Reads current/previous week summary
- **Last Month**: `/carl:status --month` - Reads current/previous month summary
- **Last Quarter**: `/carl:status --quarter` - Reads current/previous quarter summary
- **Last Year**: `/carl:status --year` - Reads current/previous year archive

**Date Handling**: The UserPromptSubmit hook injects current date information with every CARL command, ensuring Claude Code always knows the correct date for session file lookups. This prevents date hallucination issues.

## Multi-Developer Coordination

### Branch-Based Development Model
**Core Principle**: Each developer works in their own git branch with independent CARL state

**Developer Isolation**:
- **Session Files**: `session-YYYY-MM-DD-{git-user}.carl` automatically isolates by developer
- **Work Item Ownership**: One developer per work item (epic/feature/story/technical)
- **Branch Independence**: CARL files track progress independently per branch
- **No Concurrent Editing**: Developers don't share active work items simultaneously

### Git Integration Strategy
**Branch Workflow**:
```
main branch: Completed work items only (in completed/ subdirectories)
feature/epic-name: Developer's active work items + session files
feature/story-name: Developer's story-specific work + session files
```

**Merge Behavior**:
- **Completed Work**: Automatically merges (files in completed/ subdirectories)
- **Session Files**: Branch-specific, merge conflicts rare (different developers)
- **Active Work**: Typically only one active work item per branch
- **Conflict Resolution**: Standard git merge resolution for CARL files

### Work Assignment Model
**Single Owner Principle**:
- **Epic**: One developer owns the epic (can delegate features)
- **Feature**: One developer owns the feature (can delegate stories)
- **Story**: One developer owns the story (atomic work unit)
- **Technical**: One developer owns the technical work item

**Coordination Through Git**:
- **Work Handoff**: Complete work item → move to completed/ → merge branch
- **Parallel Work**: Different developers work on different features within same epic
- **Progress Visibility**: Completed work visible in main branch, active work in feature branches

### Conflict Prevention
**Natural Isolation**:
- **File Paths**: Different work items = different file paths
- **Session Separation**: Git username in session files prevents conflicts
- **Completion State**: Only completed work merges to main branch
- **Active Work**: `active.work.carl` per branch, no shared active state

**Session files are organized under `.carl/sessions/` as shown in the main Directory Structure above.**

## Quality Standards

### Universal Completion Criteria
**Story Completion** (Always Required):
- All acceptance criteria met in scope file
- Scope file updated with 100% completion
- Integration points documented
- Work moved to `completed/` subdirectory

**Feature Completion** (Always Required):
- All child stories completed
- Feature objectives achieved
- Documentation updated
- Stakeholder acceptance confirmed

**Epic Completion** (Always Required):
- All child features completed
- Strategic objectives achieved
- Epic goals validated
- Architecture documented

### Project-Specific Quality Gates
Quality gates are determined by `.carl/project/process.carl` file:

**TDD Projects** (When `process.carl` includes TDD):
- **Test-First Enforcement**: PostToolUse hook blocks completion until tests pass
- **Business Rule Coverage**: 100% of acceptance criteria must have passing tests (current work only)
- **Code Coverage Goal**: Team-defined target (e.g., 80%) for overall codebase metrics
- **Red-Green-Refactor**: Hook enforces failing test → implementation → passing test
- **Minimal Code Principle**: Only code needed to pass business rule tests

**Coverage Distinction**:
- **Business Rule Coverage (100% Required)**: All acceptance criteria in current scope file must have tests
- **Code Coverage (Team Goal)**: Overall project metric tracked in status reports, not enforced per work item

**Non-TDD Projects**:
- Manual testing acceptable
- Documentation of testing approach
- Completion based on acceptance criteria

### Implementation Notes
- **TDD Gate**: PostToolUse hook conditionally blocks completion when tests fail (TDD projects only)
- **Monorepo Support**: Detects app-specific methodology based on edited file path
- **Graceful Fallback**: Works with or without `yq` dependency for YAML parsing
- **Full Implementation**: `.carl/hooks/progress-track.sh`

## Error Handling & Recovery

### CARL File Validation

**Automatic Schema Validation** (Built into PostToolUse Hook):
- **Trigger**: Every time a `.carl` file is modified via Write/Edit/MultiEdit tools
- **Validation Checks**: Required fields, field value ranges, enum validation
- **Failure Response**: Hook exits with error message and schema guidance → Claude Code receives error → User fixes file
- **Success Response**: Proceeds with completion processing and quality gates

**Schema Validation Logic**:
```bash
# Schema-based validation using .carl/schemas/ directory
carl_file_type=$(basename "$carl_file" | cut -d'.' -f2)  # epic, feature, story, tech
schema_file=".carl/schemas/${carl_file_type}.schema.yaml"

# Use yq to validate against schema (with fallback to grep)
if command -v yq >/dev/null 2>&1 && [[ -f "$schema_file" ]]; then
  # Formal schema validation with yq
  if ! yq eval-all 'select(fileIndex == 0) as $schema | select(fileIndex == 1) | validate($schema)' \
       "$schema_file" "$carl_file" >/dev/null 2>&1; then
    validation_error="File does not match schema: $schema_file"
  fi
else
  # Fallback to basic field validation (existing logic)
  required_fields=("id" "name" "completion_percentage" "current_phase" "acceptance_criteria")
  for field in "${required_fields[@]}"; do
    if ! grep -q "^${field}:" "$carl_file"; then
      validation_error="Missing required field: $field"
      break
    fi
  done
fi
```

**Schema Error Response Strategy**:
1. **Hook Validation Failure** → Error message with schema file reference displayed to user
2. **Claude Code Context** → Specific schema file (`.carl/schemas/[type].schema.yaml`) automatically loaded for fixing
3. **User Correction** → Edit file according to schema guidance from `.carl/schemas/`  
4. **Re-validation** → Hook validates again on next file save using same schema
5. **Success Path** → Proceed with normal completion processing

**Schema Integration Benefits**:
- **Centralized Schema Management**: All validation rules in `.carl/schemas/` directory
- **Consistent Validation**: Hooks, commands, and agents use same schema files
- **Context-Rich Errors**: Specific schema file provided for fixing validation failures
- **Version Control**: Schema files tracked in git alongside CARL files
- **Agent Integration**: Sub-agents can reference schemas for consistent CARL file generation

**Schema Usage Throughout CARL System**:
- **PostToolUse Hook**: Validates CARL files against schemas before processing
- **Commands**: Reference schemas when creating new CARL files
- **Sub-agents**: Use schemas to ensure consistent file generation (`carl-requirements-analyst`, etc.)
- **Error Recovery**: Schema files provide context for automatic error correction

### Hook Failure Handling
**Hook Timeout (60 seconds)**:
- **Graceful Degradation**: System continues without hook output if timeout exceeded
- **Logging**: Hook failures logged to `.carl/system/hook-errors.log`
- **Retry Strategy**: No automatic retry - hook failures should not block Claude Code

**Hook Error Recovery**:
- **Non-blocking**: Hook failures never prevent command execution
- **Error Isolation**: One hook failure doesn't affect other hooks
- **Fallback Behavior**: Commands work without hook-provided context (reduced functionality)

### Agent Error Handling
**Agent Invocation Failures**:
- **Missing Agent Definitions**: Commands continue with reduced functionality, log missing agent
- **Agent Execution Errors**: Graceful fallback to manual processing, error logging
- **Context Loading Failures**: Agents work with partial context, request manual input when needed

**Agent Recovery Protocol**:
```
1. Detect agent failure (timeout, error response, missing agent)
2. Log failure details to session file
3. Continue command execution with fallback behavior
4. Notify user of reduced functionality
5. Suggest manual verification of results
```

### Command Error Handling
**File Access Errors**:
- **Missing CARL Files**: Create from template with user confirmation
- **Permission Errors**: Clear error message with suggested filesystem fixes
- **Lock File Conflicts**: Retry with exponential backoff, manual override option

**Workflow Interruption Recovery**:
- **Partial Completion**: Save intermediate state to work item files
- **Resume Capability**: Commands detect partial work and offer to continue
- **Rollback Option**: Undo partial changes when user requests

### System Health Monitoring
**Health Check Indicators**:
- **CARL File Integrity**: Schema validation across all files
- **Hook Functionality**: Test hooks with dummy data
- **Agent Availability**: Verify core agent definitions exist
- **File System Health**: Check `.carl/` directory structure and permissions

**Automatic Recovery Actions**:
- **Missing Directories**: Auto-create `.carl/project/`, `.carl/sessions/` structure
- **Corrupted Templates**: Regenerate from built-in schemas
- **Permission Issues**: Clear instructions for manual filesystem repair
- **Agent Definition Repair**: `carl-agent-builder` can recreate missing core agents

### Error Logging Strategy
**Error Categories**:
- **FATAL**: System cannot continue (missing .carl directory, permission denied)
- **ERROR**: Feature degraded (hook failure, agent unavailable, file corruption)
- **WARNING**: Minor issues (validation warnings, performance concerns)
- **INFO**: Normal operation logging (work item updates, session tracking)

**Log Locations**:
- **Hook Errors**: `.carl/system/hook-errors.log`
- **Session Activity**: `.carl/sessions/session-YYYY-MM-DD-{user}.carl`
- **System Health**: `.carl/system/health-check.log`
- **Agent Errors**: Individual agent execution logs in session files

### Process File Example
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

## Audio System (Future Enhancement)

### Current Implementation
**Notification Hook Only**: Cross-platform TTS for "[project-name] needs your attention"
- **macOS**: `say -v "Samantha"`
- **Linux**: `spd-say` or `espeak` fallback
- **Windows**: PowerShell System.Speech

### Future Wishlist
**Custom Character System** (Planned):
- User-configurable "cast of characters" for development interaction
- Default characters based on Jimmy Neutron (Carl, Jimmy, Sheen, Cindy, etc.)
- Support for any character arrangement or theme (custom voices, personalities, catchphrases)
- Character-specific development encouragement and contextual feedback
- Audio categories for different development events (start, progress, success, errors, etc.)
- Personality-driven responses based on development context and progress
- Configurable quiet mode, quiet hours, volume control, and character selection
- Enhanced cross-platform audio system with character voice customization

## Agent Architecture & Recommendations

### Core CARL System Agents (Required)
1. **`carl-agent-builder`** ✅ - Dynamic agent generation based on project needs
2. **`carl-requirements-analyst`** ✅ - Requirements gathering and scope analysis for /carl:plan
3. **`carl-session-analyst`** 📋 - Session data analysis and reporting for /carl:status
4. **`carl-mcp-configurator`** 🔌 - MCP detection and configuration for enhanced capabilities

### Agent Architecture Overview
```
Core CARL Agents (Built-in):
├── carl-agent-builder (creates project agents)
├── carl-requirements-analyst (planning support)
├── carl-session-analyst (reporting support)
└── carl-mcp-configurator (MCP integration)

Project Agents (Generated with project- prefix):
├── project-[technology] (javascript, python, go, csharp, etc.)
├── project-[domain] (api, database, frontend, security, etc.)
└── project-[custom] (project-specific needs)
```

**Examples by Project Type**:
- **.NET API**: `project-csharp`, `project-api`, `project-tdd`
- **React Frontend**: `project-react`, `project-typescript`, `project-frontend`
- **Node.js Backend**: `project-nodejs`, `project-express`, `project-database`

### Integration Strategy

**Claude Code Sub-Agent Architecture:**
- **Core CARL Agents**: Built-in agents with CARL-specific instructions and file permissions
- **Project Agents**: Generated by `carl-agent-builder` with project-specific context and permissions
- **Automatic Invocation**: Custom `/carl:*` commands launch appropriate agents based on task requirements
- **File Permissions**: Agents granted Read/Write/MultiEdit access to relevant CARL files only
- **Context-Aware**: Agents receive CARL file schemas and project context automatically

**Agent Integration Flow:**
```
/carl:plan → carl-requirements-analyst + project-[domain] agents
/carl:task → project-[technology] + project-[domain] agents  
/carl:analyze → carl-analyze-specialist + generated project agents
/carl:status → carl-session-analyst
```

**CARL File Interaction Protocol:**
- **Read Access**: All agents can read CARL files for context understanding
- **Write Access**: Only authorized agents can create/modify specific file types
- **Schema Compliance**: All agents must follow CARL file schema definitions
- **Progress Updates**: Agents update `completion_percentage` and `current_phase` fields
- **Relationship Maintenance**: Agents maintain parent/child relationships in hierarchical files

## MCP (Model Context Protocol) Integration

### Overview
CARL v2 supports MCP integration to enhance capabilities through external tools and data sources. MCPs enable structured access to external systems without complex shell scripting.

### Core CARL MCPs
**System-level enhancements for all CARL projects:**
- **Git MCP**: Enhanced git operations for `/carl:analyze --sync` and change detection
- **Time Tracking MCP**: Professional time tracking integration for session management
- **Metrics Database MCP**: Persistent storage for cross-project analytics and velocity data

### Project-Specific MCPs
**Detected and configured based on project technology stack:**
- **Database MCPs**: PostgreSQL, MySQL, MongoDB for database-driven applications
- **Cloud Provider MCPs**: AWS, Azure, GCP for deployment and infrastructure tasks
- **API Testing MCPs**: Postman, REST client tools for API development
- **Domain-Specific MCPs**: Jupyter for ML projects, Docker for containerized apps

### MCP Configuration Workflow
1. **Detection**: `/carl:analyze` invokes `carl-mcp-configurator` to identify MCP opportunities
2. **Research**: Agent researches available MCPs matching project needs
3. **Configuration**: Generates `.mcp.json` with security-first approach
4. **Integration**: Updates `process.carl` with MCP-enhanced workflows
5. **Agent Enhancement**: Recommends MCP tools for existing agents

### Security Considerations
- **Credential Management**: Use environment variables, never hardcode credentials
- **Minimal Permissions**: Configure MCPs with least-privilege access
- **Validation**: Test MCP configurations in isolated environments first
- **Documentation**: Document all configured MCPs in project README

### Example MCP Configuration
```json
{
  "mcps": {
    "git-mcp": {
      "command": "git-mcp-server",
      "args": ["--repo", "."]
    },
    "github": {
      "command": "github-mcp-server",
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "postgres": {
      "command": "postgres-mcp-server",
      "args": ["--connection-string", "${DATABASE_URL}"]
    }
  }
}
```

---

## Changelog

### 2025-08-01 - Architecture Updates
1. **Removed `/carl:settings` command** - Simplified to four core commands for clarity
2. **Consolidated to Single-File System** - Combined all work item information into single scope-specific files:
   - `[name].intent.carl` + `[name].state.carl` + `[name].context.carl` → `[name].epic.carl`, `[name].feature.carl`, `[name].story.carl`, `[name].tech.carl`
   - Each file contains: requirements, progress, and relationship context
   - Benefits: Atomic operations, simplest mental model (1 work item = 1 file), single read for complete picture, easier maintenance
3. **Updated naming conventions** - Scope-specific extensions provide instant recognition and maintain template connections
4. **Updated file path rules** - Reflects new single-file structure while maintaining directory organization
5. **Eliminated context file complexity** - No separate context files to maintain or keep synchronized
6. **Enhanced Session Management** - Daily session files per developer with automatic cleanup:
   - Format: `session-YYYY-MM-DD-{git-user}.carl` - prevents file explosion
   - Git user identification for multi-developer teams
   - Configurable retention periods (30 days, 90 days, 1 year)
   - Built-in review capabilities (daily standups, quarterly reviews, yearly retrospectives)
   - Individual cleanup responsibility - each developer manages their own sessions
7. **Refined `/carl:analyze` Purpose** - Focused on strategic foundation rather than feature discovery:
   - Primary role: Technology stack analysis, architecture pattern recognition, strategic artifact generation
   - Interactive validation with developer for assumptions and refinements
   - Specialized agent creation based on detected technology stack (e.g., C# API → project-csharp, project-api)
   - No longer responsible for feature/story/epic discovery (that belongs in `/carl:plan`)
   - Sync mode detects changes affecting strategic artifacts or agent requirements
8. **Dynamic Agent Creation in `/carl:plan`** - Intelligent, on-demand specialist creation:
   - Agent gap detection automatically identifies missing domain expertise during planning
   - Immediate agent creation and usage (no Claude Code restart required)
   - Contextual agent lifecycle management based on planning outcomes
   - Permanent agents for core application technologies, temporary agents for research/evaluation
   - Auto-discovery mechanism allows new agents to immediately access project context through strategic artifacts
9. **Enhanced Workflow Integration**: `/carl:task` auto-invokes `/carl:plan` for breakdown, parallel execution of independent stories
10. **Intelligent Execution Management**: Smart scope handling, dependency analysis, mixed-mode epic/feature orchestration
11. **Project Agent Naming Convention** - Established `project-` prefix for generated agents:
   - Core CARL agents: `carl-agent-builder`, `carl-requirements-analyst`, `carl-session-analyst`
   - Project agents: `project-[technology]`, `project-[domain]`, `project-[custom]`
   - Clear separation between system agents and project-specific agents

---

**Next Steps**: Workshop this documentation to ensure accuracy and completeness before implementing the management agent architecture.