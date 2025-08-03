# Multi-Developer Coordination

## Branch-Based Development Model
**Core Principle**: Each developer works in their own git branch with independent CARL state

**Developer Isolation**:
- **Session Files**: `session-YYYY-MM-DD-{git-user}.carl` automatically isolates by developer
- **Work Item Ownership**: One developer per work item (epic/feature/story/technical)
- **Branch Independence**: CARL files track progress independently per branch
- **No Concurrent Editing**: Developers don't share active work items simultaneously

## Git Integration Strategy
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

## Work Assignment Model
**Single Owner Principle**:
- **Epic**: One developer owns the epic (can delegate features)
- **Feature**: One developer owns the feature (can delegate stories)
- **Story**: One developer owns the story (atomic work unit)
- **Technical**: One developer owns the technical work item

**Coordination Through Git**:
- **Work Handoff**: Complete work item → move to completed/ → merge branch
- **Parallel Work**: Different developers work on different features within same epic
- **Progress Visibility**: Completed work visible in main branch, active work in feature branches

## Conflict Prevention
**Natural Isolation**:
- **File Paths**: Different work items = different file paths
- **Session Separation**: Git username in session files prevents conflicts
- **Completion State**: Only completed work merges to main branch
- **Active Work**: `active.work.carl` per branch, no shared active state