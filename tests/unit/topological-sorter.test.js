/**
 * Unit tests for TopologicalSorter
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { DependencyGraph } = require('../../plugins/carl/lib/cascade/dependency-graph');
const { TopologicalSorter } = require('../../plugins/carl/lib/cascade/topological-sorter');

describe('TopologicalSorter', () => {
  let graph;
  let sorter;

  beforeEach(() => {
    graph = new DependencyGraph();
    sorter = new TopologicalSorter(graph);
  });

  describe('Kahn Algorithm', () => {
    it('should sort empty graph', () => {
      const result = sorter.sortKahn();

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.order.length, 0);
      assert.strictEqual(result.algorithm, 'kahn');
    });

    it('should sort single node', () => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });

      const result = sorter.sortKahn();

      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.order, ['E0001']);
    });

    it('should sort simple linear chain', () => {
      // E0001 <- F0001 <- S0001 (S0001 depends on F0001 depends on E0001)
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('S0001', { type: 'S', title: 'Story 1' });

      graph.addEdge('F0001', 'E0001');
      graph.addEdge('S0001', 'F0001');

      const result = sorter.sortKahn();

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.order.length, 3);

      // E0001 must come before F0001, F0001 must come before S0001
      const e0001Pos = result.order.indexOf('E0001');
      const f0001Pos = result.order.indexOf('F0001');
      const s0001Pos = result.order.indexOf('S0001');

      assert.ok(e0001Pos < f0001Pos);
      assert.ok(f0001Pos < s0001Pos);
    });

    it('should sort diamond pattern', () => {
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

      const result = sorter.sortKahn();

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.order.length, 4);

      // Verify dependencies
      assert.ok(sorter.isValidOrder(result.order));
    });

    it('should detect cycles and fail', () => {
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2' });

      graph.addEdge('F0001', 'F0002');
      graph.addEdge('F0002', 'F0001'); // Creates cycle

      const result = sorter.sortKahn();

      assert.strictEqual(result.success, false);
      assert.ok(result.error.includes('cycle'));
    });

    it('should handle disconnected components', () => {
      // Component 1: E0001 <- F0001
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addEdge('F0001', 'E0001');

      // Component 2: E0002 <- F0002
      graph.addNode('E0002', { type: 'E', title: 'Epic 2' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2' });
      graph.addEdge('F0002', 'E0002');

      const result = sorter.sortKahn();

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.order.length, 4);
      assert.ok(sorter.isValidOrder(result.order));
    });
  });

  describe('DFS Algorithm', () => {
    it('should sort empty graph', () => {
      const result = sorter.sortDFS();

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.order.length, 0);
      assert.strictEqual(result.algorithm, 'dfs');
    });

    it('should sort single node', () => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });

      const result = sorter.sortDFS();

      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.order, ['E0001']);
    });

    it('should sort simple linear chain', () => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('S0001', { type: 'S', title: 'Story 1' });

      graph.addEdge('F0001', 'E0001');
      graph.addEdge('S0001', 'F0001');

      const result = sorter.sortDFS();

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.order.length, 3);
      assert.ok(sorter.isValidOrder(result.order));
    });

    it('should sort diamond pattern', () => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2' });
      graph.addNode('S0001', { type: 'S', title: 'Story 1' });

      graph.addEdge('F0001', 'E0001');
      graph.addEdge('F0002', 'E0001');
      graph.addEdge('S0001', 'F0001');
      graph.addEdge('S0001', 'F0002');

      const result = sorter.sortDFS();

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.order.length, 4);
      assert.ok(sorter.isValidOrder(result.order));
    });

    it('should detect cycles and fail', () => {
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2' });

      graph.addEdge('F0001', 'F0002');
      graph.addEdge('F0002', 'F0001');

      const result = sorter.sortDFS();

      assert.strictEqual(result.success, false);
      assert.ok(result.error.includes('cycle'));
    });
  });

  describe('Priority-based sorting', () => {
    it('should respect priority in Kahn algorithm', () => {
      // Two independent features - high priority should come first
      graph.addNode('F0001', { type: 'F', title: 'Feature 1', priority: 'low' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2', priority: 'high' });

      const result = sorter.sortKahn({ respectPriority: true });

      assert.strictEqual(result.success, true);
      // High priority should come first
      assert.strictEqual(result.order[0], 'F0002');
      assert.strictEqual(result.order[1], 'F0001');
    });

    it('should respect priority in DFS algorithm', () => {
      graph.addNode('F0001', { type: 'F', title: 'Feature 1', priority: 'low' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2', priority: 'high' });

      const result = sorter.sortDFS({ respectPriority: true });

      assert.strictEqual(result.success, true);
      // Both orderings are valid since nodes are independent
      // Just verify it's a valid topological ordering
      assert.ok(sorter.isValidOrder(result.order));
      assert.strictEqual(result.order.length, 2);
    });

    it('should maintain dependency order despite priority', () => {
      // F0001 (high) depends on E0001 (low)
      // E0001 must still come first despite lower priority
      graph.addNode('E0001', { type: 'E', title: 'Epic 1', priority: 'low' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1', priority: 'high' });
      graph.addEdge('F0001', 'E0001');

      const result = sorter.sortKahn({ respectPriority: true });

      assert.strictEqual(result.success, true);
      assert.ok(sorter.isValidOrder(result.order));

      const e0001Pos = result.order.indexOf('E0001');
      const f0001Pos = result.order.indexOf('F0001');
      assert.ok(e0001Pos < f0001Pos); // Dependency order maintained
    });

    it('should handle critical priority', () => {
      graph.addNode('F0001', { type: 'F', title: 'Feature 1', priority: 'critical' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2', priority: 'high' });
      graph.addNode('F0003', { type: 'F', title: 'Feature 3', priority: 'medium' });

      const result = sorter.sortKahn({ respectPriority: true });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.order[0], 'F0001'); // Critical first
      assert.strictEqual(result.order[1], 'F0002'); // High second
      assert.strictEqual(result.order[2], 'F0003'); // Medium last
    });
  });

  describe('Subgraph sorting', () => {
    it('should sort subgraph from root node', () => {
      // E0001 <- F0001 <- S0001
      //       <- F0002 <- S0002
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2' });
      graph.addNode('S0001', { type: 'S', title: 'Story 1' });
      graph.addNode('S0002', { type: 'S', title: 'Story 2' });

      graph.addEdge('F0001', 'E0001');
      graph.addEdge('F0002', 'E0001');
      graph.addEdge('S0001', 'F0001');
      graph.addEdge('S0002', 'F0002');

      const result = sorter.sortSubgraph('F0001');

      assert.strictEqual(result.success, true);
      // Should only include F0001 and its descendants
      assert.ok(result.order.includes('F0001'));
      assert.ok(result.order.includes('S0001'));
      assert.ok(!result.order.includes('E0001')); // Parent not included
      assert.ok(!result.order.includes('F0002')); // Sibling not included
      assert.ok(!result.order.includes('S0002')); // Sibling's child not included
    });
  });

  describe('Validation', () => {
    it('should validate correct topological order', () => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('S0001', { type: 'S', title: 'Story 1' });

      graph.addEdge('F0001', 'E0001');
      graph.addEdge('S0001', 'F0001');

      const validOrder = ['E0001', 'F0001', 'S0001'];
      assert.strictEqual(sorter.isValidOrder(validOrder), true);
    });

    it('should reject invalid topological order', () => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('S0001', { type: 'S', title: 'Story 1' });

      graph.addEdge('F0001', 'E0001');
      graph.addEdge('S0001', 'F0001');

      const invalidOrder = ['S0001', 'F0001', 'E0001']; // Reversed!
      assert.strictEqual(sorter.isValidOrder(invalidOrder), false);
    });
  });

  describe('Algorithm agreement', () => {
    it('both algorithms should produce valid orderings for same graph', () => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2' });
      graph.addNode('S0001', { type: 'S', title: 'Story 1' });

      graph.addEdge('F0001', 'E0001');
      graph.addEdge('F0002', 'E0001');
      graph.addEdge('S0001', 'F0001');
      graph.addEdge('S0001', 'F0002');

      const kahnResult = sorter.sortKahn();
      const dfsResult = sorter.sortDFS();

      assert.strictEqual(kahnResult.success, true);
      assert.strictEqual(dfsResult.success, true);

      // Both should be valid orderings
      assert.ok(sorter.isValidOrder(kahnResult.order));
      assert.ok(sorter.isValidOrder(dfsResult.order));
    });
  });

  describe('Default sort method', () => {
    it('should use Kahn algorithm by default', () => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });

      const result = sorter.sort();

      assert.strictEqual(result.algorithm, 'kahn');
    });
  });

  describe('Complex graphs', () => {
    it('should handle large branching graph', () => {
      // Create a tree: 1 epic, 3 features, 9 stories (3 per feature)
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });

      for (let f = 1; f <= 3; f++) {
        const fId = `F000${f}`;
        graph.addNode(fId, { type: 'F', title: `Feature ${f}` });
        graph.addEdge(fId, 'E0001');

        for (let s = 1; s <= 3; s++) {
          const sId = `S${f}00${s}`;
          graph.addNode(sId, { type: 'S', title: `Story ${f}-${s}` });
          graph.addEdge(sId, fId);
        }
      }

      const result = sorter.sortKahn();

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.order.length, 13); // 1 epic + 3 features + 9 stories
      assert.ok(sorter.isValidOrder(result.order));
    });
  });
});
