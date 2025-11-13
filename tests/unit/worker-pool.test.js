/**
 * Worker Pool Tests
 *
 * Tests for the WorkerPool class including lifecycle, task management,
 * concurrency control, and resource management
 */

const WorkerPool = require('../../plugins/carl/lib/orchestration/worker-pool');
const { PoolState, ConcurrencyMode } = require('../../plugins/carl/lib/orchestration/worker-pool');

describe('WorkerPool', () => {
  let pool;

  beforeEach(() => {
    pool = new WorkerPool({
      maxConcurrency: 2,
      minWorkers: 0,
      taskQueueStrategy: 'fifo',
    });
  });

  afterEach(async () => {
    if (pool.state !== PoolState.TERMINATED) {
      await pool.terminate();
    }
    pool.removeAllListeners();
  });

  describe('Lifecycle', () => {
    test('should start in INITIALIZING state', () => {
      expect(pool.state).toBe(PoolState.INITIALIZING);
    });

    test('should transition to READY after initialization', async () => {
      await pool.initialize();
      expect(pool.state).toBe(PoolState.READY);
    });

    test('should emit initialized event', async () => {
      const initialized = jest.fn();
      pool.on('initialized', initialized);

      await pool.initialize();

      expect(initialized).toHaveBeenCalled();
    });

    test('should spawn minimum workers on initialization', async () => {
      const poolWithMin = new WorkerPool({
        maxConcurrency: 4,
        minWorkers: 2,
      });

      await poolWithMin.initialize();

      const status = poolWithMin.getStatus();
      expect(status.workers.total).toBe(2);

      await poolWithMin.terminate();
    });

    test('should start pool', async () => {
      await pool.initialize();
      await pool.start();

      expect(pool.state).toBe(PoolState.READY);
    });

    test('should pause pool', async () => {
      await pool.initialize();
      await pool.start();
      await pool.pause();

      expect(pool.state).toBe(PoolState.PAUSED);
    });

    test('should resume pool', async () => {
      await pool.initialize();
      await pool.start();
      await pool.pause();
      await pool.resume();

      expect(pool.state).toBe(PoolState.READY);
    });

    test('should drain pool', async () => {
      await pool.initialize();

      const draining = jest.fn();
      pool.on('draining', draining);

      await pool.drain();

      expect(draining).toHaveBeenCalled();
    });

    test('should terminate pool', async () => {
      await pool.initialize();

      const terminated = jest.fn();
      pool.on('terminated', terminated);

      await pool.terminate();

      expect(pool.state).toBe(PoolState.TERMINATED);
      expect(terminated).toHaveBeenCalled();
    });

    test('should not allow starting from invalid state', async () => {
      await pool.initialize();
      await pool.terminate();

      await expect(pool.start()).rejects.toThrow();
    });
  });

  describe('Task Submission', () => {
    beforeEach(async () => {
      await pool.initialize();
      await pool.start();
    });

    test('should submit and execute task', async () => {
      const task = { id: 'T1', priority: 'medium' };
      const result = await pool.submit(task);

      expect(result.taskId).toBe('T1');
      expect(result.status).toBe('completed');
    }, 10000);

    test('should emit task:queued event', async () => {
      const queued = jest.fn();
      pool.on('task:queued', queued);

      const task = { id: 'T1', priority: 'medium' };
      pool.submit(task); // Don't await

      // Wait for event
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(queued).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'T1',
        })
      );
    });

    test('should emit task:completed event', async () => {
      const completed = jest.fn();
      pool.on('task:completed', completed);

      const task = { id: 'T1', priority: 'medium' };
      await pool.submit(task);

      expect(completed).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'T1',
        })
      );
    }, 10000);

    test('should submit batch of tasks', async () => {
      const tasks = [
        { id: 'T1', priority: 'medium' },
        { id: 'T2', priority: 'medium' },
        { id: 'T3', priority: 'medium' },
      ];

      const results = await pool.submitBatch(tasks);

      expect(results).toHaveLength(3);
      expect(results[0].taskId).toBe('T1');
      expect(results[1].taskId).toBe('T2');
      expect(results[2].taskId).toBe('T3');
    }, 10000);

    test('should not allow submission when draining', async () => {
      await pool.drain();

      const task = { id: 'T1', priority: 'medium' };
      await expect(pool.submit(task)).rejects.toThrow();
    });

    test('should not allow submission when terminated', async () => {
      await pool.terminate();

      const task = { id: 'T1', priority: 'medium' };
      await expect(pool.submit(task)).rejects.toThrow();
    });

    test('should queue tasks when paused', async () => {
      await pool.pause();

      const task = { id: 'T1', priority: 'medium' };
      const submitPromise = pool.submit(task);

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = pool.getStatus();
      expect(status.tasks.queued).toBe(1);

      await pool.resume();
      await submitPromise;
    }, 10000);
  });

  describe('Concurrency Control', () => {
    beforeEach(async () => {
      await pool.initialize();
      await pool.start();
    });

    test('should respect max concurrency limit', async () => {
      const tasks = [
        { id: 'T1', priority: 'medium' },
        { id: 'T2', priority: 'medium' },
        { id: 'T3', priority: 'medium' },
        { id: 'T4', priority: 'medium' },
      ];

      // Submit all tasks without awaiting
      const promises = tasks.map(task => pool.submit(task));

      // Wait a bit for execution to start
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check active tasks doesn't exceed concurrency
      const status = pool.getStatus();
      expect(status.tasks.active).toBeLessThanOrEqual(pool.config.maxConcurrency);

      // Wait for all to complete
      await Promise.all(promises);
    }, 15000);

    test('should change concurrency limit', async () => {
      pool.setConcurrency(4);

      expect(pool.config.maxConcurrency).toBe(4);
      expect(pool.currentConcurrency).toBe(4);
    });

    test('should emit concurrency:changed event', async () => {
      const changed = jest.fn();
      pool.on('concurrency:changed', changed);

      pool.setConcurrency(4);

      expect(changed).toHaveBeenCalledWith(
        expect.objectContaining({
          newConcurrency: 4,
        })
      );
    });

    test('should not allow concurrency less than 1', () => {
      expect(() => pool.setConcurrency(0)).toThrow();
    });

    test('should set concurrency mode', async () => {
      pool.setMode(ConcurrencyMode.DYNAMIC, {
        minConcurrency: 1,
        maxConcurrency: 4,
      });

      expect(pool.config.mode).toBe(ConcurrencyMode.DYNAMIC);
    });

    test('should emit mode:changed event', async () => {
      const changed = jest.fn();
      pool.on('mode:changed', changed);

      pool.setMode(ConcurrencyMode.DYNAMIC);

      expect(changed).toHaveBeenCalled();
    });

    test('should reject invalid mode', () => {
      expect(() => pool.setMode('invalid')).toThrow();
    });
  });

  describe('Task Cancellation', () => {
    beforeEach(async () => {
      await pool.initialize();
      await pool.start();
    });

    test('should cancel queued task', async () => {
      await pool.pause();

      const task = { id: 'T1', priority: 'medium' };
      pool.submit(task); // Don't await

      await new Promise(resolve => setTimeout(resolve, 50));

      const cancelled = await pool.cancel('T1');
      expect(cancelled).toBe(true);

      const status = pool.getStatus();
      expect(status.tasks.queued).toBe(0);
    });

    test('should not cancel active task', async () => {
      const task = { id: 'T1', priority: 'medium' };
      const submitPromise = pool.submit(task);

      // Wait for execution to start
      await new Promise(resolve => setTimeout(resolve, 100));

      const cancelled = await pool.cancel('T1');
      expect(cancelled).toBe(false);

      await submitPromise;
    }, 10000);

    test('should return false for non-existent task', async () => {
      const cancelled = await pool.cancel('T999');
      expect(cancelled).toBe(false);
    });
  });

  describe('Task Retry', () => {
    beforeEach(async () => {
      await pool.initialize();
      await pool.start();
    });

    test('should retry failed task', async () => {
      const task = { id: 'T1', priority: 'medium', maxRetries: 0 };

      // Force failure by mocking worker execution
      pool._spawnWorkers(1);
      const workers = Array.from(pool.workers.values());
      if (workers.length > 0) {
        const worker = workers[0];
        const originalExecute = worker._executeTask.bind(worker);
        let attemptCount = 0;

        worker._executeTask = async task => {
          attemptCount++;
          if (attemptCount === 1) {
            throw new Error('First attempt failed');
          }
          return originalExecute(task);
        };
      }

      try {
        await pool.submit(task);
      } catch (error) {
        // Expected to fail
      }

      // Now retry
      const result = await pool.retry('T1');
      expect(result.status).toBe('completed');
    }, 10000);

    test('should throw error when retrying non-existent task', async () => {
      await expect(pool.retry('T999')).rejects.toThrow();
    });
  });

  describe('Status and Metrics', () => {
    beforeEach(async () => {
      await pool.initialize();
      await pool.start();
    });

    test('should get pool status', () => {
      const status = pool.getStatus();

      expect(status).toHaveProperty('state');
      expect(status).toHaveProperty('mode');
      expect(status).toHaveProperty('concurrency');
      expect(status).toHaveProperty('workers');
      expect(status).toHaveProperty('tasks');
      expect(status).toHaveProperty('stats');
    });

    test('should get pool metrics', async () => {
      const task = { id: 'T1', priority: 'medium' };
      await pool.submit(task);

      const metrics = pool.getMetrics();

      expect(metrics.totalTasks).toBe(1);
      expect(metrics.completedTasks).toBe(1);
      expect(metrics.percentComplete).toBe(100);
      expect(metrics.successRate).toBe(100);
    }, 10000);

    test('should get active tasks', async () => {
      const task = { id: 'T1', priority: 'medium' };
      const submitPromise = pool.submit(task);

      // Wait for execution to start
      await new Promise(resolve => setTimeout(resolve, 100));

      const activeTasks = pool.getActiveTasks();
      expect(activeTasks.length).toBeGreaterThan(0);

      await submitPromise;
    }, 10000);

    test('should get queued tasks', async () => {
      await pool.pause();

      const tasks = [
        { id: 'T1', priority: 'medium' },
        { id: 'T2', priority: 'medium' },
      ];

      tasks.forEach(task => pool.submit(task));

      await new Promise(resolve => setTimeout(resolve, 50));

      const queuedTasks = pool.getQueuedTasks();
      expect(queuedTasks.length).toBe(2);
    });
  });

  describe('Resource Management', () => {
    beforeEach(async () => {
      await pool.initialize();
      await pool.start();
    });

    test('should update resource limits', () => {
      const updated = jest.fn();
      pool.on('resources:updated', updated);

      pool.updateResourceLimits({
        cpuThreshold: 90,
        memoryThreshold: 85,
      });

      expect(pool.config.cpuThreshold).toBe(90);
      expect(updated).toHaveBeenCalled();
    });
  });

  describe('Worker Management', () => {
    beforeEach(async () => {
      await pool.initialize();
      await pool.start();
    });

    test('should spawn workers on demand', async () => {
      const tasks = [
        { id: 'T1', priority: 'medium' },
        { id: 'T2', priority: 'medium' },
      ];

      const promises = tasks.map(task => pool.submit(task));

      // Wait for workers to spawn
      await new Promise(resolve => setTimeout(resolve, 200));

      const status = pool.getStatus();
      expect(status.workers.total).toBeGreaterThan(0);

      await Promise.all(promises);
    }, 15000);

    test('should track worker statistics', async () => {
      const task = { id: 'T1', priority: 'medium' };
      await pool.submit(task);

      expect(pool.stats.totalTasksSubmitted).toBe(1);
      expect(pool.stats.totalTasksCompleted).toBe(1);
      expect(pool.stats.totalWorkersSpawned).toBeGreaterThan(0);
    }, 10000);
  });

  describe('Event Propagation', () => {
    beforeEach(async () => {
      await pool.initialize();
      await pool.start();
    });

    test('should propagate worker progress events', async () => {
      const progress = jest.fn();
      pool.on('worker:progress', progress);

      const task = { id: 'T1', priority: 'medium' };
      await pool.submit(task);

      expect(progress).toHaveBeenCalled();
    }, 10000);

    test('should propagate worker state change events', async () => {
      const stateChange = jest.fn();
      pool.on('worker:stateChange', stateChange);

      const task = { id: 'T1', priority: 'medium' };
      await pool.submit(task);

      expect(stateChange).toHaveBeenCalled();
    }, 10000);
  });
});
