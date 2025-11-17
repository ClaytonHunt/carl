/**
 * Unit tests for WorkerOrchestrator
 *
 * Tests cover:
 * - Worker pool management
 * - Work distribution and assignment
 * - Parallel execution strategies
 * - Sequential execution strategies
 * - Hybrid execution strategies
 * - Worker health monitoring
 * - Coordination and result aggregation
 */

const WorkerOrchestrator = require('../../plugins/carl/lib/orchestration/worker-orchestrator');
const BaseWorkerAgent = require('../../plugins/carl/lib/orchestration/base-worker-agent');
const { ExecutionStrategy, WorkerStatus } = require('../../plugins/carl/lib/orchestration/worker-orchestrator');
const { AgentState } = require('../../plugins/carl/lib/orchestration/base-worker-agent');
const fs = require('fs').promises;
const path = require('path');

describe('WorkerOrchestrator', () => {
  let orchestrator;
  let workers;
  let sessionDir;

  beforeEach(async () => {
    sessionDir = path.join('.claude', '.carl', 'sessions', 'test-orch-session');
    orchestrator = new WorkerOrchestrator({
      sessionId: 'test-orch-session',
      maxConcurrency: 4,
    });
    await orchestrator.initialize();

    workers = [];
  });

  afterEach(async () => {
    if (orchestrator && orchestrator.session) {
      try {
        await orchestrator.session.cleanup();
      } catch (error) {
        // Ignore
      }
    }

    // Clean up test session directory
    try {
      await fs.rm(sessionDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore
    }
  });

  describe('Worker Pool Management', () => {
    test('should add worker to pool', () => {
      const worker = new BaseWorkerAgent({ id: 'worker-1' });
      const workerId = orchestrator.addWorker(worker);

      expect(workerId).toBe('worker-1');
      expect(orchestrator.workers.size).toBe(1);
      expect(orchestrator.workerStatus.has('worker-1')).toBe(true);
    });

    test('should throw error when adding non-worker object', () => {
      expect(() => {
        orchestrator.addWorker({ id: 'not-a-worker' });
      }).toThrow('Worker must be an instance of BaseWorkerAgent');
    });

    test('should emit worker:added event', () => {
      const worker = new BaseWorkerAgent({ id: 'worker-2' });

      const eventPromise = new Promise(resolve => {
        orchestrator.once('worker:added', resolve);
      });

      orchestrator.addWorker(worker);

      return eventPromise.then(event => {
        expect(event.workerId).toBe('worker-2');
      });
    });

    test('should remove idle worker from pool', () => {
      const worker = new BaseWorkerAgent({ id: 'worker-3' });
      orchestrator.addWorker(worker);

      const removed = orchestrator.removeWorker('worker-3');

      expect(removed).toBe(true);
      expect(orchestrator.workers.size).toBe(0);
    });

    test('should throw error when removing executing worker', async () => {
      const worker = new BaseWorkerAgent({ id: 'worker-4' });
      orchestrator.addWorker(worker);

      // Mark worker as executing
      orchestrator.workerStatus.set('worker-4', {
        status: WorkerStatus.EXECUTING,
        currentWork: 'task-1',
      });

      expect(() => {
        orchestrator.removeWorker('worker-4');
      }).toThrow('Cannot remove worker');
    });

    test('should get worker by ID', () => {
      const worker = new BaseWorkerAgent({ id: 'worker-5' });
      orchestrator.addWorker(worker);

      const retrieved = orchestrator.getWorker('worker-5');

      expect(retrieved).toBe(worker);
    });

    test('should return null for non-existent worker', () => {
      const retrieved = orchestrator.getWorker('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('Work Assignment', () => {
    beforeEach(() => {
      workers = [
        new BaseWorkerAgent({ id: 'worker-a' }),
        new BaseWorkerAgent({ id: 'worker-b' }),
      ];

      workers.forEach(w => orchestrator.addWorker(w));
    });

    test('should assign work to idle worker', async () => {
      const workItem = { id: 'task-1', description: 'Test task' };

      await orchestrator.assignWork('worker-a', workItem);

      const status = orchestrator.workerStatus.get('worker-a');
      expect(status.status).toBe(WorkerStatus.ASSIGNED);
      expect(status.currentWork).toBe('task-1');
      expect(orchestrator.workAssignments.get('task-1')).toBe('worker-a');
    });

    test('should throw error when assigning to non-idle worker', async () => {
      const workItem1 = { id: 'task-2', description: 'Test task 2' };
      const workItem2 = { id: 'task-3', description: 'Test task 3' };

      await orchestrator.assignWork('worker-a', workItem1);

      await expect(orchestrator.assignWork('worker-a', workItem2)).rejects.toThrow(
        'is not idle'
      );
    });

    test('should emit work:assigned event', async () => {
      const workItem = { id: 'task-4', description: 'Test task 4' };

      const eventPromise = new Promise(resolve => {
        orchestrator.once('work:assigned', resolve);
      });

      await orchestrator.assignWork('worker-a', workItem);

      const event = await eventPromise;
      expect(event.workerId).toBe('worker-a');
      expect(event.workItemId).toBe('task-4');
    });

    test('should distribute work to available workers', async () => {
      const workItems = [
        { id: 'task-5', description: 'Task 5' },
        { id: 'task-6', description: 'Task 6' },
      ];

      const assigned = await orchestrator.distributeWorkItems(workItems);

      expect(assigned.length).toBe(2);
      expect(orchestrator.workAssignments.size).toBe(2);
    });

    test('should queue work when no workers available', async () => {
      const workItems = [
        { id: 'task-7', description: 'Task 7' },
        { id: 'task-8', description: 'Task 8' },
        { id: 'task-9', description: 'Task 9' }, // Will be queued
      ];

      await orchestrator.distributeWorkItems(workItems);

      expect(orchestrator.workQueue.length).toBe(1);
      expect(orchestrator.workQueue[0].id).toBe('task-9');
    });
  });

  describe('Worker Coordination', () => {
    beforeEach(async () => {
      workers = [
        new BaseWorkerAgent({ id: 'worker-c' }),
        new BaseWorkerAgent({ id: 'worker-d' }),
      ];

      workers.forEach(w => orchestrator.addWorker(w));
      await Promise.all(workers.map(w => w.initialize()));
    });

    test('should start all workers', async () => {
      await orchestrator.startAll();

      for (const worker of workers) {
        expect(worker.state).toBe(AgentState.RUNNING);
      }
    });

    test('should stop all workers', async () => {
      await orchestrator.startAll();
      await orchestrator.stopAll();

      for (const worker of workers) {
        expect(worker.state).toBe(AgentState.STOPPED);
      }
    });

    test('should wait for completion when no active workers', async () => {
      const completed = await orchestrator.waitForCompletion(1000);

      expect(completed).toBeUndefined(); // Completes successfully
    });

    test('should timeout when workers do not complete', async () => {
      // Mark a worker as executing
      orchestrator.workerStatus.set('worker-c', {
        status: WorkerStatus.EXECUTING,
        currentWork: 'task-10',
      });

      await expect(orchestrator.waitForCompletion(500)).rejects.toThrow('Timeout');
    });
  });

  describe('Execution Strategies', () => {
    const createWorkItems = count => {
      return Array.from({ length: count }, (_, i) => ({
        id: `item-${i}`,
        description: `Work item ${i}`,
      }));
    };

    test('should execute parallel strategy', async () => {
      const workItems = createWorkItems(4);

      const results = await orchestrator.executeWorkItems(workItems, {
        strategy: ExecutionStrategy.PARALLEL,
      });

      expect(results.completed.length).toBe(4);
      expect(results.failed.length).toBe(0);
    });

    test('should execute sequential strategy', async () => {
      const workItems = createWorkItems(3);

      const results = await orchestrator.executeWorkItems(workItems, {
        strategy: ExecutionStrategy.SEQUENTIAL,
      });

      expect(results.completed.length).toBe(3);
      expect(results.failed.length).toBe(0);
    });

    test('should execute hybrid strategy', async () => {
      const workItems = createWorkItems(6);

      const results = await orchestrator.executeWorkItems(workItems, {
        strategy: ExecutionStrategy.HYBRID,
      });

      expect(results.completed.length).toBe(6);
      expect(results.failed.length).toBe(0);
    });

    test('should handle execution with predefined waves', async () => {
      const workItems = createWorkItems(6);
      const waves = [
        createWorkItems(2), // Wave 1: 2 items
        createWorkItems(3), // Wave 2: 3 items
        [workItems[5]], // Wave 3: 1 item
      ];

      const results = await orchestrator.executeWorkItems(workItems, {
        strategy: ExecutionStrategy.HYBRID,
        waves,
      });

      expect(orchestrator.totalWaves).toBe(3);
    });
  });

  describe('Pool Status and Health', () => {
    beforeEach(() => {
      workers = [
        new BaseWorkerAgent({ id: 'worker-e' }),
        new BaseWorkerAgent({ id: 'worker-f' }),
        new BaseWorkerAgent({ id: 'worker-g' }),
      ];

      workers.forEach(w => orchestrator.addWorker(w));
    });

    test('should get pool status', () => {
      const status = orchestrator.getPoolStatus();

      expect(status.totalWorkers).toBe(3);
      expect(status.idle).toBe(3);
      expect(status.executing).toBe(0);
      expect(status.queuedWork).toBe(0);
    });

    test('should track work completion in status', async () => {
      const workItem = { id: 'task-11', description: 'Test' };
      await orchestrator.assignWork('worker-e', workItem);

      const status = orchestrator.getPoolStatus();

      expect(status.assigned).toBe(1);
      expect(status.idle).toBe(2);
    });

    test('should get worker health status', async () => {
      await Promise.all(workers.map(w => w.initialize()));
      await workers[0].start();

      const health = orchestrator.getWorkerHealth();

      expect(health.length).toBe(3);
      expect(health[0].state).toBe(AgentState.RUNNING);
      expect(health[1].state).toBe(AgentState.IDLE);
    });

    test('should track metrics in worker health', async () => {
      await workers[0].initialize();
      workers[0]._updateMetrics({ tasksCompleted: 5 });

      const health = orchestrator.getWorkerHealth();

      expect(health[0].metrics.tasksCompleted).toBe(5);
    });
  });

  describe('Event Propagation', () => {
    test('should propagate worker state changes', async () => {
      const worker = new BaseWorkerAgent({ id: 'worker-h' });
      await worker.initialize();
      orchestrator.addWorker(worker);

      const eventPromise = new Promise(resolve => {
        orchestrator.once('worker:state_changed', resolve);
      });

      await worker.start();

      const event = await eventPromise;
      expect(event.agentId).toBe('worker-h');
      expect(event.orchestratorId).toBe(orchestrator.id);
    });

    test('should emit worker:failed event on error', async () => {
      const worker = new BaseWorkerAgent({ id: 'worker-i' });
      await worker.initialize();
      orchestrator.addWorker(worker);

      const eventPromise = new Promise(resolve => {
        orchestrator.once('worker:failed', resolve);
      });

      worker.emit('error', new Error('Test error'));

      const event = await eventPromise;
      expect(event.workerId).toBe('worker-i');
    });
  });

  describe('Cleanup', () => {
    test('should cleanup all resources', async () => {
      const worker = new BaseWorkerAgent({ id: 'worker-j' });
      await worker.initialize();
      orchestrator.addWorker(worker);

      await orchestrator._cleanup();

      expect(orchestrator.workers.size).toBe(0);
      expect(orchestrator.workerStatus.size).toBe(0);
      expect(orchestrator.workQueue.length).toBe(0);
    });
  });
});
