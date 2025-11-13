/**
 * Work Helpers Tests
 *
 * Tests for the work orchestration helper utilities.
 * Uses test artifacts directory to avoid polluting project root.
 */

const {
  loadWorkItem,
  validateWorkItem,
  loadExecutionContext,
  loadAndValidateWorkItem,
  WorkItemNotFoundError,
  WorkItemValidationError,
  WorkItemDeletedError
} = require('../../plugins/carl/lib/orchestration/work-helpers');

const CascadeManager = require('../../plugins/carl/lib/cascade/cascade-manager');
const fs = require('fs').promises;
const path = require('path');

const TEST_DIR = path.join(__dirname, '..', '.test-artifacts', 'work-helpers-test');

describe('Work Helpers', () => {
  let manager;

  beforeEach(async () => {
    // Clean test directory
    await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});

    // Initialize Cascade
    manager = new CascadeManager(TEST_DIR);
    await manager.initialize();
  });

  afterEach(async () => {
    // Clean up
    await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
  });

  describe('loadWorkItem()', () => {
    it('should load a Project work item', async () => {
      // Create a Project
      const project = await manager.createWorkItem('P', {
        title: 'Test Project',
        description: 'A test project',
        status: 'in_progress'
      });

      // Load the project
      const loaded = await loadWorkItem(project.id, TEST_DIR);

      expect(loaded.id).toBe(project.id);
      expect(loaded.title).toBe('Test Project');
      expect(loaded.status).toBe('in_progress');
      expect(loaded.type).toBe('P');
      expect(loaded.description).toBe('A test project');
    });

    it('should load an Epic work item', async () => {
      const project = await manager.createWorkItem('P', {
        title: 'Test Project'
      });

      const epic = await manager.createWorkItem('E', {
        title: 'Test Epic',
        parent: project.id,
        priority: 'high',
        complexity: 'complex'
      });

      const loaded = await loadWorkItem(epic.id, TEST_DIR);

      expect(loaded.id).toBe(epic.id);
      expect(loaded.title).toBe('Test Epic');
      expect(loaded.parent).toBe(project.id);
      expect(loaded.priority).toBe('high');
      expect(loaded.complexity).toBe('complex');
    });

    it('should load a Story with state', async () => {
      const project = await manager.createWorkItem('P', { title: 'Project' });
      const epic = await manager.createWorkItem('E', { title: 'Epic', parent: project.id });
      const feature = await manager.createWorkItem('F', { title: 'Feature', parent: epic.id });
      const story = await manager.createWorkItem('S', { title: 'Story', parent: feature.id });

      const loaded = await loadWorkItem(story.id, TEST_DIR);

      expect(loaded.id).toBe(story.id);
      expect(loaded.state).toBeDefined();
      expect(loaded.state.id).toBe(story.id);
      expect(loaded.state.progress).toBeDefined();
    });

    it('should load a Task work item', async () => {
      const project = await manager.createWorkItem('P', { title: 'Project' });
      const epic = await manager.createWorkItem('E', { title: 'Epic', parent: project.id });
      const feature = await manager.createWorkItem('F', { title: 'Feature', parent: epic.id });
      const story = await manager.createWorkItem('S', { title: 'Story', parent: feature.id });
      const task = await manager.createWorkItem('T', {
        title: 'Implement feature',
        parent: story.id
      });

      const loaded = await loadWorkItem(task.id, TEST_DIR);

      expect(loaded.id).toBe(task.id);
      expect(loaded.title).toBe('Implement feature');
      expect(loaded.parent).toBe(story.id);
      expect(loaded.type).toBe('T');
    });

    it('should throw WorkItemNotFoundError for non-existent ID', async () => {
      await expect(loadWorkItem('E9999', TEST_DIR))
        .rejects
        .toThrow(WorkItemNotFoundError);
    });

    it('should throw error for invalid ID format', async () => {
      await expect(loadWorkItem('invalid', TEST_DIR))
        .rejects
        .toThrow();
    });
  });

  describe('validateWorkItem()', () => {
    it('should validate a complete work item', () => {
      const workItem = {
        id: 'E0001',
        type: 'E',
        title: 'Test Epic',
        status: 'planned',
        parent: 'P0001'
      };

      const result = validateWorkItem(workItem);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate a Project without parent', () => {
      const workItem = {
        id: 'P0001',
        type: 'P',
        title: 'Test Project',
        status: 'planned'
      };

      const result = validateWorkItem(workItem);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect missing id', () => {
      const workItem = {
        type: 'E',
        title: 'Test',
        status: 'planned',
        parent: 'P0001'
      };

      const result = validateWorkItem(workItem);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: id');
    });

    it('should detect invalid id format', () => {
      const workItem = {
        id: 'invalid',
        type: 'E',
        title: 'Test',
        status: 'planned',
        parent: 'P0001'
      };

      const result = validateWorkItem(workItem);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid ID format'))).toBe(true);
    });

    it('should detect missing type', () => {
      const workItem = {
        id: 'E0001',
        title: 'Test',
        status: 'planned',
        parent: 'P0001'
      };

      const result = validateWorkItem(workItem);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: type');
    });

    it('should detect invalid type', () => {
      const workItem = {
        id: 'E0001',
        type: 'INVALID',
        title: 'Test',
        status: 'planned',
        parent: 'P0001'
      };

      const result = validateWorkItem(workItem);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid type'))).toBe(true);
    });

    it('should detect missing title', () => {
      const workItem = {
        id: 'E0001',
        type: 'E',
        status: 'planned',
        parent: 'P0001'
      };

      const result = validateWorkItem(workItem);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: title');
    });

    it('should detect empty title', () => {
      const workItem = {
        id: 'E0001',
        type: 'E',
        title: '   ',
        status: 'planned',
        parent: 'P0001'
      };

      const result = validateWorkItem(workItem);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title must be a non-empty string');
    });

    it('should detect missing status', () => {
      const workItem = {
        id: 'E0001',
        type: 'E',
        title: 'Test',
        parent: 'P0001'
      };

      const result = validateWorkItem(workItem);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: status');
    });

    it('should detect invalid status', () => {
      const workItem = {
        id: 'E0001',
        type: 'E',
        title: 'Test',
        status: 'invalid_status',
        parent: 'P0001'
      };

      const result = validateWorkItem(workItem);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid status'))).toBe(true);
    });

    it('should detect missing parent for non-Project', () => {
      const workItem = {
        id: 'E0001',
        type: 'E',
        title: 'Test',
        status: 'planned'
      };

      const result = validateWorkItem(workItem);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Parent is required'))).toBe(true);
    });

    it('should handle null work item', () => {
      const result = validateWorkItem(null);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Work item is null or undefined');
    });

    it('should handle undefined work item', () => {
      const result = validateWorkItem(undefined);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Work item is null or undefined');
    });

    it('should accumulate multiple validation errors', () => {
      const workItem = {
        type: 'INVALID'
      };

      const result = validateWorkItem(workItem);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('loadExecutionContext()', () => {
    it('should load context for a Story with children', async () => {
      const project = await manager.createWorkItem('P', { title: 'Project' });
      const epic = await manager.createWorkItem('E', { title: 'Epic', parent: project.id });
      const feature = await manager.createWorkItem('F', { title: 'Feature', parent: epic.id });
      const story = await manager.createWorkItem('S', { title: 'Story', parent: feature.id });
      const task1 = await manager.createWorkItem('T', { title: 'Task 1', parent: story.id });
      const task2 = await manager.createWorkItem('T', { title: 'Task 2', parent: story.id });

      const context = await loadExecutionContext(story.id, TEST_DIR);

      expect(context.workItem.id).toBe(story.id);
      expect(context.parent.id).toBe(feature.id);
      expect(context.children.length).toBe(2);
      expect(context.children.map(c => c.id)).toContain(task1.id);
      expect(context.children.map(c => c.id)).toContain(task2.id);
      expect(context.manager).toBeDefined();
    });

    it('should load siblings correctly', async () => {
      const project = await manager.createWorkItem('P', { title: 'Project' });
      const epic = await manager.createWorkItem('E', { title: 'Epic', parent: project.id });
      const feature = await manager.createWorkItem('F', { title: 'Feature', parent: epic.id });
      const story1 = await manager.createWorkItem('S', { title: 'Story 1', parent: feature.id });
      const story2 = await manager.createWorkItem('S', { title: 'Story 2', parent: feature.id });
      const story3 = await manager.createWorkItem('S', { title: 'Story 3', parent: feature.id });

      const context = await loadExecutionContext(story2.id, TEST_DIR);

      expect(context.workItem.id).toBe(story2.id);
      expect(context.siblings.length).toBe(2);
      expect(context.siblings.map(s => s.id)).toContain(story1.id);
      expect(context.siblings.map(s => s.id)).toContain(story3.id);
      expect(context.siblings.map(s => s.id)).not.toContain(story2.id);
    });

    it('should handle Project with no parent', async () => {
      const project = await manager.createWorkItem('P', { title: 'Project' });

      const context = await loadExecutionContext(project.id, TEST_DIR);

      expect(context.workItem.id).toBe(project.id);
      expect(context.parent).toBeNull();
      expect(context.siblings).toEqual([]);
    });

    it('should handle work item with no children', async () => {
      const project = await manager.createWorkItem('P', { title: 'Project' });
      const epic = await manager.createWorkItem('E', { title: 'Epic', parent: project.id });
      const feature = await manager.createWorkItem('F', { title: 'Feature', parent: epic.id });
      const story = await manager.createWorkItem('S', { title: 'Story', parent: feature.id });
      const task = await manager.createWorkItem('T', { title: 'Task', parent: story.id });

      const context = await loadExecutionContext(task.id, TEST_DIR);

      expect(context.workItem.id).toBe(task.id);
      expect(context.children).toEqual([]);
    });

    it('should throw error for non-existent work item', async () => {
      await expect(loadExecutionContext('E9999', TEST_DIR))
        .rejects
        .toThrow();
    });
  });

  describe('loadAndValidateWorkItem()', () => {
    it('should load and validate a valid work item', async () => {
      const project = await manager.createWorkItem('P', { title: 'Project' });
      const epic = await manager.createWorkItem('E', {
        title: 'Test Epic',
        parent: project.id
      });

      const workItem = await loadAndValidateWorkItem(epic.id, TEST_DIR);

      expect(workItem.id).toBe(epic.id);
      expect(workItem.title).toBe('Test Epic');
    });

    it('should throw WorkItemNotFoundError for non-existent item', async () => {
      await expect(loadAndValidateWorkItem('E9999', TEST_DIR))
        .rejects
        .toThrow(WorkItemNotFoundError);
    });

    it('should provide validation errors in error object', async () => {
      // Create a work item, then manually corrupt its data
      const project = await manager.createWorkItem('P', { title: 'Project' });
      const epic = await manager.createWorkItem('E', {
        title: 'Test Epic',
        parent: project.id
      });

      // Manually read and corrupt the work item
      const registry = await manager.loadRegistry();
      const epicPath = registry.work_items[epic.id].path;
      const filePath = path.join(TEST_DIR, epicPath);

      // Create invalid frontmatter
      const invalidContent = `---
id: ${epic.id}
type: E
title:
status: invalid_status
parent: ${project.id}
---

# Test Epic
`;

      await fs.writeFile(filePath, invalidContent, 'utf-8');

      try {
        await loadAndValidateWorkItem(epic.id, TEST_DIR);
        fail('Should have thrown WorkItemValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(WorkItemValidationError);
        expect(error.validationErrors).toBeDefined();
        expect(error.validationErrors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Types', () => {
    it('should create WorkItemNotFoundError with correct properties', () => {
      const error = new WorkItemNotFoundError('E0001');

      expect(error.name).toBe('WorkItemNotFoundError');
      expect(error.workItemId).toBe('E0001');
      expect(error.message).toContain('E0001');
    });

    it('should create WorkItemValidationError with correct properties', () => {
      const errors = ['Missing field: title', 'Invalid status'];
      const error = new WorkItemValidationError('E0001', errors);

      expect(error.name).toBe('WorkItemValidationError');
      expect(error.workItemId).toBe('E0001');
      expect(error.validationErrors).toEqual(errors);
      expect(error.message).toContain('E0001');
      expect(error.message).toContain('Missing field: title');
    });

    it('should create WorkItemDeletedError with correct properties', () => {
      const error = new WorkItemDeletedError('E0001');

      expect(error.name).toBe('WorkItemDeletedError');
      expect(error.workItemId).toBe('E0001');
      expect(error.message).toContain('deleted');
      expect(error.message).toContain('E0001');
    });
  });

  describe('Execution State Management', () => {
    const {
      initializeExecution,
      updateExecutionStatus,
      syncToCascade,
      addExecutionHistory,
      resumeExecution
    } = require('../../plugins/carl/lib/orchestration/work-helpers');

    describe('initializeExecution()', () => {
      it('should initialize execution state with required fields', () => {
        const state = initializeExecution('S0010');

        expect(state.workItemId).toBe('S0010');
        expect(state.status).toBe('pending');
        expect(state.startedAt).toBeDefined();
        expect(state.updatedAt).toBeDefined();
        expect(state.completedAt).toBeNull();
        expect(state.progress).toBe(0);
        expect(state.context).toEqual({});
        expect(state.history).toHaveLength(1);
        expect(state.history[0].event).toBe('initialized');
        expect(state.errors).toEqual([]);
        expect(state.retryCount).toBe(0);
      });

      it('should accept session ID in options', () => {
        const state = initializeExecution('S0010', {
          sessionId: 'session-123'
        });

        expect(state.sessionId).toBe('session-123');
      });

      it('should accept custom context', () => {
        const context = { triggeredBy: 'user', priority: 'high' };
        const state = initializeExecution('S0010', { context });

        expect(state.context).toEqual(context);
      });

      it('should add initialization event to history', () => {
        const state = initializeExecution('S0010');

        expect(state.history).toHaveLength(1);
        expect(state.history[0]).toMatchObject({
          event: 'initialized',
          status: 'pending',
          message: 'Execution state initialized'
        });
      });
    });

    describe('updateExecutionStatus()', () => {
      let state;

      beforeEach(() => {
        state = initializeExecution('S0010');
      });

      it('should update status and add history entry', () => {
        const updated = updateExecutionStatus(state, 'in_progress');

        expect(updated.status).toBe('in_progress');
        expect(updated.history).toHaveLength(2);
        expect(updated.history[1].event).toBe('status_changed');
        expect(updated.history[1].status).toBe('in_progress');
        expect(updated.history[1].previousStatus).toBe('pending');
      });

      it('should accept custom message', () => {
        const updated = updateExecutionStatus(state, 'in_progress', {
          message: 'Starting task execution'
        });

        expect(updated.history[1].message).toBe('Starting task execution');
      });

      it('should set completedAt when status is completed', () => {
        const updated = updateExecutionStatus(state, 'completed');

        expect(updated.completedAt).not.toBeNull();
        expect(updated.progress).toBe(100);
      });

      it('should set completedAt when status is failed', () => {
        const updated = updateExecutionStatus(state, 'failed');

        expect(updated.completedAt).not.toBeNull();
      });

      it('should record error when provided', () => {
        const error = new Error('Test error');
        const updated = updateExecutionStatus(state, 'failed', { error });

        expect(updated.errors).toHaveLength(1);
        expect(updated.errors[0].message).toBe('Test error');
        expect(updated.errors[0].type).toBe('Error');
        expect(updated.history[1].error).toBeDefined();
      });

      it('should throw error for invalid status', () => {
        expect(() => {
          updateExecutionStatus(state, 'invalid_status');
        }).toThrow('Invalid status');
      });

      it('should handle multiple status transitions', () => {
        let updated = updateExecutionStatus(state, 'in_progress');
        updated = updateExecutionStatus(updated, 'completed');

        expect(updated.status).toBe('completed');
        expect(updated.history).toHaveLength(3); // init + 2 transitions
      });

      it('should update updatedAt timestamp', () => {
        const original = state.updatedAt;
        // Wait a tiny bit to ensure timestamp changes
        const updated = updateExecutionStatus(state, 'in_progress');

        expect(updated.updatedAt).toBeDefined();
        expect(updated.updatedAt >= original).toBe(true);
      });
    });

    describe('syncToCascade()', () => {
      it('should sync execution state to Cascade', async () => {
        // Create a test work item
        const project = await manager.createWorkItem('P', { title: 'Project' });
        const epic = await manager.createWorkItem('E', {
          title: 'Epic',
          parent: project.id
        });

        // Initialize execution state
        const state = initializeExecution(epic.id);
        updateExecutionStatus(state, 'in_progress');

        // Sync to Cascade
        await syncToCascade(state, TEST_DIR);

        // Verify it was synced (Cascade uses hyphenated status)
        const workItem = await manager.getWorkItem(epic.id);
        expect(workItem.status).toBe('in-progress');
      });

      it('should map execution statuses to Cascade statuses', async () => {
        const project = await manager.createWorkItem('P', { title: 'Project' });
        const epic = await manager.createWorkItem('E', {
          title: 'Epic',
          parent: project.id
        });

        // Test pending → planned mapping
        const state = initializeExecution(epic.id);
        await syncToCascade(state, TEST_DIR);

        let workItem = await manager.getWorkItem(epic.id);
        expect(workItem.status).toBe('planned');

        // Test completed mapping
        updateExecutionStatus(state, 'completed');
        await syncToCascade(state, TEST_DIR);

        workItem = await manager.getWorkItem(epic.id);
        expect(workItem.status).toBe('completed');
      });

      it('should throw error if sync fails', async () => {
        const state = initializeExecution('INVALID_ID');

        await expect(syncToCascade(state, TEST_DIR))
          .rejects
          .toThrow('Failed to sync to Cascade');
      });
    });

    describe('addExecutionHistory()', () => {
      it('should add custom event to history', () => {
        const state = initializeExecution('S0010');
        const updated = addExecutionHistory(state, 'dependency_resolved', {
          dependency: 'T0013',
          result: 'success'
        });

        expect(updated.history).toHaveLength(2);
        expect(updated.history[1]).toMatchObject({
          event: 'dependency_resolved',
          dependency: 'T0013',
          result: 'success'
        });
      });

      it('should update updatedAt timestamp', () => {
        const state = initializeExecution('S0010');
        const original = state.updatedAt;

        const updated = addExecutionHistory(state, 'test_event');

        expect(updated.updatedAt).toBeDefined();
        expect(updated.updatedAt >= original).toBe(true);
      });

      it('should handle events with no additional data', () => {
        const state = initializeExecution('S0010');
        const updated = addExecutionHistory(state, 'checkpoint_reached');

        expect(updated.history).toHaveLength(2);
        expect(updated.history[1].event).toBe('checkpoint_reached');
      });
    });

    describe('resumeExecution()', () => {
      it('should resume from valid saved state', () => {
        const originalState = initializeExecution('S0010');
        updateExecutionStatus(originalState, 'in_progress');

        const originalHistoryLength = originalState.history.length;
        const resumed = resumeExecution(originalState);

        expect(resumed.workItemId).toBe('S0010');
        expect(resumed.history.length).toBeGreaterThan(originalHistoryLength);
        expect(resumed.history[resumed.history.length - 1].event).toBe('execution_resumed');
      });

      it('should throw error for invalid saved state - missing workItemId', () => {
        const invalidState = {
          status: 'in_progress',
          startedAt: new Date().toISOString(),
          history: []
        };

        expect(() => {
          resumeExecution(invalidState);
        }).toThrow('Invalid saved state: missing required field \'workItemId\'');
      });

      it('should throw error for invalid saved state - missing status', () => {
        const invalidState = {
          workItemId: 'S0010',
          startedAt: new Date().toISOString(),
          history: []
        };

        expect(() => {
          resumeExecution(invalidState);
        }).toThrow('Invalid saved state: missing required field \'status\'');
      });

      it('should throw error for invalid saved state - missing history', () => {
        const invalidState = {
          workItemId: 'S0010',
          status: 'in_progress',
          startedAt: new Date().toISOString()
        };

        expect(() => {
          resumeExecution(invalidState);
        }).toThrow('Invalid saved state: missing required field \'history\'');
      });

      it('should preserve original state data', () => {
        const originalState = initializeExecution('S0010', {
          sessionId: 'session-123',
          context: { priority: 'high' }
        });
        updateExecutionStatus(originalState, 'in_progress');

        const resumed = resumeExecution(originalState);

        expect(resumed.sessionId).toBe('session-123');
        expect(resumed.context.priority).toBe('high');
        expect(resumed.status).toBe('in_progress');
      });
    });
  });
});
