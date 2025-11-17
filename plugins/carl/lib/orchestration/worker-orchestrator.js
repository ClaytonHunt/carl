/**
 * WorkerOrchestrator - Higher Order Prompt (HOP) orchestrator
 *
 * Coordinates multiple worker agents following IndyDevDan's HOP/LOP pattern.
 * Manages work distribution, parallel execution, and result aggregation.
 *
 * Core Responsibilities:
 * - Worker pool management
 * - Work distribution and assignment
 * - Parallel and sequential execution coordination
 * - Worker health monitoring
 * - Result aggregation
 * - Error handling and recovery
 */

const BaseWorkerAgent = require('./base-worker-agent');
const { AgentType } = require('./base-worker-agent');
const EventEmitter = require('events');

/**
 * Execution strategies
 */
const ExecutionStrategy = {
  PARALLEL: 'parallel', // All workers execute simultaneously
  SEQUENTIAL: 'sequential', // Workers execute one at a time
  HYBRID: 'hybrid', // Waves of parallel execution
};

/**
 * Worker status tracking
 */
const WorkerStatus = {
  IDLE: 'idle',
  ASSIGNED: 'assigned',
  EXECUTING: 'executing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  BLOCKED: 'blocked',
};

/**
 * WorkerOrchestrator (HOP) - Coordinates multiple worker agents
 */
class WorkerOrchestrator extends BaseWorkerAgent {
  /**
   * Create a worker orchestrator
   * @param {Object} config - Orchestrator configuration
   */
  constructor(config = {}) {
    super({
      ...config,
      type: AgentType.HOP_ORCHESTRATOR,
    });

    // Worker pool
    this.workers = new Map(); // workerId -> worker instance
    this.workerStatus = new Map(); // workerId -> status info

    // Work queue and assignments
    this.workQueue = [];
    this.workAssignments = new Map(); // workItemId -> workerId
    this.completedWork = new Map(); // workItemId -> result
    this.failedWork = new Map(); // workItemId -> error

    // Execution configuration
    this.executionConfig = {
      maxConcurrency: config.maxConcurrency || 4,
      strategy: config.strategy || ExecutionStrategy.HYBRID,
      continueOnFailure: config.continueOnFailure !== false,
      retryFailedTasks: config.retryFailedTasks !== false,
      maxRetries: config.maxRetries || 3,
    };

    // Execution state
    this.currentWave = 0;
    this.totalWaves = 0;
    this.executionPlan = null;
  }

  /**
   * Add a worker to the pool
   * @param {BaseWorkerAgent} worker - Worker agent instance
   * @returns {string} Worker ID
   */
  addWorker(worker) {
    if (!(worker instanceof BaseWorkerAgent)) {
      throw new Error('Worker must be an instance of BaseWorkerAgent');
    }

    const workerId = worker.id;
    this.workers.set(workerId, worker);
    this.workerStatus.set(workerId, {
      workerId,
      status: WorkerStatus.IDLE,
      currentWork: null,
      assignedAt: null,
      completedAt: null,
    });

    // Listen to worker events
    this._attachWorkerListeners(worker);

    this.emit('worker:added', { workerId, timestamp: Date.now() });

    return workerId;
  }

  /**
   * Remove a worker from the pool
   * @param {string} workerId - Worker ID to remove
   * @returns {boolean} Success
   */
  removeWorker(workerId) {
    const worker = this.workers.get(workerId);
    if (!worker) {
      return false;
    }

    // Cannot remove if executing
    const status = this.workerStatus.get(workerId);
    if (status?.status === WorkerStatus.EXECUTING) {
      throw new Error(
        `Cannot remove worker ${workerId} while executing work ${status.currentWork}`
      );
    }

    this.workers.delete(workerId);
    this.workerStatus.delete(workerId);

    this.emit('worker:removed', { workerId, timestamp: Date.now() });

    return true;
  }

  /**
   * Get a worker by ID
   * @param {string} workerId - Worker ID
   * @returns {BaseWorkerAgent|null}
   */
  getWorker(workerId) {
    return this.workers.get(workerId) || null;
  }

  /**
   * Assign work to a specific worker
   * @param {string} workerId - Worker ID
   * @param {Object} workItem - Work item to assign
   * @returns {Promise<void>}
   */
  async assignWork(workerId, workItem) {
    const worker = this.workers.get(workerId);
    if (!worker) {
      throw new Error(`Worker not found: ${workerId}`);
    }

    const status = this.workerStatus.get(workerId);
    if (status.status !== WorkerStatus.IDLE) {
      throw new Error(`Worker ${workerId} is not idle (status: ${status.status})`);
    }

    // Update status
    this.workerStatus.set(workerId, {
      ...status,
      status: WorkerStatus.ASSIGNED,
      currentWork: workItem.id,
      assignedAt: Date.now(),
    });

    // Track assignment
    this.workAssignments.set(workItem.id, workerId);

    await this.logEvent('work:assigned', {
      workerId,
      workItemId: workItem.id,
    });

    this.emit('work:assigned', {
      workerId,
      workItemId: workItem.id,
      timestamp: Date.now(),
    });
  }

  /**
   * Distribute work items to available workers
   * @param {Array<Object>} workItems - Work items to distribute
   * @returns {Promise<Array<string>>} - Array of worker IDs assigned
   */
  async distributeWorkItems(workItems) {
    const assignments = [];

    for (const workItem of workItems) {
      const availableWorker = this._getAvailableWorker();

      if (availableWorker) {
        await this.assignWork(availableWorker.id, workItem);
        assignments.push(availableWorker.id);
      } else {
        // Add to queue if no workers available
        this.workQueue.push(workItem);
        await this.logEvent('work:queued', { workItemId: workItem.id });
      }
    }

    return assignments;
  }

  /**
   * Start all workers in the pool
   * @returns {Promise<void>}
   */
  async startAll() {
    const startPromises = Array.from(this.workers.values()).map(worker =>
      worker.start().catch(error =>
        this.logEvent('worker:start:failed', {
          workerId: worker.id,
          error: error.message,
        })
      )
    );

    await Promise.allSettled(startPromises);

    await this.logEvent('workers:started', {
      count: this.workers.size,
    });
  }

  /**
   * Stop all workers in the pool
   * @returns {Promise<void>}
   */
  async stopAll() {
    const stopPromises = Array.from(this.workers.values()).map(worker =>
      worker.stop().catch(error =>
        this.logEvent('worker:stop:failed', {
          workerId: worker.id,
          error: error.message,
        })
      )
    );

    await Promise.allSettled(stopPromises);

    await this.logEvent('workers:stopped', {
      count: this.workers.size,
    });
  }

  /**
   * Wait for all workers to complete their current work
   * @param {number} timeout - Timeout in milliseconds (default: 10 minutes)
   * @returns {Promise<void>}
   */
  async waitForCompletion(timeout = 600000) {
    const startTime = Date.now();

    while (this._hasActiveWorkers()) {
      // Check timeout
      if (Date.now() - startTime > timeout) {
        throw new Error('Timeout waiting for workers to complete');
      }

      // Wait a bit before checking again
      await this._sleep(100);
    }

    await this.logEvent('workers:completed', {
      duration: Date.now() - startTime,
    });
  }

  /**
   * Execute work items using configured strategy
   * @param {Array<Object>} workItems - Work items to execute
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution results
   */
  async executeWorkItems(workItems, options = {}) {
    const strategy = options.strategy || this.executionConfig.strategy;

    await this.logEvent('execution:started', {
      strategy,
      itemCount: workItems.length,
    });

    let results;

    try {
      switch (strategy) {
        case ExecutionStrategy.PARALLEL:
          results = await this._executeParallel(workItems);
          break;

        case ExecutionStrategy.SEQUENTIAL:
          results = await this._executeSequential(workItems);
          break;

        case ExecutionStrategy.HYBRID:
          results = await this._executeHybrid(workItems, options.waves);
          break;

        default:
          throw new Error(`Unknown execution strategy: ${strategy}`);
      }

      await this.logEvent('execution:completed', {
        strategy,
        totalItems: workItems.length,
        completed: results.completed.length,
        failed: results.failed.length,
      });

      return results;
    } catch (error) {
      await this.logEvent('execution:failed', {
        strategy,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get worker pool status
   * @returns {Object} Status information
   */
  getPoolStatus() {
    const workers = Array.from(this.workerStatus.values());

    return {
      totalWorkers: this.workers.size,
      idle: workers.filter(w => w.status === WorkerStatus.IDLE).length,
      assigned: workers.filter(w => w.status === WorkerStatus.ASSIGNED).length,
      executing: workers.filter(w => w.status === WorkerStatus.EXECUTING).length,
      completed: workers.filter(w => w.status === WorkerStatus.COMPLETED).length,
      failed: workers.filter(w => w.status === WorkerStatus.FAILED).length,
      queuedWork: this.workQueue.length,
      completedWork: this.completedWork.size,
      failedWork: this.failedWork.size,
      currentWave: this.currentWave,
      totalWaves: this.totalWaves,
    };
  }

  /**
   * Get health status of all workers
   * @returns {Array<Object>} Worker health status
   */
  getWorkerHealth() {
    return Array.from(this.workers.entries()).map(([workerId, worker]) => ({
      workerId,
      state: worker.state,
      status: this.workerStatus.get(workerId)?.status,
      uptime: worker.getStatus().uptime,
      metrics: worker.metrics,
      lastError: worker.lastError,
    }));
  }

  /**
   * Execute work items in parallel
   * @param {Array<Object>} workItems - Work items
   * @returns {Promise<Object>} Results
   * @private
   */
  async _executeParallel(workItems) {
    const results = {
      completed: [],
      failed: [],
    };

    // Execute all items simultaneously (up to maxConcurrency)
    const batches = this._createBatches(workItems, this.executionConfig.maxConcurrency);

    for (const batch of batches) {
      const promises = batch.map(item => this._executeWorkItem(item));
      const batchResults = await Promise.allSettled(promises);

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.completed.push(result.value);
        } else {
          results.failed.push({
            workItem: batch[index],
            error: result.reason,
          });
        }
      });
    }

    return results;
  }

  /**
   * Execute work items sequentially
   * @param {Array<Object>} workItems - Work items
   * @returns {Promise<Object>} Results
   * @private
   */
  async _executeSequential(workItems) {
    const results = {
      completed: [],
      failed: [],
    };

    for (const item of workItems) {
      try {
        const result = await this._executeWorkItem(item);
        results.completed.push(result);
      } catch (error) {
        results.failed.push({
          workItem: item,
          error,
        });

        // Stop on failure unless configured otherwise
        if (!this.executionConfig.continueOnFailure) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Execute work items in waves (hybrid strategy)
   * @param {Array<Object>} workItems - Work items
   * @param {Array<Array<Object>>} waves - Pre-defined waves
   * @returns {Promise<Object>} Results
   * @private
   */
  async _executeHybrid(workItems, waves = null) {
    const results = {
      completed: [],
      failed: [],
    };

    // Use provided waves or create default batches
    const executionWaves =
      waves || this._createBatches(workItems, this.executionConfig.maxConcurrency);

    this.totalWaves = executionWaves.length;

    for (let i = 0; i < executionWaves.length; i++) {
      this.currentWave = i;
      const wave = executionWaves[i];

      await this.logEvent('wave:started', {
        waveIndex: i,
        itemCount: wave.length,
      });

      // Execute wave in parallel
      const waveResults = await this._executeParallel(wave);

      results.completed.push(...waveResults.completed);
      results.failed.push(...waveResults.failed);

      await this.logEvent('wave:completed', {
        waveIndex: i,
        completed: waveResults.completed.length,
        failed: waveResults.failed.length,
      });

      // Stop if wave failed and continueOnFailure is false
      if (
        waveResults.failed.length > 0 &&
        !this.executionConfig.continueOnFailure
      ) {
        break;
      }
    }

    return results;
  }

  /**
   * Execute a single work item
   * @param {Object} workItem - Work item
   * @returns {Promise<Object>} Result
   * @private
   */
  async _executeWorkItem(workItem) {
    // This is a placeholder - actual implementation would delegate to workers
    // via Task tool or direct method calls

    await this.logEvent('work:started', { workItemId: workItem.id });

    try {
      // Simulate work execution
      await this._sleep(100);

      const result = {
        workItemId: workItem.id,
        status: 'completed',
        timestamp: Date.now(),
      };

      this.completedWork.set(workItem.id, result);

      await this.logEvent('work:completed', { workItemId: workItem.id });

      return result;
    } catch (error) {
      this.failedWork.set(workItem.id, error);

      await this.logEvent('work:failed', {
        workItemId: workItem.id,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Get an available worker
   * @returns {BaseWorkerAgent|null}
   * @private
   */
  _getAvailableWorker() {
    for (const [workerId, status] of this.workerStatus.entries()) {
      if (status.status === WorkerStatus.IDLE) {
        return this.workers.get(workerId);
      }
    }
    return null;
  }

  /**
   * Check if there are active workers
   * @returns {boolean}
   * @private
   */
  _hasActiveWorkers() {
    for (const status of this.workerStatus.values()) {
      if (
        status.status === WorkerStatus.ASSIGNED ||
        status.status === WorkerStatus.EXECUTING
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Create batches from work items
   * @param {Array<Object>} items - Items to batch
   * @param {number} batchSize - Size of each batch
   * @returns {Array<Array<Object>>}
   * @private
   */
  _createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Attach listeners to worker events
   * @param {BaseWorkerAgent} worker - Worker instance
   * @private
   */
  _attachWorkerListeners(worker) {
    worker.on('state_changed', data => {
      this.emit('worker:state_changed', {
        ...data,
        orchestratorId: this.id,
      });
    });

    worker.on('started', data => {
      const status = this.workerStatus.get(worker.id);
      if (status) {
        status.status = WorkerStatus.EXECUTING;
      }
    });

    worker.on('stopped', data => {
      const status = this.workerStatus.get(worker.id);
      if (status) {
        status.status = WorkerStatus.COMPLETED;
        status.completedAt = Date.now();
      }
    });

    worker.on('error', error => {
      const status = this.workerStatus.get(worker.id);
      if (status) {
        status.status = WorkerStatus.FAILED;
      }

      this.emit('worker:failed', {
        workerId: worker.id,
        error: error.message,
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Sleep helper
   * @param {number} ms - Milliseconds
   * @returns {Promise<void>}
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup orchestrator resources
   * @returns {Promise<void>}
   * @protected
   */
  async _cleanup() {
    await this.stopAll();
    this.workers.clear();
    this.workerStatus.clear();
    this.workQueue = [];
    this.workAssignments.clear();
    await super._cleanup();
  }
}

// Export class and constants
module.exports = WorkerOrchestrator;
module.exports.ExecutionStrategy = ExecutionStrategy;
module.exports.WorkerStatus = WorkerStatus;
