/**
 * Cascade Manager Tests: Foundation
 *
 * Tests for core initialization, registry management, and ID generation.
 * Covers: initialize(), loadRegistry(), saveRegistry(), getNextId(), validateId()
 */

const CascadeManager = require('../../plugins/carl/lib/cascade/cascade-manager.js');
const fs = require('fs').promises;
const path = require('path');

// Test directory - contained within tests/ directory to avoid polluting root
const TEST_DIR = path.join(__dirname, '..', '.test-artifacts', '.cascade-test');

describe('CascadeManager - Foundation', () => {
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

  describe('initialize()', () => {
    it('should create .cascade directory', async () => {
      const result = await manager.initialize();

      expect(result).toBe(true);

      const dirStats = await fs.stat(TEST_DIR);
      expect(dirStats.isDirectory()).toBe(true);
    });

    it('should create registry file', async () => {
      await manager.initialize();

      const registryPath = path.join(TEST_DIR, 'work-item-registry.json');
      const registryStats = await fs.stat(registryPath);
      expect(registryStats.isFile()).toBe(true);
    });

    it('should create root state.json', async () => {
      await manager.initialize();

      const statePath = path.join(TEST_DIR, 'state.json');
      const stateStats = await fs.stat(statePath);
      expect(stateStats.isFile()).toBe(true);

      // Verify state structure
      const stateContent = await fs.readFile(statePath, 'utf-8');
      const state = JSON.parse(stateContent);

      expect(state).toHaveProperty('id', 'root');
      expect(state).toHaveProperty('status');
      expect(state).toHaveProperty('progress');
      expect(state).toHaveProperty('children');
      expect(state).toHaveProperty('updated');
    });

    it('should create registry with proper structure', async () => {
      await manager.initialize();

      const registry = await manager.loadRegistry();

      expect(registry).toHaveProperty('version', '1.0.0');
      expect(registry).toHaveProperty('last_updated');
      expect(registry).toHaveProperty('work_items');
      expect(registry).toHaveProperty('global_id_counter', 0);
      expect(registry.work_items).toEqual({});
    });
  });

  describe('loadRegistry()', () => {
    it('should load existing registry', async () => {
      await manager.initialize();

      const registry = await manager.loadRegistry();

      expect(registry).toBeDefined();
      expect(registry.version).toBe('1.0.0');
      expect(typeof registry.global_id_counter).toBe('number');
    });

    it('should create empty registry if file does not exist', async () => {
      // Don't initialize - registry doesn't exist yet
      const registry = await manager.loadRegistry();

      expect(registry).toBeDefined();
      expect(registry.version).toBe('1.0.0');
      expect(registry.global_id_counter).toBe(0);
      expect(registry.work_items).toEqual({});
    });

    it('should have proper registry structure', async () => {
      const registry = await manager.loadRegistry();

      expect(registry).toHaveProperty('version');
      expect(registry).toHaveProperty('last_updated');
      expect(registry).toHaveProperty('work_items');
      expect(registry).toHaveProperty('global_id_counter');
    });
  });

  describe('saveRegistry()', () => {
    it('should save registry to file', async () => {
      await manager.initialize();

      const registry = await manager.loadRegistry();
      registry.work_items['TEST'] = { title: 'Test Item' };

      const result = await manager.saveRegistry(registry);

      expect(result).toBe(true);

      const reloaded = await manager.loadRegistry();
      expect(reloaded.work_items).toHaveProperty('TEST');
      expect(reloaded.work_items.TEST.title).toBe('Test Item');
    });

    it('should update last_updated timestamp', async () => {
      await manager.initialize();

      const registry = await manager.loadRegistry();
      const oldTimestamp = registry.last_updated;

      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));

      await manager.saveRegistry(registry);
      const updated = await manager.loadRegistry();

      expect(updated.last_updated).not.toBe(oldTimestamp);
    });

    it('should validate registry structure', async () => {
      await manager.initialize();

      const invalidRegistry = { invalid: 'structure' };

      await expect(manager.saveRegistry(invalidRegistry))
        .rejects
        .toThrow('Invalid registry structure');
    });

    it('should create directory if it does not exist', async () => {
      // Don't initialize - directory doesn't exist
      const registry = {
        version: '1.0.0',
        last_updated: new Date().toISOString(),
        work_items: {},
        global_id_counter: 0
      };

      const result = await manager.saveRegistry(registry);

      expect(result).toBe(true);

      const dirStats = await fs.stat(TEST_DIR);
      expect(dirStats.isDirectory()).toBe(true);
    });
  });

  describe('getNextId()', () => {
    it('should generate first ID correctly', async () => {
      await manager.initialize();

      const id = await manager.getNextId('E');

      expect(id).toBe('E0001');
    });

    it('should generate sequential IDs across types', async () => {
      await manager.initialize();

      const id1 = await manager.getNextId('E');
      const id2 = await manager.getNextId('F');
      const id3 = await manager.getNextId('E');
      const id4 = await manager.getNextId('T');

      expect(id1).toBe('E0001');
      expect(id2).toBe('F0002');
      expect(id3).toBe('E0003');
      expect(id4).toBe('T0004');
    });

    it('should pad IDs with zeros correctly', async () => {
      await manager.initialize();

      // Generate enough IDs to test padding
      for (let i = 0; i < 9; i++) {
        await manager.getNextId('T');
      }

      const id10 = await manager.getNextId('T');
      expect(id10).toBe('T0010');

      for (let i = 0; i < 89; i++) {
        await manager.getNextId('T');
      }

      const id100 = await manager.getNextId('T');
      expect(id100).toBe('T0100');
    });

    it('should persist counter across loads', async () => {
      await manager.initialize();

      await manager.getNextId('E');
      await manager.getNextId('F');

      // Create new manager instance (simulates restart)
      const manager2 = new CascadeManager(TEST_DIR);
      const id = await manager2.getNextId('S');

      expect(id).toBe('S0003');
    });

    it('should reject invalid work item types', async () => {
      await manager.initialize();

      await expect(manager.getNextId('INVALID'))
        .rejects
        .toThrow('Invalid work item type');
    });

    it('should work for all valid types', async () => {
      await manager.initialize();

      const types = ['P', 'E', 'F', 'S', 'B', 'PH', 'T'];

      for (const type of types) {
        const id = await manager.getNextId(type);
        expect(id).toMatch(new RegExp(`^${type}\\d{4}$`));
      }
    });
  });

  describe('validateId()', () => {
    it('should return true for unique IDs', async () => {
      await manager.initialize();

      const isUnique = await manager.validateId('E0001');

      expect(isUnique).toBe(true);
    });

    it('should return false for existing IDs', async () => {
      await manager.initialize();

      const registry = await manager.loadRegistry();
      registry.work_items['E0001'] = { title: 'Existing' };
      await manager.saveRegistry(registry);

      const isUnique = await manager.validateId('E0001');

      expect(isUnique).toBe(false);
    });

    it('should return true for deleted IDs', async () => {
      await manager.initialize();

      const registry = await manager.loadRegistry();
      registry.work_items['E0001'] = { title: 'Deleted', deleted: true };
      await manager.saveRegistry(registry);

      const isUnique = await manager.validateId('E0001');

      // Deleted items are considered available
      expect(isUnique).toBe(true);
    });

    it('should reject invalid ID formats', async () => {
      await manager.initialize();

      await expect(manager.validateId('INVALID'))
        .rejects
        .toThrow('Invalid work item ID format');

      await expect(manager.validateId('E'))
        .rejects
        .toThrow('Invalid work item ID format');

      await expect(manager.validateId('123'))
        .rejects
        .toThrow('Invalid work item ID format');
    });

    it('should accept all valid ID formats', async () => {
      await manager.initialize();

      const validIds = ['E0001', 'F0042', 'S1234', 'B9999', 'PH0100', 'T0001', 'P0001'];

      for (const id of validIds) {
        const isUnique = await manager.validateId(id);
        expect(isUnique).toBe(true);
      }
    });
  });

  describe('Utility Functions', () => {
    describe('parseId()', () => {
      it('should parse valid IDs correctly', () => {
        expect(manager.parseId('E1234')).toEqual({ type: 'E', number: 1234 });
        expect(manager.parseId('F0001')).toEqual({ type: 'F', number: 1 });
        expect(manager.parseId('PH9999')).toEqual({ type: 'PH', number: 9999 });
      });

      it('should throw on invalid formats', () => {
        expect(() => manager.parseId('INVALID')).toThrow('Invalid work item ID format');
        expect(() => manager.parseId('E')).toThrow('Invalid work item ID format');
        expect(() => manager.parseId('123')).toThrow('Invalid work item ID format');
      });
    });

    describe('generateSlug()', () => {
      it('should create URL-safe slugs', () => {
        expect(manager.generateSlug('User Authentication')).toBe('user-authentication');
        expect(manager.generateSlug('API Integration Layer')).toBe('api-integration-layer');
        expect(manager.generateSlug('Fix Bug #123')).toBe('fix-bug-123');
      });

      it('should handle special characters', () => {
        expect(manager.generateSlug('Test @#$% Special')).toBe('test-special');
        expect(manager.generateSlug('Multiple   Spaces')).toBe('multiple-spaces');
      });

      it('should trim leading/trailing dashes', () => {
        expect(manager.generateSlug('-Leading Dash-')).toBe('leading-dash');
        expect(manager.generateSlug('---Test---')).toBe('test');
      });
    });

    describe('generateDirectoryName()', () => {
      it('should combine ID and slug', () => {
        expect(manager.generateDirectoryName('E0001', 'User Auth')).toBe('E0001-user-auth');
        expect(manager.generateDirectoryName('F0042', 'API Layer')).toBe('F0042-api-layer');
      });
    });

    describe('hasDirectory()', () => {
      it('should return true for directory types', () => {
        expect(manager.hasDirectory('E')).toBe(true);
        expect(manager.hasDirectory('F')).toBe(true);
        expect(manager.hasDirectory('S')).toBe(true);
        expect(manager.hasDirectory('B')).toBe(true);
        expect(manager.hasDirectory('PH')).toBe(true);
      });

      it('should return false for file-only types', () => {
        expect(manager.hasDirectory('P')).toBe(false);
        expect(manager.hasDirectory('T')).toBe(false);
      });

      it('should throw on invalid types', () => {
        expect(() => manager.hasDirectory('INVALID')).toThrow('Unknown work item type');
      });
    });

    describe('isValidType()', () => {
      it('should validate all work item types', () => {
        expect(manager.isValidType('P')).toBe(true);
        expect(manager.isValidType('E')).toBe(true);
        expect(manager.isValidType('F')).toBe(true);
        expect(manager.isValidType('S')).toBe(true);
        expect(manager.isValidType('B')).toBe(true);
        expect(manager.isValidType('PH')).toBe(true);
        expect(manager.isValidType('T')).toBe(true);
      });

      it('should reject invalid types', () => {
        expect(manager.isValidType('X')).toBe(false);
        expect(manager.isValidType('INVALID')).toBe(false);
        expect(manager.isValidType('')).toBe(false);
      });
    });

    describe('isValidStatus()', () => {
      it('should validate all status values', () => {
        expect(manager.isValidStatus('planned')).toBe(true);
        expect(manager.isValidStatus('in-progress')).toBe(true);
        expect(manager.isValidStatus('completed')).toBe(true);
        expect(manager.isValidStatus('blocked')).toBe(true);
      });

      it('should reject invalid statuses', () => {
        expect(manager.isValidStatus('invalid')).toBe(false);
        expect(manager.isValidStatus('done')).toBe(false);
        expect(manager.isValidStatus('')).toBe(false);
      });
    });
  });
});
