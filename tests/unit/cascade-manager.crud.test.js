/**
 * Cascade Manager Tests: CRUD Operations
 *
 * Tests for creating, reading, updating, and deleting work items.
 * Covers: createWorkItem(), getWorkItem(), updateWorkItem(), deleteWorkItem(),
 *         _generateMarkdown(), _parseMarkdown()
 */

const CascadeManager = require('../../plugins/carl/lib/cascade/cascade-manager.js');
const fs = require('fs').promises;
const path = require('path');

// Test directory - contained within tests/ directory to avoid polluting root
const TEST_DIR = path.join(__dirname, '..', '.test-artifacts', '.cascade-crud-test');

describe('CascadeManager - CRUD Operations', () => {
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

  describe('createWorkItem()', () => {
    it('should create a Project work item', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', {
        title: 'My Project',
        description: 'Test project'
      });

      expect(project).toHaveProperty('id');
      expect(project.id).toMatch(/^P\d{4}$/);
      expect(project.type).toBe('P');
      expect(project.title).toBe('My Project');
      expect(project.description).toBe('Test project');
      expect(project.status).toBe('planned');
      expect(project).toHaveProperty('created');
      expect(project).toHaveProperty('updated');
    });

    it('should create an Epic under a Project', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', {
        title: 'Project',
        description: 'Test'
      });

      const epic = await manager.createWorkItem('E', {
        title: 'User Authentication',
        description: 'Auth epic',
        parent: project.id
      });

      expect(epic.id).toMatch(/^E\d{4}$/);
      expect(epic.type).toBe('E');
      expect(epic.parent).toBe(project.id);
      expect(epic.title).toBe('User Authentication');
    });

    it('should create hierarchical directory structure', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', { title: 'Project' });
      const epic = await manager.createWorkItem('E', {
        title: 'Epic One',
        parent: project.id
      });
      const feature = await manager.createWorkItem('F', {
        title: 'Feature One',
        parent: epic.id
      });

      // Check directories exist
      const epicDir = path.join(TEST_DIR, 'E0002-epic-one');
      const featureDir = path.join(epicDir, 'F0003-feature-one');

      const epicStats = await fs.stat(epicDir);
      const featureStats = await fs.stat(featureDir);

      expect(epicStats.isDirectory()).toBe(true);
      expect(featureStats.isDirectory()).toBe(true);
    });

    it('should create markdown file with frontmatter', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', {
        title: 'Test Project',
        description: 'Description here',
        priority: 'high',
        complexity: 'medium'
      });

      const filePath = path.join(TEST_DIR, `${project.id}.md`);
      const content = await fs.readFile(filePath, 'utf-8');

      expect(content).toContain('---');
      expect(content).toContain('id: P0001');
      expect(content).toContain('type: P');
      expect(content).toContain('title: Test Project');
      expect(content).toContain('status: planned');
      expect(content).toContain('priority: high');
      expect(content).toContain('complexity: medium');
      expect(content).toContain('# Test Project');
      expect(content).toContain('## Description');
      expect(content).toContain('Description here');
    });

    it('should create state.json for non-Task items', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', { title: 'Project' });
      const epic = await manager.createWorkItem('E', {
        title: 'Epic',
        parent: project.id
      });

      // Check state files exist
      const projectStatePath = path.join(TEST_DIR, 'state.json');
      const epicStatePath = path.join(TEST_DIR, 'E0002-epic', 'state.json');

      const projectState = JSON.parse(await fs.readFile(projectStatePath, 'utf-8'));
      const epicState = JSON.parse(await fs.readFile(epicStatePath, 'utf-8'));

      expect(projectState.id).toBe(project.id);
      expect(projectState.status).toBe('planned');
      expect(projectState).toHaveProperty('progress');
      expect(projectState).toHaveProperty('children');

      expect(epicState.id).toBe(epic.id);
      expect(epicState.status).toBe('planned');
    });

    it('should NOT create state.json for Tasks', async () => {
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

      // Task should have markdown but no state.json
      const taskMdPath = path.join(
        TEST_DIR,
        'E0002-epic',
        'F0003-feature',
        'S0004-story',
        'T0005.md'
      );
      const storyStatePath = path.join(
        TEST_DIR,
        'E0002-epic',
        'F0003-feature',
        'S0004-story',
        'state.json'
      );

      const mdStats = await fs.stat(taskMdPath);
      expect(mdStats.isFile()).toBe(true);

      // Story should HAVE a state.json (Tasks don't, but their parents do)
      const storyStateStats = await fs.stat(storyStatePath);
      expect(storyStateStats.isFile()).toBe(true);

      // Verify Task has null state when loaded
      const taskWorkItem = await manager.getWorkItem(task.id);
      expect(taskWorkItem.state).toBeNull();
    });

    it('should add work item to registry', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', {
        title: 'Project',
        description: 'Test'
      });

      const registry = await manager.loadRegistry();

      expect(registry.work_items).toHaveProperty(project.id);
      expect(registry.work_items[project.id].title).toBe('Project');
      expect(registry.work_items[project.id].type).toBe('Project'); // Registry stores full type name
      expect(registry.work_items[project.id].status).toBe('planned');
    });

    it('should reject invalid work item types', async () => {
      await manager.initialize();

      await expect(manager.createWorkItem('INVALID', { title: 'Test' }))
        .rejects
        .toThrow('Invalid work item type');
    });

    it('should reject missing title', async () => {
      await manager.initialize();

      await expect(manager.createWorkItem('P', { description: 'No title' }))
        .rejects
        .toThrow('Work item title is required');
    });

    it('should reject non-Project items without parent', async () => {
      await manager.initialize();

      await expect(manager.createWorkItem('E', { title: 'Epic without parent' }))
        .rejects
        .toThrow('Parent is required for E work items');
    });

    it('should handle special characters in titles', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', {
        title: 'Project @#$% Special & Chars!'
      });

      expect(project.title).toBe('Project @#$% Special & Chars!');

      // Directory name should be sanitized
      const filePath = path.join(TEST_DIR, `${project.id}.md`);
      const stats = await fs.stat(filePath);
      expect(stats.isFile()).toBe(true);
    });

    it('should set default status to planned', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', { title: 'Project' });

      expect(project.status).toBe('planned');
    });

    it('should set default priority to medium', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', { title: 'Project' });

      expect(project.priority).toBe('medium');
    });

    it('should set default complexity to medium', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', { title: 'Project' });

      expect(project.complexity).toBe('medium');
    });
  });

  describe('getWorkItem()', () => {
    it('should retrieve a work item by ID', async () => {
      await manager.initialize();

      const created = await manager.createWorkItem('P', {
        title: 'My Project',
        description: 'Test description'
      });

      const retrieved = await manager.getWorkItem(created.id);

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.title).toBe('My Project');
      expect(retrieved.description).toBe('Test description');
      expect(retrieved.type).toBe('P');
      expect(retrieved.status).toBe('planned');
    });

    it('should include state for non-Task items', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', { title: 'Project' });
      const retrieved = await manager.getWorkItem(project.id);

      expect(retrieved.state).not.toBeNull();
      expect(retrieved.state.id).toBe(project.id);
      expect(retrieved.state.status).toBe('planned');
      expect(retrieved.state).toHaveProperty('progress');
      expect(retrieved.state).toHaveProperty('children');
    });

    it('should have null state for Tasks', async () => {
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

      const retrieved = await manager.getWorkItem(task.id);

      expect(retrieved.state).toBeNull();
    });

    it('should throw error for non-existent work item', async () => {
      await manager.initialize();

      await expect(manager.getWorkItem('E9999'))
        .rejects
        .toThrow('Work item not found: E9999');
    });

    it('should throw error for deleted work item', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', { title: 'Project' });
      await manager.deleteWorkItem(project.id);

      await expect(manager.getWorkItem(project.id))
        .rejects
        .toThrow('Work item has been deleted');
    });

    it('should throw error for invalid ID format', async () => {
      await manager.initialize();

      await expect(manager.getWorkItem('INVALID'))
        .rejects
        .toThrow('Invalid work item ID format');
    });

    it('should include all frontmatter fields', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', {
        title: 'Project',
        description: 'Desc',
        priority: 'high',
        complexity: 'low',
        status: 'planned'
      });

      const retrieved = await manager.getWorkItem(project.id);

      expect(retrieved.priority).toBe('high');
      expect(retrieved.complexity).toBe('low');
      expect(retrieved.status).toBe('planned');
    });
  });

  describe('updateWorkItem()', () => {
    it('should update work item title', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', { title: 'Old Title' });

      await manager.updateWorkItem(project.id, { title: 'New Title' });

      const updated = await manager.getWorkItem(project.id);
      expect(updated.title).toBe('New Title');
    });

    it('should update work item description', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', {
        title: 'Project',
        description: 'Old description'
      });

      await manager.updateWorkItem(project.id, {
        description: 'New description'
      });

      const updated = await manager.getWorkItem(project.id);
      expect(updated.description).toBe('New description');
    });

    it('should update work item status', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', { title: 'Project' });

      await manager.updateWorkItem(project.id, { status: 'in-progress' });

      const updated = await manager.getWorkItem(project.id);
      expect(updated.status).toBe('in-progress');
    });

    it('should update work item priority', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', { title: 'Project' });

      await manager.updateWorkItem(project.id, { priority: 'high' });

      const updated = await manager.getWorkItem(project.id);
      expect(updated.priority).toBe('high');
    });

    it('should update work item complexity', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', { title: 'Project' });

      await manager.updateWorkItem(project.id, { complexity: 'high' });

      const updated = await manager.getWorkItem(project.id);
      expect(updated.complexity).toBe('high');
    });

    it('should update multiple fields at once', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', { title: 'Project' });

      await manager.updateWorkItem(project.id, {
        title: 'Updated Project',
        description: 'Updated description',
        status: 'in-progress',
        priority: 'high',
        complexity: 'low'
      });

      const updated = await manager.getWorkItem(project.id);
      expect(updated.title).toBe('Updated Project');
      expect(updated.description).toBe('Updated description');
      expect(updated.status).toBe('in-progress');
      expect(updated.priority).toBe('high');
      expect(updated.complexity).toBe('low');
    });

    it('should update registry metadata', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', { title: 'Old Title' });

      await manager.updateWorkItem(project.id, {
        title: 'New Title',
        status: 'in-progress'
      });

      const registry = await manager.loadRegistry();
      expect(registry.work_items[project.id].title).toBe('New Title');
      expect(registry.work_items[project.id].status).toBe('in-progress');
    });

    it('should update timestamp', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', { title: 'Project' });
      const originalTimestamp = project.updated;

      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));

      await manager.updateWorkItem(project.id, { title: 'Updated' });

      const updated = await manager.getWorkItem(project.id);
      expect(updated.updated).not.toBe(originalTimestamp);
    });

    it('should throw error for non-existent work item', async () => {
      await manager.initialize();

      await expect(manager.updateWorkItem('E9999', { title: 'Test' }))
        .rejects
        .toThrow('Work item not found');
    });

    it('should throw error for deleted work item', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', { title: 'Project' });
      await manager.deleteWorkItem(project.id);

      await expect(manager.updateWorkItem(project.id, { title: 'Updated' }))
        .rejects
        .toThrow('Work item has been deleted');
    });
  });

  describe('deleteWorkItem()', () => {
    it('should mark work item as deleted in registry', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', { title: 'Project' });

      await manager.deleteWorkItem(project.id);

      const registry = await manager.loadRegistry();
      expect(registry.work_items[project.id].deleted).toBe(true);
      expect(registry.work_items[project.id]).toHaveProperty('deleted_at');
    });

    it('should remove markdown file', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', { title: 'Project' });
      const filePath = path.join(TEST_DIR, `${project.id}.md`);

      // Verify file exists
      await fs.stat(filePath);

      await manager.deleteWorkItem(project.id);

      // File should be gone
      await expect(fs.stat(filePath)).rejects.toThrow();
    });

    it('should remove directory for directory-based items', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', { title: 'Project' });
      const epic = await manager.createWorkItem('E', {
        title: 'Epic',
        parent: project.id
      });

      const epicDir = path.join(TEST_DIR, 'E0002-epic');

      // Verify directory exists
      await fs.stat(epicDir);

      await manager.deleteWorkItem(epic.id);

      // Directory should be gone
      await expect(fs.stat(epicDir)).rejects.toThrow();
    });

    it('should throw error for non-existent work item', async () => {
      await manager.initialize();

      await expect(manager.deleteWorkItem('E9999'))
        .rejects
        .toThrow('Work item not found');
    });

    it('should throw error for already deleted work item', async () => {
      await manager.initialize();

      const project = await manager.createWorkItem('P', { title: 'Project' });
      await manager.deleteWorkItem(project.id);

      await expect(manager.deleteWorkItem(project.id))
        .rejects
        .toThrow('Work item has been deleted');
    });
  });

  describe('_generateMarkdown()', () => {
    it('should generate markdown with frontmatter', () => {
      const frontmatter = {
        id: 'E0001',
        type: 'E',
        title: 'Test Epic',
        status: 'planned',
        priority: 'high'
      };

      const data = {
        description: 'Epic description'
      };

      const markdown = manager._generateMarkdown(frontmatter, data);

      expect(markdown).toContain('---');
      expect(markdown).toContain('id: E0001');
      expect(markdown).toContain('type: E');
      expect(markdown).toContain('title: Test Epic');
      expect(markdown).toContain('status: planned');
      expect(markdown).toContain('priority: high');
      expect(markdown).toContain('# Test Epic');
      expect(markdown).toContain('## Description');
      expect(markdown).toContain('Epic description');
    });

    it('should handle missing description', () => {
      const frontmatter = {
        id: 'P0001',
        type: 'P',
        title: 'Project',
        status: 'planned'
      };

      const markdown = manager._generateMarkdown(frontmatter, {});

      expect(markdown).toContain('# Project');
      expect(markdown).toContain('## Description');
    });

    it('should include parent in frontmatter if present', () => {
      const frontmatter = {
        id: 'E0001',
        type: 'E',
        title: 'Epic',
        parent: 'P0001',
        status: 'planned'
      };

      const markdown = manager._generateMarkdown(frontmatter, {});

      expect(markdown).toContain('parent: P0001');
    });
  });

  describe('_parseMarkdown()', () => {
    it('should parse frontmatter and content', () => {
      const markdown = `---
id: E0001
type: E
title: Test Epic
status: planned
priority: high
---

# Test Epic

## Description
Epic description here

## Notes
Some notes
`;

      const parsed = manager._parseMarkdown(markdown);

      expect(parsed.frontmatter.id).toBe('E0001');
      expect(parsed.frontmatter.type).toBe('E');
      expect(parsed.frontmatter.title).toBe('Test Epic');
      expect(parsed.frontmatter.status).toBe('planned');
      expect(parsed.frontmatter.priority).toBe('high');
      expect(parsed.content).toContain('# Test Epic');
      expect(parsed.content).toContain('Epic description here');
    });

    it('should handle content without frontmatter', () => {
      const markdown = `# Simple Markdown

Just content, no frontmatter.
`;

      const parsed = manager._parseMarkdown(markdown);

      expect(parsed.frontmatter).toEqual({});
      expect(parsed.content).toBe(markdown);
    });

    it('should parse parent field correctly', () => {
      const markdown = `---
id: F0001
type: F
title: Feature
parent: E0001
---

# Feature
`;

      const parsed = manager._parseMarkdown(markdown);

      expect(parsed.frontmatter.parent).toBe('E0001');
    });
  });
});
