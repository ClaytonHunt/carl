/**
 * Worker - Individual execution unit for work items
 *
 * Handles task execution with progress reporting, timeout enforcement,
 * and error handling.
 */

const EventEmitter = require('events');

// Worker states
const WorkerState = {
  SPAWNING: 'spawning',
  IDLE: 'idle',
  ASSIGNED: 'assigned',
  EXECUTING: 'executing',
  COMPLETING: 'completing',
  FAILED: 'failed',
  TERMINATED: 'terminated',
};

class Worker extends EventEmitter {
  constructor(id, pool, config = {}) {
    super();
    this.id = id;
    this.pool = pool;
    this.config = {
      timeout: config.timeout || 600000, // 10 minutes
      enableProgressReporting: config.enableProgressReporting !== false,
      ...config,
    };

    this.state = WorkerState.SPAWNING;
    this.currentTask = null;
    this.startTime = null;
    this.completionTime = null;
    this.error = null;
    this.result = null;
    this.progressPercent = 0;
    this.progressMessage = '';

    // Statistics
    this.stats = {
      tasksCompleted: 0,
      tasksFailed: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
    };
  }

  /**
   * Initialize worker (transition from SPAWNING to IDLE)
   */
  async spawn() {
    this._setState(WorkerState.IDLE);
    this.emit('spawned', { workerId: this.id });
    return this;
  }

  /**
   * Execute a task
   * @param {Object} task - Task to execute
   * @returns {Promise<Object>} Task result
   */
  async execute(task) {
    if (this.state !== WorkerState.IDLE) {
      throw new Error(`Worker ${this.id} not idle (state: ${this.state})`);
    }

    this.currentTask = task;
    this._setState(WorkerState.ASSIGNED);
    this.emit('assigned', { workerId: this.id, taskId: task.id });

    try {
      // Start execution
      this._setState(WorkerState.EXECUTING);
      this.startTime = Date.now();
      this.emit('started', {
        workerId: this.id,
        taskId: task.id,
        startTime: this.startTime,
      });

      // Execute with timeout
      const result = await this._executeWithTimeout(task);

      // Complete successfully
      this._setState(WorkerState.COMPLETING);
      this.completionTime = Date.now();
      this.result = result;

      const executionTime = this.completionTime - this.startTime;
      this.stats.tasksCompleted++;
      this.stats.totalExecutionTime += executionTime;
      this.stats.averageExecutionTime =
        this.stats.totalExecutionTime /
        (this.stats.tasksCompleted + this.stats.tasksFailed);

      this.emit('completed', {
        workerId: this.id,
        taskId: task.id,
        result,
        executionTime,
      });

      // Return to idle state
      this._cleanup();
      this._setState(WorkerState.IDLE);

      return result;
    } catch (error) {
      // Handle failure
      this._setState(WorkerState.FAILED);
      this.error = error;

      const executionTime = Date.now() - this.startTime;
      this.stats.tasksFailed++;
      this.stats.totalExecutionTime += executionTime;
      this.stats.averageExecutionTime =
        this.stats.totalExecutionTime /
        (this.stats.tasksCompleted + this.stats.tasksFailed);

      this.emit('failed', {
        workerId: this.id,
        taskId: task.id,
        error,
        executionTime,
      });

      // Return to idle state for retry
      this._cleanup();
      this._setState(WorkerState.IDLE);

      throw error;
    }
  }

  /**
   * Execute task with timeout enforcement
   * @param {Object} task - Task to execute
   * @returns {Promise<Object>} Task result
   * @private
   */
  async _executeWithTimeout(task) {
    const timeout = task.timeout || this.config.timeout;

    return Promise.race([
      this._executeTask(task),
      this._createTimeout(timeout, task.id),
    ]);
  }

  /**
   * Execute the actual task
   * @param {Object} task - Task to execute
   * @returns {Promise<Object>} Task result
   * @private
   */
  async _executeTask(task) {
    // Report initial progress
    this.reportProgress(0, 'Task started');

    // Simulate task execution for now
    // In real implementation, this would:
    // 1. Delegate to specialized agents (via Task tool)
    // 2. Execute commands (via SlashCommand tool)
    // 3. Execute tools (Read/Write/Edit/Bash)
    // 4. Call helper functions from work-helpers.js

    // For now, just simulate some work
    const steps = 5;
    for (let i = 1; i <= steps; i++) {
      await this._sleep(100);
      const percent = (i / steps) * 100;
      this.reportProgress(percent, `Step ${i}/${steps} complete`);
    }

    return {
      taskId: task.id,
      status: 'completed',
      message: 'Task executed successfully',
      timestamp: Date.now(),
    };
  }

  /**
   * Create timeout promise
   * @param {number} ms - Timeout in milliseconds
   * @param {string} taskId - Task ID for error message
   * @returns {Promise} Timeout promise
   * @private
   */
  _createTimeout(ms, taskId) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Task ${taskId} timed out after ${ms}ms`));
      }, ms);
    });
  }

  /**
   * Report task progress
   * @param {number} percent - Progress percentage (0-100)
   * @param {string} message - Progress message
   */
  reportProgress(percent, message = '') {
    if (!this.config.enableProgressReporting) {
      return;
    }

    this.progressPercent = Math.min(100, Math.max(0, percent));
    this.progressMessage = message;

    this.emit('progress', {
      workerId: this.id,
      taskId: this.currentTask?.id,
      percent: this.progressPercent,
      message: this.progressMessage,
      timestamp: Date.now(),
    });
  }

  /**
   * Terminate worker
   */
  async terminate() {
    if (this.state === WorkerState.EXECUTING) {
      throw new Error(
        `Cannot terminate worker ${this.id} while executing task ${this.currentTask?.id}`
      );
    }

    this._setState(WorkerState.TERMINATED);
    this._cleanup();
    this.emit('terminated', { workerId: this.id });
  }

  /**
   * Get current state
   * @returns {string} Current state
   */
  getState() {
    return this.state;
  }

  /**
   * Get current task
   * @returns {Object|null} Current task or null
   */
  getCurrentTask() {
    return this.currentTask;
  }

  /**
   * Get worker statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      ...this.stats,
      currentState: this.state,
      currentTask: this.currentTask?.id || null,
      uptime: Date.now() - (this.startTime || Date.now()),
    };
  }

  /**
   * Check if worker is available
   * @returns {boolean} True if idle
   */
  isAvailable() {
    return this.state === WorkerState.IDLE;
  }

  /**
   * Check if worker is busy
   * @returns {boolean} True if executing
   */
  isBusy() {
    return this.state === WorkerState.EXECUTING;
  }

  /**
   * Set worker state
   * @param {string} state - New state
   * @private
   */
  _setState(state) {
    const oldState = this.state;
    this.state = state;
    this.emit('stateChange', {
      workerId: this.id,
      oldState,
      newState: state,
      timestamp: Date.now(),
    });
  }

  /**
   * Clean up after task completion/failure
   * @private
   */
  _cleanup() {
    this.currentTask = null;
    this.startTime = null;
    this.completionTime = null;
    this.error = null;
    this.result = null;
    this.progressPercent = 0;
    this.progressMessage = '';
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

// Export Worker class and states
module.exports = Worker;
module.exports.WorkerState = WorkerState;
