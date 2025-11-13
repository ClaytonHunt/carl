/**
 * Unit tests for DependencyGraph
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { DependencyGraph, GraphNode, GraphEdge } = require('../../plugins/carl/lib/cascade/dependency-graph');

describe('GraphNode', () => {
  it('should create a node with basic metadata', () => {
    const node = new GraphNode('E0001', {
      type: 'E',
      title: 'Test Epic',
      status: 'planned'
    });

    assert.strictEqual(node.id, 'E0001');
    assert.strictEqual(node.type, 'E');
    assert.strictEqual(node.title, 'Test Epic');
    assert.strictEqual(node.status, 'planned');
    assert.strictEqual(node.parent, null);
    assert.deepStrictEqual(node.depends_on, []);
  });

  it('should create a node with parent', () => {
    const node = new GraphNode('F0001', {
      type: 'F',
      title: 'Test Feature',
      parent: 'E0001'
    });

    assert.strictEqual(node.parent, 'E0001');
  });

  it('should create a node with explicit dependencies', () => {
    const node = new GraphNode('F0002', {
      type: 'F',
      title: 'Test Feature',
      depends_on: ['F0001', 'F0003']
    });

    assert.deepStrictEqual(node.depends_on, ['F0001', 'F0003']);
  });

  it('should convert to JSON', () => {
    const node = new GraphNode('E0001', {
      type: 'E',
      title: 'Test Epic',
      status: 'planned',
      priority: 'high',
      complexity: 'complex'
    });

    const json = node.toJSON();
    assert.strictEqual(json.id, 'E0001');
    assert.strictEqual(json.type, 'E');
    assert.strictEqual(json.title, 'Test Epic');
    assert.strictEqual(json.priority, 'high');
    assert.strictEqual(json.complexity, 'complex');
  });
});

describe('GraphEdge', () => {
  it('should create an edge with default type', () => {
    const edge = new GraphEdge('F0001', 'E0001');

    assert.strictEqual(edge.from, 'F0001');
    assert.strictEqual(edge.to, 'E0001');
    assert.strictEqual(edge.type, 'explicit');
  });

  it('should create an edge with parent-child type', () => {
    const edge = new GraphEdge('F0001', 'E0001', { type: 'parent-child' });

    assert.strictEqual(edge.type, 'parent-child');
  });

  it('should convert to JSON', () => {
    const edge = new GraphEdge('F0001', 'E0001', {
      type: 'parent-child',
      reason: 'hierarchical'
    });

    const json = edge.toJSON();
    assert.strictEqual(json.from, 'F0001');
    assert.strictEqual(json.to, 'E0001');
    assert.strictEqual(json.type, 'parent-child');
    assert.strictEqual(json.reason, 'hierarchical');
  });
});

describe('DependencyGraph', () => {
  let graph;

  beforeEach(() => {
    graph = new DependencyGraph();
  });

  describe('Node operations', () => {
    it('should add a node', () => {
      const node = graph.addNode('E0001', {
        type: 'E',
        title: 'Test Epic'
      });

      assert.strictEqual(node.id, 'E0001');
      assert.strictEqual(graph.hasNode('E0001'), true);
      assert.strictEqual(graph.size().nodes, 1);
    });

    it('should throw error when adding duplicate node', () => {
      graph.addNode('E0001', { type: 'E', title: 'Test Epic' });

      assert.throws(() => {
        graph.addNode('E0001', { type: 'E', title: 'Test Epic' });
      }, /already exists/);
    });

    it('should get a node', () => {
      graph.addNode('E0001', { type: 'E', title: 'Test Epic' });
      const node = graph.getNode('E0001');

      assert.strictEqual(node.id, 'E0001');
      assert.strictEqual(node.title, 'Test Epic');
    });

    it('should return null for non-existent node', () => {
      const node = graph.getNode('E9999');
      assert.strictEqual(node, null);
    });

    it('should get all nodes', () => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2' });

      const nodes = graph.getAllNodes();
      assert.strictEqual(nodes.length, 3);
    });
  });

  describe('Edge operations', () => {
    beforeEach(() => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2' });
    });

    it('should add an edge', () => {
      const edge = graph.addEdge('F0001', 'E0001', { type: 'parent-child' });

      assert.strictEqual(edge.from, 'F0001');
      assert.strictEqual(edge.to, 'E0001');
      assert.strictEqual(graph.hasEdge('F0001', 'E0001'), true);
      assert.strictEqual(graph.size().edges, 1);
    });

    it('should throw error when adding edge with non-existent source', () => {
      assert.throws(() => {
        graph.addEdge('F9999', 'E0001');
      }, /does not exist/);
    });

    it('should throw error when adding edge with non-existent target', () => {
      assert.throws(() => {
        graph.addEdge('F0001', 'E9999');
      }, /does not exist/);
    });

    it('should get edge metadata', () => {
      graph.addEdge('F0001', 'E0001', {
        type: 'parent-child',
        reason: 'test'
      });

      const edge = graph.getEdge('F0001', 'E0001');
      assert.strictEqual(edge.type, 'parent-child');
      assert.strictEqual(edge.reason, 'test');
    });

    it('should return null for non-existent edge', () => {
      const edge = graph.getEdge('F0001', 'E0001');
      assert.strictEqual(edge, null);
    });

    it('should get all edges', () => {
      graph.addEdge('F0001', 'E0001');
      graph.addEdge('F0002', 'E0001');

      const edges = graph.getAllEdges();
      assert.strictEqual(edges.length, 2);
    });
  });

  describe('Dependency queries', () => {
    beforeEach(() => {
      // Create a simple dependency tree:
      // E0001 (Epic)
      //   ├── F0001 (Feature)
      //   │   ├── S0001 (Story)
      //   │   └── S0002 (Story)
      //   └── F0002 (Feature)
      //       └── S0003 (Story) -> depends on S0001

      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1', parent: 'E0001' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2', parent: 'E0001' });
      graph.addNode('S0001', { type: 'S', title: 'Story 1', parent: 'F0001' });
      graph.addNode('S0002', { type: 'S', title: 'Story 2', parent: 'F0001' });
      graph.addNode('S0003', { type: 'S', title: 'Story 3', parent: 'F0002' });

      // Add parent-child edges
      graph.addEdge('F0001', 'E0001', { type: 'parent-child' });
      graph.addEdge('F0002', 'E0001', { type: 'parent-child' });
      graph.addEdge('S0001', 'F0001', { type: 'parent-child' });
      graph.addEdge('S0002', 'F0001', { type: 'parent-child' });
      graph.addEdge('S0003', 'F0002', { type: 'parent-child' });

      // Add explicit dependency
      graph.addEdge('S0003', 'S0001', { type: 'explicit' });
    });

    it('should get direct dependencies', () => {
      const deps = graph.getDependencies('F0001');
      assert.deepStrictEqual(deps, ['E0001']);
    });

    it('should get multiple dependencies', () => {
      const deps = graph.getDependencies('S0003');
      assert.strictEqual(deps.length, 2);
      assert.ok(deps.includes('F0002'));
      assert.ok(deps.includes('S0001'));
    });

    it('should get empty array for node with no dependencies', () => {
      const deps = graph.getDependencies('E0001');
      assert.deepStrictEqual(deps, []);
    });

    it('should get direct dependents', () => {
      const dependents = graph.getDependents('E0001');
      assert.strictEqual(dependents.length, 2);
      assert.ok(dependents.includes('F0001'));
      assert.ok(dependents.includes('F0002'));
    });

    it('should get empty array for node with no dependents', () => {
      const dependents = graph.getDependents('S0002');
      assert.deepStrictEqual(dependents, []);
    });

    it('should get all ancestors', () => {
      const ancestors = graph.getAncestors('S0001');
      assert.strictEqual(ancestors.length, 2);
      assert.ok(ancestors.includes('F0001'));
      assert.ok(ancestors.includes('E0001'));
    });

    it('should get ancestors including explicit dependencies', () => {
      const ancestors = graph.getAncestors('S0003');
      assert.strictEqual(ancestors.length, 4);
      assert.ok(ancestors.includes('F0002'));
      assert.ok(ancestors.includes('E0001'));
      assert.ok(ancestors.includes('S0001'));
      assert.ok(ancestors.includes('F0001'));
    });

    it('should get all descendants', () => {
      const descendants = graph.getDescendants('E0001');
      assert.strictEqual(descendants.length, 5);
      assert.ok(descendants.includes('F0001'));
      assert.ok(descendants.includes('F0002'));
      assert.ok(descendants.includes('S0001'));
      assert.ok(descendants.includes('S0002'));
      assert.ok(descendants.includes('S0003'));
    });

    it('should get descendants for mid-level node', () => {
      const descendants = graph.getDescendants('F0001');
      assert.strictEqual(descendants.length, 3);
      assert.ok(descendants.includes('S0001'));
      assert.ok(descendants.includes('S0002'));
      assert.ok(descendants.includes('S0003')); // S0003 depends on S0001
    });

    it('should check if path exists', () => {
      assert.strictEqual(graph.hasPath('S0001', 'E0001'), true);
      assert.strictEqual(graph.hasPath('S0003', 'E0001'), true);
      assert.strictEqual(graph.hasPath('S0003', 'S0001'), true);
    });

    it('should return false for non-existent path', () => {
      assert.strictEqual(graph.hasPath('E0001', 'S0001'), false);
      assert.strictEqual(graph.hasPath('S0001', 'S0002'), false);
    });

    it('should return true for path from node to itself', () => {
      assert.strictEqual(graph.hasPath('E0001', 'E0001'), true);
    });
  });

  describe('Graph serialization', () => {
    it('should export to JSON', () => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addEdge('F0001', 'E0001', { type: 'parent-child' });

      const json = graph.toJSON();
      assert.strictEqual(json.nodes.length, 2);
      assert.strictEqual(json.edges.length, 1);
      assert.strictEqual(json.nodes[0].id, 'E0001');
      assert.strictEqual(json.edges[0].from, 'F0001');
    });

    it('should import from JSON', () => {
      const data = {
        nodes: [
          { id: 'E0001', type: 'E', title: 'Epic 1', status: 'planned' },
          { id: 'F0001', type: 'F', title: 'Feature 1', status: 'planned', parent: 'E0001' }
        ],
        edges: [
          { from: 'F0001', to: 'E0001', type: 'parent-child' }
        ]
      };

      graph.fromJSON(data);
      assert.strictEqual(graph.size().nodes, 2);
      assert.strictEqual(graph.size().edges, 1);
      assert.strictEqual(graph.hasNode('E0001'), true);
      assert.strictEqual(graph.hasEdge('F0001', 'E0001'), true);
    });
  });

  describe('Graph utilities', () => {
    it('should get graph size', () => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addEdge('F0001', 'E0001');

      const size = graph.size();
      assert.strictEqual(size.nodes, 2);
      assert.strictEqual(size.edges, 1);
    });

    it('should clear the graph', () => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addEdge('F0001', 'E0001');

      graph.clear();
      assert.strictEqual(graph.size().nodes, 0);
      assert.strictEqual(graph.size().edges, 0);
    });
  });
});
