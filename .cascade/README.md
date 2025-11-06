# Cascade Work Item System

This directory contains the local canonical format for all work items managed by CARL's orchestration system.

## Purpose

**Cascade is the source of truth** for detailed implementation planning. It provides:
- Structured work breakdown (Projects → Epics → Features → Stories/Bugs → Phases → Tasks)
- Hierarchical directory structure that mirrors work organization
- Dependency tracking
- Progress monitoring with layered state files
- Execution planning

## Directory Structure

```
.cascade/
├── README.md                              # This file
├── P####.md                               # Project file (in root)
├── state.json                             # Project state
├── work-item-registry.json                # ID tracking and path index
└── E####-{epic-slug}/                     # Epic directory
    ├── E####.md                           # Epic markdown file
    ├── state.json                         # Epic state
    └── F####-{feature-slug}/              # Feature directory
        ├── F####.md                       # Feature markdown file
        ├── state.json                     # Feature state
        ├── S####-{story-slug}/            # Story directory
        │   ├── S####.md                   # Story markdown file
        │   ├── state.json                 # Story state
        │   ├── PH####-{phase-slug}/       # Phase directory (optional)
        │   │   ├── PH####.md              # Phase markdown file
        │   │   ├── state.json             # Phase state
        │   │   ├── T####.md               # Task files (no directories)
        │   │   └── T####.md
        │   └── T####.md                   # Task files (if no phase)
        └── B####-{bug-slug}/              # Bug directory
            ├── B####.md                   # Bug markdown file
            ├── state.json                 # Bug state
            └── T####.md                   # Task files
```

## Work Item Hierarchy

```
P#### - Project (highest level, file in root)
  └── E#### - Epic (directory + file)
      └── F#### - Feature (directory + file)
          ├── S#### - Story (directory + file)
          │   ├── PH#### - Phase (directory + file, optional)
          │   │   └── T#### - Task (file only, leaf node)
          │   └── T#### - Task (file only, no phase)
          └── B#### - Bug (directory + file)
              └── T#### - Task (file only)
```

### Key Structure Rules
- **Directories**: Epic, Feature, Story, Bug, Phase all have directories named `{ID}-{slug}/`
- **Files inside directories**: Named just `{ID}.md` (directory name provides context)
- **Tasks**: Always files (leaf nodes), never directories
- **Project**: File only (`P####.md`) in root, no directory
- **State files**: Every directory level has a `state.json`

## State Management

### Layered State Files

Each directory level has a `state.json` that tracks:
- Current status
- Progress metrics (total, completed, in-progress, planned, percentage)
- Children summary (IDs with their status and progress)
- Last updated timestamp

**Example state.json:**
```json
{
  "id": "E0001",
  "status": "in-progress",
  "progress": {
    "total_items": 23,
    "completed": 8,
    "in_progress": 5,
    "planned": 10,
    "percentage": 35
  },
  "children": {
    "F0001": { "status": "in-progress", "progress": 60 },
    "F0002": { "status": "planned", "progress": 0 }
  },
  "updated": "2025-01-05T10:25:00Z"
}
```

### Responsibility Separation

**CARL's Responsibility:**
- Update only the work item being worked on
- Update markdown frontmatter (status, updated)
- Update local state.json (status, updated)
- No need to touch parent states

**Cascade VSCode Extension's Responsibility:**
- Watch for state.json changes
- Automatically cascade updates to parent state files
- Recalculate progress percentages
- Update child summaries in parent states

This separation enables:
- ✅ Fast, local updates by CARL
- ✅ Clean async operation (no conflicts between agents)
- ✅ Centralized progress rollup logic
- ✅ Observable progress at all levels

## CARL Commands

### Planning
```bash
# Plan a new epic
/carl:plan "Implement user authentication"

# Break down an existing epic into features
/carl:plan E0001

# Plan a specific feature into stories
/carl:plan F0001
```

### Execution
```bash
# Execute an entire epic (all features, stories, tasks)
/carl:work E0001

# Execute a specific feature
/carl:work F0001

# Execute a single story
/carl:work S0001

# Execute a single task
/carl:work T0001
```

## Work Item Format

Each work item is a markdown file with YAML frontmatter:

```markdown
---
id: E0001
type: Epic
title: Work Item Title
status: planned
priority: high
complexity: complex
parent: P0001
created: 2025-01-05
updated: 2025-01-05
---

# Work Item Title

## Description
Detailed description...

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Dependencies
- Depends on: E0002
- Blocks: F0005

## Children
List of child work items (generated as they're created)

## Execution Strategy
- Parallel execution possible: Yes/No
- Prerequisites: List
- Estimated effort: Duration

## Notes
Additional context...
```

## Work Item Statuses

- `planned` - Work item defined but not started
- `in-progress` - Currently being worked on
- `completed` - Work finished and verified
- `blocked` - Cannot proceed due to blocker

## ID Management

### Registry
The `work-item-registry.json` tracks:
- All work item IDs
- Paths to markdown files
- ID counters for each type
- Never removes entries (audit trail)

### ID Format
- `P####` - Project (e.g., P0001)
- `E####` - Epic (e.g., E0001)
- `F####` - Feature (e.g., F0001)
- `S####` - Story (e.g., S0001)
- `B####` - Bug (e.g., B0001)
- `PH####` - Phase (e.g., PH0001)
- `T####` - Task (e.g., T0001)

IDs are unique across the entire codebase and never reused.

## External System Integration

Cascade is the local format. Adapters enable optional sync with:
- **Azure DevOps (ADO)** - Import epics/stories, sync status
- **GitHub Issues** - Import issues, close on completion
- **Jira** - Bidirectional sync
- **Kanban Flow** - Board synchronization

Adapters are configured in `.claude/.carl/carl.settings.json` under `work_orchestration.adapters`.

**Important**: Adapters are extensions, not replacements. They import high-level items (Epics, Stories) into local Cascade format where detailed planning happens (Phases, Tasks).

## IndyDevDan's Patterns Applied

The Cascade system follows IndyDevDan's Agentic Orchestration Patterns:

### 1. "Success is Planned"
- Detailed, actionable work items
- Clear acceptance criteria
- Explicit dependencies

### 2. Atomic Tasks
- Work broken into smallest meaningful units
- Clear boundaries between items
- Independent execution where possible

### 3. Async-First Execution
- Parallel execution identified upfront
- Dependencies tracked explicitly
- "Do more when possible, wait when needed"

### 4. Clean Context Separation
- Each work item is independent
- Agents get only relevant context
- Hierarchical directory structure mirrors work separation

### 5. Observable by Default
- Status tracked at all levels via state.json
- Progress visible in real-time
- Cascade VSCode extension provides monitoring
- No need to traverse entire tree for status

### 6. Composable Building Blocks
- Work items are independent units
- Directory structure enables modular organization
- Easy to navigate and understand

## Examples

### Example Project Structure
See `P0001.md` for the CARL Development Project.

### Example Epic
See `E0001-user-authentication-system/E0001.md` for a complete example Epic with detailed breakdown.

## Cascade VSCode Extension Integration

The Cascade VSCode extension provides:
- **File watching**: Monitors state.json changes
- **State propagation**: Cascades updates to parent states
- **Progress calculation**: Rolls up progress percentages
- **Visualization**: Shows work item hierarchy
- **Navigation**: Quick jump to work items
- **Status dashboard**: Real-time progress overview

CARL doesn't need to know how Cascade works internally - it just updates the local work item and state.json, and Cascade handles the rest.

## Related Documentation

- **IndyDevDan Patterns**: `docs/indydevdan/agentic-orchestration-patterns.md`
- **CARL Commands**: `plugins/carl/commands/`
- **Orchestrator Agents**: `plugins/carl/agents/`
- **Adapters**: `plugins/carl/lib/adapters/`
- **Cascade Manager**: `plugins/carl/lib/cascade/cascade-manager.js`

## Notes

- This system is always active - it's the local source of truth
- Directory structure mirrors work breakdown for intuitive navigation
- External adapters are optional extensions
- Work items can be created manually or via `/carl:plan`
- Execution happens via `/carl:work` with async orchestration
- CARL updates only what it's working on
- Cascade VSCode extension handles state propagation
