/**
 * Cascade Manager Tests: State Management
 *
 * Tests for work item state tracking and status updates.
 * Covers: createState(), getState(), updateStatus()
 */

const CascadeManager = require('../../plugins/carl/lib/cascade/cascade-manager.js');
const fs = require('fs').promises;
const path = require('path');

// Test directory - contained within tests/ directory to avoid polluting root
const TEST_DIR = path.join(__dirname, '..', '.test-artifacts', '.cascade-state-test');

describe('CascadeManager - State Management', () => {
  let manager;

  beforeEach(async () => {
    // Registry path is auto-calculated from TEST_DIR
    manager = new CascadeManager(TEST_DIR);
    // Clean up before each test
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch (error) {
      // Ignore if doesn't exist
    }
  });

  afterEach(async () => {
    // Clean up after each test
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('createState()', () => {
    it('should create state.json with proper structure', async () => {
      await manager.initialize();

      const dirPath = path.join(TEST_DIR, 'test-dir');
      await fs.mkdir(dirPath, { recursive: true });

      const result = await manager.createState(dirPath, 'E0001', 'planned');

      expect(result).toBe(true);

      const statePath = path.join(dirPath, 'state.json');
      const stateContent = await fs.readFile(statePath, 'utf-8');
      const state = JSON.parse(stateContent);

      expect(state.id).toBe('E0001');
      expect(state.status).toBe('planned');
      expect(state).toHaveProperty('updated');
      expect(state).toHaveProperty('progress');
      expect(state).toHaveProperty('children');
    });

    it('should initialize progress metrics to zero', async () => {
      await manager.initialize();

      const dirPath = path.join(TEST_DIR, 'test-dir');
      await fs.mkdir(dirPath, { recursive: true });

      await manager.createState(dirPath, 'F0001', 'planned');

      const statePath = path.join(dirPath, 'state.json');
      const state = JSON.parse(await fs.readFile(statePath, 'utf-8'));

      expect(state.progress).toEqual({
        total_items: 0,
        completed: 0,
        in_progress: 0,
        planned: 0,
        blocked: 0
      });
    });

    it('should initialize children to empty object', async () => {
      await manager.initialize();

      const dirPath = path.join(TEST_DIR, 'test-dir');
      await fs.mkdir(dirPath, { recursive: true });

      await manager.createState(dirPath, 'E0001', 'planned');

      const statePath = path.join(dirPath, 'state.json');
      const state = JSON.parse(await fs.readFile(statePath, 'utf-8'));

      expect(state.children).toEqual({});
    });

    it('should default to planned status if not specified', async () => {
      await manager.initialize();

      const dirPath = path.join(TEST_DIR, 'test-dir');
      await fs.mkdir(dirPath, { recursive: true });

      await manager.createState(dirPath, 'S0001');

      const statePath = path.join(dirPath, 'state.json');
      const state = JSON.parse(await fs.readFile(statePath, 'utf-8'));

      expect(state.status).toBe('planned');
    });

    it('should accept different status values', async () => {
      await manager.initialize();

      const dirPath = path.join(TEST_DIR, 'test-dir');
      await fs.mkdir(dirPath, { recursive: true });

      await manager.createState(dirPath, 'E0001', 'in-progress');

      const statePath = path.join(dirPath, 'state.json');
      const state = JSON.parse(await fs.readFile(statePath, 'utf-8'));

      expect(state.status).toBe('in-progress');
    });

    it('should create directory if it does not exist', async () => {
      await manager.initialize();

      const dirPath = path.join(TEST_DIR, 'new-dir');

      await manager.createState(dirPath, 'F0001', 'planned');

      const statePath = path.join(dirPath, 'state.json');
      const state = JSON.parse(await fs.readFile(statePath, 'utf-8'));

      expect(state.id).toBe('F0001');
    });
  });

  describe('getState()', () => {
    it('should read state.json for work item', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', { title: 'Project' });

      const state = await manager.getState(project.id);

      expect(state).not.toBeNull();
      expect(state.id).toBe(project.id);
      expect(state.status).toBe('planned');
      expect(state).toHaveProperty('progress');
      expect(state).toHaveProperty('children');
      expect(state).toHaveProperty('updated');
    });

    it('should return null for Tasks', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', { title: 'Project' });
      const epic = await manager.createWorkItem('E', {
        title: 'Epic',
        parent: project.id
      });
      const feature = await manager.createWorkItem('F', {
        title: 'Feature',
        parent: epic.id
      });
      const story = await manager.createWorkItem('S', {
        title: 'Story',
        parent: feature.id
      });
      const task = await manager.createWorkItem('T', {
        title: 'Task',
        parent: story.id
      });

      const state = await manager.getState(task.id);

      expect(state).toBeNull();
    });

    it('should return null for non-existent work item', async () => {
      await manager.initialize();

      const state = await manager.getState('E9999');

      expect(state).toBeNull();
    });

    it('should return null if state.json does not exist', async () => {
      await manager.initialize();

      // Create a work item but manually delete its state.json
      const project = await manager.createWorkItem('P', { title: 'Project' });
      const statePath = path.join(TEST_DIR, 'state.json');
      await fs.unlink(statePath);

      const state = await manager.getState(project.id);

      expect(state).toBeNull();
    });

    it('should throw error for invalid ID format', async () => {
      await manager.initialize();

      await expect(manager.getState('INVALID'))
        .rejects
        .toThrow('Invalid work item ID format');
    });
  });

  describe('updateStatus()', () => {
    it('should update status in markdown frontmatter', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', { title: 'Project' });

      await manager.updateStatus(project.id, 'in-progress');

      const workItem = await manager.getWorkItem(project.id);
      expect(workItem.status).toBe('in-progress');
    });

    it('should update status in state.json', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', { title: 'Project' });

      await manager.updateStatus(project.id, 'in-progress');

      const state = await manager.getState(project.id);
      expect(state.status).toBe('in-progress');
    });

    it('should update status in registry', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', { title: 'Project' });

      await manager.updateStatus(project.id, 'in-progress');

      const registry = await manager.loadRegistry();
      expect(registry.work_items[project.id].status).toBe('in-progress');
    });

    it('should update all three locations atomically', async () => {
      await manager.initialize();

      const epic = await manager.createWorkItem('P', { title: 'Project' });
      const feature = await manager.createWorkItem('E', {
        title: 'Epic',
        parent: epic.id
      });

      await manager.updateStatus(feature.id, 'completed');

      // Check markdown
      const workItem = await manager.getWorkItem(feature.id);
      expect(workItem.status).toBe('completed');

      // Check state.json
      const state = await manager.getState(feature.id);
      expect(state.status).toBe('completed');

      // Check registry
      const registry = await manager.loadRegistry();
      expect(registry.work_items[feature.id].status).toBe('completed');
    });

    it('should handle all valid status values', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', { title: 'Project' });

      const statuses = ['planned', 'in-progress', 'completed', 'blocked'];

      for (const status of statuses) {
        await manager.updateStatus(project.id, status);

        const workItem = await manager.getWorkItem(project.id);
        expect(workItem.status).toBe(status);
      }
    });

    it('should update Tasks (which have no state.json)', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', { title: 'Project' });
      const epic = await manager.createWorkItem('E', {
        title: 'Epic',
        parent: project.id
      });
      const feature = await manager.createWorkItem('F', {
        title: 'Feature',
        parent: epic.id
      });
      const story = await manager.createWorkItem('S', {
        title: 'Story',
        parent: feature.id
      });
      const task = await manager.createWorkItem('T', {
        title: 'Task',
        parent: story.id
      });

      await manager.updateStatus(task.id, 'completed');

      const workItem = await manager.getWorkItem(task.id);
      expect(workItem.status).toBe('completed');

      // Task should have null state
      expect(workItem.state).toBeNull();

      // But registry should be updated
      const registry = await manager.loadRegistry();
      expect(registry.work_items[task.id].status).toBe('completed');
    });

    it('should update timestamp', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', { title: 'Project' });
      const originalTimestamp = project.updated;

      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));

      await manager.updateStatus(project.id, 'in-progress');

      const workItem = await manager.getWorkItem(project.id);
      expect(workItem.updated).not.toBe(originalTimestamp);
    });

    it('should throw error for non-existent work item', async () => {
      await manager.initialize();

      await expect(manager.updateStatus('E9999', 'in-progress'))
        .rejects
        .toThrow('Work item not found');
    });

    it('should throw error for deleted work item', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', { title: 'Project' });
      await manager.deleteWorkItem(project.id);

      await expect(manager.updateStatus(project.id, 'in-progress'))
        .rejects
        .toThrow('Work item has been deleted');
    });

    it('should throw error for invalid status', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', { title: 'Project' });

      await expect(manager.updateStatus(project.id, 'invalid-status'))
        .rejects
        .toThrow('Invalid status');
    });
  });
});
