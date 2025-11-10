# Cascade Integration

**Last Updated**: 2025-01-06
**Purpose**: CARL integration with Cascade VSCode Extension for work item management

---

## Overview

CARL integrates with the Cascade extension to provide AI-powered work item creation and status management. This integration allows CARL to:

1. Create and manage work items (Projects, Epics, Features, Stories, Tasks)
2. Update task status and track progress
3. Automatically propagate changes through the work hierarchy

### Division of Responsibilities

**CARL's Role:**
- Create and update work items
- Manage task status in parent state.json files
- Update work-item-registry.json

**Cascade's Role:**
- Automatically propagate state changes up the hierarchy
- Provide visual tracking through VSCode TreeView
- Calculate progress percentages

### The Golden Rule

**CARL updates leaf nodes (Tasks and work item content) → Cascade propagates upward automatically**

---

## Directory Structure

```
.cascade/
├── README.md                                  # Documentation
├── work-item-registry.json                    # Master registry (CARL manages)
├── P####.md                                   # Project file
├── state.json                                 # Project state (Cascade manages)
└── E####-{epic-slug}/
    ├── E####.md                               # Epic file
    ├── state.json                             # Epic state (Cascade manages)
    └── F####-{feature-slug}/
        ├── F####.md                           # Feature file
        ├── state.json                         # Feature state (Cascade manages)
        └── S####-{story-slug}/
            ├── S####.md                       # Story file
            ├── state.json                     # Story state (Cascade manages)
            ├── PH####-{phase-slug}/           # Optional Phase
            │   ├── PH####.md
            │   ├── state.json                 # Phase state (Cascade manages)
            │   └── T####.md                   # Task files (no state.json)
            └── T####.md                       # Task files (no state.json)
```

---

## CARL's Responsibilities

### 1. Create Work Items

**Registry Management**: Add new items to `work-item-registry.json`

```json
{
  "work_items": {
    "T0011": {
      "id": "T0011",
      "type": "Task",
      "path": "E0001-epic/F0001-feature/S0001-story/T0011.md",
      "title": "Implement validation",
      "status": "planned",
      "parent": "S0001",
      "created": "2025-01-06",
      "updated": "2025-01-06"
    }
  }
}
```

**Create Work Item Files**: Markdown files with minimal frontmatter

```markdown
---
id: T0011
type: Task
title: Implement validation
parent: S0001
created: 2025-01-06
updated: 2025-01-06
---

# Implement validation

## Description
...
```

### 2. Update Task Status

**CRITICAL**: Update task status in **parent's state.json**, NOT in task frontmatter

**Example**: Mark T0011 as completed

Edit: `.cascade/E0001-epic/F0001-feature/S0001-story/state.json`

```json
{
  "id": "S0001",
  "status": "in-progress",
  "progress": {
    "total_items": 4,
    "completed": 1,
    "in_progress": 3,
    "planned": 0,
    "percentage": 25
  },
  "children": {
    "T0011": {
      "status": "completed",    // ← CARL updates this
      "progress": 100           // ← CARL updates this
    },
    "T0012": {
      "status": "in-progress",
      "progress": 50
    }
  },
  "updated": "2025-01-06T14:23:50.994Z"
}
```

**Workflow**:
1. CARL edits task status in parent state.json
2. Cascade detects file change
3. Cascade recalculates parent progress
4. Cascade propagates up to grandparent, great-grandparent, etc.

### 3. Keep Frontmatter Minimal

**Tasks only need these frontmatter fields**:
- `id` - Task identifier (T####)
- `type` - Always "Task"
- `title` - Task description
- `parent` - Parent Story/Phase ID
- `created` - Creation date
- `updated` - Last update date

**DO NOT add to task frontmatter**:
- ❌ `status` - Lives in parent state.json
- ❌ `progress` - Lives in parent state.json
- ❌ `priority` - Optional, but not used by Cascade
- ❌ `complexity` - Optional, but not used by Cascade

### 4. Never Touch Parent state.json Files

**CARL should NEVER edit**:
- `.cascade/state.json` (Project)
- `.cascade/E####-*/state.json` (Epic)
- `.cascade/E####-*/F####-*/state.json` (Feature)

These are managed entirely by Cascade's propagation engine.

**CARL CAN edit**:
- `.cascade/E####-*/F####-*/S####-*/state.json` (Story - for task status)
- `.cascade/E####-*/F####-*/S####-*/PH####-*/state.json` (Phase - for task status)

---

## Utilities

CARL provides Node.js utilities for Cascade operations:

### cascade-utils.cjs

Location: `lib/cascade-utils.cjs`

**Functions:**

```javascript
// Get next available ID for a work item type
getNextId(type) // Returns: string (e.g., "T0042")

// Add work item to registry
addToRegistry(workItem) // workItem: { id, type, path, title, status, parent, created, updated }

// Update work item in registry
updateRegistry(workItemId, updates)

// Create work item markdown file
createWorkItemFile(workItem, content)

// Update task status in parent state.json
updateTaskStatus(taskId, parentId, status, progress)

// Create initial state.json for a parent work item
createStateFile(parentId, workItemType)

// Read work item registry
readRegistry() // Returns: registry object

// Find work item by ID
findWorkItem(workItemId) // Returns: work item object or null
```

### Using the Utilities

**From Node.js:**
```javascript
const cascade = require('./lib/cascade-utils.cjs');

// Create a new task
const taskId = cascade.getNextId('T');
const workItem = {
  id: taskId,
  type: 'Task',
  path: 'E0001-epic/F0001-feature/S0001-story/T0001.md',
  title: 'Implement feature',
  status: 'planned',
  parent: 'S0001',
  created: new Date().toISOString().split('T')[0],
  updated: new Date().toISOString().split('T')[0]
};

cascade.addToRegistry(workItem);
cascade.createWorkItemFile(workItem, '# Task content here');
```

**From Bash (via node):**
```bash
# Get next task ID
node -e "console.log(require('./lib/cascade-utils.cjs').getNextId('T'))"

# Update task status
node -e "require('./lib/cascade-utils.cjs').updateTaskStatus('T0001', 'S0001', 'completed', 100)"
```

---

## Workflow Examples

### Create a New Task

1. **Generate Task ID**: Use `getNextId('T')`
2. **Add to registry**: Use `addToRegistry(workItem)`
3. **Create markdown file**: Use `createWorkItemFile(workItem, content)`
4. **Add to parent state**: Use `updateTaskStatus(taskId, parentId, 'planned', 0)`
5. **Cascade auto-updates**: Story → Feature → Epic → Project progress

### Mark Task as Completed

1. **Update parent state.json**: Use `updateTaskStatus(taskId, parentId, 'completed', 100)`
2. **Cascade auto-propagates**: Updates all parents automatically

### Create a New Story

1. **Generate Story ID**: Use `getNextId('S')`
2. **Add to registry**: With path to story markdown
3. **Create directory**: `mkdir -p .cascade/E####/F####/S####-story-name`
4. **Create files**:
   - Story markdown: `createWorkItemFile()`
   - Initial state: `createStateFile(storyId, 'Story')`
5. **Cascade auto-updates**: When tasks added, propagation happens automatically

---

## Common Pitfalls to Avoid

### ❌ DON'T: Update Task Frontmatter Status
```markdown
---
id: T0001
status: completed  ← DON'T DO THIS
---
```

### ✅ DO: Update Parent State.json
```json
{
  "children": {
    "T0001": {
      "status": "completed",  ← DO THIS
      "progress": 100
    }
  }
}
```

### ❌ DON'T: Edit Epic/Feature/Project state.json
```json
// DON'T manually edit these files
.cascade/state.json
.cascade/E0001-epic/state.json
.cascade/E0001-epic/F0001-feature/state.json
```

### ✅ DO: Let Cascade Propagate
```
Edit Story state.json → Cascade handles the rest
```

---

## Integration Checklist for CARL

- [ ] Add new work items to `work-item-registry.json`
- [ ] Create markdown files with minimal frontmatter
- [ ] Update task status in **parent state.json** (not frontmatter)
- [ ] Never edit Epic/Feature/Project state.json files
- [ ] Trust Cascade to propagate changes upward
- [ ] Use state.json as source of truth for status/progress
- [ ] Keep task frontmatter minimal (id, type, title, parent, dates)

---

## Questions or Issues?

If CARL encounters:
- Missing state.json files → Cascade will regenerate on next propagation
- Circular dependencies → Check for incorrect parent references in registry
- Progress not updating → Verify task status updated in correct parent state.json
- TreeView not showing items → Check that registry paths are correct

See `d:/projects/cascade/CASCADE-CARL-INTEGRATION.md` for full technical specification.
