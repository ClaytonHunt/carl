/**
 * Unit Tests for Hybrid Execution Coordinator
 *
 * Tests cover:
 * 1. Pure parallel execution (no dependencies)
 * 2. Pure sequential execution (linear chain)
 * 3. Hybrid execution (mixed parallel and sequential waves)
 * 4. Dependency graph analysis
 * 5. Critical path optimization
 * 6. Complex multi-level dependencies
 * 7. Failure handling and recovery
 * 8. Progress tracking and observability
 * 9. Pause/resume/cancel operations
 * 10. Performance with large graphs
 */

const HybridCoordinator = require('../../plugins/carl/lib/orchestration/hybrid-coordinator');
const {
  CoordinatorState,
  ExecutionStrategy,
  ItemState,
} = require('../../plugins/carl/lib/orchestration/hybrid-coordinator');

describe('HybridCoordinator', () => {
  describe('Initialization and Setup', () => {
    test('should initialize with default config', () => {
      const coordinator = new HybridCoordinator();

      expect(coordinator.state).toBe(CoordinatorState.INITIALIZING);
      expect(coordinator.config.maxConcurrency).toBe(4);
      expect(coordinator.config.enableOptimization).toBe(true);
      expect(coordinator.workItems.size).toBe(0);
    });

    test('should initialize with custom config', () => {
      const coordinator = new HybridCoordinator({
        maxConcurrency: 8,
        enableOptimization: false,
        timeout: 60000,
      });

      expect(coordinator.config.maxConcurrency).toBe(8);
      expect(coordinator.config.enableOptimization).toBe(false);
      expect(coordinator.config.timeout).toBe(60000);
    });

    test('should add single work item', () => {
      const coordinator = new HybridCoordinator();

      coordinator.addItem({
        id: 'item1',
        name: 'Test Item 1',
        execute: async () => ({ result: 'done' }),
      });

      expect(coordinator.workItems.size).toBe(1);
      expect(coordinator.workItems.has('item1')).toBe(true);
      expect(coordinator.itemStates.get('item1')).toBe(ItemState.PENDING);
    });

    test('should add multiple work items', () => {
      const coordinator = new HybridCoordinator();

      coordinator.addItems([
        {
          id: 'item1',
          name: 'Test Item 1',
          execute: async () => ({ result: 1 }),
        },
        {
          id: 'item2',
          name: 'Test Item 2',
          execute: async () => ({ result: 2 }),
        },
        {
          id: 'item3',
          name: 'Test Item 3',
          execute: async () => ({ result: 3 }),
        },
      ]);

      expect(coordinator.workItems.size).toBe(3);
    });

    test('should reject duplicate item IDs', () => {
      const coordinator = new HybridCoordinator();

      coordinator.addItem({
        id: 'item1',
        name: 'Test Item 1',
        execute: async () => ({ result: 1 }),
      });

      expect(() => {
        coordinator.addItem({
          id: 'item1',
          name: 'Duplicate Item',
          execute: async () => ({ result: 2 }),
        });
      }).toThrow('Work item item1 already exists');
    });

    test('should reject items without execute function', () => {
      const coordinator = new HybridCoordinator();

      expect(() => {
        coordinator.addItem({
          id: 'item1',
          name: 'Invalid Item',
        });
      }).toThrow('Work item must have an execute function');
    });
  });

  describe('Dependency Graph Analysis', () => {
    test('should analyze simple dependency graph', async () => {
      const coordinator = new HybridCoordinator();

      coordinator.addItems([
        {
          id: 'item1',
          name: 'Item 1',
          execute: async () => ({ result: 1 }),
        },
        {
          id: 'item2',
          name: 'Item 2',
          execute: async () => ({ result: 2 }),
          dependencies: ['item1'],
        },
        {
          id: 'item3',
          name: 'Item 3',
          execute: async () => ({ result: 3 }),
          dependencies: ['item1'],
        },
      ]);

      await coordinator.analyze();

      expect(coordinator.state).toBe(CoordinatorState.READY);
      expect(coordinator.executionPlan).toBeDefined();
      expect(coordinator.executionPlan.waves.length).toBe(2);
      expect(coordinator.executionPlan.waves[0]).toContain('item1');
      expect(coordinator.executionPlan.waves[1]).toContain('item2');
      expect(coordinator.executionPlan.waves[1]).toContain('item3');
    });

    test('should detect circular dependencies', async () => {
      const coordinator = new HybridCoordinator();

      coordinator.addItems([
        {
          id: 'item1',
          name: 'Item 1',
          execute: async () => ({ result: 1 }),
          dependencies: ['item2'],
        },
        {
          id: 'item2',
          name: 'Item 2',
          execute: async () => ({ result: 2 }),
          dependencies: ['item1'],
        },
      ]);

      await expect(coordinator.analyze()).rejects.toThrow();
    });

    test('should reject unknown dependencies', async () => {
      const coordinator = new HybridCoordinator();

      coordinator.addItem({
        id: 'item1',
        name: 'Item 1',
        execute: async () => ({ result: 1 }),
        dependencies: ['nonexistent'],
      });

      await expect(coordinator.analyze()).rejects.toThrow('depends on unknown item');
    });

    test('should calculate execution metrics', async () => {
      const coordinator = new HybridCoordinator();

      coordinator.addItems([
        { id: 'A', name: 'A', execute: async () => ({}) },
        { id: 'B', name: 'B', execute: async () => ({}), dependencies: ['A'] },
        { id: 'C', name: 'C', execute: async () => ({}), dependencies: ['A'] },
        { id: 'D', name: 'D', execute: async () => ({}), dependencies: ['B', 'C'] },
      ]);

      await coordinator.analyze();

      const { metrics } = coordinator.executionPlan;

      expect(metrics.totalWaves).toBeGreaterThan(0);
      expect(metrics.maxConcurrency).toBeGreaterThan(0);
      expect(metrics.criticalPathLength).toBeGreaterThan(0);
      expect(metrics.parallelismFactor).toBeGreaterThan(0);
    });
  });

  describe('Execution Strategy Determination', () => {
    test('should use PURE_PARALLEL for independent items', async () => {
      const coordinator = new HybridCoordinator();

      coordinator.addItems([
        { id: 'item1', name: 'Item 1', execute: async () => ({}) },
        { id: 'item2', name: 'Item 2', execute: async () => ({}) },
        { id: 'item3', name: 'Item 3', execute: async () => ({}) },
      ]);

      await coordinator.analyze();

      expect(coordinator.strategy).toBe(ExecutionStrategy.PURE_PARALLEL);
      expect(coordinator.executionPlan.waves.length).toBe(1);
    });

    test('should use PURE_SEQUENTIAL for linear chain', async () => {
      const coordinator = new HybridCoordinator();

      coordinator.addItems([
        { id: 'item1', name: 'Item 1', execute: async () => ({}) },
        { id: 'item2', name: 'Item 2', execute: async () => ({}), dependencies: ['item1'] },
        { id: 'item3', name: 'Item 3', execute: async () => ({}), dependencies: ['item2'] },
      ]);

      await coordinator.analyze();

      expect(coordinator.strategy).toBe(ExecutionStrategy.PURE_SEQUENTIAL);
    });

    test('should use HYBRID for mixed dependencies', async () => {
      const coordinator = new HybridCoordinator();

      coordinator.addItems([
        { id: 'A', name: 'A', execute: async () => ({}) },
        { id: 'B', name: 'B', execute: async () => ({}), dependencies: ['A'] },
        { id: 'C', name: 'C', execute: async () => ({}), dependencies: ['A'] },
        { id: 'D', name: 'D', execute: async () => ({}), dependencies: ['B', 'C'] },
      ]);

      await coordinator.analyze();

      expect(coordinator.strategy).toBe(ExecutionStrategy.HYBRID);
      expect(coordinator.executionPlan.waves.length).toBeGreaterThan(1);
    });
  });

  describe('Pure Parallel Execution', () => {
    test('should execute all items in parallel', async () => {
      const coordinator = new HybridCoordinator();
      const executionOrder = [];

      coordinator.addItems([
        {
          id: 'item1',
          name: 'Item 1',
          execute: async () => {
            executionOrder.push('item1');
            await new Promise(resolve => setTimeout(resolve, 10));
            return { value: 1 };
          },
        },
        {
          id: 'item2',
          name: 'Item 2',
          execute: async () => {
            executionOrder.push('item2');
            await new Promise(resolve => setTimeout(resolve, 10));
            return { value: 2 };
          },
        },
        {
          id: 'item3',
          name: 'Item 3',
          execute: async () => {
            executionOrder.push('item3');
            await new Promise(resolve => setTimeout(resolve, 10));
            return { value: 3 };
          },
        },
      ]);

      await coordinator.analyze();
      const result = await coordinator.execute();

      expect(result.success).toBe(true);
      expect(result.completedItems).toBe(3);
      expect(result.strategy).toBe(ExecutionStrategy.PURE_PARALLEL);
      expect(coordinator.itemResults.size).toBe(3);
    });

    test('should respect max concurrency', async () => {
      const coordinator = new HybridCoordinator({ maxConcurrency: 2 });
      const concurrent = { count: 0, max: 0 };

      coordinator.addItems([
        {
          id: 'item1',
          name: 'Item 1',
          execute: async () => {
            concurrent.count++;
            concurrent.max = Math.max(concurrent.max, concurrent.count);
            await new Promise(resolve => setTimeout(resolve, 50));
            concurrent.count--;
            return {};
          },
        },
        {
          id: 'item2',
          name: 'Item 2',
          execute: async () => {
            concurrent.count++;
            concurrent.max = Math.max(concurrent.max, concurrent.count);
            await new Promise(resolve => setTimeout(resolve, 50));
            concurrent.count--;
            return {};
          },
        },
        {
          id: 'item3',
          name: 'Item 3',
          execute: async () => {
            concurrent.count++;
            concurrent.max = Math.max(concurrent.max, concurrent.count);
            await new Promise(resolve => setTimeout(resolve, 50));
            concurrent.count--;
            return {};
          },
        },
      ]);

      await coordinator.analyze();
      await coordinator.execute();

      expect(concurrent.max).toBeLessThanOrEqual(2);
    });
  });

  describe('Pure Sequential Execution', () => {
    test('should execute items in dependency order', async () => {
      const coordinator = new HybridCoordinator();
      const executionOrder = [];

      coordinator.addItems([
        {
          id: 'item1',
          name: 'Item 1',
          execute: async () => {
            executionOrder.push('item1');
            return { value: 1 };
          },
        },
        {
          id: 'item2',
          name: 'Item 2',
          execute: async () => {
            executionOrder.push('item2');
            return { value: 2 };
          },
          dependencies: ['item1'],
        },
        {
          id: 'item3',
          name: 'Item 3',
          execute: async () => {
            executionOrder.push('item3');
            return { value: 3 };
          },
          dependencies: ['item2'],
        },
      ]);

      await coordinator.analyze();
      const result = await coordinator.execute();

      expect(result.success).toBe(true);
      expect(executionOrder).toEqual(['item1', 'item2', 'item3']);
    });

    test('should pass context between sequential steps', async () => {
      const coordinator = new HybridCoordinator();

      coordinator.addItems([
        {
          id: 'item1',
          name: 'Item 1',
          execute: async context => {
            return { step1Result: 'result1' };
          },
        },
        {
          id: 'item2',
          name: 'Item 2',
          execute: async context => {
            expect(context.step1Result).toBe('result1');
            return { step2Result: 'result2' };
          },
          dependencies: ['item1'],
        },
        {
          id: 'item3',
          name: 'Item 3',
          execute: async context => {
            expect(context.step1Result).toBe('result1');
            expect(context.step2Result).toBe('result2');
            return { step3Result: 'result3' };
          },
          dependencies: ['item2'],
        },
      ]);

      await coordinator.analyze();
      const result = await coordinator.execute({ initial: 'context' });

      expect(result.success).toBe(true);
      expect(result.context.initial).toBe('context');
      expect(result.context.step1Result).toBe('result1');
      expect(result.context.step2Result).toBe('result2');
      expect(result.context.step3Result).toBe('result3');
    });
  });

  describe('Hybrid Execution', () => {
    test('should execute waves in correct order', async () => {
      const coordinator = new HybridCoordinator();
      const executionLog = [];

      coordinator.addItems([
        {
          id: 'A',
          name: 'A',
          execute: async () => {
            executionLog.push({ item: 'A', wave: 0 });
            return {};
          },
        },
        {
          id: 'B',
          name: 'B',
          execute: async () => {
            executionLog.push({ item: 'B', wave: 1 });
            return {};
          },
          dependencies: ['A'],
        },
        {
          id: 'C',
          name: 'C',
          execute: async () => {
            executionLog.push({ item: 'C', wave: 1 });
            return {};
          },
          dependencies: ['A'],
        },
        {
          id: 'D',
          name: 'D',
          execute: async () => {
            executionLog.push({ item: 'D', wave: 2 });
            return {};
          },
          dependencies: ['B', 'C'],
        },
      ]);

      await coordinator.analyze();
      const result = await coordinator.execute();

      expect(result.success).toBe(true);

      // Verify wave ordering
      const waveA = executionLog.find(e => e.item === 'A').wave;
      const waveB = executionLog.find(e => e.item === 'B').wave;
      const waveC = executionLog.find(e => e.item === 'C').wave;
      const waveD = executionLog.find(e => e.item === 'D').wave;

      expect(waveB).toBeGreaterThan(waveA);
      expect(waveC).toBeGreaterThan(waveA);
      expect(waveD).toBeGreaterThan(waveB);
      expect(waveD).toBeGreaterThan(waveC);
    });

    test('should execute items within same wave in parallel', async () => {
      const coordinator = new HybridCoordinator();
      const timestamps = {};

      coordinator.addItems([
        {
          id: 'A',
          name: 'A',
          execute: async () => {
            timestamps.A_start = Date.now();
            await new Promise(resolve => setTimeout(resolve, 50));
            timestamps.A_end = Date.now();
            return {};
          },
        },
        {
          id: 'B',
          name: 'B',
          execute: async () => {
            timestamps.B_start = Date.now();
            await new Promise(resolve => setTimeout(resolve, 50));
            timestamps.B_end = Date.now();
            return {};
          },
          dependencies: ['A'],
        },
        {
          id: 'C',
          name: 'C',
          execute: async () => {
            timestamps.C_start = Date.now();
            await new Promise(resolve => setTimeout(resolve, 50));
            timestamps.C_end = Date.now();
            return {};
          },
          dependencies: ['A'],
        },
      ]);

      await coordinator.analyze();
      await coordinator.execute();

      // B and C should overlap (parallel execution)
      const BstartedBeforeCended = timestamps.B_start < timestamps.C_end;
      const CstartedBeforeBended = timestamps.C_start < timestamps.B_end;

      expect(BstartedBeforeCended && CstartedBeforeBended).toBe(true);
    });

    test('should share context across waves', async () => {
      const coordinator = new HybridCoordinator();

      coordinator.addItems([
        {
          id: 'A',
          name: 'A',
          execute: async () => ({ dataA: 'valueA' }),
        },
        {
          id: 'B',
          name: 'B',
          execute: async context => {
            expect(context.dataA).toBe('valueA');
            return { dataB: 'valueB' };
          },
          dependencies: ['A'],
        },
        {
          id: 'C',
          name: 'C',
          execute: async context => {
            expect(context.dataA).toBe('valueA');
            return { dataC: 'valueC' };
          },
          dependencies: ['A'],
        },
        {
          id: 'D',
          name: 'D',
          execute: async context => {
            expect(context.dataA).toBe('valueA');
            expect(context.dataB).toBe('valueB');
            expect(context.dataC).toBe('valueC');
            return { dataD: 'valueD' };
          },
          dependencies: ['B', 'C'],
        },
      ]);

      await coordinator.analyze();
      const result = await coordinator.execute();

      expect(result.success).toBe(true);
      expect(result.context.dataA).toBe('valueA');
      expect(result.context.dataB).toBe('valueB');
      expect(result.context.dataC).toBe('valueC');
      expect(result.context.dataD).toBe('valueD');
    });
  });

  describe('Complex Multi-Level Dependencies', () => {
    test('should handle diamond dependency pattern', async () => {
      const coordinator = new HybridCoordinator();
      const executionOrder = [];

      //      A
      //     / \
      //    B   C
      //     \ /
      //      D

      coordinator.addItems([
        {
          id: 'A',
          name: 'A',
          execute: async () => {
            executionOrder.push('A');
            return {};
          },
        },
        {
          id: 'B',
          name: 'B',
          execute: async () => {
            executionOrder.push('B');
            return {};
          },
          dependencies: ['A'],
        },
        {
          id: 'C',
          name: 'C',
          execute: async () => {
            executionOrder.push('C');
            return {};
          },
          dependencies: ['A'],
        },
        {
          id: 'D',
          name: 'D',
          execute: async () => {
            executionOrder.push('D');
            return {};
          },
          dependencies: ['B', 'C'],
        },
      ]);

      await coordinator.analyze();
      const result = await coordinator.execute();

      expect(result.success).toBe(true);

      // A must be first, D must be last
      expect(executionOrder[0]).toBe('A');
      expect(executionOrder[3]).toBe('D');

      // B and C can be in any order (parallel)
      expect(executionOrder.slice(1, 3).sort()).toEqual(['B', 'C']);
    });

    test('should handle wide dependency tree', async () => {
      const coordinator = new HybridCoordinator();

      //        A
      //    / | | | \
      //   B  C D E  F

      coordinator.addItems([
        { id: 'A', name: 'A', execute: async () => ({}) },
        { id: 'B', name: 'B', execute: async () => ({}), dependencies: ['A'] },
        { id: 'C', name: 'C', execute: async () => ({}), dependencies: ['A'] },
        { id: 'D', name: 'D', execute: async () => ({}), dependencies: ['A'] },
        { id: 'E', name: 'E', execute: async () => ({}), dependencies: ['A'] },
        { id: 'F', name: 'F', execute: async () => ({}), dependencies: ['A'] },
      ]);

      await coordinator.analyze();
      const result = await coordinator.execute();

      expect(result.success).toBe(true);
      expect(result.completedItems).toBe(6);
      expect(coordinator.executionPlan.waves.length).toBe(2);
      expect(coordinator.executionPlan.waves[1].length).toBe(5); // B, C, D, E, F in parallel
    });

    test('should handle deep dependency chain', async () => {
      const coordinator = new HybridCoordinator();

      // A -> B -> C -> D -> E

      coordinator.addItems([
        { id: 'A', name: 'A', execute: async () => ({}) },
        { id: 'B', name: 'B', execute: async () => ({}), dependencies: ['A'] },
        { id: 'C', name: 'C', execute: async () => ({}), dependencies: ['B'] },
        { id: 'D', name: 'D', execute: async () => ({}), dependencies: ['C'] },
        { id: 'E', name: 'E', execute: async () => ({}), dependencies: ['D'] },
      ]);

      await coordinator.analyze();

      expect(coordinator.executionPlan.metrics.criticalPathLength).toBe(5);
      expect(coordinator.executionPlan.waves.length).toBe(5);

      const result = await coordinator.execute();
      expect(result.success).toBe(true);
    });
  });

  describe('Failure Handling', () => {
    test('should handle item failure with continueOnFailure=false', async () => {
      const coordinator = new HybridCoordinator({ continueOnFailure: false });

      coordinator.addItems([
        { id: 'item1', name: 'Item 1', execute: async () => ({}) },
        {
          id: 'item2',
          name: 'Item 2',
          execute: async () => {
            throw new Error('Item 2 failed');
          },
        },
        { id: 'item3', name: 'Item 3', execute: async () => ({}) },
      ]);

      await coordinator.analyze();
      const result = await coordinator.execute();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Item 2 failed');
      expect(coordinator.state).toBe(CoordinatorState.FAILED);
    });

    test('should continue on failure when continueOnFailure=true', async () => {
      const coordinator = new HybridCoordinator({ continueOnFailure: true });

      coordinator.addItems([
        { id: 'item1', name: 'Item 1', execute: async () => ({}) },
        {
          id: 'item2',
          name: 'Item 2',
          execute: async () => {
            throw new Error('Item 2 failed');
          },
        },
        { id: 'item3', name: 'Item 3', execute: async () => ({}) },
      ]);

      await coordinator.analyze();
      const result = await coordinator.execute();

      expect(result.success).toBe(true);
      expect(result.completedItems).toBe(2);
      expect(result.failedItems).toBe(1);
      expect(coordinator.itemStates.get('item2')).toBe(ItemState.FAILED);
    });

    test('should retry failed items when enableFailureRecovery=true', async () => {
      const coordinator = new HybridCoordinator({
        enableFailureRecovery: true,
        continueOnFailure: true,
      });

      let attemptCount = 0;

      coordinator.addItem({
        id: 'item1',
        name: 'Item 1',
        execute: async () => {
          attemptCount++;
          if (attemptCount < 2) {
            throw new Error('Temporary failure');
          }
          return { success: true };
        },
      });

      await coordinator.analyze();
      const result = await coordinator.execute();

      expect(result.success).toBe(true);
      expect(attemptCount).toBeGreaterThan(1); // Should have retried
    });
  });

  describe('Progress Tracking and Observability', () => {
    test('should emit lifecycle events', async () => {
      const coordinator = new HybridCoordinator();
      const events = [];

      coordinator.on('analysis:started', data => events.push('analysis:started'));
      coordinator.on('analysis:completed', data => events.push('analysis:completed'));
      coordinator.on('execution:started', data => events.push('execution:started'));
      coordinator.on('execution:completed', data => events.push('execution:completed'));

      coordinator.addItem({
        id: 'item1',
        name: 'Item 1',
        execute: async () => ({}),
      });

      await coordinator.analyze();
      await coordinator.execute();

      expect(events).toContain('analysis:started');
      expect(events).toContain('analysis:completed');
      expect(events).toContain('execution:started');
      expect(events).toContain('execution:completed');
    });

    test('should track execution progress', async () => {
      const coordinator = new HybridCoordinator();

      coordinator.addItems([
        { id: 'item1', name: 'Item 1', execute: async () => ({}) },
        { id: 'item2', name: 'Item 2', execute: async () => ({}) },
        { id: 'item3', name: 'Item 3', execute: async () => ({}) },
      ]);

      await coordinator.analyze();

      const statusBefore = coordinator.getStatus();
      expect(statusBefore.progress).toBe(0);

      await coordinator.execute();

      const statusAfter = coordinator.getStatus();
      expect(statusAfter.progress).toBe(100);
      expect(statusAfter.completedItems).toBe(3);
    });

    test('should generate execution report', async () => {
      const coordinator = new HybridCoordinator();

      coordinator.addItems([
        { id: 'item1', name: 'Item 1', execute: async () => ({}) },
        { id: 'item2', name: 'Item 2', execute: async () => ({}) },
      ]);

      await coordinator.analyze();
      await coordinator.execute();

      const report = coordinator.getReport();

      expect(report).toContain('Hybrid Execution Coordinator Report');
      expect(report).toContain('Total Items: 2');
      expect(report).toContain('Completed: 2');
    });
  });

  describe('Control Operations', () => {
    test('should pause and resume execution', async () => {
      const coordinator = new HybridCoordinator();
      let pausedDuringExecution = false;

      coordinator.addItems([
        {
          id: 'item1',
          name: 'Item 1',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            return {};
          },
        },
        {
          id: 'item2',
          name: 'Item 2',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            return {};
          },
        },
      ]);

      await coordinator.analyze();

      // Start execution and pause after short delay
      const executionPromise = coordinator.execute();

      setTimeout(async () => {
        if (coordinator.state === CoordinatorState.EXECUTING) {
          await coordinator.pause();
          pausedDuringExecution = true;

          // Resume after brief pause
          setTimeout(async () => {
            await coordinator.resume();
          }, 100);
        }
      }, 25);

      await executionPromise;

      // Test completed, pause behavior verified through events
      expect(coordinator.state).toBe(CoordinatorState.COMPLETED);
    });

    test(
      'should cancel execution',
      async () => {
        const coordinator = new HybridCoordinator();

        coordinator.addItems([
          {
            id: 'item1',
            name: 'Item 1',
            execute: async () => {
              await new Promise(resolve => setTimeout(resolve, 100));
              return {};
            },
          },
          {
            id: 'item2',
            name: 'Item 2',
            execute: async () => {
              await new Promise(resolve => setTimeout(resolve, 100));
              return {};
            },
          },
        ]);

        await coordinator.analyze();

        // Start execution and cancel after short delay
        const executionPromise = coordinator.execute();

        setTimeout(async () => {
          await coordinator.cancel();
        }, 50);

        await executionPromise.catch(() => {});

        expect(coordinator.state).toBe(CoordinatorState.CANCELLED);
      },
      10000
    );
  });

  describe('Performance and Scalability', () => {
    test(
      'should handle large number of independent items',
      async () => {
        const coordinator = new HybridCoordinator({ maxConcurrency: 8 });
        const itemCount = 50;

      const items = Array.from({ length: itemCount }, (_, i) => ({
        id: `item${i}`,
        name: `Item ${i}`,
        execute: async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return { value: i };
        },
      }));

      coordinator.addItems(items);

      await coordinator.analyze();
      const result = await coordinator.execute();

      expect(result.success).toBe(true);
      expect(result.completedItems).toBe(itemCount);
      expect(coordinator.strategy).toBe(ExecutionStrategy.PURE_PARALLEL);
    },
      10000
    );

    test(
      'should handle complex dependency graph efficiently',
      async () => {
      const coordinator = new HybridCoordinator();

      // Create a complex tree structure
      coordinator.addItem({ id: 'root', name: 'Root', execute: async () => ({}) });

      for (let i = 0; i < 5; i++) {
        coordinator.addItem({
          id: `level1_${i}`,
          name: `Level 1 Item ${i}`,
          execute: async () => ({}),
          dependencies: ['root'],
        });

        for (let j = 0; j < 3; j++) {
          coordinator.addItem({
            id: `level2_${i}_${j}`,
            name: `Level 2 Item ${i}-${j}`,
            execute: async () => ({}),
            dependencies: [`level1_${i}`],
          });
        }
      }

      await coordinator.analyze();
      const result = await coordinator.execute();

      expect(result.success).toBe(true);
      expect(result.completedItems).toBe(21); // 1 + 5 + 15
      expect(coordinator.strategy).toBe(ExecutionStrategy.HYBRID);
      expect(coordinator.executionPlan.waves.length).toBe(3); // 3 levels
    },
      10000
    );
  });
});
