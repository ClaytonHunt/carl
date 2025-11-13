/**
 * Unit tests for CycleDetector
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { DependencyGraph } = require('../../plugins/carl/lib/cascade/dependency-graph');
const { CycleDetector } = require('../../plugins/carl/lib/cascade/cycle-detector');

describe('CycleDetector', () => {
  let graph;
  let detector;

  beforeEach(() => {
    graph = new DependencyGraph();
    detector = new CycleDetector(graph);
  });

  describe('Acyclic graphs', () => {
    it('should detect no cycles in empty graph', () => {
      const result = detector.detectCycles();

      assert.strictEqual(result.hasCycle, false);
      assert.strictEqual(result.cycles.length, 0);
      assert.strictEqual(detector.isAcyclic(), true);
    });

    it('should detect no cycles in single node', () => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });

      const result = detector.detectCycles();

      assert.strictEqual(result.hasCycle, false);
      assert.strictEqual(result.cycles.length, 0);
    });

    it('should detect no cycles in simple tree', () => {
      // E0001 -> F0001 -> S0001
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('S0001', { type: 'S', title: 'Story 1' });

      graph.addEdge('F0001', 'E0001', { type: 'parent-child' });
      graph.addEdge('S0001', 'F0001', { type: 'parent-child' });

      const result = detector.detectCycles();

      assert.strictEqual(result.hasCycle, false);
      assert.strictEqual(result.cycles.length, 0);
      assert.strictEqual(detector.isAcyclic(), true);
    });

    it('should detect no cycles in complex DAG', () => {
      // Diamond structure:
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

      const result = detector.detectCycles();

      assert.strictEqual(result.hasCycle, false);
      assert.strictEqual(result.cycles.length, 0);
    });
  });

  describe('Simple cycles', () => {
    it('should detect self-loop', () => {
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addEdge('F0001', 'F0001', { type: 'explicit' });

      const result = detector.detectCycles();

      assert.strictEqual(result.hasCycle, true);
      assert.strictEqual(result.cycles.length, 1);
      assert.deepStrictEqual(result.cycles[0].path, ['F0001', 'F0001']);
    });

    it('should detect 2-node cycle', () => {
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2' });

      graph.addEdge('F0001', 'F0002', { type: 'explicit' });
      graph.addEdge('F0002', 'F0001', { type: 'explicit' });

      const result = detector.detectCycles();

      assert.strictEqual(result.hasCycle, true);
      assert.strictEqual(result.cycles.length, 1);

      const cycle = result.cycles[0];
      assert.ok(cycle.path.includes('F0001'));
      assert.ok(cycle.path.includes('F0002'));
      assert.strictEqual(cycle.path[0], cycle.path[cycle.path.length - 1]); // Cycle closes
    });

    it('should detect 3-node cycle', () => {
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2' });
      graph.addNode('F0003', { type: 'F', title: 'Feature 3' });

      // F0001 -> F0002 -> F0003 -> F0001
      graph.addEdge('F0001', 'F0002');
      graph.addEdge('F0002', 'F0003');
      graph.addEdge('F0003', 'F0001');

      const result = detector.detectCycles();

      assert.strictEqual(result.hasCycle, true);
      assert.strictEqual(result.cycles.length, 1);

      const cycle = result.cycles[0];
      assert.strictEqual(cycle.path.length, 4); // 3 nodes + closing node
      assert.strictEqual(cycle.path[0], cycle.path[3]); // Cycle closes
    });
  });

  describe('Complex cycles', () => {
    it('should detect cycle in larger graph', () => {
      // E0001 -> F0001 -> F0002 -> F0003 -> F0001 (cycle)
      //                   F0002 -> F0004 (no cycle)

      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2' });
      graph.addNode('F0003', { type: 'F', title: 'Feature 3' });
      graph.addNode('F0004', { type: 'F', title: 'Feature 4' });

      graph.addEdge('F0001', 'E0001');
      graph.addEdge('F0002', 'F0001');
      graph.addEdge('F0003', 'F0002');
      graph.addEdge('F0001', 'F0003'); // Creates cycle
      graph.addEdge('F0004', 'F0002');

      const result = detector.detectCycles();

      assert.strictEqual(result.hasCycle, true);
      assert.strictEqual(result.cycles.length, 1);

      const cycle = result.cycles[0];
      assert.ok(cycle.path.includes('F0001'));
      assert.ok(cycle.path.includes('F0002'));
      assert.ok(cycle.path.includes('F0003'));
    });

    it('should detect multiple disconnected cycles', () => {
      // Cycle 1: F0001 <-> F0002
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2' });
      graph.addEdge('F0001', 'F0002');
      graph.addEdge('F0002', 'F0001');

      // Cycle 2: F0003 <-> F0004
      graph.addNode('F0003', { type: 'F', title: 'Feature 3' });
      graph.addNode('F0004', { type: 'F', title: 'Feature 4' });
      graph.addEdge('F0003', 'F0004');
      graph.addEdge('F0004', 'F0003');

      const result = detector.detectCycles();

      assert.strictEqual(result.hasCycle, true);
      assert.strictEqual(result.cycles.length, 2);
    });
  });

  describe('Cycle path and information', () => {
    it('should include edge types in cycle info', () => {
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2' });

      graph.addEdge('F0001', 'F0002', { type: 'explicit' });
      graph.addEdge('F0002', 'F0001', { type: 'parent-child' });

      const result = detector.detectCycles();

      assert.strictEqual(result.hasCycle, true);

      const cycle = result.cycles[0];
      assert.strictEqual(cycle.edges.length, 2);
      assert.ok(cycle.edges.some(e => e.type === 'explicit'));
      assert.ok(cycle.edges.some(e => e.type === 'parent-child'));
    });

    it('should generate human-readable error message', () => {
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2' });

      graph.addEdge('F0001', 'F0002');
      graph.addEdge('F0002', 'F0001');

      const result = detector.detectCycles();

      const cycle = result.cycles[0];
      assert.ok(cycle.message.includes('Circular dependency detected'));
      assert.ok(cycle.message.includes('F0001'));
      assert.ok(cycle.message.includes('F0002'));
      assert.ok(cycle.message.includes('Feature 1'));
      assert.ok(cycle.message.includes('Feature 2'));
    });

    it('should provide suggestions for breaking cycles', () => {
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2' });

      graph.addEdge('F0001', 'F0002', { type: 'explicit' });
      graph.addEdge('F0002', 'F0001', { type: 'explicit' });

      const result = detector.detectCycles();

      const cycle = result.cycles[0];
      assert.ok(Array.isArray(cycle.suggestions));
      assert.ok(cycle.suggestions.length > 0);
      assert.ok(cycle.suggestions[0].includes('Remove explicit dependency'));
    });

    it('should suggest hierarchy restructuring for parent-child cycles', () => {
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2' });

      graph.addEdge('F0001', 'F0002', { type: 'parent-child' });
      graph.addEdge('F0002', 'F0001', { type: 'parent-child' });

      const result = detector.detectCycles();

      const cycle = result.cycles[0];
      assert.ok(cycle.suggestions.some(s => s.includes('hierarchy')));
    });
  });

  describe('Validation methods', () => {
    it('should throw error on validate() if cycles exist', () => {
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2' });

      graph.addEdge('F0001', 'F0002');
      graph.addEdge('F0002', 'F0001');

      assert.throws(() => {
        detector.validate();
      }, /Dependency graph contains.*cycle/);
    });

    it('should not throw error on validate() if no cycles', () => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addEdge('F0001', 'E0001');

      assert.doesNotThrow(() => {
        detector.validate();
      });
    });

    it('should check if adding edge would create cycle', () => {
      // Current graph: F0001 -> E0001, S0001 -> F0001
      // This means: F0001 depends on E0001, S0001 depends on F0001
      // Dependency chain: S0001 -> F0001 -> E0001
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('S0001', { type: 'S', title: 'Story 1' });

      graph.addEdge('F0001', 'E0001');
      graph.addEdge('S0001', 'F0001');

      // Adding E0001 -> S0001 WOULD create a cycle: E0001 -> S0001 -> F0001 -> E0001
      assert.strictEqual(detector.wouldCreateCycle('E0001', 'S0001'), true);

      // Adding S0001 -> E0001 WOULD create a cycle (but already has path through F0001)
      assert.strictEqual(detector.wouldCreateCycle('S0001', 'E0001'), false); // No cycle since S0001 already reaches E0001

      // Adding F0001 -> S0001 WOULD create a cycle: F0001 -> S0001 -> F0001
      assert.strictEqual(detector.wouldCreateCycle('F0001', 'S0001'), true);
    });

    it('should get all cycles', () => {
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2' });
      graph.addEdge('F0001', 'F0002');
      graph.addEdge('F0002', 'F0001');

      const cycles = detector.getAllCycles();

      assert.strictEqual(cycles.length, 1);
      assert.ok(cycles[0].path);
      assert.ok(cycles[0].message);
      assert.ok(cycles[0].suggestions);
    });
  });

  describe('Edge cases', () => {
    it('should handle graph with only isolated nodes', () => {
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2' });
      graph.addNode('F0003', { type: 'F', title: 'Feature 3' });

      const result = detector.detectCycles();

      assert.strictEqual(result.hasCycle, false);
      assert.strictEqual(result.cycles.length, 0);
    });

    it('should handle disconnected components with mixed cycles', () => {
      // Component 1: E0001 -> F0001 (no cycle)
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addEdge('F0001', 'E0001');

      // Component 2: F0002 <-> F0003 (cycle)
      graph.addNode('F0002', { type: 'F', title: 'Feature 2' });
      graph.addNode('F0003', { type: 'F', title: 'Feature 3' });
      graph.addEdge('F0002', 'F0003');
      graph.addEdge('F0003', 'F0002');

      const result = detector.detectCycles();

      assert.strictEqual(result.hasCycle, true);
      assert.strictEqual(result.cycles.length, 1);
    });

    it('should handle long cycle chains', () => {
      // Create a cycle: F0001 -> F0002 -> F0003 -> F0004 -> F0005 -> F0001
      const nodeCount = 5;

      for (let i = 1; i <= nodeCount; i++) {
        graph.addNode(`F000${i}`, { type: 'F', title: `Feature ${i}` });
      }

      for (let i = 1; i < nodeCount; i++) {
        graph.addEdge(`F000${i}`, `F000${i + 1}`);
      }
      // Close the cycle
      graph.addEdge(`F000${nodeCount}`, 'F0001');

      const result = detector.detectCycles();

      assert.strictEqual(result.hasCycle, true);
      assert.strictEqual(result.cycles.length, 1);

      const cycle = result.cycles[0];
      assert.strictEqual(cycle.path.length, nodeCount + 1); // 5 nodes + closing node
    });
  });
});
