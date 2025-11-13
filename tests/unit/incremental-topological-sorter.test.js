/**
 * Unit tests for IncrementalTopologicalSorter
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { DependencyGraph } = require('../../plugins/carl/lib/cascade/dependency-graph');
const { IncrementalTopologicalSorter } = require('../../plugins/carl/lib/cascade/incremental-topological-sorter');

describe('IncrementalTopologicalSorter', () => {
  let graph;
  let sorter;

  beforeEach(() => {
    graph = new DependencyGraph();
    sorter = new IncrementalTopologicalSorter(graph);
  });

  describe('Initialization', () => {
    it('should initialize with empty graph', () => {
      const result = sorter.initialize();

      assert.strictEqual(result.success, true);
      assert.strictEqual(sorter.initialized, true);
    });

    it('should initialize with existing graph', () => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addEdge('F0001', 'E0001');

      sorter.initialize();

      const order = sorter.getOrder();
      assert.strictEqual(order.length, 2);
      assert.ok(order.indexOf('E0001') < order.indexOf('F0001'));
    });
  });

  describe('Adding nodes', () => {
    beforeEach(() => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addEdge('F0001', 'E0001');
      sorter.initialize();
    });

    it('should add node with no dependencies at beginning', () => {
      graph.addNode('F0002', { type: 'F', title: 'Feature 2' });
      sorter.addNode('F0002');

      const order = sorter.getOrder();
      assert.ok(order.includes('F0002'));
      assert.strictEqual(order[0], 'F0002'); // No deps, goes first
    });

    it('should add node after its dependencies', () => {
      graph.addNode('S0001', { type: 'S', title: 'Story 1' });
      graph.addEdge('S0001', 'F0001');
      sorter.addNode('S0001');

      const order = sorter.getOrder();
      const f0001Pos = order.indexOf('F0001');
      const s0001Pos = order.indexOf('S0001');

      assert.ok(f0001Pos < s0001Pos);
    });

    it('should not add duplicate node', () => {
      const added = sorter.addNode('E0001');

      assert.strictEqual(added, false);
    });
  });

  describe('Removing nodes', () => {
    beforeEach(() => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('S0001', { type: 'S', title: 'Story 1' });
      graph.addEdge('F0001', 'E0001');
      graph.addEdge('S0001', 'F0001');
      sorter.initialize();
    });

    it('should remove node from order', () => {
      graph.removeNode('F0001');
      sorter.removeNode('F0001');

      const order = sorter.getOrder();
      assert.ok(!order.includes('F0001'));
      assert.strictEqual(order.length, 2);
    });

    it('should not remove non-existent node', () => {
      const removed = sorter.removeNode('F9999');

      assert.strictEqual(removed, false);
    });
  });

  describe('Adding edges', () => {
    beforeEach(() => {
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2' });
      sorter.initialize();
    });

    it('should update order when adding edge', () => {
      // Initially independent
      const initialOrder = sorter.getOrder();

      // Add dependency: F0001 depends on F0002
      graph.addEdge('F0001', 'F0002');
      sorter.addEdge('F0001', 'F0002');

      const newOrder = sorter.getOrder();
      const f0001Pos = newOrder.indexOf('F0001');
      const f0002Pos = newOrder.indexOf('F0002');

      assert.ok(f0002Pos < f0001Pos);
    });

    it('should maintain valid order after edge add', () => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addEdge('F0001', 'E0001');
      graph.addEdge('F0002', 'E0001');

      sorter.initialize();

      graph.addEdge('F0001', 'F0002');
      sorter.addEdge('F0001', 'F0002');

      assert.strictEqual(sorter.isValid(), true);
    });
  });

  describe('Removing edges', () => {
    beforeEach(() => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addEdge('F0001', 'E0001');
      sorter.initialize();
    });

    it('should allow optimization after edge removal', () => {
      graph.removeEdge('F0001', 'E0001');
      sorter.removeEdge('F0001', 'E0001');

      // Order should still be valid
      assert.strictEqual(sorter.isValid(), true);
    });
  });

  describe('Validation', () => {
    it('should validate empty graph', () => {
      sorter.initialize();

      assert.strictEqual(sorter.isValid(), true);
    });

    it('should validate correct order', () => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addEdge('F0001', 'E0001');

      sorter.initialize();

      assert.strictEqual(sorter.isValid(), true);
    });

    it('should detect invalid order if corrupted', () => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addEdge('F0001', 'E0001');

      sorter.initialize();

      // Manually corrupt the order
      sorter.order = ['F0001', 'E0001']; // Wrong! F0001 depends on E0001
      sorter._updatePositions();

      assert.strictEqual(sorter.isValid(), false);
    });
  });

  describe('Position queries', () => {
    beforeEach(() => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('S0001', { type: 'S', title: 'Story 1' });
      graph.addEdge('F0001', 'E0001');
      graph.addEdge('S0001', 'F0001');
      sorter.initialize();
    });

    it('should get position of node', () => {
      const e0001Pos = sorter.getPosition('E0001');
      const f0001Pos = sorter.getPosition('F0001');
      const s0001Pos = sorter.getPosition('S0001');

      assert.strictEqual(e0001Pos, 0);
      assert.strictEqual(f0001Pos, 1);
      assert.strictEqual(s0001Pos, 2);
    });

    it('should return -1 for non-existent node', () => {
      const pos = sorter.getPosition('F9999');

      assert.strictEqual(pos, -1);
    });
  });

  describe('Clear', () => {
    it('should clear all state', () => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      sorter.initialize();

      sorter.clear();

      assert.strictEqual(sorter.initialized, false);
      assert.strictEqual(sorter.order.length, 0);
      assert.strictEqual(sorter.position.size, 0);
    });
  });

  describe('Statistics', () => {
    it('should get stats', () => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addEdge('F0001', 'E0001');

      sorter.initialize();

      const stats = sorter.getStats();

      assert.strictEqual(stats.initialized, true);
      assert.strictEqual(stats.orderLength, 2);
      assert.strictEqual(stats.isValid, true);
    });
  });

  describe('Complex scenarios', () => {
    it('should handle diamond pattern', () => {
      //     E0001
      //    /     \
      //  F0001  F0002
      //    \     /
      //     S0001

      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2' });
      graph.addNode('S0001', { type: 'S', title: 'Story 1' });

      graph.addEdge('F0001', 'E0001');
      graph.addEdge('F0002', 'E0001');
      graph.addEdge('S0001', 'F0001');
      graph.addEdge('S0001', 'F0002');

      sorter.initialize();

      assert.strictEqual(sorter.isValid(), true);

      const order = sorter.getOrder();
      const e0001Pos = order.indexOf('E0001');
      const f0001Pos = order.indexOf('F0001');
      const f0002Pos = order.indexOf('F0002');
      const s0001Pos = order.indexOf('S0001');

      assert.ok(e0001Pos < f0001Pos);
      assert.ok(e0001Pos < f0002Pos);
      assert.ok(f0001Pos < s0001Pos);
      assert.ok(f0002Pos < s0001Pos);
    });
  });
});
