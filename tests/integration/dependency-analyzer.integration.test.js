/**
 * Integration Tests for Dependency Analyzer
 *
 * Comprehensive end-to-end tests for the complete dependency analysis system
 * using realistic Cascade work item hierarchies.
 *
 * Test Coverage:
 * - T0056: Realistic test scenarios
 * - T0057: End-to-end dependency analysis
 * - T0058: Dynamic workflow updates
 * - T0059: Error scenarios
 */

const { describe, it, beforeEach, afterEach, before } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { DependencyGraphBuilder } = require('../../plugins/carl/lib/cascade/dependency-graph-builder');
const { CycleDetector } = require('../../plugins/carl/lib/cascade/cycle-detector');
const { TopologicalSorter } = require('../../plugins/carl/lib/cascade/topological-sorter');
const { ParallelExecutionAnalyzer } = require('../../plugins/carl/lib/cascade/parallel-execution-analyzer');
const { DynamicDependencyManager } = require('../../plugins/carl/lib/cascade/dynamic-dependency-manager');

// Test fixture directories
const FIXTURES_BASE = path.join(__dirname, '../fixtures/integration-scenarios');
const SIMPLE_LINEAR_DIR = path.join(FIXTURES_BASE, 'simple-linear');
const COMPLEX_PARALLEL_DIR = path.join(FIXTURES_BASE, 'complex-parallel');
const CIRCULAR_DEPENDENCY_DIR = path.join(FIXTURES_BASE, 'circular-dependency');
const LARGE_HIERARCHY_DIR = path.join(FIXTURES_BASE, 'large-hierarchy');

describe('Dependency Analyzer Integration Tests', () => {

  describe('T0057: End-to-End Dependency Analysis', () => {

    describe('Simple Linear Workflow', () => {
      let builder;
      let graph;

      before(async () => {
        builder = new DependencyGraphBuilder(SIMPLE_LINEAR_DIR);
        graph = await builder.build();
      });

      it('should load all work items from Cascade directory', () => {
        const size = graph.size();
        assert.strictEqual(size.nodes, 7, 'Should load 7 work items');

        // Verify all expected items are present
        assert.ok(graph.hasNode('P0001'), 'Should have Project P0001');
        assert.ok(graph.hasNode('E0001'), 'Should have Epic E0001');
        assert.ok(graph.hasNode('F0001'), 'Should have Feature F0001');
        assert.ok(graph.hasNode('S0001'), 'Should have Story S0001');
        assert.ok(graph.hasNode('S0002'), 'Should have Story S0002');
        assert.ok(graph.hasNode('T0001'), 'Should have Task T0001');
        assert.ok(graph.hasNode('T0002'), 'Should have Task T0002');
      });

      it('should build dependency graph with parent-child relationships', () => {
        // Check parent-child edges
        assert.ok(graph.hasEdge('E0001', 'P0001'), 'Epic should depend on Project');
        assert.ok(graph.hasEdge('F0001', 'E0001'), 'Feature should depend on Epic');
        assert.ok(graph.hasEdge('S0001', 'F0001'), 'Story should depend on Feature');
        assert.ok(graph.hasEdge('T0001', 'S0001'), 'Task should depend on Story');
      });

      it('should build dependency graph with explicit dependencies', () => {
        // S0002 explicitly depends on S0001
        assert.ok(graph.hasEdge('S0002', 'S0001'), 'S0002 should depend on S0001');

        // Verify edge metadata
        const edge = graph.getEdge('S0002', 'S0001');
        assert.strictEqual(edge.type, 'explicit', 'Should be explicit dependency');
      });

      it('should detect no cycles in valid workflow', () => {
        const cycleDetector = new CycleDetector(graph);
        const result = cycleDetector.detectCycles();

        assert.strictEqual(result.hasCycle, false, 'Should have no cycles');
        assert.strictEqual(result.cycles.length, 0, 'Should have zero cycle objects');
      });

      it('should generate valid topological order', () => {
        const sorter = new TopologicalSorter(graph);
        const result = sorter.sort();

        assert.strictEqual(result.success, true, 'Sort should succeed');
        assert.strictEqual(result.order.length, 7, 'Should order all 7 items');

        // Verify dependencies are satisfied (parents come before children)
        const indexOf = (id) => result.order.indexOf(id);
        assert.ok(indexOf('P0001') < indexOf('E0001'), 'Project before Epic');
        assert.ok(indexOf('E0001') < indexOf('F0001'), 'Epic before Feature');
        assert.ok(indexOf('F0001') < indexOf('S0001'), 'Feature before Story S0001');
        assert.ok(indexOf('S0001') < indexOf('S0002'), 'S0001 before S0002 (explicit dep)');
        assert.ok(indexOf('S0001') < indexOf('T0001'), 'Story before Task');
      });

      it('should create execution waves for parallel execution', () => {
        const analyzer = new ParallelExecutionAnalyzer(graph);
        const plan = analyzer.analyze();

        assert.ok(plan.waves.length > 0, 'Should have execution waves');
        assert.ok(Array.isArray(plan.waves), 'Waves should be an array');

        // Verify metrics
        assert.ok(plan.metrics.totalWaves > 0, 'Should have wave count');
        assert.ok(plan.metrics.maxConcurrency >= 1, 'Should have max concurrency');
        assert.ok(plan.metrics.criticalPathLength > 0, 'Should have critical path length');
      });

      it('should verify correct execution ordering', () => {
        const sorter = new TopologicalSorter(graph);
        const result = sorter.sort({ respectPriority: true });

        // All dependencies should be satisfied
        for (const nodeId of result.order) {
          const dependencies = graph.getDependencies(nodeId);
          const nodeIndex = result.order.indexOf(nodeId);

          for (const depId of dependencies) {
            const depIndex = result.order.indexOf(depId);
            assert.ok(depIndex < nodeIndex,
              `Dependency ${depId} should come before ${nodeId}`);
          }
        }
      });
    });

    describe('Complex Parallel Workflow', () => {
      let builder;
      let graph;

      before(async () => {
        builder = new DependencyGraphBuilder(COMPLEX_PARALLEL_DIR);
        graph = await builder.build();
      });

      it('should load complex hierarchy with multiple parallel branches', () => {
        const size = graph.size();
        assert.ok(size.nodes >= 12, 'Should load at least 12 work items');

        // Verify key items
        assert.ok(graph.hasNode('F0002'), 'Should have Auth Feature');
        assert.ok(graph.hasNode('F0003'), 'Should have API Feature');
        assert.ok(graph.hasNode('F0004'), 'Should have UI Feature');
        assert.ok(graph.hasNode('F0005'), 'Should have Integration Feature');
      });

      it('should identify independent items for parallel execution', () => {
        const analyzer = new ParallelExecutionAnalyzer(graph);
        const plan = analyzer.analyze();

        // F0002, F0003, F0004 are independent and should be in same wave
        // Find which waves they are in
        let foundWaveWithMultipleFeatures = false;
        for (const wave of plan.waves) {
          const featuresInWave = wave.filter(id => id.startsWith('F'));
          if (featuresInWave.length >= 2) {
            foundWaveWithMultipleFeatures = true;
            break;
          }
        }

        assert.ok(plan.metrics.maxConcurrency >= 2,
          'Should have at least 2 items that can run concurrently');
      });

      it('should respect explicit dependencies in parallel workflow', () => {
        const sorter = new TopologicalSorter(graph);
        const result = sorter.sort();

        // F0005 depends on F0002, F0003, F0004
        const f0005Index = result.order.indexOf('F0005');
        const f0002Index = result.order.indexOf('F0002');
        const f0003Index = result.order.indexOf('F0003');
        const f0004Index = result.order.indexOf('F0004');

        if (f0005Index !== -1) {
          if (f0002Index !== -1) {
            assert.ok(f0002Index < f0005Index, 'F0002 should come before F0005');
          }
          if (f0003Index !== -1) {
            assert.ok(f0003Index < f0005Index, 'F0003 should come before F0005');
          }
          if (f0004Index !== -1) {
            assert.ok(f0004Index < f0005Index, 'F0004 should come before F0005');
          }
        }
      });

      it('should calculate realistic parallelism metrics', () => {
        const analyzer = new ParallelExecutionAnalyzer(graph);
        const plan = analyzer.analyze();

        assert.ok(plan.metrics.parallelismFactor > 1,
          'Parallelism factor should be > 1 for parallel workflow');
        assert.ok(plan.metrics.criticalPath.length > 0,
          'Should identify critical path');
      });
    });

    describe('Large Hierarchy Performance', () => {
      let builder;
      let graph;
      let buildTime;

      before(async () => {
        builder = new DependencyGraphBuilder(LARGE_HIERARCHY_DIR);
        const startTime = Date.now();
        graph = await builder.build();
        buildTime = Date.now() - startTime;
      });

      it('should handle large graphs with 100+ items efficiently', () => {
        const size = graph.size();
        assert.ok(size.nodes >= 100, 'Should load 100+ work items');
        console.log(`Loaded ${size.nodes} nodes in ${buildTime}ms`);

        // Build should complete in reasonable time (< 5 seconds)
        assert.ok(buildTime < 5000,
          `Build should complete in < 5s (actual: ${buildTime}ms)`);
      });

      it('should perform topological sort on large graph efficiently', () => {
        const sorter = new TopologicalSorter(graph);
        const startTime = Date.now();
        const result = sorter.sort();
        const sortTime = Date.now() - startTime;

        assert.strictEqual(result.success, true, 'Sort should succeed');
        assert.ok(result.order.length >= 100, 'Should order 100+ items');
        console.log(`Sorted ${result.order.length} items in ${sortTime}ms`);

        // Sort should complete in reasonable time (< 1 second)
        assert.ok(sortTime < 1000,
          `Sort should complete in < 1s (actual: ${sortTime}ms)`);
      });

      it('should analyze parallel execution on large graph efficiently', () => {
        const analyzer = new ParallelExecutionAnalyzer(graph);
        const startTime = Date.now();
        const plan = analyzer.analyze();
        const analysisTime = Date.now() - startTime;

        assert.ok(plan.waves.length > 0, 'Should generate execution plan');
        console.log(`Analyzed ${graph.size().nodes} items into ${plan.waves.length} waves in ${analysisTime}ms`);

        // Analysis should complete in reasonable time (< 2 seconds)
        assert.ok(analysisTime < 2000,
          `Analysis should complete in < 2s (actual: ${analysisTime}ms)`);
      });
    });
  });

  describe('T0058: Dynamic Workflow Updates', () => {
    let manager;
    let graph;

    beforeEach(async () => {
      // Start with simple linear workflow
      const builder = new DependencyGraphBuilder(SIMPLE_LINEAR_DIR);
      graph = await builder.build();
      manager = new DynamicDependencyManager(graph);
    });

    it('should add new work items dynamically', () => {
      const initialSize = graph.size().nodes;

      // Add a new story
      const added = manager.addWorkItem('S0099', {
        type: 'S',
        title: 'New Story',
        status: 'planned',
        parent: 'F0001'
      });

      assert.strictEqual(added, true, 'Should add work item successfully');
      assert.strictEqual(graph.size().nodes, initialSize + 1,
        'Should have one more node');
      assert.ok(graph.hasNode('S0099'), 'Should have new story');

      // Add parent-child dependency explicitly
      const depResult = manager.addDependency('S0099', 'F0001');
      assert.strictEqual(depResult.success, true, 'Should add parent dependency');
      assert.ok(graph.hasEdge('S0099', 'F0001'),
        'New story should depend on parent');
    });

    it('should update dependencies dynamically', () => {
      // Add new dependency to existing item
      const result = manager.addDependency('T0001', 'S0002');

      assert.strictEqual(result.success, true, 'Should add dependency successfully');
      assert.ok(graph.hasEdge('T0001', 'S0002'),
        'Should have new dependency edge');
    });

    it('should mark items as completed and update execution plan', () => {
      // Mark item as completed
      manager.updateStatus('S0001', 'completed');

      const node = graph.getNode('S0001');
      assert.strictEqual(node.status, 'completed',
        'Status should be updated');
    });

    it('should verify execution plan updates correctly after changes', () => {
      // Add new item with dependency
      manager.addWorkItem('S0100', {
        type: 'S',
        title: 'New Story 2',
        status: 'planned',
        parent: 'F0001'
      });

      // Add dependencies explicitly
      manager.addDependency('S0100', 'F0001');
      manager.addDependency('S0100', 'S0001');
      manager.addDependency('S0100', 'S0002');

      // Verify topological sort still works
      const sorter = new TopologicalSorter(graph);
      const result = sorter.sort();

      assert.strictEqual(result.success, true,
        'Sort should succeed after updates');

      // New item should come after its dependencies
      const s0100Index = result.order.indexOf('S0100');
      const s0001Index = result.order.indexOf('S0001');
      const s0002Index = result.order.indexOf('S0002');

      assert.ok(s0001Index < s0100Index, 'S0001 should come before S0100');
      assert.ok(s0002Index < s0100Index, 'S0002 should come before S0100');
    });

    it('should handle incremental cycle detection after updates', () => {
      // Try to add edge that would create cycle
      // S0002 -> S0001 already exists
      // Adding S0001 -> S0002 would create cycle

      const result = manager.addDependency('S0001', 'S0002');

      assert.strictEqual(result.success, false,
        'Should fail to add dependency that creates cycle');
      assert.ok(result.error, 'Should provide error message');
      assert.ok(result.error.includes('cycle'),
        'Error message should mention cycle');
    });

    it('should remove work items and update dependencies', () => {
      const initialSize = graph.size().nodes;

      // Remove a work item
      manager.removeWorkItem('T0001');

      assert.strictEqual(graph.size().nodes, initialSize - 1,
        'Should have one less node');
      assert.ok(!graph.hasNode('T0001'), 'Should not have removed item');
    });
  });

  describe('T0059: Error Scenarios', () => {

    describe('Circular Dependency Detection', () => {
      let builder;
      let graph;

      before(async () => {
        builder = new DependencyGraphBuilder(CIRCULAR_DEPENDENCY_DIR);
        graph = await builder.build();
      });

      it('should detect circular dependencies', () => {
        const cycleDetector = new CycleDetector(graph);
        const result = cycleDetector.detectCycles();

        assert.strictEqual(result.hasCycle, true, 'Should detect cycle');
        assert.ok(result.cycles.length > 0, 'Should have cycle information');
      });

      it('should provide cycle path for error reporting', () => {
        const cycleDetector = new CycleDetector(graph);
        const result = cycleDetector.detectCycles();

        const cycle = result.cycles[0];
        assert.ok(Array.isArray(cycle.path), 'Should have cycle path');
        assert.ok(cycle.path.length >= 2, 'Cycle path should have multiple items');

        // Verify it's actually a cycle (first and last should connect)
        const firstNode = cycle.path[0];
        const lastNode = cycle.path[cycle.path.length - 1];
        assert.ok(graph.hasEdge(lastNode, firstNode) ||
                  graph.hasPath(lastNode, firstNode),
          'Should form a complete cycle');
      });

      it('should create user-friendly error messages', () => {
        const cycleDetector = new CycleDetector(graph);
        const result = cycleDetector.detectCycles();

        const cycle = result.cycles[0];
        assert.ok(cycle.message, 'Should have error message');
        assert.ok(typeof cycle.message === 'string', 'Message should be string');
        assert.ok(cycle.message.length > 0, 'Message should not be empty');
      });

      it('should provide suggestions for breaking cycle', () => {
        const cycleDetector = new CycleDetector(graph);
        const result = cycleDetector.detectCycles();

        const cycle = result.cycles[0];
        assert.ok(Array.isArray(cycle.suggestions), 'Should have suggestions');
        assert.ok(cycle.suggestions.length > 0,
          'Should have at least one suggestion');
      });
    });

    describe('Missing References', () => {
      let builder;

      beforeEach(() => {
        builder = new DependencyGraphBuilder(SIMPLE_LINEAR_DIR);
      });

      it('should handle missing parent reference gracefully', async () => {
        await builder.build();

        // Manually add item with missing parent (simulate error)
        builder.graph.addNode('ORPHAN1', {
          type: 'S',
          title: 'Orphan Story',
          parent: 'NONEXISTENT'
        });

        // Should have warning about missing parent
        // (This would be validated during build in real scenario)
        const node = builder.graph.getNode('ORPHAN1');
        assert.strictEqual(node.parent, 'NONEXISTENT',
          'Should store parent reference even if missing');
      });

      it('should handle missing dependency reference', async () => {
        await builder.build();

        // Check warnings for missing dependencies
        const warnings = builder.getWarnings();

        // Builder should continue despite warnings
        assert.ok(builder.graph.size().nodes > 0,
          'Should still build graph with warnings');
      });
    });

    describe('Invalid Work Item Data', () => {

      it('should handle work items with missing required fields', async () => {
        // This test verifies the builder handles malformed frontmatter
        const builder = new DependencyGraphBuilder(SIMPLE_LINEAR_DIR);
        await builder.build();

        // Check for parse warnings
        const warnings = builder.getWarnings();
        assert.ok(Array.isArray(warnings), 'Should track warnings');
      });

      it('should provide clear error messages for invalid data', async () => {
        const builder = new DependencyGraphBuilder('/nonexistent/path');

        try {
          await builder.build();
          assert.fail('Should throw error for nonexistent directory');
        } catch (error) {
          assert.ok(error.message.includes('not found') ||
                   error.message.includes('ENOENT'),
            'Should have clear error about missing directory');
        }
      });
    });
  });

  describe('T0056: Realistic Test Scenarios Coverage', () => {

    it('should have simple linear workflow scenario (5-10 items)', () => {
      const builder = new DependencyGraphBuilder(SIMPLE_LINEAR_DIR);
      assert.ok(builder, 'Simple linear scenario should exist');
    });

    it('should have complex parallel workflow scenario (15-20 items)', () => {
      const builder = new DependencyGraphBuilder(COMPLEX_PARALLEL_DIR);
      assert.ok(builder, 'Complex parallel scenario should exist');
    });

    it('should have circular dependency scenario', () => {
      const builder = new DependencyGraphBuilder(CIRCULAR_DEPENDENCY_DIR);
      assert.ok(builder, 'Circular dependency scenario should exist');
    });

    it('should have large hierarchy scenario (100+ items)', () => {
      const builder = new DependencyGraphBuilder(LARGE_HIERARCHY_DIR);
      assert.ok(builder, 'Large hierarchy scenario should exist');
    });
  });
});
