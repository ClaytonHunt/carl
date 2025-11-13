/**
 * Chain Executor Tests
 *
 * Tests for the ChainExecutor class including sequential execution,
 * dependency ordering, failure propagation, rollback, and state management
 */

const ChainExecutor = require('../../plugins/carl/lib/orchestration/chain-executor');
const { ChainState, StepState } = require('../../plugins/carl/lib/orchestration/chain-executor');

describe('ChainExecutor', () => {
  let executor;

  beforeEach(() => {
    executor = new ChainExecutor({
      enableRollback: true,
      rollbackOnFailure: true,
    });
  });

  afterEach(() => {
    if (executor) {
      executor.removeAllListeners();
    }
  });

  describe('Lifecycle', () => {
    test('should start in INITIALIZING state', () => {
      expect(executor.state).toBe(ChainState.INITIALIZING);
    });

    test('should transition to READY after build', async () => {
      executor.addStep({
        id: 'step1',
        name: 'Step 1',
        execute: async () => ({ result: 'test' }),
      });

      await executor.build();
      expect(executor.state).toBe(ChainState.READY);
    });

    test('should emit built event', async () => {
      const built = jest.fn();
      executor.on('built', built);

      executor.addStep({
        id: 'step1',
        name: 'Step 1',
        execute: async () => ({ result: 'test' }),
      });

      await executor.build();

      expect(built).toHaveBeenCalled();
      expect(built.mock.calls[0][0].stepCount).toBe(1);
      expect(built.mock.calls[0][0].executionOrder).toContain('step1');
    });

    test('should transition to EXECUTING during execution', async () => {
      executor.addStep({
        id: 'step1',
        name: 'Step 1',
        execute: async () => {
          expect(executor.state).toBe(ChainState.EXECUTING);
          return { result: 'test' };
        },
      });

      await executor.build();
      await executor.execute();
    });

    test('should transition to COMPLETED on success', async () => {
      executor.addStep({
        id: 'step1',
        name: 'Step 1',
        execute: async () => ({ result: 'test' }),
      });

      await executor.build();
      const result = await executor.execute();

      expect(executor.state).toBe(ChainState.COMPLETED);
      expect(result.success).toBe(true);
    });

    test('should transition to FAILED on error', async () => {
      executor.addStep({
        id: 'step1',
        name: 'Step 1',
        priority: 'critical',
        execute: async () => {
          throw new Error('Test error');
        },
      });

      await executor.build();
      const result = await executor.execute();

      expect(executor.state).toBe(ChainState.FAILED);
      expect(result.success).toBe(false);
    });
  });

  describe('Step Management', () => {
    test('should add step', () => {
      executor.addStep({
        id: 'step1',
        name: 'Step 1',
        execute: async () => ({ result: 'test' }),
      });

      expect(executor.steps).toHaveLength(1);
      expect(executor.stepMap.has('step1')).toBe(true);
    });

    test('should add multiple steps', () => {
      executor.addSteps([
        { id: 'step1', name: 'Step 1', execute: async () => ({}) },
        { id: 'step2', name: 'Step 2', execute: async () => ({}) },
        { id: 'step3', name: 'Step 3', execute: async () => ({}) },
      ]);

      expect(executor.steps).toHaveLength(3);
    });

    test('should reject step without id', () => {
      expect(() => {
        executor.addStep({
          name: 'Step 1',
          execute: async () => ({}),
        });
      }).toThrow('Step must have an id');
    });

    test('should reject step without execute function', () => {
      expect(() => {
        executor.addStep({
          id: 'step1',
          name: 'Step 1',
        });
      }).toThrow('Step must have an execute function');
    });

    test('should reject duplicate step id', () => {
      executor.addStep({
        id: 'step1',
        name: 'Step 1',
        execute: async () => ({}),
      });

      expect(() => {
        executor.addStep({
          id: 'step1',
          name: 'Step 1 Duplicate',
          execute: async () => ({}),
        });
      }).toThrow('Step step1 already exists');
    });
  });

  describe('Dependency Ordering', () => {
    test('should execute steps in dependency order', async () => {
      const executionOrder = [];

      executor.addSteps([
        {
          id: 'step1',
          name: 'Step 1',
          execute: async () => {
            executionOrder.push('step1');
            return { step1: 'done' };
          },
        },
        {
          id: 'step2',
          name: 'Step 2',
          dependencies: ['step1'],
          execute: async () => {
            executionOrder.push('step2');
            return { step2: 'done' };
          },
        },
        {
          id: 'step3',
          name: 'Step 3',
          dependencies: ['step2'],
          execute: async () => {
            executionOrder.push('step3');
            return { step3: 'done' };
          },
        },
      ]);

      await executor.build();
      await executor.execute();

      expect(executionOrder).toEqual(['step1', 'step2', 'step3']);
    });

    test('should handle complex dependency graph', async () => {
      const executionOrder = [];

      executor.addSteps([
        {
          id: 'step1',
          name: 'Step 1',
          execute: async () => {
            executionOrder.push('step1');
          },
        },
        {
          id: 'step2',
          name: 'Step 2',
          execute: async () => {
            executionOrder.push('step2');
          },
        },
        {
          id: 'step3',
          name: 'Step 3',
          dependencies: ['step1', 'step2'],
          execute: async () => {
            executionOrder.push('step3');
          },
        },
        {
          id: 'step4',
          name: 'Step 4',
          dependencies: ['step1'],
          execute: async () => {
            executionOrder.push('step4');
          },
        },
      ]);

      await executor.build();
      await executor.execute();

      // step1 and step2 must come before step3
      expect(executionOrder.indexOf('step1')).toBeLessThan(executionOrder.indexOf('step3'));
      expect(executionOrder.indexOf('step2')).toBeLessThan(executionOrder.indexOf('step3'));
      // step1 must come before step4
      expect(executionOrder.indexOf('step1')).toBeLessThan(executionOrder.indexOf('step4'));
    });

    test('should detect circular dependencies', async () => {
      executor.addSteps([
        {
          id: 'step1',
          name: 'Step 1',
          dependencies: ['step2'],
          execute: async () => ({}),
        },
        {
          id: 'step2',
          name: 'Step 2',
          dependencies: ['step1'],
          execute: async () => ({}),
        },
      ]);

      await expect(executor.build()).rejects.toThrow('Failed to build execution order');
    });

    test('should reject unknown dependency', async () => {
      executor.addStep({
        id: 'step1',
        name: 'Step 1',
        dependencies: ['unknownStep'],
        execute: async () => ({}),
      });

      await expect(executor.build()).rejects.toThrow(
        'Step step1 depends on unknown step unknownStep'
      );
    });

    test('should respect priority ordering', async () => {
      const executionOrder = [];

      executor.addSteps([
        {
          id: 'low',
          name: 'Low Priority',
          priority: 'low',
          execute: async () => {
            executionOrder.push('low');
          },
        },
        {
          id: 'high',
          name: 'High Priority',
          priority: 'high',
          execute: async () => {
            executionOrder.push('high');
          },
        },
        {
          id: 'medium',
          name: 'Medium Priority',
          priority: 'medium',
          execute: async () => {
            executionOrder.push('medium');
          },
        },
      ]);

      await executor.build();
      await executor.execute();

      // High priority should execute before medium and low
      expect(executionOrder.indexOf('high')).toBeLessThan(executionOrder.indexOf('medium'));
      expect(executionOrder.indexOf('high')).toBeLessThan(executionOrder.indexOf('low'));
    });
  });

  describe('Data Flow Between Steps', () => {
    test('should pass context between steps', async () => {
      let step2Context;

      executor.addSteps([
        {
          id: 'step1',
          name: 'Step 1',
          execute: async context => {
            return { value1: 'from step 1', initial: context.initial };
          },
        },
        {
          id: 'step2',
          name: 'Step 2',
          dependencies: ['step1'],
          execute: async context => {
            step2Context = context;
            return { value2: 'from step 2' };
          },
        },
      ]);

      await executor.build();
      await executor.execute({ initial: 'initial value' });

      expect(step2Context).toMatchObject({
        initial: 'initial value',
        value1: 'from step 1',
      });
    });

    test('should merge results into context', async () => {
      executor.addSteps([
        {
          id: 'step1',
          name: 'Step 1',
          execute: async () => ({ a: 1 }),
        },
        {
          id: 'step2',
          name: 'Step 2',
          dependencies: ['step1'],
          execute: async () => ({ b: 2 }),
        },
        {
          id: 'step3',
          name: 'Step 3',
          dependencies: ['step2'],
          execute: async () => ({ c: 3 }),
        },
      ]);

      await executor.build();
      const result = await executor.execute();

      expect(result.context).toMatchObject({ a: 1, b: 2, c: 3 });
    });

    test('should handle non-object results', async () => {
      executor.addSteps([
        {
          id: 'step1',
          name: 'Step 1',
          execute: async () => 'string result',
        },
        {
          id: 'step2',
          name: 'Step 2',
          dependencies: ['step1'],
          execute: async () => 123,
        },
      ]);

      await executor.build();
      const result = await executor.execute();

      expect(result.success).toBe(true);
      expect(result.results.step1).toBe('string result');
      expect(result.results.step2).toBe(123);
    });
  });

  describe('Failure Propagation', () => {
    test('should propagate failure through chain', async () => {
      const step3Executed = jest.fn();

      executor.addSteps([
        {
          id: 'step1',
          name: 'Step 1',
          execute: async () => ({}),
        },
        {
          id: 'step2',
          name: 'Step 2',
          priority: 'critical',
          dependencies: ['step1'],
          execute: async () => {
            throw new Error('Step 2 failed');
          },
        },
        {
          id: 'step3',
          name: 'Step 3',
          dependencies: ['step2'],
          execute: step3Executed,
        },
      ]);

      await executor.build();
      const result = await executor.execute();

      expect(result.success).toBe(false);
      expect(step3Executed).not.toHaveBeenCalled();
      expect(executor.stepStates.get('step1')).toBe(StepState.COMPLETED);
      expect(executor.stepStates.get('step2')).toBe(StepState.FAILED);
      expect(executor.stepStates.get('step3')).toBe(StepState.PENDING);
    });

    test('should continue on non-critical failure if configured', async () => {
      const nonCriticalExecutor = new ChainExecutor({
        continueOnNonCriticalFailure: true,
        rollbackOnFailure: false,
      });

      nonCriticalExecutor.addSteps([
        {
          id: 'step1',
          name: 'Step 1',
          execute: async () => ({}),
        },
        {
          id: 'step2',
          name: 'Step 2',
          priority: 'medium',
          canSkip: true,
          dependencies: ['step1'],
          execute: async () => {
            throw new Error('Step 2 failed');
          },
        },
        {
          id: 'step3',
          name: 'Step 3',
          dependencies: ['step1'], // Not dependent on step2
          execute: async () => ({ step3: 'completed' }),
        },
      ]);

      await nonCriticalExecutor.build();
      const result = await nonCriticalExecutor.execute();

      expect(nonCriticalExecutor.stepStates.get('step1')).toBe(StepState.COMPLETED);
      expect(nonCriticalExecutor.stepStates.get('step2')).toBe(StepState.SKIPPED);
      expect(nonCriticalExecutor.stepStates.get('step3')).toBe(StepState.COMPLETED);
    });

    test('should emit step:failed event', async () => {
      const failed = jest.fn();
      executor.on('step:failed', failed);

      executor.addStep({
        id: 'step1',
        name: 'Step 1',
        priority: 'critical',
        execute: async () => {
          throw new Error('Test error');
        },
      });

      await executor.build();
      await executor.execute();

      expect(failed).toHaveBeenCalled();
      expect(failed.mock.calls[0][0]).toMatchObject({
        stepId: 'step1',
        stepName: 'Step 1',
        error: 'Test error',
      });
    });

    test('should handle timeout', async () => {
      executor.addStep({
        id: 'step1',
        name: 'Step 1',
        priority: 'critical',
        timeout: 100,
        execute: async () => {
          await new Promise(resolve => setTimeout(resolve, 500));
          return {};
        },
      });

      await executor.build();
      const result = await executor.execute();

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    });
  });

  describe('Rollback and Compensation', () => {
    test('should rollback completed steps on failure', async () => {
      const rollbacks = [];

      executor.addSteps([
        {
          id: 'step1',
          name: 'Step 1',
          execute: async () => ({ step1: 'done' }),
          rollback: async () => {
            rollbacks.push('step1');
          },
        },
        {
          id: 'step2',
          name: 'Step 2',
          dependencies: ['step1'],
          execute: async () => ({ step2: 'done' }),
          rollback: async () => {
            rollbacks.push('step2');
          },
        },
        {
          id: 'step3',
          name: 'Step 3',
          priority: 'critical',
          dependencies: ['step2'],
          execute: async () => {
            throw new Error('Step 3 failed');
          },
          rollback: async () => {
            rollbacks.push('step3');
          },
        },
      ]);

      await executor.build();
      await executor.execute();

      // Should rollback step2 and step1 in reverse order
      expect(rollbacks).toEqual(['step2', 'step1']);
      expect(executor.stepStates.get('step1')).toBe(StepState.ROLLED_BACK);
      expect(executor.stepStates.get('step2')).toBe(StepState.ROLLED_BACK);
    });

    test('should emit rollback events', async () => {
      const rollbackStarted = jest.fn();
      const rollbackCompleted = jest.fn();

      executor.on('rollback:started', rollbackStarted);
      executor.on('rollback:completed', rollbackCompleted);

      executor.addSteps([
        {
          id: 'step1',
          name: 'Step 1',
          execute: async () => ({}),
          rollback: async () => {},
        },
        {
          id: 'step2',
          name: 'Step 2',
          priority: 'critical',
          dependencies: ['step1'],
          execute: async () => {
            throw new Error('Failure');
          },
        },
      ]);

      await executor.build();
      await executor.execute();

      expect(rollbackStarted).toHaveBeenCalled();
      expect(rollbackCompleted).toHaveBeenCalled();
    });

    test('should handle rollback errors gracefully', async () => {
      const rollbackError = jest.fn();
      executor.on('rollback:error', rollbackError);

      executor.addSteps([
        {
          id: 'step1',
          name: 'Step 1',
          execute: async () => ({}),
          rollback: async () => {
            throw new Error('Rollback failed');
          },
        },
        {
          id: 'step2',
          name: 'Step 2',
          priority: 'critical',
          dependencies: ['step1'],
          execute: async () => {
            throw new Error('Failure');
          },
        },
      ]);

      await executor.build();
      await executor.execute();

      expect(rollbackError).toHaveBeenCalled();
      expect(rollbackError.mock.calls[0][0]).toMatchObject({
        stepId: 'step1',
        error: 'Rollback failed',
      });
    });

    test('should skip rollback if not enabled', async () => {
      const rollbackCalled = jest.fn();
      const noRollbackExecutor = new ChainExecutor({
        enableRollback: false,
      });

      noRollbackExecutor.addSteps([
        {
          id: 'step1',
          name: 'Step 1',
          execute: async () => ({}),
          rollback: rollbackCalled,
        },
        {
          id: 'step2',
          name: 'Step 2',
          priority: 'critical',
          dependencies: ['step1'],
          execute: async () => {
            throw new Error('Failure');
          },
        },
      ]);

      await noRollbackExecutor.build();
      await noRollbackExecutor.execute();

      expect(rollbackCalled).not.toHaveBeenCalled();
    });
  });

  describe('Pause and Resume', () => {
    test('should error on pause if not executing', async () => {
      executor.addStep({
        id: 'step1',
        name: 'Step 1',
        execute: async () => ({}),
      });

      await executor.build();

      await expect(executor.pause()).rejects.toThrow('Cannot pause chain in state:');
    });

    test('should error on resume if not paused', async () => {
      executor.addStep({
        id: 'step1',
        name: 'Step 1',
        execute: async () => ({}),
      });

      await executor.build();

      await expect(executor.resume()).rejects.toThrow('Cannot resume chain in state:');
    });
  });

  describe('Cancellation', () => {
    test('should error on cancel if not executing or paused', async () => {
      executor.addStep({
        id: 'step1',
        name: 'Step 1',
        execute: async () => ({}),
      });

      await executor.build();

      await expect(executor.cancel()).rejects.toThrow('Cannot cancel chain in state:');
    });
  });

  describe('Status and History', () => {
    test('should track execution status', async () => {
      executor.addSteps([
        {
          id: 'step1',
          name: 'Step 1',
          execute: async () => ({}),
        },
        {
          id: 'step2',
          name: 'Step 2',
          dependencies: ['step1'],
          execute: async () => ({}),
        },
      ]);

      await executor.build();

      const statusBefore = executor.getStatus();
      expect(statusBefore.completedSteps).toBe(0);
      expect(statusBefore.progress).toBe(0);

      await executor.execute();

      const statusAfter = executor.getStatus();
      expect(statusAfter.completedSteps).toBe(2);
      expect(statusAfter.progress).toBe(100);
      expect(statusAfter.state).toBe(ChainState.COMPLETED);
    });

    test('should get step details', async () => {
      executor.addStep({
        id: 'step1',
        name: 'Step 1',
        priority: 'high',
        execute: async () => ({ result: 'test' }),
      });

      await executor.build();
      await executor.execute();

      const details = executor.getStepDetails('step1');

      expect(details).toMatchObject({
        id: 'step1',
        name: 'Step 1',
        state: StepState.COMPLETED,
        result: { result: 'test' },
        priority: 'high',
      });
    });

    test('should track execution history', async () => {
      executor.addSteps([
        {
          id: 'step1',
          name: 'Step 1',
          execute: async () => ({}),
        },
        {
          id: 'step2',
          name: 'Step 2',
          dependencies: ['step1'],
          execute: async () => ({}),
        },
      ]);

      await executor.build();
      await executor.execute();

      const history = executor.getHistory();

      expect(history.length).toBeGreaterThan(0);
      expect(history.some(e => e.event === 'step:started')).toBe(true);
      expect(history.some(e => e.event === 'step:completed')).toBe(true);
    });
  });

  describe('Progress Events', () => {
    test('should emit step:started events', async () => {
      const started = jest.fn();
      executor.on('step:started', started);

      executor.addStep({
        id: 'step1',
        name: 'Step 1',
        execute: async () => ({}),
      });

      await executor.build();
      await executor.execute();

      expect(started).toHaveBeenCalled();
      expect(started.mock.calls[0][0]).toMatchObject({
        stepId: 'step1',
        stepName: 'Step 1',
      });
    });

    test('should emit step:completed events', async () => {
      const completed = jest.fn();
      executor.on('step:completed', completed);

      executor.addStep({
        id: 'step1',
        name: 'Step 1',
        execute: async () => ({ result: 'test' }),
      });

      await executor.build();
      await executor.execute();

      expect(completed).toHaveBeenCalled();
      expect(completed.mock.calls[0][0]).toMatchObject({
        stepId: 'step1',
        result: { result: 'test' },
      });
    });

    test('should report progress percentage', async () => {
      const progresses = [];

      executor.on('step:started', data => {
        progresses.push(data.progress);
      });

      executor.addSteps([
        { id: 'step1', name: 'Step 1', execute: async () => ({}) },
        { id: 'step2', name: 'Step 2', dependencies: ['step1'], execute: async () => ({}) },
        { id: 'step3', name: 'Step 3', dependencies: ['step2'], execute: async () => ({}) },
      ]);

      await executor.build();
      await executor.execute();

      expect(progresses).toHaveLength(3);
      expect(progresses[0]).toBeCloseTo(33.33, 1);
      expect(progresses[1]).toBeCloseTo(66.67, 1);
      expect(progresses[2]).toBe(100);
    });
  });
});
