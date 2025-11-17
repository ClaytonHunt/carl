/**
 * State Synchronization Tests
 *
 * Tests for bi-directional sync between session state and Cascade state.json files.
 * Covers: readCascadeState(), writeCascadeState(), locking, parent propagation
 *
 * Story: S0105 - Cascade State Synchronization
 */

const StateSync = require('../../plugins/carl/lib/cascade/state-sync.js');
const CascadeManager = require('../../plugins/carl/lib/cascade/cascade-manager.js');
const SessionState = require('../../plugins/carl/lib/workflow/session-state.js');
const fs = require('fs').promises;
const path = require('path');

// Test directory - contained within tests/ directory
const TEST_DIR = path.join(__dirname, '..', '.test-artifacts', '.state-sync-test');
const SESSION_DIR = path.join(TEST_DIR, 'sessions');

describe('StateSync - Cascade State Synchronization', () => {
  let manager;
  let stateSync;
  let sessionState;

  beforeEach(async () => {
    manager = new CascadeManager(TEST_DIR);
    sessionState = new SessionState(null, SESSION_DIR);
    stateSync = new StateSync(manager, sessionState);

    // Clean up before each test
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch (error) {
      // Ignore if doesn't exist
    }

    await manager.initialize();
    await sessionState.initialize();
  });

  afterEach(async () => {
    // Clean up after each test
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('T0121: Read from Cascade State', () => {
    it('should read state.json for work item', async () => {
      const project = await manager.createWorkItem('P', { title: 'Test Project' });

      const state = await stateSync.readCascadeState(project.id);

      expect(state).not.toBeNull();
      expect(state.id).toBe(project.id);
      expect(state.status).toBe('planned');
      expect(state.progress).toBeDefined();
      expect(state.children).toBeDefined();
      expect(state.updated).toBeDefined();
    });

    it('should return null for Tasks (no state.json)', async () => {
      const project = await manager.createWorkItem('P', { title: 'Project' });
      const epic = await manager.createWorkItem('E', { title: 'Epic', parent: project.id });
      const feature = await manager.createWorkItem('F', { title: 'Feature', parent: epic.id });
      const story = await manager.createWorkItem('S', { title: 'Story', parent: feature.id });
      const task = await manager.createWorkItem('T', { title: 'Task', parent: story.id });

      const state = await stateSync.readCascadeState(task.id);

      expect(state).toBeNull();
    });

    it('should return null for non-existent work item', async () => {
      const state = await stateSync.readCascadeState('E9999');

      expect(state).toBeNull();
    });

    it('should handle missing state.json file gracefully', async () => {
      const project = await manager.createWorkItem('P', { title: 'Project' });

      // Delete state.json
      const statePath = path.join(TEST_DIR, 'state.json');
      await fs.unlink(statePath);

      const state = await stateSync.readCascadeState(project.id);

      expect(state).toBeNull();
    });

    it('should validate and repair corrupt state data', async () => {
      const epic = await manager.createWorkItem('P', { title: 'Project' });
      const feature = await manager.createWorkItem('E', { title: 'Epic', parent: epic.id });

      // Corrupt the state.json
      const registry = await manager.loadRegistry();
      const metadata = registry.work_items[feature.id];
      const filePath = path.join(TEST_DIR, metadata.path);
      const statePath = path.join(path.dirname(filePath), 'state.json');

      await fs.writeFile(statePath, JSON.stringify({
        id: feature.id,
        status: 'invalid-status', // Invalid status
        progress: 'not-an-object', // Invalid progress
        children: [1, 2, 3] // Invalid children (should be object)
      }), 'utf-8');

      const state = await stateSync.readCascadeState(feature.id);

      // Should repair invalid data
      expect(state).not.toBeNull();
      expect(state.status).toBe('planned'); // Fixed
      expect(typeof state.progress).toBe('object');
      expect(state.progress.total_items).toBe(0);
      expect(typeof state.children).toBe('object');
      expect(Array.isArray(state.children)).toBe(false);
    });

    it('should read multiple states in parallel', async () => {
      const project = await manager.createWorkItem('P', { title: 'Project' });
      const epic1 = await manager.createWorkItem('E', { title: 'Epic 1', parent: project.id });
      const epic2 = await manager.createWorkItem('E', { title: 'Epic 2', parent: project.id });
      const epic3 = await manager.createWorkItem('E', { title: 'Epic 3', parent: project.id });

      const states = await stateSync.readCascadeStateBatch([epic1.id, epic2.id, epic3.id]);

      expect(Object.keys(states).length).toBe(3);
      expect(states[epic1.id]).not.toBeNull();
      expect(states[epic2.id]).not.toBeNull();
      expect(states[epic3.id]).not.toBeNull();
      expect(states[epic1.id].id).toBe(epic1.id);
    });

    it('should handle batch read with some missing items', async () => {
      const project = await manager.createWorkItem('P', { title: 'Project' });
      const epic1 = await manager.createWorkItem('E', { title: 'Epic 1', parent: project.id });

      const states = await stateSync.readCascadeStateBatch([epic1.id, 'E9999', 'E8888']);

      expect(Object.keys(states).length).toBe(3);
      expect(states[epic1.id]).not.toBeNull();
      expect(states['E9999']).toBeNull();
      expect(states['E8888']).toBeNull();
    });
  });

  describe('T0122: Write to Cascade State', () => {
    it('should write updated state to state.json', async () => {
      const project = await manager.createWorkItem('P', { title: 'Project' });

      const success = await stateSync.writeCascadeState(project.id, {
        status: 'in-progress'
      });

      expect(success).toBe(true);

      const state = await stateSync.readCascadeState(project.id);
      expect(state.status).toBe('in-progress');
    });

    it('should preserve existing fields when updating', async () => {
      const project = await manager.createWorkItem('P', { title: 'Project' });

      // Add children to state manually
      const statePath = path.join(TEST_DIR, 'state.json');
      const currentState = JSON.parse(await fs.readFile(statePath, 'utf-8'));
      currentState.children = { E0001: { status: 'completed', progress: 100 } };
      await fs.writeFile(statePath, JSON.stringify(currentState, null, 2));

      // Update only status
      await stateSync.writeCascadeState(project.id, { status: 'in-progress' });

      const state = await stateSync.readCascadeState(project.id);
      expect(state.status).toBe('in-progress');
      expect(state.children).toEqual({ E0001: { status: 'completed', progress: 100 } });
    });

    it('should update only changed fields in progress', async () => {
      const epic = await manager.createWorkItem('P', { title: 'Project' });
      const feature = await manager.createWorkItem('E', { title: 'Epic', parent: epic.id });

      await stateSync.writeCascadeState(feature.id, {
        progress: { completed: 3, in_progress: 2 }
      });

      const state = await stateSync.readCascadeState(feature.id);
      expect(state.progress.completed).toBe(3);
      expect(state.progress.in_progress).toBe(2);
      expect(state.progress.total_items).toBe(0); // Unchanged
      expect(state.progress.planned).toBe(0); // Unchanged
    });

    it('should update timestamp on write', async () => {
      const project = await manager.createWorkItem('P', { title: 'Project' });
      const originalState = await stateSync.readCascadeState(project.id);
      const originalTimestamp = originalState.updated;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      await stateSync.writeCascadeState(project.id, { status: 'in-progress' });

      const newState = await stateSync.readCascadeState(project.id);
      expect(newState.updated).not.toBe(originalTimestamp);
    });

    it('should handle write errors gracefully', async () => {
      await expect(stateSync.writeCascadeState('E9999', { status: 'in-progress' }))
        .rejects
        .toThrow('Cannot update state for non-existent work item');
    });

    it('should not write state for Tasks', async () => {
      const project = await manager.createWorkItem('P', { title: 'Project' });
      const epic = await manager.createWorkItem('E', { title: 'Epic', parent: project.id });
      const feature = await manager.createWorkItem('F', { title: 'Feature', parent: epic.id });
      const story = await manager.createWorkItem('S', { title: 'Story', parent: feature.id });
      const task = await manager.createWorkItem('T', { title: 'Task', parent: story.id });

      const success = await stateSync.writeCascadeState(task.id, { status: 'completed' });

      expect(success).toBe(false);
    });

    it('should write atomically using temp file', async () => {
      const project = await manager.createWorkItem('P', { title: 'Project' });

      // Write state
      await stateSync.writeCascadeState(project.id, { status: 'in-progress' });

      // Verify no temp files left behind
      const files = await fs.readdir(TEST_DIR);
      const tempFiles = files.filter(f => f.includes('.tmp'));
      expect(tempFiles.length).toBe(0);
    });
  });

  describe('T0123: State Consistency and Concurrency', () => {
    it('should acquire and release lock', async () => {
      const project = await manager.createWorkItem('P', { title: 'Project' });

      const unlock = await stateSync.acquireLock(project.id);
      expect(typeof unlock).toBe('function');

      await unlock();

      // Should be able to acquire again
      const unlock2 = await stateSync.acquireLock(project.id);
      await unlock2();
    });

    it('should block concurrent lock acquisition', async () => {
      const project = await manager.createWorkItem('P', { title: 'Project' });

      const unlock1 = await stateSync.acquireLock(project.id);

      // Try to acquire same lock (should timeout)
      await expect(stateSync.acquireLock(project.id, 100))
        .rejects
        .toThrow('Failed to acquire lock');

      await unlock1();
    });

    it('should write with lock protection', async () => {
      const project = await manager.createWorkItem('P', { title: 'Project' });

      const success = await stateSync.writeCascadeStateWithLock(project.id, {
        status: 'in-progress'
      });

      expect(success).toBe(true);

      const state = await stateSync.readCascadeState(project.id);
      expect(state.status).toBe('in-progress');
    });

    it('should handle concurrent writes safely', async () => {
      const project = await manager.createWorkItem('P', { title: 'Project' });

      // Start multiple concurrent writes
      const writes = [
        stateSync.writeCascadeStateWithLock(project.id, { status: 'in-progress' }),
        stateSync.writeCascadeStateWithLock(project.id, { status: 'completed' }),
        stateSync.writeCascadeStateWithLock(project.id, { status: 'blocked' })
      ];

      // All should complete (serially due to locking)
      const results = await Promise.all(writes);
      expect(results.every(r => r === true)).toBe(true);

      // Final state should be one of the written values
      const state = await stateSync.readCascadeState(project.id);
      expect(['in-progress', 'completed', 'blocked']).toContain(state.status);
    });

    it('should clean up stale locks', async () => {
      const project = await manager.createWorkItem('P', { title: 'Project' });

      // Create a stale lock manually
      const lockDir = path.join(TEST_DIR, '.locks');
      await fs.mkdir(lockDir, { recursive: true });
      const lockPath = path.join(lockDir, `${project.id}.lock`);
      await fs.writeFile(lockPath, JSON.stringify({ old: true }));

      // Backdate the lock file
      const oldTime = Date.now() - 120000; // 2 minutes ago
      await fs.utimes(lockPath, new Date(oldTime), new Date(oldTime));

      const cleaned = await stateSync.cleanupStaleLocks();
      expect(cleaned).toBe(1);

      // Lock should be gone
      await expect(fs.access(lockPath)).rejects.toThrow();
    });

    it('should release lock even if write fails', async () => {
      const project = await manager.createWorkItem('P', { title: 'Project' });

      // Delete state.json to cause write failure
      const statePath = path.join(TEST_DIR, 'state.json');
      await fs.unlink(statePath);

      await expect(stateSync.writeCascadeStateWithLock(project.id, { status: 'in-progress' }))
        .rejects
        .toThrow();

      // Lock should be released - we should be able to acquire it
      const unlock = await stateSync.acquireLock(project.id, 100);
      await unlock();
    });
  });

  describe('T0124: Parent State Propagation', () => {
    it('should propagate child status to parent', async () => {
      const project = await manager.createWorkItem('P', { title: 'Project' });
      const epic = await manager.createWorkItem('E', { title: 'Epic', parent: project.id });

      // Update epic status
      await manager.updateStatus(epic.id, 'in-progress');

      // Propagate to parent
      await stateSync.propagateToParent(epic.id);

      const projectState = await stateSync.readCascadeState(project.id);
      expect(projectState.status).toBe('in-progress');
    });

    it('should calculate aggregate progress from children', async () => {
      const project = await manager.createWorkItem('P', { title: 'Project' });
      const epic1 = await manager.createWorkItem('E', { title: 'Epic 1', parent: project.id });
      const epic2 = await manager.createWorkItem('E', { title: 'Epic 2', parent: project.id });
      const epic3 = await manager.createWorkItem('E', { title: 'Epic 3', parent: project.id });

      // Complete one epic
      await manager.updateStatus(epic1.id, 'completed');

      // Propagate
      await stateSync.propagateToParent(epic1.id);

      const projectState = await stateSync.readCascadeState(project.id);
      expect(projectState.progress.total_items).toBe(3);
      expect(projectState.progress.completed).toBe(1);
      expect(projectState.progress.planned).toBe(2);
      expect(projectState.progress.percentage).toBe(33); // 1/3 = 33%
    });

    it('should set parent to completed when all children completed', async () => {
      const project = await manager.createWorkItem('P', { title: 'Project' });
      const epic1 = await manager.createWorkItem('E', { title: 'Epic 1', parent: project.id });
      const epic2 = await manager.createWorkItem('E', { title: 'Epic 2', parent: project.id });

      await manager.updateStatus(epic1.id, 'completed');
      await manager.updateStatus(epic2.id, 'completed');

      await stateSync.propagateToParent(epic2.id);

      const projectState = await stateSync.readCascadeState(project.id);
      expect(projectState.status).toBe('completed');
      expect(projectState.progress.percentage).toBe(100);
    });

    it('should propagate recursively to grandparents', async () => {
      const project = await manager.createWorkItem('P', { title: 'Project' });
      const epic = await manager.createWorkItem('E', { title: 'Epic', parent: project.id });
      const feature = await manager.createWorkItem('F', { title: 'Feature', parent: epic.id });

      await manager.updateStatus(feature.id, 'in-progress');

      // Propagate from feature
      await stateSync.propagateToParent(feature.id);

      // Check epic
      const epicState = await stateSync.readCascadeState(epic.id);
      expect(epicState.status).toBe('in-progress');

      // Check project (grandparent)
      const projectState = await stateSync.readCascadeState(project.id);
      expect(projectState.status).toBe('in-progress');
    });

    it('should handle parent with no parent (root)', async () => {
      const project = await manager.createWorkItem('P', { title: 'Project' });

      const result = await stateSync.propagateToParent(project.id);

      expect(result).toBe(false); // No parent to propagate to
    });

    it('should set parent to blocked if any child blocked', async () => {
      const project = await manager.createWorkItem('P', { title: 'Project' });
      const epic1 = await manager.createWorkItem('E', { title: 'Epic 1', parent: project.id });
      const epic2 = await manager.createWorkItem('E', { title: 'Epic 2', parent: project.id });

      await manager.updateStatus(epic1.id, 'blocked');
      await manager.updateStatus(epic2.id, 'planned');

      await stateSync.propagateToParent(epic1.id);

      const projectState = await stateSync.readCascadeState(project.id);
      expect(projectState.status).toBe('blocked');
    });

    it('should maintain state hierarchy integrity', async () => {
      const project = await manager.createWorkItem('P', { title: 'Project' });
      const epic = await manager.createWorkItem('E', { title: 'Epic', parent: project.id });
      const feature1 = await manager.createWorkItem('F', { title: 'Feature 1', parent: epic.id });
      const feature2 = await manager.createWorkItem('F', { title: 'Feature 2', parent: epic.id });
      const story1 = await manager.createWorkItem('S', { title: 'Story 1', parent: feature1.id });
      const story2 = await manager.createWorkItem('S', { title: 'Story 2', parent: feature1.id });

      // Complete story1
      await manager.updateStatus(story1.id, 'completed');
      await stateSync.propagateToParent(story1.id);

      // feature1 should be in-progress (1/2 stories done)
      const feature1State = await stateSync.readCascadeState(feature1.id);
      expect(feature1State.status).toBe('in-progress');
      expect(feature1State.progress.completed).toBe(1);
      expect(feature1State.progress.total_items).toBe(2);

      // Complete story2
      await manager.updateStatus(story2.id, 'completed');
      await stateSync.propagateToParent(story2.id);

      // feature1 should now be completed
      const feature1StateAfter = await stateSync.readCascadeState(feature1.id);
      expect(feature1StateAfter.status).toBe('completed');

      // epic should be in-progress (1/2 features done)
      const epicState = await stateSync.readCascadeState(epic.id);
      expect(epicState.status).toBe('in-progress');
    });
  });

  describe('Session State Integration', () => {
    it('should sync from session to cascade', async () => {
      const project = await manager.createWorkItem('P', { title: 'Project' });

      await sessionState.setState({
        workItemId: project.id,
        status: 'in-progress',
        progress: { completed: 5, total_items: 10 }
      });

      const sessionData = await sessionState.getState();
      await stateSync.syncFromSession(project.id, sessionData.data);

      const cascadeState = await stateSync.readCascadeState(project.id);
      expect(cascadeState.status).toBe('in-progress');
    });

    it('should sync from cascade to session', async () => {
      const project = await manager.createWorkItem('P', { title: 'Project' });

      await stateSync.writeCascadeState(project.id, { status: 'completed' });
      await stateSync.syncToSession(project.id);

      const sessionData = await sessionState.getState();
      expect(sessionData.data.cascadeState.status).toBe('completed');
    });

    it('should throw error if SessionState not configured', async () => {
      const stateSyncNoSession = new StateSync(manager); // No session state

      await expect(stateSyncNoSession.syncFromSession('P0001', {}))
        .rejects
        .toThrow('SessionState not configured');
    });
  });
});
