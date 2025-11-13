/**
 * Worker Tests
 *
 * Tests for the Worker class including lifecycle, execution, and error handling
 */

const Worker = require('../../plugins/carl/lib/orchestration/worker');
const { WorkerState } = require('../../plugins/carl/lib/orchestration/worker');

describe('Worker', () => {
  let worker;
  let mockPool;

  beforeEach(() => {
    mockPool = {
      id: 'pool-1',
    };
    worker = new Worker(1, mockPool);
  });

  afterEach(() => {
    worker.removeAllListeners();
  });

  describe('Lifecycle', () => {
    test('should start in SPAWNING state', () => {
      expect(worker.getState()).toBe(WorkerState.SPAWNING);
    });

    test('should transition to IDLE after spawn', async () => {
      await worker.spawn();
      expect(worker.getState()).toBe(WorkerState.IDLE);
    });

    test('should emit spawned event', async () => {
      const spawned = jest.fn();
      worker.on('spawned', spawned);

      await worker.spawn();

      expect(spawned).toHaveBeenCalledWith({ workerId: 1 });
    });

    test('should terminate worker', async () => {
      await worker.spawn();
      await worker.terminate();

      expect(worker.getState()).toBe(WorkerState.TERMINATED);
    });

    test('should emit terminated event', async () => {
      await worker.spawn();

      const terminated = jest.fn();
      worker.on('terminated', terminated);

      await worker.terminate();

      expect(terminated).toHaveBeenCalledWith({ workerId: 1 });
    });

    test('should not allow termination while executing', async () => {
      await worker.spawn();

      const task = { id: 'T1', priority: 'medium' };
      const executePromise = worker.execute(task);

      await expect(worker.terminate()).rejects.toThrow();

      await executePromise;
    });
  });

  describe('Task Execution', () => {
    beforeEach(async () => {
      await worker.spawn();
    });

    test('should execute task successfully', async () => {
      const task = { id: 'T1', priority: 'medium' };
      const result = await worker.execute(task);

      expect(result.taskId).toBe('T1');
      expect(result.status).toBe('completed');
    });

    test('should transition through execution states', async () => {
      const states = [];
      worker.on('stateChange', ({ newState }) => states.push(newState));

      const task = { id: 'T1', priority: 'medium' };
      await worker.execute(task);

      expect(states).toContain(WorkerState.ASSIGNED);
      expect(states).toContain(WorkerState.EXECUTING);
      expect(states).toContain(WorkerState.COMPLETING);
      expect(states).toContain(WorkerState.IDLE);
    });

    test('should emit execution events', async () => {
      const assigned = jest.fn();
      const started = jest.fn();
      const completed = jest.fn();

      worker.on('assigned', assigned);
      worker.on('started', started);
      worker.on('completed', completed);

      const task = { id: 'T1', priority: 'medium' };
      await worker.execute(task);

      expect(assigned).toHaveBeenCalled();
      expect(started).toHaveBeenCalled();
      expect(completed).toHaveBeenCalled();
    });

    test('should report progress during execution', async () => {
      const progress = jest.fn();
      worker.on('progress', progress);

      const task = { id: 'T1', priority: 'medium' };
      await worker.execute(task);

      expect(progress).toHaveBeenCalled();
      expect(progress.mock.calls.length).toBeGreaterThan(0);
    });

    test('should track current task during execution', async () => {
      const task = { id: 'T1', priority: 'medium' };
      const executePromise = worker.execute(task);

      // Wait a bit to ensure execution has started
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(worker.getCurrentTask()).toEqual(task);

      await executePromise;

      expect(worker.getCurrentTask()).toBeNull();
    });

    test('should return to IDLE after successful execution', async () => {
      const task = { id: 'T1', priority: 'medium' };
      await worker.execute(task);

      expect(worker.getState()).toBe(WorkerState.IDLE);
    });

    test('should not allow execution when not idle', async () => {
      const task1 = { id: 'T1', priority: 'medium' };
      const task2 = { id: 'T2', priority: 'medium' };

      const executePromise = worker.execute(task1);

      // Try to execute second task while first is running
      await expect(worker.execute(task2)).rejects.toThrow();

      await executePromise;
    });

    test('should enforce task timeout', async () => {
      const task = {
        id: 'T1',
        priority: 'medium',
        timeout: 100, // 100ms timeout
      };

      // Override _executeTask to simulate long-running task
      worker._executeTask = async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      };

      await expect(worker.execute(task)).rejects.toThrow(/timed out/);
    }, 10000);

    test('should use default timeout if not specified', async () => {
      const task = { id: 'T1', priority: 'medium' };
      const result = await worker.execute(task);

      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await worker.spawn();
    });

    test('should handle task execution failure', async () => {
      const task = { id: 'T1', priority: 'medium' };

      // Force execution to fail
      worker._executeTask = async () => {
        throw new Error('Task failed');
      };

      await expect(worker.execute(task)).rejects.toThrow('Task failed');
    });

    test('should emit failed event on error', async () => {
      const failed = jest.fn();
      worker.on('failed', failed);

      const task = { id: 'T1', priority: 'medium' };
      worker._executeTask = async () => {
        throw new Error('Task failed');
      };

      try {
        await worker.execute(task);
      } catch (error) {
        // Expected
      }

      expect(failed).toHaveBeenCalled();
      expect(failed.mock.calls[0][0].error.message).toBe('Task failed');
    });

    test('should return to IDLE after failure', async () => {
      const task = { id: 'T1', priority: 'medium' };
      worker._executeTask = async () => {
        throw new Error('Task failed');
      };

      try {
        await worker.execute(task);
      } catch (error) {
        // Expected
      }

      expect(worker.getState()).toBe(WorkerState.IDLE);
    });

    test('should clear task state after failure', async () => {
      const task = { id: 'T1', priority: 'medium' };
      worker._executeTask = async () => {
        throw new Error('Task failed');
      };

      try {
        await worker.execute(task);
      } catch (error) {
        // Expected
      }

      expect(worker.getCurrentTask()).toBeNull();
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await worker.spawn();
    });

    test('should track completed tasks', async () => {
      const task1 = { id: 'T1', priority: 'medium' };
      const task2 = { id: 'T2', priority: 'medium' };

      await worker.execute(task1);
      await worker.execute(task2);

      const stats = worker.getStats();
      expect(stats.tasksCompleted).toBe(2);
    });

    test('should track failed tasks', async () => {
      worker._executeTask = async () => {
        throw new Error('Task failed');
      };

      const task1 = { id: 'T1', priority: 'medium' };
      const task2 = { id: 'T2', priority: 'medium' };

      try {
        await worker.execute(task1);
      } catch (error) {
        // Expected
      }

      try {
        await worker.execute(task2);
      } catch (error) {
        // Expected
      }

      const stats = worker.getStats();
      expect(stats.tasksFailed).toBe(2);
    });

    test('should calculate average execution time', async () => {
      const task1 = { id: 'T1', priority: 'medium' };
      const task2 = { id: 'T2', priority: 'medium' };

      await worker.execute(task1);
      await worker.execute(task2);

      const stats = worker.getStats();
      expect(stats.averageExecutionTime).toBeGreaterThan(0);
    });

    test('should include current state in stats', async () => {
      const stats = worker.getStats();
      expect(stats.currentState).toBe(WorkerState.IDLE);
    });
  });

  describe('State Queries', () => {
    beforeEach(async () => {
      await worker.spawn();
    });

    test('should report availability correctly', () => {
      expect(worker.isAvailable()).toBe(true);
      expect(worker.isBusy()).toBe(false);
    });

    test('should report busy state during execution', async () => {
      const task = { id: 'T1', priority: 'medium' };
      const executePromise = worker.execute(task);

      // Wait a bit to ensure execution has started
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(worker.isAvailable()).toBe(false);
      expect(worker.isBusy()).toBe(true);

      await executePromise;
    });
  });

  describe('Progress Reporting', () => {
    beforeEach(async () => {
      await worker.spawn();
    });

    test('should report progress with percentage', async () => {
      const progress = jest.fn();
      worker.on('progress', progress);

      worker.reportProgress(50, 'Half done');

      expect(progress).toHaveBeenCalledWith(
        expect.objectContaining({
          workerId: 1,
          percent: 50,
          message: 'Half done',
        })
      );
    });

    test('should clamp progress to 0-100 range', async () => {
      const progress = jest.fn();
      worker.on('progress', progress);

      worker.reportProgress(-10, 'Below zero');
      expect(progress.mock.calls[0][0].percent).toBe(0);

      worker.reportProgress(150, 'Above 100');
      expect(progress.mock.calls[1][0].percent).toBe(100);
    });

    test('should not report progress if disabled', async () => {
      const workerNoProgress = new Worker(2, mockPool, {
        enableProgressReporting: false,
      });

      const progress = jest.fn();
      workerNoProgress.on('progress', progress);

      workerNoProgress.reportProgress(50, 'Half done');

      expect(progress).not.toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    test('should use custom timeout', async () => {
      const customWorker = new Worker(2, mockPool, { timeout: 100 });
      await customWorker.spawn();

      const task = { id: 'T1', priority: 'medium' };

      customWorker._executeTask = async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      };

      await expect(customWorker.execute(task)).rejects.toThrow(/timed out/);
    }, 10000);
  });
});
