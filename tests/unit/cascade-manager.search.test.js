/**
 * Cascade Manager Tests: Search & Query Operations
 *
 * Tests for finding and filtering work items by various criteria.
 * Covers: searchWorkItems(), getWorkItemsByType()
 */

const CascadeManager = require('../../plugins/carl/lib/cascade/cascade-manager.js');
const fs = require('fs').promises;
const path = require('path');

// Test directory - contained within tests/ directory to avoid polluting root
const TEST_DIR = path.join(__dirname, '..', '.test-artifacts', '.cascade-search-test');

describe('CascadeManager - Search & Queries', () => {
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

  // Helper to create test work items
  async function createTestWorkItems(manager) {
    await manager.initialize();

    // Create a complete hierarchy for testing
    const project = await manager.createWorkItem('P', {
      title: 'Test Project',
      description: 'Project for search testing'
    });

    const epic1 = await manager.createWorkItem('E', {
      title: 'User Authentication',
      description: 'Epic 1',
      parent: project.id
    });

    const epic2 = await manager.createWorkItem('E', {
      title: 'Data Management',
      description: 'Epic 2',
      parent: project.id
    });

    const feature1 = await manager.createWorkItem('F', {
      title: 'Login System',
      description: 'Feature in Epic 1',
      parent: epic1.id
    });

    const feature2 = await manager.createWorkItem('F', {
      title: 'User Profiles',
      description: 'Feature in Epic 2',
      parent: epic2.id
    });

    const story1 = await manager.createWorkItem('S', {
      title: 'Login Form',
      description: 'Story in Feature 1',
      parent: feature1.id
    });

    const story2 = await manager.createWorkItem('S', {
      title: 'Profile Editor',
      description: 'Story in Feature 2',
      parent: feature2.id
    });

    const bug = await manager.createWorkItem('B', {
      title: 'Login Bug',
      description: 'Bug in Feature 1',
      parent: feature1.id
    });

    const task = await manager.createWorkItem('T', {
      title: 'Write Tests',
      description: 'Task in Story 1',
      parent: story1.id
    });

    // Update some statuses
    await manager.updateStatus(epic1.id, 'in-progress');
    await manager.updateStatus(feature1.id, 'in-progress');
    await manager.updateStatus(story2.id, 'completed');

    return { project, epic1, epic2, feature1, feature2, story1, story2, bug, task };
  }

  describe('searchWorkItems()', () => {
    it('should find all work items with no criteria', async () => {
      const items = await createTestWorkItems(manager);

      const results = await manager.searchWorkItems();

      // Should return all 9 items
      expect(results).toHaveLength(9);
    });

    it('should filter by type', async () => {
      await createTestWorkItems(manager);

      const epics = await manager.searchWorkItems({ type: 'E' });
      const features = await manager.searchWorkItems({ type: 'F' });
      const stories = await manager.searchWorkItems({ type: 'S' });

      expect(epics).toHaveLength(2);
      expect(features).toHaveLength(2);
      expect(stories).toHaveLength(2);

      // Verify IDs
      expect(epics.every(item => item.id.startsWith('E'))).toBe(true);
      expect(features.every(item => item.id.startsWith('F'))).toBe(true);
      expect(stories.every(item => item.id.startsWith('S'))).toBe(true);
    });

    it('should filter by status', async () => {
      await createTestWorkItems(manager);

      const planned = await manager.searchWorkItems({ status: 'planned' });
      const inProgress = await manager.searchWorkItems({ status: 'in-progress' });
      const completed = await manager.searchWorkItems({ status: 'completed' });

      // P, E2, F2, S1, B, T are planned (6)
      expect(planned).toHaveLength(6);

      // E1, F1 are in-progress (2)
      expect(inProgress).toHaveLength(2);

      // S2 is completed (1)
      expect(completed).toHaveLength(1);
      expect(completed[0].status).toBe('completed');
    });

    it('should filter by parent', async () => {
      const items = await createTestWorkItems(manager);

      const epic1Children = await manager.searchWorkItems({ parent: items.epic1.id });
      const epic2Children = await manager.searchWorkItems({ parent: items.epic2.id });
      const feature1Children = await manager.searchWorkItems({ parent: items.feature1.id });

      // Epic1 has 1 Feature
      expect(epic1Children).toHaveLength(1);
      expect(epic1Children[0].id).toBe(items.feature1.id);

      // Epic2 has 1 Feature
      expect(epic2Children).toHaveLength(1);
      expect(epic2Children[0].id).toBe(items.feature2.id);

      // Feature1 has 1 Story and 1 Bug
      expect(feature1Children).toHaveLength(2);
      const childIds = feature1Children.map(c => c.id).sort();
      expect(childIds).toEqual([items.story1.id, items.bug.id].sort());
    });

    it('should filter by multiple criteria', async () => {
      await createTestWorkItems(manager);

      // Find in-progress Features
      const inProgressFeatures = await manager.searchWorkItems({
        type: 'F',
        status: 'in-progress'
      });

      expect(inProgressFeatures).toHaveLength(1);
      expect(inProgressFeatures[0].type).toBe('F');
      expect(inProgressFeatures[0].status).toBe('in-progress');
    });

    it('should exclude deleted items by default', async () => {
      const items = await createTestWorkItems(manager);

      // Delete a work item
      await manager.deleteWorkItem(items.bug.id);

      // Search should exclude deleted
      const all = await manager.searchWorkItems();
      const bugs = await manager.searchWorkItems({ type: 'B' });

      expect(all).toHaveLength(8); // 9 - 1 deleted
      expect(bugs).toHaveLength(0); // Bug was deleted
    });

    it('should include deleted items when explicitly requested', async () => {
      const items = await createTestWorkItems(manager);

      // Delete a work item
      await manager.deleteWorkItem(items.bug.id);

      // Explicitly include deleted
      const allIncludingDeleted = await manager.searchWorkItems({ deleted: true });
      const allActive = await manager.searchWorkItems({ deleted: false });

      // Should find only the deleted item
      expect(allIncludingDeleted).toHaveLength(1);
      expect(allIncludingDeleted[0].id).toBe(items.bug.id);

      // Should find all active items
      expect(allActive).toHaveLength(8);
    });

    it('should return empty array when no matches', async () => {
      await createTestWorkItems(manager);

      const results = await manager.searchWorkItems({ status: 'blocked' });

      expect(results).toEqual([]);
    });

    it('should handle empty registry', async () => {
      await manager.initialize();

      const results = await manager.searchWorkItems();

      expect(results).toEqual([]);
    });

    it('should return complete work item objects', async () => {
      const items = await createTestWorkItems(manager);

      const epics = await manager.searchWorkItems({ type: 'E' });

      // Verify structure
      expect(epics[0]).toHaveProperty('id');
      expect(epics[0]).toHaveProperty('type');
      expect(epics[0]).toHaveProperty('title');
      expect(epics[0]).toHaveProperty('description');
      expect(epics[0]).toHaveProperty('status');
      expect(epics[0]).toHaveProperty('parent');
      expect(epics[0]).toHaveProperty('created');
      expect(epics[0]).toHaveProperty('updated');
      expect(epics[0]).toHaveProperty('path');
    });
  });

  describe('getWorkItemsByType()', () => {
    it('should get all Projects', async () => {
      await createTestWorkItems(manager);

      const projects = await manager.getWorkItemsByType('P');

      expect(projects).toHaveLength(1);
      expect(projects[0].type).toBe('P');
    });

    it('should get all Epics', async () => {
      await createTestWorkItems(manager);

      const epics = await manager.getWorkItemsByType('E');

      expect(epics).toHaveLength(2);
      expect(epics.every(e => e.type === 'E')).toBe(true);
    });

    it('should get all Features', async () => {
      await createTestWorkItems(manager);

      const features = await manager.getWorkItemsByType('F');

      expect(features).toHaveLength(2);
      expect(features.every(f => f.type === 'F')).toBe(true);
    });

    it('should get all Stories', async () => {
      await createTestWorkItems(manager);

      const stories = await manager.getWorkItemsByType('S');

      expect(stories).toHaveLength(2);
      expect(stories.every(s => s.type === 'S')).toBe(true);
    });

    it('should get all Bugs', async () => {
      await createTestWorkItems(manager);

      const bugs = await manager.getWorkItemsByType('B');

      expect(bugs).toHaveLength(1);
      expect(bugs[0].type).toBe('B');
    });

    it('should get all Tasks', async () => {
      await createTestWorkItems(manager);

      const tasks = await manager.getWorkItemsByType('T');

      expect(tasks).toHaveLength(1);
      expect(tasks[0].type).toBe('T');
    });

    it('should exclude deleted items by default', async () => {
      const items = await createTestWorkItems(manager);

      // Delete a feature
      await manager.deleteWorkItem(items.feature1.id);

      const features = await manager.getWorkItemsByType('F');

      expect(features).toHaveLength(1);
      expect(features[0].id).toBe(items.feature2.id);
    });

    it('should return empty array when no items of type exist', async () => {
      await createTestWorkItems(manager);

      const phases = await manager.getWorkItemsByType('PH');

      expect(phases).toEqual([]);
    });

    it('should reject invalid types', async () => {
      await manager.initialize();

      await expect(manager.getWorkItemsByType('INVALID'))
        .rejects
        .toThrow('Invalid work item type');

      await expect(manager.getWorkItemsByType('X'))
        .rejects
        .toThrow('Invalid work item type');
    });

    it('should handle empty registry', async () => {
      await manager.initialize();

      const epics = await manager.getWorkItemsByType('E');

      expect(epics).toEqual([]);
    });

    it('should return complete work item objects', async () => {
      await createTestWorkItems(manager);

      const stories = await manager.getWorkItemsByType('S');

      // Verify structure
      expect(stories[0]).toHaveProperty('id');
      expect(stories[0]).toHaveProperty('type');
      expect(stories[0]).toHaveProperty('title');
      expect(stories[0]).toHaveProperty('description');
      expect(stories[0]).toHaveProperty('status');
      expect(stories[0]).toHaveProperty('parent');
      expect(stories[0]).toHaveProperty('created');
      expect(stories[0]).toHaveProperty('updated');
      expect(stories[0]).toHaveProperty('path');
    });
  });
});
