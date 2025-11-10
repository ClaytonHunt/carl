# Cascade Integration Section

This section should be inserted into the CARL README.md before the "Commands" section.

---

## Cascade Integration

CARL integrates with the Cascade VSCode Extension for work item management. This integration allows CARL to create and manage Projects, Epics, Features, Stories, Phases, and Tasks in a structured hierarchy.

### Features

- **Create Work Items**: Generate new work items with proper hierarchy
- **Update Task Status**: Mark tasks as planned, in-progress, or completed
- **Automatic Propagation**: Cascade automatically updates parent progress
- **Visual Tracking**: See your work items in VSCode TreeView

### Cascade Manager Agent

CARL includes a specialized agent for Cascade operations. Simply ask CARL to create or manage work items:

```
Create a new story for user authentication with 4 tasks
```

The agent will handle all the details automatically.

### Utilities

CARL provides Node.js utilities in `lib/cascade-utils.cjs`:

```javascript
const cascade = require('./lib/cascade-utils.cjs');

// Get next available ID
const taskId = cascade.getNextId('T');

// Update task status
cascade.updateTaskStatus('T0001', 'S0001', 'completed', 100);
```

### Documentation

- `docs/cascade-integration.md` - Complete integration guide
- `agents/cascade-manager.md` - Cascade Manager agent documentation
