/**
 * Planning Helpers Tests
 *
 * Tests for the simple planning helper utilities.
 * Uses test artifacts directory to avoid polluting project root.
 */

const {
  loadContext,
  createWorkItems,
  isWorkItemId,
  formatResult,
  parseWorkItemId
} = require('../../plugins/carl/lib/planning/planning-helpers');

const CascadeManager = require('../../plugins/carl/lib/cascade/cascade-manager');
const fs = require('fs').promises;
const path = require('path');

const TEST_DIR = path.join(__dirname, '..', '.test-artifacts', 'planning-helpers-test');

describe('Planning Helpers', () => {
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

  describe('isWorkItemId()', () => {
    it('should recognize valid work item IDs', () => {
      expect(isWorkItemId('E0001')).toBe(true);
      expect(isWorkItemId('F0123')).toBe(true);
      expect(isWorkItemId('S9999')).toBe(true);
      expect(isWorkItemId('PH0001')).toBe(true);
      expect(isWorkItemId('T0042')).toBe(true);
      expect(isWorkItemId('P0001')).toBe(true);
      expect(isWorkItemId('B0001')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isWorkItemId('E001')).toBe(false); // Missing leading zero
      expect(isWorkItemId('Epic0001')).toBe(false); // Full word
      expect(isWorkItemId('e0001')).toBe(false); // Lowercase
      expect(isWorkItemId('0001')).toBe(false); // No type
      expect(isWorkItemId('E')).toBe(false); // No number
      expect(isWorkItemId('')).toBe(false); // Empty
      expect(isWorkItemId('Implement auth')).toBe(false); // Description
      expect(isWorkItemId(null)).toBe(false); // Null
      expect(isWorkItemId(undefined)).toBe(false); // Undefined
      expect(isWorkItemId(123)).toBe(false); // Number
    });

    it('should handle whitespace', () => {
      expect(isWorkItemId(' E0001 ')).toBe(true); // Trimmed
      expect(isWorkItemId('E 0001')).toBe(false); // Space in middle
    });
  });

  describe('parseWorkItemId()', () => {
    it('should parse valid IDs', () => {
      expect(parseWorkItemId('E0001')).toEqual({
        type: 'E',
        number: 1,
        id: 'E0001'
      });

      expect(parseWorkItemId('PH0123')).toEqual({
        type: 'PH',
        number: 123,
        id: 'PH0123'
      });

      expect(parseWorkItemId('T9999')).toEqual({
        type: 'T',
        number: 9999,
        id: 'T9999'
      });
    });

    it('should return null for invalid IDs', () => {
      expect(parseWorkItemId('invalid')).toBeNull();
      expect(parseWorkItemId('E001')).toBeNull();
      expect(parseWorkItemId('')).toBeNull();
      expect(parseWorkItemId(null)).toBeNull();
    });
  });

  describe('loadContext()', () => {
    it('should load empty context when no ID provided', async () => {
      const context = await loadContext(null, TEST_DIR);

      expect(context).toHaveProperty('registry');
      expect(context).toHaveProperty('manager');
      expect(context.workItem).toBeNull();
      expect(context.parent).toBeNull();
      expect(context.children).toEqual([]);
    });

    it('should load existing work item with context', async () => {
      // Create a test Project (top level)
      const project = await manager.createWorkItem('P', {
        title: 'Test Project'
      });

      // Create an Epic
      const epic = await manager.createWorkItem('E', {
        title: 'Test Epic',
        description: 'Test description',
        parent: project.id
      });

      // Create a child Feature
      await manager.createWorkItem('F', {
        title: 'Test Feature',
        parent: epic.id
      });

      // Load context
      const context = await loadContext(epic.id, TEST_DIR);

      expect(context.workItem).toBeDefined();
      expect(context.workItem.id).toBe(epic.id);
      expect(context.workItem.title).toBe('Test Epic');
      expect(context.parent).toBeDefined(); // Epic has Project parent
      expect(context.parent.id).toBe(project.id);
      expect(context.children).toHaveLength(1);
      expect(context.children[0].title).toBe('Test Feature');
      expect(context.registry).toBeDefined();
      expect(context.manager).toBeDefined();
    });

    it('should load parent context for child items', async () => {
      // Create Project
      const project = await manager.createWorkItem('P', {
        title: 'Test Project'
      });

      // Create Epic
      const epic = await manager.createWorkItem('E', {
        title: 'Parent Epic',
        parent: project.id
      });

      // Create Feature
      const feature = await manager.createWorkItem('F', {
        title: 'Child Feature',
        parent: epic.id
      });

      // Load Feature context
      const context = await loadContext(feature.id, TEST_DIR);

      expect(context.workItem.id).toBe(feature.id);
      expect(context.parent).toBeDefined();
      expect(context.parent.id).toBe(epic.id);
      expect(context.parent.title).toBe('Parent Epic');
    });

    it('should throw error for non-existent work item', async () => {
      await expect(loadContext('E9999', TEST_DIR))
        .rejects
        .toThrow('Failed to load work item E9999');
    });
  });

  describe('createWorkItems()', () => {
    it('should create single work item', async () => {
      const breakdown = [
        {
          type: 'P',
          data: {
            title: 'New Project',
            description: 'Test project',
            complexity: 'medium'
          }
        }
      ];

      const result = await createWorkItems(breakdown, TEST_DIR);

      expect(result.created).toHaveLength(1);
      expect(result.created[0].type).toBe('P');
      expect(result.created[0].title).toBe('New Project');
      expect(result.created[0].id).toMatch(/^P\d{4}$/);
      expect(result.summary.total).toBe(1);
      expect(result.summary.byType.P).toBe(1);
    });

    it('should create multiple work items with parent-child relationships', async () => {
      const breakdown = [
        {
          type: 'P',
          data: {
            title: 'Project Title',
            description: 'Project description'
          }
        },
        {
          type: 'E',
          data: {
            title: 'Epic 1',
            parent: '$0' // Reference first created item (Project)
          }
        },
        {
          type: 'E',
          data: {
            title: 'Epic 2',
            parent: '$0' // Reference first created item (Project)
          }
        }
      ];

      const result = await createWorkItems(breakdown, TEST_DIR);

      expect(result.created).toHaveLength(3);

      // Check Project
      const project = result.created[0];
      expect(project.type).toBe('P');
      expect(project.title).toBe('Project Title');

      // Check Epics reference Project as parent
      const epic1 = result.created[1];
      expect(epic1.type).toBe('E');
      expect(epic1.parent).toBe(project.id);

      const epic2 = result.created[2];
      expect(epic2.type).toBe('E');
      expect(epic2.parent).toBe(project.id);

      // Check summary
      expect(result.summary.total).toBe(3);
      expect(result.summary.byType.P).toBe(1);
      expect(result.summary.byType.E).toBe(2);
    });

    it('should handle direct parent ID references', async () => {
      // Create Project and Epic first
      const project = await manager.createWorkItem('P', {
        title: 'Existing Project'
      });

      const epic = await manager.createWorkItem('E', {
        title: 'Existing Epic',
        parent: project.id
      });

      // Create Features referencing Epic directly
      const breakdown = [
        {
          type: 'F',
          data: {
            title: 'New Feature',
            parent: epic.id // Direct ID reference
          }
        }
      ];

      const result = await createWorkItems(breakdown, TEST_DIR);

      expect(result.created).toHaveLength(1);
      expect(result.created[0].parent).toBe(epic.id);
    });

    it('should throw error if work item missing type', async () => {
      const breakdown = [
        {
          data: { title: 'No Type' }
        }
      ];

      await expect(createWorkItems(breakdown, TEST_DIR))
        .rejects
        .toThrow('Work item must have a type');
    });

    it('should throw error if work item missing title', async () => {
      const breakdown = [
        {
          type: 'E',
          data: { description: 'No title' }
        }
      ];

      await expect(createWorkItems(breakdown, TEST_DIR))
        .rejects
        .toThrow('Work item must have data with title');
    });

    it('should throw error for invalid parent reference', async () => {
      const breakdown = [
        {
          type: 'P',
          data: { title: 'Project' }
        },
        {
          type: 'E',
          data: {
            title: 'Epic',
            parent: '$5' // Invalid reference (only 1 item created so far)
          }
        }
      ];

      await expect(createWorkItems(breakdown, TEST_DIR))
        .rejects
        .toThrow('Invalid parent reference: $5');
    });
  });

  describe('formatResult()', () => {
    it('should format empty result', () => {
      const result = formatResult([]);

      expect(result.summary).toBe('No work items created');
      expect(result.items).toEqual([]);
      expect(result.next_steps).toEqual([]);
    });

    it('should format single item result', () => {
      const created = [
        {
          id: 'E0001',
          type: 'E',
          title: 'Test Epic',
          filePath: '/path/to/E0001.md',
          status: 'planned',
          complexity: 'medium'
        }
      ];

      const result = formatResult(created, TEST_DIR);

      expect(result.summary).toBe('Created 1 work item: 1 Epic');
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        id: 'E0001',
        type: 'E',
        typeName: 'Epic',
        title: 'Test Epic',
        path: '/path/to/E0001.md',
        status: 'planned',
        complexity: 'medium'
      });
      expect(result.next_steps).toContain(`Review work items in ${TEST_DIR}/`);
      expect(result.next_steps).toContain('To break down further, run: /carl:plan E0001');
      expect(result.next_steps).toContain('To start work, run: /carl:work E0001');
    });

    it('should format multiple items with summary', () => {
      const created = [
        { id: 'E0001', type: 'E', title: 'Epic', filePath: '/e.md', status: 'planned', complexity: 'complex' },
        { id: 'F0001', type: 'F', title: 'Feature 1', filePath: '/f1.md', status: 'planned', complexity: 'medium' },
        { id: 'F0002', type: 'F', title: 'Feature 2', filePath: '/f2.md', status: 'planned', complexity: 'simple' }
      ];

      const result = formatResult(created, TEST_DIR);

      expect(result.summary).toBe('Created 3 work items: 1 Epic, 2 Features');
      expect(result.items).toHaveLength(3);
    });

    it('should handle null or undefined input', () => {
      expect(formatResult(null).summary).toBe('No work items created');
      expect(formatResult(undefined).summary).toBe('No work items created');
    });
  });
});
