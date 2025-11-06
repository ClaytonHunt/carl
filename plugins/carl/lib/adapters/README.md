# Work Item Adapters

This directory contains adapters for integrating external project management systems with CARL's Cascade work item system.

## Architecture Overview

### Core Design Principle

**Cascade is the local canonical format** - always active, always the source of truth for detailed implementation planning.

**Adapters are optional extensions** - they import/export to external systems but don't replace Cascade.

```
External Systems (ADO, GitHub, Jira, etc.)
           ↓ Import                     ↑ Export/Sync
    [Adapters - Optional Extensions]
           ↓                            ↑
      [Cascade Format - Always Active]
           ↓
    [Local Work Items with Full Detail]
```

### Workflow Model

1. **High-level work** comes from external systems (Epics, Features, Stories)
2. **Adapters import** these items into local Cascade format
3. **Detailed planning** happens locally (Phases, Tasks, implementation details)
4. **Work is executed** using local Cascade work items
5. **Status updates sync back** to external systems via adapters

## Adapter Types

### Import Adapters
Pull work items FROM external systems → Create Cascade work items

**Use cases**:
- Team uses ADO for Epic/Story tracking
- Import Epic → Create local Cascade Epic with detailed breakdown
- Developers work locally with full task detail
- Status syncs back to ADO

### Export Adapters
Push updates FROM Cascade → External systems

**Use cases**:
- Update ADO work item status
- Add comments to GitHub Issues
- Move Kanban cards
- Update progress percentages

### Sync Adapters
Bidirectional synchronization

**Use cases**:
- Changes in ADO reflected locally
- Local progress reflected in ADO
- Conflict resolution for simultaneous updates

## Available Adapters

### Currently Available
- **None yet** - This is the initial skeleton

### Planned
- **ADO (Azure DevOps)** - `ado-adapter.js`
- **GitHub Issues** - `github-adapter.js`
- **Jira** - `jira-adapter.js`
- **Kanban Flow** - `kanban-adapter.js`

## Workflow Mapping

Different teams have different processes. Adapters support **team-configurable workflow mapping**.

### Example: ADO Workflow

Team A (Traditional):
```json
{
  "ado": {
    "workflow": {
      "planned": "New",
      "in-progress": "Active",
      "completed": "Resolved"
    }
  }
}
```

Team B (With QA):
```json
{
  "ado": {
    "workflow": {
      "planned": "New",
      "in-progress": "Active",
      "completed": "In QA",  // Stories go to QA, not Resolved
      "blocked": "Blocked"
    }
  }
}
```

### Example: GitHub Issues

```json
{
  "github": {
    "workflow": {
      "planned": "open",
      "in-progress": "in progress",
      "completed": "closed"
    },
    "labels": {
      "completed": ["completed", "merged"]
    }
  }
}
```

## Using Adapters

### Configuration

Adapters are configured in `.claude/.carl/carl.settings.json`:

```json
{
  "work_orchestration": {
    "adapters": {
      "ado": {
        "enabled": false,
        "sync_direction": "bidirectional",
        "workflow": {
          "planned": "New",
          "in-progress": "Active",
          "completed": "Resolved"
        },
        "connection": {
          "organization": "your-org",
          "project": "your-project",
          "pat_env_var": "ADO_PAT"
        }
      },
      "github": {
        "enabled": false,
        "sync_direction": "import_only",
        "workflow": {
          "planned": "open",
          "in-progress": "in progress",
          "completed": "closed"
        },
        "connection": {
          "owner": "your-org",
          "repo": "your-repo",
          "token_env_var": "GITHUB_TOKEN"
        }
      }
    }
  }
}
```

### Sync Directions

- `import_only` - Only pull from external system to Cascade
- `export_only` - Only push from Cascade to external system
- `bidirectional` - Two-way sync with conflict resolution

## Creating a New Adapter

### 1. Extend the Base Interface

```javascript
const WorkItemAdapter = require('./adapter-interface');

class MySystemAdapter extends WorkItemAdapter {
  constructor(config) {
    super(config);
    this.adapterType = 'mysystem';
  }

  async importWorkItem(externalId) {
    // Implementation
  }

  // ... implement all required methods
}

module.exports = MySystemAdapter;
```

### 2. Implement Required Methods

**Import Operations**:
- `importWorkItem(externalId)` - Import single item
- `importWorkItems(criteria)` - Import multiple items
- `mapToCascade(externalItem)` - Map external format to Cascade

**Export Operations**:
- `exportStatus(cascadeId, status)` - Export status updates
- `exportComment(cascadeId, comment)` - Export comments
- `exportProgress(cascadeId, percentComplete)` - Export progress

**Workflow Mapping**:
- `mapStatus(cascadeStatus, workflowConfig)` - Map statuses

**Sync Operations**:
- `syncWorkItem(cascadeId, syncDirection)` - Bidirectional sync

**Registry Operations**:
- `linkWorkItems(cascadeId, externalId, metadata)` - Link items
- `getExternalId(cascadeId)` - Get external ID for Cascade item
- `getCascadeId(externalId)` - Get Cascade ID for external item

**Validation**:
- `validateConfig()` - Validate configuration
- `testConnection()` - Test connectivity

### 3. Register the Adapter

Add to adapter loader (future implementation):
```javascript
const adapters = {
  ado: require('./ado-adapter'),
  github: require('./github-adapter'),
  mysystem: require('./mysystem-adapter')
};
```

## Adapter Interface

See `adapter-interface.js` for the complete base class with all methods documented.

## IndyDevDan's Principles Applied

This adapter system follows IndyDevDan's orchestration patterns:

### 1. Clean Separation of Concerns
- Cascade is core, adapters are extensions
- Each adapter handles one external system
- No cross-adapter dependencies

### 2. Composable Building Blocks
- Adapters are independent, reusable components
- Can enable/disable adapters individually
- Mix and match as needed

### 3. Event-Driven Coordination
- Adapters respond to work item events
- Async operations don't block Cascade
- Hooks for adapter event monitoring

### 4. Observable by Default
- Adapter operations are logged
- Sync status is visible
- Conflicts are reported clearly

## Examples

### Import Epic from ADO

```javascript
const adoAdapter = new ADOAdapter(config);
const cascadeData = await adoAdapter.importWorkItem('12345');
// Creates .cascade/epics/E0001-feature-name.md
```

### Export Status to GitHub

```javascript
const githubAdapter = new GitHubAdapter(config);
await githubAdapter.exportStatus('S0123', 'completed');
// Closes GitHub Issue #789
```

### Bidirectional Sync

```javascript
const adoAdapter = new ADOAdapter(config);
const result = await adoAdapter.syncWorkItem('E0001', 'bidirectional');
if (result.conflicts) {
  // Handle conflicts
}
```

## Future Enhancements

- Automatic sync on work item status changes
- Conflict resolution UI
- Adapter marketplace for community adapters
- Real-time webhook support
- Bulk import/export operations
- Adapter testing framework

## Related Components

- **Cascade Manager**: `plugins/carl/lib/cascade/cascade-manager.js`
- **Work Orchestrator**: `plugins/carl/agents/work-orchestrator.md`
- **Settings**: `.claude/.carl/carl.settings.json`
- **Registry**: `.cascade/work-item-registry.json`
