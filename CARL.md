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
7. **Specialized Agent Creation**: Generate project-specific agents based on technology stack

**Examples of Generated Agents**:
- **.NET API Project**: `carl-csharp-specialist`, `carl-api-specialist`, `carl-tdd-specialist`
- **React Frontend**: `carl-react-specialist`, `carl-typescript-specialist`, `carl-frontend-specialist`
- **Node.js Backend**: `carl-nodejs-specialist`, `carl-express-specialist`, `carl-database-specialist`

**Modes**:
- `--sync`: Detect code changes that affect strategic artifacts or require new agents
- `--comprehensive`: Deep analysis with full technology assessment and interactive validation
- `--changes-only`: Analyze recent git changes for strategic implications only

### `/carl:plan` - Intelligent Planning
**Purpose**: Context-aware planning that adapts to scope and complexity

**Planning Modes**:
- **New Work Item**: Create single work item at determined scope level
- **Scope Breakdown**: Break down existing work item to next level (Epic → Features, Feature → Stories)

**Auto-Scope Detection** (for new items):
- **Epic Level**: Complex requests requiring architecture analysis
- **Feature Level**: User-facing capabilities needing detailed specs
- **Story Level**: Implementation tasks with clear deliverables
- **Technical Level**: Infrastructure and process improvements

**Process**:
1. **Context Loading**: Gather relevant existing CARL files and strategic artifacts
2. **Initial Requirements Gathering**: Interactive questioning to understand the request
3. **Agent Gap Detection**: Assess if appropriate domain specialists exist for the planning task
4. **Dynamic Agent Creation**: If gaps exist, invoke `carl-agent-builder` to create needed specialists immediately
5. **Specialist Consultation**: Deploy available agents (existing + newly created) for domain expertise
6. **Deep Requirements Analysis**: Detailed exploration with specialist input and clarifying questions
7. **Scope Analysis**: Determine appropriate level (epic/feature/story/technical) based on full understanding
8. **CARL Generation**: Create structured planning documents with proper scope and specialist input
9. **Scope Breakdown** (if applicable): Break down higher-level items into child work items
10. **Next Step Recommendation**: Suggest specific next action (further breakdown or implementation)
11. **Agent Lifecycle Decision**: Keep agents that address core application needs, remove research-only agents
12. **Validation**: Ensure completeness and consistency

**Scope Breakdown Examples**:
- **Epic Breakdown**: `user-authentication.epic.carl` → `registration.feature.carl`, `login.feature.carl`, `password-reset.feature.carl`
- **Feature Breakdown**: `user-registration.feature.carl` → `email-validation.story.carl`, `password-strength.story.carl`, `user-profile-creation.story.carl`

**Next Step Recommendations**:
- **Further Breakdown Needed**: "Break down `user-authentication.epic.carl` using `/carl:plan user-authentication.epic.carl`"
- **Ready for Implementation**: "Start work on `email-validation.story.carl` using `/carl:task email-validation.story.carl`"
- **Dependencies First**: "Complete `database-schema.tech.carl` before starting user registration features"

**Agent Auto-Discovery**:
- Newly created agents automatically discover project context through strategic artifacts
- Agents access `vision.carl`, `roadmap.carl`, `process.carl` for technology stack and patterns
- No manual agent configuration required - context flows automatically

**Agent Lifecycle Management**:
- **Keep Permanent**: Agents for core application technologies (React → `carl-react-specialist`)
- **Remove After Planning**: Research agents for options not selected (GraphQL evaluation → remove `carl-graphql-specialist`)
- **Contextual Decision**: Lifecycle determined by actual planning outcomes, not predetermined rules

### `/carl:task` - Context-Aware Execution
**Purpose**: Execute development work with full CARL context integration

**Scope-Based Workflow**:
- **Story/Technical Items**: Assume planning complete, proceed with implementation (if dependencies satisfied)
- **Epic/Feature Items**: Automatically invoke `/carl:plan` to break down into implementable work items

**Implementation Workflow** (for Story/Technical items):
1. **Context Validation**: Verify scope files exist and dependencies are satisfied
2. **TDD Enforcement**: Red-Green-Refactor cycle required
3. **Progress Tracking**: Real-time progress updates within scope files
4. **Quality Gates**: Automated validation at each phase
5. **Completion Verification**: Comprehensive testing and documentation

**Planning Workflow** (for Epic/Feature items):
1. **Automatic Planning Invocation**: Execute `/carl:plan [work-item]` to break down scope
2. **Iterative Breakdown**: Continue until story/technical level items are created
3. **Dependency Resolution**: Ensure all prerequisites are identified and satisfied
4. **Implementation Readiness**: Confirm work items are ready for development

### `/carl:status` - Project Health Dashboard
**Purpose**: AI-powered progress monitoring with actionable insights

**Provides**:
- Implementation progress across all scopes
- Quality metrics and test coverage analysis
- Technical debt identification with effort estimates
- Next priority recommendations based on dependencies
- Resource allocation and velocity tracking

## File Structure & Organization

### Directory Structure
```
.carl/
├── project/
│   ├── epics/           # Strategic initiatives (3-6 months)
│   ├── features/        # User capabilities (2-4 weeks)
│   ├── stories/         # Implementation tasks (2-5 days)
│   ├── technical/       # Infrastructure & process (varies)
│   ├── completed/       # Automatically moved completed items
│   ├── vision.carl      # Strategic project vision
│   ├── roadmap.carl     # Development roadmap
│   └── process.carl     # Team processes and standards
├── sessions/            # Daily session tracking per developer
├── templates/           # CARL file templates
├── system/             # Core system definitions
├── config/             # Configuration files
└── active.work.carl    # Current work queue and priorities
```

### Critical File Path Rules
**NEVER DEVIATE - Enforced by all agents**:
- Epic files: `.carl/project/epics/[name].epic.carl`
- Feature files: `.carl/project/features/[name].feature.carl`
- Story files: `.carl/project/stories/[name].story.carl`
- Technical files: `.carl/project/technical/[name].tech.carl`
- Completed items: Move entire directory to `completed/` subdirectory

### Naming Conventions
- **Epic files**: `kebab-case-descriptive-name.epic.carl`
- **Feature files**: `kebab-case-descriptive-name.feature.carl`
- **Story files**: `kebab-case-descriptive-name.story.carl`
- **Technical files**: `kebab-case-descriptive-name.tech.carl`
- **IDs**: `snake_case_descriptive_id`
- **Scope directories**: `epics/`, `features/`, `stories/`, `technical/`

## Integration Architecture

### Claude Code Hooks
CARL operates through Claude Code's hook system:
- **Session Start**: Load CARL context, initialize daily session tracking, cleanup old sessions
- **User Prompt Submit**: Inject relevant context into AI requests
- **Tool Call**: Track progress, update scope files automatically, log session activity
- **Session End**: Save state, generate summaries, move completed items, update daily session

### Context Injection Strategy
**Automatic Context Loading**:
1. **Active Work Context**: Current work queue and priorities
2. **Strategic Context**: Vision, roadmap, objectives for alignment
3. **Targeted Context**: Specific CARL files relevant to current task
4. **Session Context**: Development patterns and preferences

**Token Budget Management**:
- Lazy loading of workflow definitions
- Intelligent context selection based on relevance
- Sub-100ms context processing target
- Hierarchical context prioritization

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

### Retention Policy
- **30 days**: Recent context for immediate reference and daily standups
- **90 days**: Quarterly reviews and velocity tracking
- **1 year**: Yearly retrospectives and performance reviews
- **Archive/Delete**: After 1 year, compress to summary data

### Cleanup Strategy
- **Trigger**: First session update of each day
- **Scope**: Only current git user's sessions (individual responsibility)
- **Process**: Automatic, no manual intervention required
- **Safety**: Configurable retention periods with logging

### Review Capabilities
**Daily Standups**: `/carl:status --daily` - What did I work on yesterday?
**Quarterly Reviews**: `/carl:status --quarter` - Progress and achievements over 3 months
**Yearly Reviews**: `/carl:status --yearly` - Annual accomplishments and growth

## Quality Standards

### TDD Enforcement
- **Red Phase**: Failing tests required before implementation
- **Green Phase**: Minimal code to pass tests
- **Refactor Phase**: Code quality improvement with passing tests
- **Documentation**: Updated CARL files with each phase

### Completion Criteria
**Story Completion**:
- All acceptance criteria met
- Unit and integration tests passing
- Scope file updated with 100% completion
- Integration points updated within scope file

**Feature Completion**:
- All child stories completed
- End-to-end testing complete
- Documentation updated
- Stakeholder acceptance confirmed

**Epic Completion**:
- All child features completed
- Architecture validated
- Performance requirements met
- Strategic objectives achieved

### Validation Gates
1. **Requirements Validation**: Requirements clarity and completeness in scope files
2. **Implementation Validation**: Code quality and test coverage
3. **Integration Validation**: System compatibility and performance
4. **Acceptance Validation**: User needs and business value

## Audio System & Personalities

### Jimmy Neutron Character System
**Available Characters**: Carl, Jimmy, Sheen, Cindy, Libby, Ms. Fowl, Judy, Sam, Principal Willoughby

**Audio Categories**:
- **Start**: Session beginning encouragement
- **Work**: Task initiation motivation  
- **Progress**: Milestone achievement celebration
- **Success**: Test passing, build success confirmation
- **End**: Session completion summary

**Configuration**:
- Quiet mode and quiet hours support
- Volume control and character selection
- TTS fallback with character-appropriate voices
- Cross-platform compatibility (macOS, Linux, Windows)

## Agent Architecture & Recommendations

### Current Specialist Agents
1. **`carl-analyze-specialist`** ✅ - Comprehensive codebase analysis and CARL generation
2. **`carl-js-specialist`** ✅ - JavaScript/TypeScript domain expertise
3. **`carl-requirements-analyst`** ✅ - Requirements gathering and scope analysis
4. **`carl-agent-builder`** ✅ - Dynamic agent generation based on project needs
5. **`carl-session-analyst`** 📋 - Session data analysis and reporting specialist

### Recommended CARL Management Agents

#### **1. `carl-system-coordinator` (Primary)**
**Role**: Master orchestrator for all CARL operations
- Ensures commands stay aligned with CARL principles
- Validates CARL file consistency and relationships
- Coordinates between specialist agents
- Enforces CARL workflow standards
- Manages session continuity and context
- **Trigger Keywords**: "carl workflow", "system coordination", "carl compliance"

#### **2. `carl-workflow-enforcer` (Quality Gate)**
**Role**: Prevents anti-patterns and ensures methodology compliance
- Validates TDD workflow adherence (Red-Green-Refactor)
- Prevents implementation without proper requirements (scope files)
- Ensures CARL file structure consistency
- Enforces critical file path rules from master.process.carl
- Quality gates for CARL file generation and updates
- **Trigger Keywords**: "workflow validation", "tdd enforcement", "requirements check"

#### **3. `carl-context-manager` (Performance)**
**Role**: Intelligent context loading and optimization
- Optimizes context selection for AI efficiency and token budgets
- Manages intelligent context injection based on current work
- Maintains session state and work continuity
- Handles context relationship mapping and hierarchies
- Performance optimization for large project structures
- **Trigger Keywords**: "context optimization", "session continuity", "context loading"

#### **4. `carl-session-analyst` (Reporting Specialist)**
**Role**: Session data analysis and developer productivity insights
- Analyzes daily session files for patterns and productivity insights
- Generates daily standup reports, weekly summaries, and retrospective data
- Provides velocity tracking and work pattern analysis
- Creates quarterly and yearly performance reviews
- Identifies productivity bottlenecks and suggests improvements
- Tracks time allocation across different types of work (epic/feature/story/technical)
- **Trigger Keywords**: "daily standup", "session report", "quarterly review", "yearly review", "productivity analysis", "work patterns", "velocity tracking"

**Core Capabilities**:
- **Daily Reports**: "What did I work on yesterday?" with time breakdowns and accomplishments
- **Weekly Summaries**: Progress across active work items with velocity calculations
- **Sprint Retrospectives**: Work pattern analysis and productivity insights for team retrospectives
- **Quarterly Reviews**: Comprehensive analysis of achievements, growth areas, and goal progress
- **Yearly Reviews**: Annual productivity summary with career development insights
- **Pattern Recognition**: Identifies peak productivity times, context switching patterns, and focus areas
- **Time Allocation**: Breaks down time spent on different work types and provides optimization suggestions

**Integration Points**:
- Reads daily session files (`session-YYYY-MM-DD-{git-user}.carl`)
- Correlates with git commit data for comprehensive activity tracking
- Integrates with CARL scope files to understand work context and business impact
- Provides data for project health dashboards and team velocity metrics

### Agent Coordination Pattern
```
carl-system-coordinator (master orchestrator)
├── carl-workflow-enforcer (quality & compliance)
├── carl-context-manager (context & performance)
├── carl-session-analyst (reporting & productivity)
├── carl-analyze-specialist (codebase analysis)
├── carl-js-specialist (JavaScript domain)
└── [domain-specialists] (created dynamically)
```

### Integration Strategy
- **Primary Agent**: `carl-system-coordinator` handles all CARL command workflows
- **Quality Gates**: `carl-workflow-enforcer` validates at each workflow step
- **Context Optimization**: `carl-context-manager` ensures efficient AI context
- **Productivity Insights**: `carl-session-analyst` provides developer productivity analysis and reporting
- **Domain Expertise**: Specialist agents provide technology-specific insights
- **Dynamic Creation**: Agent builder creates project-specific specialists as needed

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
   - Specialized agent creation based on detected technology stack (e.g., C# API → carl-csharp-specialist, carl-api-specialist)
   - No longer responsible for feature/story/epic discovery (that belongs in `/carl:plan`)
   - Sync mode detects changes affecting strategic artifacts or agent requirements
8. **Dynamic Agent Creation in `/carl:plan`** - Intelligent, on-demand specialist creation:
   - Agent gap detection automatically identifies missing domain expertise during planning
   - Immediate agent creation and usage (no Claude Code restart required)
   - Contextual agent lifecycle management based on planning outcomes
   - Permanent agents for core application technologies, temporary agents for research/evaluation
   - Auto-discovery mechanism allows new agents to immediately access project context through strategic artifacts
9. **Enhanced Scope Management and Workflow Integration**:
   - `/carl:task` now automatically invokes `/carl:plan` for Epic/Feature items to break them down
   - `/carl:plan` supports both new work item creation and scope breakdown modes
   - Hierarchical breakdown: Epic → Features, Feature → Stories, with clear examples
   - Next step recommendations guide users on whether to break down further or start implementation
   - Dependency-aware suggestions prevent premature implementation attempts

---

**Next Steps**: Workshop this documentation to ensure accuracy and completeness before implementing the management agent architecture.