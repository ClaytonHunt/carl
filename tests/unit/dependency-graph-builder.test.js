/**
 * Unit tests for DependencyGraphBuilder
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs').promises;
const path = require('path');
const { DependencyGraphBuilder } = require('../../plugins/carl/lib/cascade/dependency-graph-builder');

// Test fixture directory
const TEST_CASCADE_DIR = path.join(__dirname, '../fixtures/test-cascade');

describe('DependencyGraphBuilder', () => {
  let builder;

  beforeEach(async () => {
    // Create test cascade directory structure
    await fs.mkdir(TEST_CASCADE_DIR, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(TEST_CASCADE_DIR, { recursive: true, force: true });
    } catch (error) {
      // Ignore errors
    }
  });

  describe('Construction', () => {
    it('should create builder with default cascade directory', () => {
      builder = new DependencyGraphBuilder();
      assert.strictEqual(builder.cascadeDir, '.cascade');
    });

    it('should create builder with custom cascade directory', () => {
      builder = new DependencyGraphBuilder(TEST_CASCADE_DIR);
      assert.strictEqual(builder.cascadeDir, TEST_CASCADE_DIR);
    });
  });

  describe('Work item file detection', () => {
    beforeEach(() => {
      builder = new DependencyGraphBuilder(TEST_CASCADE_DIR);
    });

    it('should detect valid work item filenames', () => {
      assert.strictEqual(builder._isWorkItemFile('E0001.md'), true);
      assert.strictEqual(builder._isWorkItemFile('F0001.md'), true);
      assert.strictEqual(builder._isWorkItemFile('S0001.md'), true);
      assert.strictEqual(builder._isWorkItemFile('T0001.md'), true);
      assert.strictEqual(builder._isWorkItemFile('B0001.md'), true);
      assert.strictEqual(builder._isWorkItemFile('PH0001.md'), true);
      assert.strictEqual(builder._isWorkItemFile('P0001.md'), true);
    });

    it('should reject invalid work item filenames', () => {
      assert.strictEqual(builder._isWorkItemFile('README.md'), false);
      assert.strictEqual(builder._isWorkItemFile('notes.md'), false);
      assert.strictEqual(builder._isWorkItemFile('E001.md'), false); // Too few digits
      assert.strictEqual(builder._isWorkItemFile('X0001.md'), false); // Invalid type
    });
  });

  describe('Frontmatter parsing', () => {
    beforeEach(() => {
      builder = new DependencyGraphBuilder(TEST_CASCADE_DIR);
    });

    it('should parse basic frontmatter', () => {
      const frontmatter = `id: E0001
type: E
title: Test Epic
status: planned
priority: high
complexity: medium`;

      const result = builder._parseFrontmatter(frontmatter);
      assert.strictEqual(result.id, 'E0001');
      assert.strictEqual(result.type, 'E');
      assert.strictEqual(result.title, 'Test Epic');
      assert.strictEqual(result.status, 'planned');
      assert.strictEqual(result.priority, 'high');
    });

    it('should parse frontmatter with parent', () => {
      const frontmatter = `id: F0001
type: F
title: Test Feature
parent: E0001`;

      const result = builder._parseFrontmatter(frontmatter);
      assert.strictEqual(result.parent, 'E0001');
    });

    it('should parse frontmatter with array dependencies', () => {
      const frontmatter = `id: F0002
type: F
title: Test Feature
depends_on: [F0001, F0003]`;

      const result = builder._parseFrontmatter(frontmatter);
      assert.ok(Array.isArray(result.depends_on));
      assert.strictEqual(result.depends_on.length, 2);
      assert.ok(result.depends_on.includes('F0001'));
      assert.ok(result.depends_on.includes('F0003'));
    });

    it('should handle empty array', () => {
      const frontmatter = `id: F0001
type: F
title: Test Feature
depends_on: []`;

      const result = builder._parseFrontmatter(frontmatter);
      assert.ok(Array.isArray(result.depends_on));
      assert.strictEqual(result.depends_on.length, 0);
    });
  });

  describe('Graph building', () => {
    beforeEach(() => {
      builder = new DependencyGraphBuilder(TEST_CASCADE_DIR);
    });

    it('should build graph from single work item', async () => {
      // Create test file
      const content = `---
id: E0001
type: E
title: Test Epic
status: planned
priority: high
complexity: medium
created: 2025-01-01T00:00:00.000Z
updated: 2025-01-01T00:00:00.000Z
---

# Test Epic

Test content.
`;

      await fs.writeFile(path.join(TEST_CASCADE_DIR, 'E0001.md'), content);

      const graph = await builder.build();
      assert.strictEqual(graph.size().nodes, 1);
      assert.strictEqual(graph.hasNode('E0001'), true);
    });

    it('should build graph with parent-child relationships', async () => {
      // Create Epic
      const epicContent = `---
id: E0001
type: E
title: Test Epic
status: planned
---

# Test Epic
`;

      // Create Feature
      const featureContent = `---
id: F0001
type: F
title: Test Feature
parent: E0001
status: planned
---

# Test Feature
`;

      await fs.writeFile(path.join(TEST_CASCADE_DIR, 'E0001.md'), epicContent);
      await fs.writeFile(path.join(TEST_CASCADE_DIR, 'F0001.md'), featureContent);

      const graph = await builder.build();
      assert.strictEqual(graph.size().nodes, 2);
      assert.strictEqual(graph.size().edges, 1);
      assert.strictEqual(graph.hasEdge('F0001', 'E0001'), true);

      const edge = graph.getEdge('F0001', 'E0001');
      assert.strictEqual(edge.type, 'parent-child');
    });

    it('should build graph with explicit dependencies', async () => {
      // Create Features
      const feature1Content = `---
id: F0001
type: F
title: Feature 1
status: planned
---

# Feature 1
`;

      const feature2Content = `---
id: F0002
type: F
title: Feature 2
depends_on: [F0001]
status: planned
---

# Feature 2
`;

      await fs.writeFile(path.join(TEST_CASCADE_DIR, 'F0001.md'), feature1Content);
      await fs.writeFile(path.join(TEST_CASCADE_DIR, 'F0002.md'), feature2Content);

      const graph = await builder.build();
      assert.strictEqual(graph.size().nodes, 2);
      assert.strictEqual(graph.size().edges, 1);
      assert.strictEqual(graph.hasEdge('F0002', 'F0001'), true);

      const edge = graph.getEdge('F0002', 'F0001');
      assert.strictEqual(edge.type, 'explicit');
    });

    it('should build graph with mixed dependencies', async () => {
      // E0001
      //   ├── F0001
      //   └── F0002 (depends on F0001)

      const epicContent = `---
id: E0001
type: E
title: Test Epic
status: planned
---

# Test Epic
`;

      const feature1Content = `---
id: F0001
type: F
title: Feature 1
parent: E0001
status: planned
---

# Feature 1
`;

      const feature2Content = `---
id: F0002
type: F
title: Feature 2
parent: E0001
depends_on: [F0001]
status: planned
---

# Feature 2
`;

      await fs.writeFile(path.join(TEST_CASCADE_DIR, 'E0001.md'), epicContent);
      await fs.writeFile(path.join(TEST_CASCADE_DIR, 'F0001.md'), feature1Content);
      await fs.writeFile(path.join(TEST_CASCADE_DIR, 'F0002.md'), feature2Content);

      const graph = await builder.build();
      assert.strictEqual(graph.size().nodes, 3);
      assert.strictEqual(graph.size().edges, 3);

      // Check parent-child edges
      assert.strictEqual(graph.hasEdge('F0001', 'E0001'), true);
      assert.strictEqual(graph.hasEdge('F0002', 'E0001'), true);

      // Check explicit dependency
      assert.strictEqual(graph.hasEdge('F0002', 'F0001'), true);
    });

    it('should handle nested directory structure', async () => {
      // Create nested structure
      const epicDir = path.join(TEST_CASCADE_DIR, 'E0001-test-epic');
      const featureDir = path.join(epicDir, 'F0001-test-feature');

      await fs.mkdir(epicDir, { recursive: true });
      await fs.mkdir(featureDir, { recursive: true });

      const epicContent = `---
id: E0001
type: E
title: Test Epic
status: planned
---

# Test Epic
`;

      const featureContent = `---
id: F0001
type: F
title: Test Feature
parent: E0001
status: planned
---

# Test Feature
`;

      await fs.writeFile(path.join(epicDir, 'E0001.md'), epicContent);
      await fs.writeFile(path.join(featureDir, 'F0001.md'), featureContent);

      const graph = await builder.build();
      assert.strictEqual(graph.size().nodes, 2);
      assert.strictEqual(graph.hasNode('E0001'), true);
      assert.strictEqual(graph.hasNode('F0001'), true);
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      builder = new DependencyGraphBuilder(TEST_CASCADE_DIR);
    });

    it('should warn about missing parent', async () => {
      const featureContent = `---
id: F0001
type: F
title: Test Feature
parent: E9999
status: planned
---

# Test Feature
`;

      await fs.writeFile(path.join(TEST_CASCADE_DIR, 'F0001.md'), featureContent);

      const graph = await builder.build();
      assert.strictEqual(graph.size().nodes, 1);
      assert.strictEqual(graph.size().edges, 0);
      assert.strictEqual(builder.hasWarnings(), true);

      const warnings = builder.getWarnings();
      const missingParentWarning = warnings.find(w => w.type === 'missing_parent');
      assert.ok(missingParentWarning);
      assert.strictEqual(missingParentWarning.parent, 'E9999');
    });

    it('should warn about missing dependency', async () => {
      const featureContent = `---
id: F0001
type: F
title: Test Feature
depends_on: [F9999]
status: planned
---

# Test Feature
`;

      await fs.writeFile(path.join(TEST_CASCADE_DIR, 'F0001.md'), featureContent);

      const graph = await builder.build();
      assert.strictEqual(graph.size().nodes, 1);
      assert.strictEqual(graph.size().edges, 0);
      assert.strictEqual(builder.hasWarnings(), true);

      const warnings = builder.getWarnings();
      const missingDepWarning = warnings.find(w => w.type === 'missing_dependency');
      assert.ok(missingDepWarning);
      assert.strictEqual(missingDepWarning.dependency, 'F9999');
    });

    it('should warn about invalid frontmatter', async () => {
      const invalidContent = `---
type: F
title: Test Feature
---

# Test Feature
`;

      await fs.writeFile(path.join(TEST_CASCADE_DIR, 'F0001.md'), invalidContent);

      const graph = await builder.build();
      assert.strictEqual(graph.size().nodes, 0);
      assert.strictEqual(builder.hasWarnings(), true);

      const warnings = builder.getWarnings();
      const invalidWarning = warnings.find(w => w.type === 'invalid_frontmatter');
      assert.ok(invalidWarning);
    });

    it('should throw error for non-existent cascade directory', async () => {
      builder = new DependencyGraphBuilder('/nonexistent/path');

      await assert.rejects(
        async () => await builder.build(),
        /Cascade directory not found/
      );
    });
  });

  describe('Query methods', () => {
    beforeEach(() => {
      builder = new DependencyGraphBuilder(TEST_CASCADE_DIR);
    });

    it('should return empty arrays initially', () => {
      assert.deepStrictEqual(builder.getErrors(), []);
      assert.deepStrictEqual(builder.getWarnings(), []);
    });

    it('should check for errors and warnings', () => {
      assert.strictEqual(builder.hasErrors(), false);
      assert.strictEqual(builder.hasWarnings(), false);
    });

    it('should get the built graph', async () => {
      const content = `---
id: E0001
type: E
title: Test Epic
status: planned
---

# Test Epic
`;

      await fs.writeFile(path.join(TEST_CASCADE_DIR, 'E0001.md'), content);

      const graph = await builder.build();
      const retrievedGraph = builder.getGraph();

      assert.strictEqual(graph, retrievedGraph);
    });
  });
});
