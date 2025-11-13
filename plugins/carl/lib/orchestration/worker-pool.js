/**
 * Worker Pool - Manages concurrent task execution with resource control
 *
 * Implements async-first orchestration with configurable concurrency,
 * resource management, and observable progress tracking.
 */

const EventEmitter = require('events');
const Worker = require('./worker');
const TaskQueue = require('./task-queue');

// Pool states
const PoolState = {
  INITIALIZING: 'initializing',
  READY: 'ready',
  EXECUTING: 'executing',
  PAUSED: 'paused',
  DRAINING: 'draining',
  TERMINATED: 'terminated',
};

// Concurrency modes
const ConcurrencyMode = {
  FIXED: 'fixed',
  DYNAMIC: 'dynamic',
  ADAPTIVE: 'adaptive',
};

class WorkerPool extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      maxConcurrency: config.maxConcurrency || 4,
      minWorkers: config.minWorkers || 1,
      maxWorkers: config.maxWorkers || 8,
      taskQueueStrategy: config.taskQueueStrategy || 'priority',
      workerSpawnDelay: config.workerSpawnDelay || 100,
      workerIdleTimeout: config.workerIdleTimeout || 30000,
      mode: config.mode || ConcurrencyMode.FIXED,
      ...config,
    };

    this.state = PoolState.INITIALIZING;
    this.workers = new Map(); // workerId -> Worker
    this.taskQueue = new TaskQueue(this.config.taskQueueStrategy);
    this.activeTasks = new Map(); // taskId -> { workerId, task, startTime }
    this.completedTasks = new Map(); // taskId -> result
    this.failedTasks = new Map(); // taskId -> error

    this.nextWorkerId = 1;
    this.stats = {
      totalTasksSubmitted: 0,
      totalTasksCompleted: 0,
      totalTasksFailed: 0,
      totalWorkersSpawned: 0,
      totalWorkersTerminated: 0,
    };

    // For dynamic/adaptive modes
    this.currentConcurrency = this.config.maxConcurrency;
  }

  /**
   * Initialize the worker pool
   */
  async initialize() {
    this._setState(PoolState.READY);
    this.emit('initialized', {
      config: this.config,
      timestamp: Date.now(),
    });

    // Spawn minimum workers if configured
    if (this.config.minWorkers > 0) {
      await this._spawnWorkers(this.config.minWorkers);
    }

    return this;
  }

  /**
   * Start the worker pool
   */
  async start() {
    if (this.state !== PoolState.READY && this.state !== PoolState.PAUSED) {
      throw new Error(`Cannot start pool in state: ${this.state}`);
    }

    this._setState(PoolState.READY);
    this.emit('started', { timestamp: Date.now() });

    // Start processing queued tasks
    this._processQueue();

    return this;
  }

  /**
   * Pause the worker pool (no new tasks executed)
   */
  async pause() {
    this._setState(PoolState.PAUSED);
    this.emit('paused', { timestamp: Date.now() });
    return this;
  }

  /**
   * Resume the worker pool
   */
  async resume() {
    if (this.state !== PoolState.PAUSED) {
      throw new Error(`Cannot resume pool in state: ${this.state}`);
    }

    this._setState(PoolState.READY);
    this.emit('resumed', { timestamp: Date.now() });

    // Resume processing queue
    this._processQueue();

    return this;
  }

  /**
   * Drain the pool (complete current tasks, no new tasks)
   */
  async drain() {
    this._setState(PoolState.DRAINING);
    this.emit('draining', {
      activeTasks: this.activeTasks.size,
      queuedTasks: this.taskQueue.size(),
      timestamp: Date.now(),
    });

    // Wait for all active tasks to complete
    while (this.activeTasks.size > 0) {
      await this._sleep(100);
    }

    this.emit('drained', { timestamp: Date.now() });
    return this;
  }

  /**
   * Terminate the pool (stop all workers)
   */
  async terminate() {
    // First drain
    if (this.state !== PoolState.DRAINING) {
      await this.drain();
    }

    // Terminate all workers
    const terminationPromises = [];
    for (const worker of this.workers.values()) {
      terminationPromises.push(worker.terminate());
    }
    await Promise.all(terminationPromises);

    this.workers.clear();
    this._setState(PoolState.TERMINATED);
    this.emit('terminated', { timestamp: Date.now() });

    return this;
  }

  /**
   * Submit a task for execution
   * @param {Object} task - Task object
   * @returns {Promise<Object>} Task result
   */
  async submit(task) {
    if (this.state === PoolState.DRAINING || this.state === PoolState.TERMINATED) {
      throw new Error(`Cannot submit task in state: ${this.state}`);
    }

    this.stats.totalTasksSubmitted++;

    // Add to queue
    const queuedTask = this.taskQueue.enqueue(task);
    this.emit('task:queued', {
      taskId: task.id,
      queueSize: this.taskQueue.size(),
      timestamp: Date.now(),
    });

    // Process queue if not paused
    if (this.state === PoolState.READY) {
      this._processQueue();
    }

    // Wait for task to complete
    return this._waitForTask(task.id);
  }

  /**
   * Submit multiple tasks as a batch
   * @param {Array<Object>} tasks - Array of task objects
   * @returns {Promise<Array<Object>>} Array of task results
   */
  async submitBatch(tasks) {
    const submissions = tasks.map(task => this.submit(task));
    return Promise.all(submissions);
  }

  /**
   * Cancel a queued or active task
   * @param {string} taskId - Task ID to cancel
   * @returns {boolean} True if cancelled
   */
  async cancel(taskId) {
    // Try to remove from queue first
    if (this.taskQueue.remove(taskId)) {
      this.emit('task:cancelled', {
        taskId,
        reason: 'removed from queue',
        timestamp: Date.now(),
      });
      return true;
    }

    // Check if task is active
    const activeTask = this.activeTasks.get(taskId);
    if (activeTask) {
      // For now, we can't cancel active tasks
      // Would need to implement cancellation tokens
      this.emit('task:cancel:failed', {
        taskId,
        reason: 'task is currently executing',
        timestamp: Date.now(),
      });
      return false;
    }

    return false;
  }

  /**
   * Retry a failed task
   * @param {string} taskId - Task ID to retry
   * @returns {Promise<Object>} Task result
   */
  async retry(taskId) {
    const failedTask = this.failedTasks.get(taskId);
    if (!failedTask) {
      throw new Error(`Task ${taskId} not found in failed tasks`);
    }

    // Remove from failed tasks
    this.failedTasks.delete(taskId);

    // Resubmit
    return this.submit(failedTask.task);
  }

  /**
   * Set concurrency limit
   * @param {number} count - New concurrency limit
   */
  setConcurrency(count) {
    if (count < 1) {
      throw new Error('Concurrency must be at least 1');
    }

    this.config.maxConcurrency = count;
    this.currentConcurrency = count;

    this.emit('concurrency:changed', {
      newConcurrency: count,
      timestamp: Date.now(),
    });

    // Adjust worker pool size if needed
    this._adjustWorkerPool();
  }

  /**
   * Set concurrency mode
   * @param {string} mode - Concurrency mode (fixed, dynamic, adaptive)
   * @param {Object} options - Mode-specific options
   */
  setMode(mode, options = {}) {
    if (!Object.values(ConcurrencyMode).includes(mode)) {
      throw new Error(`Invalid mode: ${mode}`);
    }

    this.config.mode = mode;
    Object.assign(this.config, options);

    this.emit('mode:changed', {
      mode,
      options,
      timestamp: Date.now(),
    });

    this._adjustWorkerPool();
  }

  /**
   * Update resource limits
   * @param {Object} limits - New resource limits
   */
  updateResourceLimits(limits) {
    Object.assign(this.config, limits);

    this.emit('resources:updated', {
      limits,
      timestamp: Date.now(),
    });
  }

  /**
   * Get pool status
   * @returns {Object} Status object
   */
  getStatus() {
    return {
      state: this.state,
      mode: this.config.mode,
      concurrency: {
        current: this.currentConcurrency,
        max: this.config.maxConcurrency,
      },
      workers: {
        total: this.workers.size,
        idle: this._getIdleWorkers().length,
        busy: this._getBusyWorkers().length,
      },
      tasks: {
        queued: this.taskQueue.size(),
        active: this.activeTasks.size,
        completed: this.completedTasks.size,
        failed: this.failedTasks.size,
      },
      stats: { ...this.stats },
    };
  }

  /**
   * Get pool metrics
   * @returns {Object} Metrics object
   */
  getMetrics() {
    const metrics = {
      totalTasks: this.stats.totalTasksSubmitted,
      completedTasks: this.stats.totalTasksCompleted,
      failedTasks: this.stats.totalTasksFailed,
      queuedTasks: this.taskQueue.size(),
      activeTasks: this.activeTasks.size,
      percentComplete:
        this.stats.totalTasksSubmitted > 0
          ? (this.stats.totalTasksCompleted / this.stats.totalTasksSubmitted) * 100
          : 0,
      successRate:
        this.stats.totalTasksCompleted + this.stats.totalTasksFailed > 0
          ? (this.stats.totalTasksCompleted /
              (this.stats.totalTasksCompleted + this.stats.totalTasksFailed)) *
            100
          : 0,
      workers: {
        total: this.workers.size,
        idle: this._getIdleWorkers().length,
        busy: this._getBusyWorkers().length,
      },
    };

    // Calculate average task duration if we have completed tasks
    if (this.stats.totalTasksCompleted > 0) {
      let totalDuration = 0;
      for (const worker of this.workers.values()) {
        totalDuration += worker.stats.totalExecutionTime;
      }
      metrics.averageTaskDuration = totalDuration / this.stats.totalTasksCompleted;
    }

    return metrics;
  }

  /**
   * Get active tasks
   * @returns {Array} Array of active task info
   */
  getActiveTasks() {
    return Array.from(this.activeTasks.entries()).map(([taskId, info]) => ({
      taskId,
      workerId: info.workerId,
      startTime: info.startTime,
      duration: Date.now() - info.startTime,
    }));
  }

  /**
   * Get queued tasks
   * @returns {Array} Array of queued tasks
   */
  getQueuedTasks() {
    return this.taskQueue.toArray();
  }

  /**
   * Process task queue
   * @private
   */
  _processQueue() {
    // Don't process if paused or draining
    if (this.state === PoolState.PAUSED || this.state === PoolState.DRAINING) {
      return;
    }

    // Get available workers
    const idleWorkers = this._getIdleWorkers();

    // Assign tasks to idle workers
    while (!this.taskQueue.isEmpty() && idleWorkers.length > 0) {
      const worker = idleWorkers.shift();
      const task = this.taskQueue.dequeue();

      this._assignTaskToWorker(worker, task);
    }

    // Spawn more workers if needed
    if (!this.taskQueue.isEmpty() && this.workers.size < this.currentConcurrency) {
      const workersToSpawn = Math.min(
        this.taskQueue.size(),
        this.currentConcurrency - this.workers.size
      );

      this._spawnWorkers(workersToSpawn).then(() => {
        this._processQueue();
      });
    }

    // Update state
    if (this.activeTasks.size > 0) {
      this._setState(PoolState.EXECUTING);
    } else if (this.taskQueue.isEmpty()) {
      this._setState(PoolState.READY);
    }
  }

  /**
   * Assign task to worker
   * @param {Worker} worker - Worker to assign to
   * @param {Object} task - Task to assign
   * @private
   */
  _assignTaskToWorker(worker, task) {
    // Track active task
    this.activeTasks.set(task.id, {
      workerId: worker.id,
      task,
      startTime: Date.now(),
    });

    // Execute task
    worker
      .execute(task)
      .then(result => {
        this._handleTaskSuccess(task.id, result);
      })
      .catch(error => {
        this._handleTaskFailure(task.id, task, error);
      });
  }

  /**
   * Handle successful task completion
   * @param {string} taskId - Task ID
   * @param {Object} result - Task result
   * @private
   */
  _handleTaskSuccess(taskId, result) {
    this.activeTasks.delete(taskId);
    this.completedTasks.set(taskId, result);
    this.stats.totalTasksCompleted++;

    this.emit('task:completed', {
      taskId,
      result,
      timestamp: Date.now(),
    });

    // Continue processing queue
    this._processQueue();
  }

  /**
   * Handle task failure
   * @param {string} taskId - Task ID
   * @param {Object} task - Task object
   * @param {Error} error - Error that occurred
   * @private
   */
  _handleTaskFailure(taskId, task, error) {
    this.activeTasks.delete(taskId);

    // Check if we should retry
    if (task.retryCount < task.maxRetries) {
      task.retryCount++;

      this.emit('task:retry', {
        taskId,
        retryCount: task.retryCount,
        maxRetries: task.maxRetries,
        error: error.message,
        timestamp: Date.now(),
      });

      // Re-enqueue with exponential backoff
      const backoffDelay = Math.min(1000 * Math.pow(2, task.retryCount - 1), 30000);
      setTimeout(() => {
        this.taskQueue.enqueue(task);
        this._processQueue();
      }, backoffDelay);
    } else {
      // Max retries reached, mark as failed
      this.failedTasks.set(taskId, { task, error });
      this.stats.totalTasksFailed++;

      this.emit('task:failed', {
        taskId,
        error: error.message,
        retryCount: task.retryCount,
        timestamp: Date.now(),
      });
    }

    // Continue processing queue
    this._processQueue();
  }

  /**
   * Wait for task to complete
   * @param {string} taskId - Task ID to wait for
   * @returns {Promise<Object>} Task result
   * @private
   */
  _waitForTask(taskId) {
    return new Promise((resolve, reject) => {
      const checkCompletion = () => {
        // Check if completed
        if (this.completedTasks.has(taskId)) {
          resolve(this.completedTasks.get(taskId));
          return;
        }

        // Check if failed
        if (this.failedTasks.has(taskId)) {
          const failure = this.failedTasks.get(taskId);
          reject(failure.error);
          return;
        }

        // Still pending, check again
        setTimeout(checkCompletion, 100);
      };

      checkCompletion();
    });
  }

  /**
   * Spawn new workers
   * @param {number} count - Number of workers to spawn
   * @private
   */
  async _spawnWorkers(count) {
    const spawnPromises = [];

    for (let i = 0; i < count; i++) {
      const workerId = this.nextWorkerId++;
      const worker = new Worker(workerId, this, this.config);

      // Listen to worker events
      this._attachWorkerListeners(worker);

      // Spawn worker
      spawnPromises.push(worker.spawn());

      this.workers.set(workerId, worker);
      this.stats.totalWorkersSpawned++;

      // Add delay between spawns to prevent thundering herd
      if (i < count - 1) {
        await this._sleep(this.config.workerSpawnDelay);
      }
    }

    await Promise.all(spawnPromises);
  }

  /**
   * Attach event listeners to worker
   * @param {Worker} worker - Worker to attach listeners to
   * @private
   */
  _attachWorkerListeners(worker) {
    worker.on('progress', data => {
      this.emit('worker:progress', data);
    });

    worker.on('stateChange', data => {
      this.emit('worker:stateChange', data);
    });
  }

  /**
   * Adjust worker pool size based on mode and demand
   * @private
   */
  _adjustWorkerPool() {
    // Implementation depends on mode
    // For now, just ensure we don't exceed max concurrency
    const targetWorkers = Math.min(this.currentConcurrency, this.config.maxWorkers);

    if (this.workers.size > targetWorkers) {
      // Terminate excess idle workers
      const idleWorkers = this._getIdleWorkers();
      const excess = this.workers.size - targetWorkers;

      for (let i = 0; i < excess && i < idleWorkers.length; i++) {
        const worker = idleWorkers[i];
        worker.terminate().then(() => {
          this.workers.delete(worker.id);
          this.stats.totalWorkersTerminated++;
        });
      }
    }
  }

  /**
   * Get idle workers
   * @returns {Array<Worker>} Array of idle workers
   * @private
   */
  _getIdleWorkers() {
    return Array.from(this.workers.values()).filter(w => w.isAvailable());
  }

  /**
   * Get busy workers
   * @returns {Array<Worker>} Array of busy workers
   * @private
   */
  _getBusyWorkers() {
    return Array.from(this.workers.values()).filter(w => w.isBusy());
  }

  /**
   * Set pool state
   * @param {string} state - New state
   * @private
   */
  _setState(state) {
    const oldState = this.state;
    this.state = state;
    this.emit('stateChange', {
      oldState,
      newState: state,
      timestamp: Date.now(),
    });
  }

  /**
   * Sleep helper
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Sleep promise
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export WorkerPool class and constants
module.exports = WorkerPool;
module.exports.PoolState = PoolState;
module.exports.ConcurrencyMode = ConcurrencyMode;
