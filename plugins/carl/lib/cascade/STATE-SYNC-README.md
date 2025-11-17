# Cascade State Synchronization

**Story**: S0105 - Cascade State Synchronization
**Status**: Completed
**Tests**: 30 passing

## Overview

Bi-directional synchronization between session state and Cascade state.json files with safe concurrent access and automatic parent state propagation.

## Features

### T0121: Read from Cascade State
- Reads and validates state.json for work items
- Handles missing or corrupt files gracefully
- Returns structured state objects with defaults
- Batch read capability for parallel operations
- Comprehensive validation and repair of corrupt data

### T0122: Write to Cascade State
- Atomic writes using temporary files and rename
- Preserves existing fields (only updates changed fields)
- Deep merge for nested objects (progress, children)
- Automatic timestamp updates
- Handles write errors gracefully

### T0123: State Consistency and Concurrency
- File-based optimistic locking with timeout
- Exponential backoff retry strategy
- Automatic stale lock cleanup (30 seconds)
- Lock-protected write operations
- Prevents concurrent write conflicts

### T0124: Parent State Propagation
- Automatically propagates child state changes to parents
- Recursively updates grandparents and ancestors
- Calculates aggregate progress from children
- Determines parent status based on child statuses
- Maintains state hierarchy integrity
- Updates both state.json and markdown frontmatter

## Usage

```javascript
const StateSync = require('./plugins/carl/lib/cascade/state-sync.js');
const CascadeManager = require('./plugins/carl/lib/cascade/cascade-manager.js');
const SessionState = require('./plugins/carl/lib/workflow/session-state.js');

const manager = new CascadeManager('.cascade');
const sessionState = new SessionState();
const stateSync = new StateSync(manager, sessionState);

// Read state
const state = await stateSync.readCascadeState('S0105');
console.log(state);
// { id, status, progress, children, updated }

// Write state (with lock)
await stateSync.writeCascadeStateWithLock('S0105', {
  status: 'in-progress',
  progress: { completed: 2, in_progress: 1 }
});

// Propagate to parent
await stateSync.propagateToParent('S0105');
// Updates F0007, E0002, and Project automatically

// Batch read
const states = await stateSync.readCascadeStateBatch(['S0105', 'S0106', 'S0107']);

// Session sync
await stateSync.syncToSession('S0105'); // Cascade -> Session
await stateSync.syncFromSession('S0105', sessionData); // Session -> Cascade
```

## API Reference

### StateSync Class

#### Constructor
```javascript
new StateSync(cascadeManager, sessionState = null)
```
- `cascadeManager`: CascadeManager instance
- `sessionState`: Optional SessionState instance for bi-directional sync

#### Methods

**readCascadeState(workItemId)**
- Reads state.json for a work item
- Returns: `Promise<Object|null>` - State object or null
- Handles: Missing files, corrupt data, invalid IDs

**readCascadeStateBatch(workItemIds)**
- Reads multiple states in parallel
- Returns: `Promise<Object>` - Map of `{ workItemId: state }`
- Uses: IndyDevDan's "Do more when possible" pattern

**writeCascadeState(workItemId, stateUpdates)**
- Writes state updates atomically
- Returns: `Promise<boolean>` - Success indicator
- Atomic: Uses temp file + rename for safety

**writeCascadeStateWithLock(workItemId, stateUpdates)**
- Writes state with automatic lock acquisition
- Returns: `Promise<boolean>` - Success indicator
- Safe: Prevents concurrent write conflicts

**acquireLock(workItemId, timeoutMs = 5000)**
- Acquires exclusive lock on work item state
- Returns: `Promise<Function>` - Unlock function
- Timeout: Configurable with exponential backoff

**propagateToParent(childId)**
- Propagates state changes up the hierarchy
- Returns: `Promise<boolean>` - Success indicator
- Recursive: Updates all ancestors automatically

**syncToSession(workItemId)**
- Syncs Cascade state to session state
- Returns: `Promise<boolean>` - Success indicator

**syncFromSession(workItemId, sessionStateData)**
- Syncs session state to Cascade state
- Returns: `Promise<boolean>` - Success indicator

**cleanupStaleLocks()**
- Removes stale lock files (>1 minute old)
- Returns: `Promise<number>` - Number of locks cleaned

## State Structure

### state.json Format
```json
{
  "id": "S0105",
  "status": "completed",
  "progress": {
    "total_items": 4,
    "completed": 4,
    "in_progress": 0,
    "planned": 0,
    "blocked": 0,
    "percentage": 100
  },
  "children": {
    "T0121": { "status": "completed", "progress": 100 },
    "T0122": { "status": "completed", "progress": 100 }
  },
  "updated": "2025-11-14T18:50:00.000Z"
}
```

## Parent Status Logic

The parent status is determined by children:

1. **All children completed** → Parent is `completed`
2. **Any child in-progress** → Parent is `in-progress`
3. **Some children completed (but not all)** → Parent is `in-progress`
4. **Any child blocked (and none in-progress/completed)** → Parent is `blocked`
5. **All children planned** → Parent is `planned`

## Locking Strategy

- **File-based locks**: `.cascade/.locks/{workItemId}.lock`
- **Timeout**: Default 5 seconds, configurable
- **Retry**: Exponential backoff (10ms, 20ms, 40ms, 80ms, 160ms, 200ms max)
- **Stale detection**: Locks older than 30 seconds are considered stale
- **Auto-cleanup**: `cleanupStaleLocks()` removes old locks

## Test Coverage

30 comprehensive tests covering:
- ✓ Read operations (7 tests)
- ✓ Write operations (7 tests)
- ✓ Concurrency control (6 tests)
- ✓ Parent propagation (7 tests)
- ✓ Session integration (3 tests)

## IndyDevDan Alignment

This implementation follows IndyDevDan's agentic orchestration patterns:

1. **Observable by Default**: All state changes are tracked and logged
2. **Event-Driven Coordination**: State changes propagate through hierarchy
3. **Clean Separation of Concerns**: State sync isolated from core operations
4. **Async-First Execution**: Batch reads use parallel execution
5. **Graceful Degradation**: Handles missing/corrupt files without crashing

## Files Created

1. **plugins/carl/lib/cascade/state-sync.js** (540 lines)
   - Complete implementation of state synchronization
   - All 4 tasks implemented (T0121-T0124)

2. **tests/unit/state-sync.test.js** (475 lines)
   - 30 comprehensive tests
   - All tests passing

3. **plugins/carl/lib/cascade/STATE-SYNC-README.md** (this file)
   - Complete documentation and usage examples

## Integration Points

- **CascadeManager**: Uses `getState()`, `updateWorkItem()`, `getChildren()`
- **SessionState**: Optional bi-directional sync support
- **Work Orchestrator**: Can use for execution state tracking
- **Cascade VSCode Extension**: Watches state.json changes for UI updates

## Future Enhancements

- Event emitter for state change notifications
- Redis-based locking for distributed systems
- State history/audit trail
- Conflict resolution strategies
- Performance metrics and monitoring
