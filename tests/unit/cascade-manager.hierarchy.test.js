/**
 * Cascade Manager Tests: Hierarchy Navigation
 *
 * Tests for traversing and querying work item parent-child relationships.
 * Covers: getParent(), getChildren(), getHierarchy()
 */

const CascadeManager = require('../../plugins/carl/lib/cascade/cascade-manager.js');
const fs = require('fs').promises;
const path = require('path');

// Test directory - contained within tests/ directory to avoid polluting root
const TEST_DIR = path.join(__dirname, '..', '.test-artifacts', '.cascade-hierarchy-test');

describe('CascadeManager - Hierarchy Navigation', () => {
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

  // Helper to create a test hierarchy
  async function createTestHierarchy(manager) {
    await manager.initialize();

    const project = await manager.createWorkItem('P', {
      title: 'Test Project',
      description: 'Root project'
    });

    const epic1 = await manager.createWorkItem('E', {
      title: 'Epic 1',
      parent: project.id
    });

    const epic2 = await manager.createWorkItem('E', {
      title: 'Epic 2',
      parent: project.id
    });

    const feature1 = await manager.createWorkItem('F', {
      title: 'Feature 1',
      parent: epic1.id
    });

    const feature2 = await manager.createWorkItem('F', {
      title: 'Feature 2',
      parent: epic1.id
    });

    const story1 = await manager.createWorkItem('S', {
      title: 'Story 1',
      parent: feature1.id
    });

    const bug1 = await manager.createWorkItem('B', {
      title: 'Bug 1',
      parent: feature1.id
    });

    const task1 = await manager.createWorkItem('T', {
      title: 'Task 1',
      parent: story1.id
    });

    return { project, epic1, epic2, feature1, feature2, story1, bug1, task1 };
  }

  describe('getParent()', () => {
    it('should return parent work item', async () => {
      const items = await createTestHierarchy(manager);

      const parent = await manager.getParent(items.epic1.id);

      expect(parent).not.toBeNull();
      expect(parent.id).toBe(items.project.id);
      expect(parent.title).toBe('Test Project');
    });

    it('should return null for Project (no parent)', async () => {
      const items = await createTestHierarchy(manager);

      const parent = await manager.getParent(items.project.id);

      expect(parent).toBeNull();
    });

    it('should return null for non-existent work item', async () => {
      await manager.initialize();

      const parent = await manager.getParent('E9999');

      expect(parent).toBeNull();
    });

    it('should handle multi-level hierarchy', async () => {
      const items = await createTestHierarchy(manager);

      const taskParent = await manager.getParent(items.task1.id);
      expect(taskParent.id).toBe(items.story1.id);

      const storyParent = await manager.getParent(items.story1.id);
      expect(storyParent.id).toBe(items.feature1.id);

      const featureParent = await manager.getParent(items.feature1.id);
      expect(featureParent.id).toBe(items.epic1.id);

      const epicParent = await manager.getParent(items.epic1.id);
      expect(epicParent.id).toBe(items.project.id);

      const projectParent = await manager.getParent(items.project.id);
      expect(projectParent).toBeNull();
    });

    it('should throw error for invalid ID format', async () => {
      await manager.initialize();

      await expect(manager.getParent('INVALID'))
        .rejects
        .toThrow('Invalid work item ID format');
    });

    it('should return null for deleted parent', async () => {
      const items = await createTestHierarchy(manager);

      // Delete the parent
      await manager.deleteWorkItem(items.epic1.id);

      const parent = await manager.getParent(items.feature1.id);

      expect(parent).toBeNull();
    });
  });

  describe('getChildren()', () => {
    it('should return direct children of a work item', async () => {
      const items = await createTestHierarchy(manager);

      const children = await manager.getChildren(items.epic1.id);

      expect(children).toHaveLength(2);
      const childIds = children.map(c => c.id).sort();
      expect(childIds).toEqual([items.feature1.id, items.feature2.id].sort());
    });

    it('should return empty array for work items with no children', async () => {
      const items = await createTestHierarchy(manager);

      const children = await manager.getChildren(items.task1.id);

      expect(children).toEqual([]);
    });

    it('should return empty array for non-existent work item', async () => {
      await manager.initialize();

      const children = await manager.getChildren('E9999');

      expect(children).toEqual([]);
    });

    it('should return children of different types', async () => {
      const items = await createTestHierarchy(manager);

      const children = await manager.getChildren(items.feature1.id);

      expect(children).toHaveLength(2);
      const types = children.map(c => c.type).sort();
      expect(types).toEqual(['B', 'S']);
    });

    it('should include all child properties', async () => {
      const items = await createTestHierarchy(manager);

      const children = await manager.getChildren(items.project.id);

      expect(children[0]).toHaveProperty('id');
      expect(children[0]).toHaveProperty('type');
      expect(children[0]).toHaveProperty('title');
      expect(children[0]).toHaveProperty('status');
      expect(children[0]).toHaveProperty('parent');
      expect(children[0]).toHaveProperty('created');
      expect(children[0]).toHaveProperty('updated');
    });

    it('should exclude deleted children', async () => {
      const items = await createTestHierarchy(manager);

      // Delete one child
      await manager.deleteWorkItem(items.feature1.id);

      const children = await manager.getChildren(items.epic1.id);

      expect(children).toHaveLength(1);
      expect(children[0].id).toBe(items.feature2.id);
    });

    it('should handle Tasks (which are files, not directories)', async () => {
      const items = await createTestHierarchy(manager);

      const children = await manager.getChildren(items.story1.id);

      expect(children).toHaveLength(1);
      expect(children[0].id).toBe(items.task1.id);
      expect(children[0].type).toBe('T');
    });

    it('should throw error for invalid ID format', async () => {
      await manager.initialize();

      await expect(manager.getChildren('INVALID'))
        .rejects
        .toThrow('Invalid work item ID format');
    });
  });

  describe('getHierarchy()', () => {
    it('should return work item with nested children', async () => {
      const items = await createTestHierarchy(manager);

      const hierarchy = await manager.getHierarchy(items.project.id);

      expect(hierarchy.id).toBe(items.project.id);
      expect(hierarchy).toHaveProperty('children');
      expect(Array.isArray(hierarchy.children)).toBe(true);
    });

    it('should recursively load all descendants', async () => {
      const items = await createTestHierarchy(manager);

      const hierarchy = await manager.getHierarchy(items.project.id);

      // Should have 2 epics
      expect(hierarchy.children).toHaveLength(2);

      // Epic 1 should have 2 features
      const epic1 = hierarchy.children.find(c => c.id === items.epic1.id);
      expect(epic1.children).toHaveLength(2);

      // Feature 1 should have 2 children (story and bug)
      const feature1 = epic1.children.find(c => c.id === items.feature1.id);
      expect(feature1.children).toHaveLength(2);

      // Story 1 should have 1 task
      const story1 = feature1.children.find(c => c.id === items.story1.id);
      expect(story1.children).toHaveLength(1);

      // Task should have no children
      const task1 = story1.children.find(c => c.id === items.task1.id);
      expect(task1.children).toHaveLength(0);
    });

    it('should return full 5-level hierarchy', async () => {
      const items = await createTestHierarchy(manager);

      const hierarchy = await manager.getHierarchy(items.project.id);

      // Verify we can traverse down 5 levels
      expect(hierarchy.id).toBe(items.project.id); // Level 1: Project
      const epic = hierarchy.children.find(c => c.id === items.epic1.id);
      expect(epic.id).toBe(items.epic1.id); // Level 2: Epic
      const feature = epic.children.find(c => c.id === items.feature1.id);
      expect(feature.id).toBe(items.feature1.id); // Level 3: Feature
      const story = feature.children.find(c => c.id === items.story1.id);
      expect(story.id).toBe(items.story1.id); // Level 4: Story
      const task = story.children.find(c => c.id === items.task1.id);
      expect(task.id).toBe(items.task1.id); // Level 5: Task
    });

    it('should return empty children array for leaf nodes', async () => {
      const items = await createTestHierarchy(manager);

      const hierarchy = await manager.getHierarchy(items.task1.id);

      expect(hierarchy.children).toEqual([]);
    });

    it('should load hierarchy from any level', async () => {
      const items = await createTestHierarchy(manager);

      const hierarchy = await manager.getHierarchy(items.feature1.id);

      expect(hierarchy.id).toBe(items.feature1.id);
      expect(hierarchy.children).toHaveLength(2);

      const story = hierarchy.children.find(c => c.id === items.story1.id);
      expect(story.children).toHaveLength(1);
    });

    it('should return null for non-existent work item', async () => {
      await manager.initialize();

      const hierarchy = await manager.getHierarchy('E9999');

      expect(hierarchy).toBeNull();
    });

    it('should include all work item properties at each level', async () => {
      const items = await createTestHierarchy(manager);

      const hierarchy = await manager.getHierarchy(items.project.id);

      // Check root properties
      expect(hierarchy).toHaveProperty('id');
      expect(hierarchy).toHaveProperty('type');
      expect(hierarchy).toHaveProperty('title');
      expect(hierarchy).toHaveProperty('status');
      expect(hierarchy).toHaveProperty('children');

      // Check child properties
      const epic = hierarchy.children[0];
      expect(epic).toHaveProperty('id');
      expect(epic).toHaveProperty('type');
      expect(epic).toHaveProperty('title');
      expect(epic).toHaveProperty('parent');
      expect(epic).toHaveProperty('children');
    });

    it('should exclude deleted items from hierarchy', async () => {
      const items = await createTestHierarchy(manager);

      // Delete a feature
      await manager.deleteWorkItem(items.feature1.id);

      const hierarchy = await manager.getHierarchy(items.epic1.id);

      // Should only have 1 feature now
      expect(hierarchy.children).toHaveLength(1);
      expect(hierarchy.children[0].id).toBe(items.feature2.id);
    });

    it('should handle work items with siblings at same level', async () => {
      const items = await createTestHierarchy(manager);

      const hierarchy = await manager.getHierarchy(items.project.id);

      // Project has 2 epics (siblings)
      expect(hierarchy.children).toHaveLength(2);
      const epicIds = hierarchy.children.map(c => c.id).sort();
      expect(epicIds).toEqual([items.epic1.id, items.epic2.id].sort());
    });

    it('should throw error for invalid ID format', async () => {
      await manager.initialize();

      await expect(manager.getHierarchy('INVALID'))
        .rejects
        .toThrow('Invalid work item ID format');
    });

    it('should load hierarchy in parallel for performance', async () => {
      const items = await createTestHierarchy(manager);

      const startTime = Date.now();
      await manager.getHierarchy(items.project.id);
      const duration = Date.now() - startTime;

      // Should complete reasonably fast due to parallel loading
      // This is a heuristic test - parallel should be faster than sequential
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});
