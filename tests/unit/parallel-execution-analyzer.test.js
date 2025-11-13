/**
 * Unit tests for ParallelExecutionAnalyzer
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { DependencyGraph } = require('../../plugins/carl/lib/cascade/dependency-graph');
const { ParallelExecutionAnalyzer } = require('../../plugins/carl/lib/cascade/parallel-execution-analyzer');

describe('ParallelExecutionAnalyzer', () => {
  let graph;
  let analyzer;

  beforeEach(() => {
    graph = new DependencyGraph();
    analyzer = new ParallelExecutionAnalyzer(graph);
  });

  describe('Wave calculation', () => {
    it('should handle empty graph', () => {
      const plan = analyzer.analyze();

      assert.strictEqual(plan.waves.length, 0);
      assert.strictEqual(plan.metrics.totalWaves, 0);
    });

    it('should put independent items in same wave', () => {
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2' });
      graph.addNode('F0003', { type: 'F', title: 'Feature 3' });

      const plan = analyzer.analyze();

      assert.strictEqual(plan.waves.length, 1);
      assert.strictEqual(plan.waves[0].length, 3);
      assert.ok(plan.waves[0].includes('F0001'));
      assert.ok(plan.waves[0].includes('F0002'));
      assert.ok(plan.waves[0].includes('F0003'));
    });

    it('should create sequential waves for linear dependencies', () => {
      // E0001 <- F0001 <- S0001
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('S0001', { type: 'S', title: 'Story 1' });

      graph.addEdge('F0001', 'E0001');
      graph.addEdge('S0001', 'F0001');

      const plan = analyzer.analyze();

      assert.strictEqual(plan.waves.length, 3);
      assert.deepStrictEqual(plan.waves[0], ['E0001']);
      assert.deepStrictEqual(plan.waves[1], ['F0001']);
      assert.deepStrictEqual(plan.waves[2], ['S0001']);
    });

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

      const plan = analyzer.analyze();

      assert.strictEqual(plan.waves.length, 3);
      assert.deepStrictEqual(plan.waves[0], ['E0001']);
      assert.strictEqual(plan.waves[1].length, 2);
      assert.ok(plan.waves[1].includes('F0001'));
      assert.ok(plan.waves[1].includes('F0002'));
      assert.deepStrictEqual(plan.waves[2], ['S0001']);
    });

    it('should handle complex mixed dependencies', () => {
      // E0001 <- F0001 <- S0001
      //       <- F0002 <- S0002
      // S0003 (independent)

      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2' });
      graph.addNode('S0001', { type: 'S', title: 'Story 1' });
      graph.addNode('S0002', { type: 'S', title: 'Story 2' });
      graph.addNode('S0003', { type: 'S', title: 'Story 3' });

      graph.addEdge('F0001', 'E0001');
      graph.addEdge('F0002', 'E0001');
      graph.addEdge('S0001', 'F0001');
      graph.addEdge('S0002', 'F0002');

      const plan = analyzer.analyze();

      // Wave 0: E0001, S0003
      // Wave 1: F0001, F0002
      // Wave 2: S0001, S0002

      assert.strictEqual(plan.waves.length, 3);
      assert.strictEqual(plan.waves[0].length, 2);
      assert.ok(plan.waves[0].includes('E0001'));
      assert.ok(plan.waves[0].includes('S0003'));
    });
  });

  describe('Metrics calculation', () => {
    it('should calculate metrics for linear chain', () => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('S0001', { type: 'S', title: 'Story 1' });

      graph.addEdge('F0001', 'E0001');
      graph.addEdge('S0001', 'F0001');

      const plan = analyzer.analyze();

      assert.strictEqual(plan.metrics.totalWaves, 3);
      assert.strictEqual(plan.metrics.maxConcurrency, 1);
      assert.strictEqual(plan.metrics.criticalPathLength, 3);
      assert.deepStrictEqual(plan.metrics.criticalPath, ['E0001', 'F0001', 'S0001']);
      assert.strictEqual(plan.metrics.parallelismFactor, 1.0); // 3 items / 3 waves
    });

    it('should calculate metrics for parallel items', () => {
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2' });
      graph.addNode('F0003', { type: 'F', title: 'Feature 3' });

      const plan = analyzer.analyze();

      assert.strictEqual(plan.metrics.totalWaves, 1);
      assert.strictEqual(plan.metrics.maxConcurrency, 3);
      assert.strictEqual(plan.metrics.criticalPathLength, 1);
      assert.strictEqual(plan.metrics.parallelismFactor, 3.0); // 3 items / 1 wave
    });

    it('should calculate critical path for diamond', () => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2' });
      graph.addNode('S0001', { type: 'S', title: 'Story 1' });

      graph.addEdge('F0001', 'E0001');
      graph.addEdge('F0002', 'E0001');
      graph.addEdge('S0001', 'F0001');
      graph.addEdge('S0001', 'F0002');

      const plan = analyzer.analyze();

      assert.strictEqual(plan.metrics.criticalPathLength, 3);
      // Critical path should be: E0001 -> F0001/F0002 -> S0001
      assert.ok(plan.metrics.criticalPath.includes('E0001'));
      assert.ok(plan.metrics.criticalPath.includes('S0001'));
    });
  });

  describe('Resource constraints', () => {
    it('should apply max concurrent limit', () => {
      // 5 independent items, limit to 2 concurrent
      for (let i = 1; i <= 5; i++) {
        graph.addNode(`F000${i}`, { type: 'F', title: `Feature ${i}` });
      }

      const plan = analyzer.analyze({ maxConcurrent: 2 });

      // Should split into 3 waves: [2, 2, 1]
      assert.strictEqual(plan.waves.length, 3);
      assert.strictEqual(plan.waves[0].length, 2);
      assert.strictEqual(plan.waves[1].length, 2);
      assert.strictEqual(plan.waves[2].length, 1);
    });

    it('should not modify waves under limit', () => {
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2' });

      const plan = analyzer.analyze({ maxConcurrent: 5 });

      assert.strictEqual(plan.waves.length, 1);
      assert.strictEqual(plan.waves[0].length, 2);
    });

    it('should maintain dependency order with constraints', () => {
      // Linear chain with limit
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('S0001', { type: 'S', title: 'Story 1' });

      graph.addEdge('F0001', 'E0001');
      graph.addEdge('S0001', 'F0001');

      const plan = analyzer.analyze({ maxConcurrent: 1 });

      // Should still be 3 waves, order preserved
      assert.strictEqual(plan.waves.length, 3);
      assert.deepStrictEqual(plan.waves[0], ['E0001']);
      assert.deepStrictEqual(plan.waves[1], ['F0001']);
      assert.deepStrictEqual(plan.waves[2], ['S0001']);
    });
  });

  describe('Ready items', () => {
    it('should get items with no dependencies', () => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('S0001', { type: 'S', title: 'Story 1' });

      graph.addEdge('F0001', 'E0001');

      const ready = analyzer.getReadyItems();

      assert.strictEqual(ready.length, 2);
      assert.ok(ready.includes('E0001'));
      assert.ok(ready.includes('S0001'));
    });

    it('should get next ready items after completion', () => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2' });
      graph.addNode('S0001', { type: 'S', title: 'Story 1' });

      graph.addEdge('F0001', 'E0001');
      graph.addEdge('F0002', 'E0001');
      graph.addEdge('S0001', 'F0001');
      graph.addEdge('S0001', 'F0002');

      // E0001 completed
      const nextReady = analyzer.getNextReadyItems(['E0001']);

      assert.strictEqual(nextReady.length, 2);
      assert.ok(nextReady.includes('F0001'));
      assert.ok(nextReady.includes('F0002'));
    });

    it('should exclude in-progress items', () => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2' });

      graph.addEdge('F0001', 'E0001');
      graph.addEdge('F0002', 'E0001');

      // E0001 completed, F0001 in progress
      const nextReady = analyzer.getNextReadyItems(['E0001'], ['F0001']);

      assert.strictEqual(nextReady.length, 1);
      assert.strictEqual(nextReady[0], 'F0002');
    });
  });

  describe('Parallel execution checks', () => {
    it('should identify independent items can run in parallel', () => {
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2' });

      const canParallel = analyzer.canExecuteInParallel('F0001', 'F0002');

      assert.strictEqual(canParallel, true);
    });

    it('should identify dependent items cannot run in parallel', () => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });

      graph.addEdge('F0001', 'E0001');

      const canParallel = analyzer.canExecuteInParallel('E0001', 'F0001');

      assert.strictEqual(canParallel, false);
    });

    it('should check reverse dependencies', () => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });

      graph.addEdge('F0001', 'E0001');

      // Check in reverse order
      const canParallel = analyzer.canExecuteInParallel('F0001', 'E0001');

      assert.strictEqual(canParallel, false);
    });
  });

  describe('Wave assignment', () => {
    it('should get wave number for item', () => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });
      graph.addNode('S0001', { type: 'S', title: 'Story 1' });

      graph.addEdge('F0001', 'E0001');
      graph.addEdge('S0001', 'F0001');

      assert.strictEqual(analyzer.getWaveForItem('E0001'), 0);
      assert.strictEqual(analyzer.getWaveForItem('F0001'), 1);
      assert.strictEqual(analyzer.getWaveForItem('S0001'), 2);
    });

    it('should return -1 for non-existent item', () => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });

      assert.strictEqual(analyzer.getWaveForItem('F9999'), -1);
    });
  });

  describe('Priority-based grouping', () => {
    it('should group by priority within waves', () => {
      graph.addNode('F0001', { type: 'F', title: 'Feature 1', priority: 'low' });
      graph.addNode('F0002', { type: 'F', title: 'Feature 2', priority: 'high' });
      graph.addNode('F0003', { type: 'F', title: 'Feature 3', priority: 'critical' });

      const plan = analyzer.analyze({ respectPriority: true });

      // All in same wave, but ordered by priority
      assert.strictEqual(plan.waves.length, 1);
      assert.strictEqual(plan.waves[0][0], 'F0003'); // Critical first
      assert.strictEqual(plan.waves[0][1], 'F0002'); // High second
      assert.strictEqual(plan.waves[0][2], 'F0001'); // Low last
    });
  });

  describe('Report generation', () => {
    it('should generate readable report', () => {
      graph.addNode('E0001', { type: 'E', title: 'Epic 1' });
      graph.addNode('F0001', { type: 'F', title: 'Feature 1' });

      graph.addEdge('F0001', 'E0001');

      const report = analyzer.getReport();

      assert.ok(report.includes('Total Items: 2'));
      assert.ok(report.includes('Total Waves: 2'));
      assert.ok(report.includes('Critical Path'));
      assert.ok(report.includes('Execution Waves'));
    });
  });
});
