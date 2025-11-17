/**
 * Timeout Manager for HOP/LOP Agent Communication
 *
 * Implements timeout management and graceful cancellation for worker tasks:
 * - Configurable timeout per task type
 * - Timeout detection and worker notification
 * - Graceful cancellation signals
 * - Forced termination after grace period
 * - Event logging for timeout and cancellation
 *
 * Follows IndyDevDan's orchestration principles:
 * - Observable by default (emit all events)
 * - Graceful degradation (graceful shutdown first, forced last resort)
 * - Event-driven coordination
 */

const EventEmitter = require('events');
const { MessageFactory } = require('./message-serializer');

/**
 * Timeout strategies
 */
const TimeoutStrategy = {
  SOFT: 'soft', // Send notification but allow continuation
  HARD: 'hard', // Force cancellation on timeout
  GRACEFUL: 'graceful', // Attempt graceful shutdown, then force
};

/**
 * Task states for timeout tracking
 */
const TaskState = {
  ACTIVE: 'active',
  WARNING: 'warning', // Approaching timeout
  TIMEOUT: 'timeout',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
};

/**
 * Tracked task entry
 */
class TaskEntry {
  constructor(taskId, workerId, options = {}) {
    this.taskId = taskId;
    this.workerId = workerId;
    this.correlationId = options.correlationId;
    this.state = TaskState.ACTIVE;
    this.startTime = Date.now();
    this.timeout = options.timeout || 300000; // 5 minutes default
    this.warningThreshold = options.warningThreshold || 0.8; // Warn at 80%
    this.gracePeriod = options.gracePeriod || 5000; // 5 seconds grace
    this.strategy = options.strategy || TimeoutStrategy.GRACEFUL;
    this.warningSent = false;
    this.cancellationSent = false;
    this.terminationTime = null;
    this.metadata = options.metadata || {};
  }

  getElapsedTime() {
    return Date.now() - this.startTime;
  }

  getRemainingTime() {
    return Math.max(0, this.timeout - this.getElapsedTime());
  }

  getProgressPercentage() {
    return Math.min(100, (this.getElapsedTime() / this.timeout) * 100);
  }

  isExpired() {
    return this.getElapsedTime() >= this.timeout;
  }

  shouldWarn() {
    return !this.warningSent && this.getElapsedTime() >= this.timeout * this.warningThreshold;
  }

  shouldForceTerminate() {
    return (
      this.cancellationSent &&
      this.terminationTime &&
      Date.now() >= this.terminationTime + this.gracePeriod
    );
  }

  markWarning() {
    this.state = TaskState.WARNING;
    this.warningSent = true;
  }

  markTimeout() {
    this.state = TaskState.TIMEOUT;
  }

  markCancelled() {
    this.state = TaskState.CANCELLED;
    this.cancellationSent = true;
    this.terminationTime = Date.now();
  }

  markCompleted() {
    this.state = TaskState.COMPLETED;
  }

  toJSON() {
    return {
      taskId: this.taskId,
      workerId: this.workerId,
      correlationId: this.correlationId,
      state: this.state,
      startTime: this.startTime,
      timeout: this.timeout,
      elapsedTime: this.getElapsedTime(),
      remainingTime: this.getRemainingTime(),
      progressPercentage: this.getProgressPercentage(),
      strategy: this.strategy,
      warningSent: this.warningSent,
      cancellationSent: this.cancellationSent,
      metadata: this.metadata,
    };
  }
}

/**
 * Timeout configuration per task type
 */
const DEFAULT_TIMEOUTS = {
  Task: 300000, // 5 minutes
  Story: 600000, // 10 minutes
  Feature: 1800000, // 30 minutes
  Epic: 3600000, // 1 hour
  Phase: 900000, // 15 minutes
  Bug: 300000, // 5 minutes
};

/**
 * Timeout Manager
 */
class TimeoutManager extends EventEmitter {
  /**
   * Create a timeout manager
   * @param {Object} options - Manager configuration
   */
  constructor(options = {}) {
    super();

    this.options = {
      checkInterval: options.checkInterval || 1000, // Check every second
      defaultTimeout: options.defaultTimeout || 300000, // 5 minutes
      defaultStrategy: options.defaultStrategy || TimeoutStrategy.GRACEFUL,
      defaultGracePeriod: options.defaultGracePeriod || 5000, // 5 seconds
      warningThreshold: options.warningThreshold || 0.8, // Warn at 80%
      enableMetrics: options.enableMetrics !== false,
      customTimeouts: options.customTimeouts || {},
    };

    // Merge custom timeouts with defaults
    this.timeouts = { ...DEFAULT_TIMEOUTS, ...this.options.customTimeouts };

    // Active tasks
    this.tasks = new Map(); // taskId -> TaskEntry

    // Metrics
    this.metrics = {
      tasksTracked: 0,
      warningsSent: 0,
      timeoutsDetected: 0,
      cancellationsSent: 0,
      forcedTerminations: 0,
      tasksCompleted: 0,
    };

    // Check timer
    this.checkTimer = null;
    this._startChecking();
  }

  /**
   * Track a new task
   * @param {string} taskId - Task ID
   * @param {string} workerId - Worker ID
   * @param {Object} options - Task options
   * @returns {string} Task ID
   */
  trackTask(taskId, workerId, options = {}) {
    if (this.tasks.has(taskId)) {
      throw new Error(`Task already tracked: ${taskId}`);
    }

    // Determine timeout based on task type
    const taskType = options.taskType || 'Task';
    const timeout = options.timeout || this.timeouts[taskType] || this.options.defaultTimeout;

    const entry = new TaskEntry(taskId, workerId, {
      ...options,
      timeout,
      strategy: options.strategy || this.options.defaultStrategy,
      gracePeriod: options.gracePeriod || this.options.defaultGracePeriod,
      warningThreshold: options.warningThreshold || this.options.warningThreshold,
    });

    this.tasks.set(taskId, entry);
    this.metrics.tasksTracked++;

    this.emit('task:tracked', {
      taskId,
      workerId,
      timeout,
      timestamp: Date.now(),
    });

    return taskId;
  }

  /**
   * Untrack a task (mark as completed)
   * @param {string} taskId - Task ID
   * @returns {boolean} Success
   */
  untrackTask(taskId) {
    const entry = this.tasks.get(taskId);
    if (!entry) {
      return false;
    }

    entry.markCompleted();
    this.tasks.delete(taskId);
    this.metrics.tasksCompleted++;

    this.emit('task:completed', {
      taskId,
      duration: entry.getElapsedTime(),
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Cancel a task
   * @param {string} taskId - Task ID
   * @param {Object} options - Cancellation options
   * @returns {Promise<boolean>} Success
   */
  async cancelTask(taskId, options = {}) {
    const entry = this.tasks.get(taskId);
    if (!entry) {
      return false;
    }

    const reason = options.reason || 'User requested cancellation';
    const graceful = options.graceful !== false;
    const savePartialResults = options.savePartialResults !== false;

    // Create cancellation message
    const cancellationMessage = MessageFactory.createCancellationRequest({
      orchestratorId: options.orchestratorId || 'unknown',
      workerId: entry.workerId,
      correlationId: entry.correlationId,
      cancellation: {
        workItemId: taskId,
        reason,
        graceful,
        gracePeriod: entry.gracePeriod,
        savePartialResults,
      },
    });

    entry.markCancelled();
    this.metrics.cancellationsSent++;

    this.emit('task:cancellation:sent', {
      taskId,
      workerId: entry.workerId,
      reason,
      graceful,
      message: cancellationMessage,
      timestamp: Date.now(),
    });

    // If not graceful, force terminate immediately
    if (!graceful) {
      this._forceTerminate(taskId);
    }

    return true;
  }

  /**
   * Cancel all tasks for a worker
   * @param {string} workerId - Worker ID
   * @param {Object} options - Cancellation options
   * @returns {Promise<number>} Number of tasks cancelled
   */
  async cancelWorkerTasks(workerId, options = {}) {
    const workerTasks = Array.from(this.tasks.values()).filter(
      entry => entry.workerId === workerId
    );

    let cancelledCount = 0;
    for (const entry of workerTasks) {
      const success = await this.cancelTask(entry.taskId, options);
      if (success) cancelledCount++;
    }

    return cancelledCount;
  }

  /**
   * Get task entry
   * @param {string} taskId - Task ID
   * @returns {TaskEntry|null}
   */
  getTask(taskId) {
    return this.tasks.get(taskId) || null;
  }

  /**
   * Get all tracked tasks
   * @returns {Array<TaskEntry>}
   */
  getAllTasks() {
    return Array.from(this.tasks.values());
  }

  /**
   * Get tasks by worker
   * @param {string} workerId - Worker ID
   * @returns {Array<TaskEntry>}
   */
  getTasksByWorker(workerId) {
    return Array.from(this.tasks.values()).filter(entry => entry.workerId === workerId);
  }

  /**
   * Get tasks by state
   * @param {string} state - Task state
   * @returns {Array<TaskEntry>}
   */
  getTasksByState(state) {
    return Array.from(this.tasks.values()).filter(entry => entry.state === state);
  }

  /**
   * Update timeout for a task type
   * @param {string} taskType - Task type (Task, Story, Feature, etc.)
   * @param {number} timeout - Timeout in milliseconds
   */
  setTimeoutForType(taskType, timeout) {
    this.timeouts[taskType] = timeout;
  }

  /**
   * Get timeout for a task type
   * @param {string} taskType - Task type
   * @returns {number} Timeout in milliseconds
   */
  getTimeoutForType(taskType) {
    return this.timeouts[taskType] || this.options.defaultTimeout;
  }

  /**
   * Get manager statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const tasks = Array.from(this.tasks.values());

    return {
      activeTasks: this.tasks.size,
      tasksByState: {
        active: tasks.filter(t => t.state === TaskState.ACTIVE).length,
        warning: tasks.filter(t => t.state === TaskState.WARNING).length,
        timeout: tasks.filter(t => t.state === TaskState.TIMEOUT).length,
        cancelled: tasks.filter(t => t.state === TaskState.CANCELLED).length,
      },
      metrics: { ...this.metrics },
      timeouts: { ...this.timeouts },
    };
  }

  /**
   * Start timeout checking
   * @private
   */
  _startChecking() {
    if (this.checkTimer) {
      return;
    }

    this.checkTimer = setInterval(() => {
      this._checkTimeouts();
    }, this.options.checkInterval);
  }

  /**
   * Check all tasks for timeouts
   * @private
   */
  _checkTimeouts() {
    const now = Date.now();

    for (const [taskId, entry] of this.tasks.entries()) {
      // Skip completed or already timed out
      if (entry.state === TaskState.COMPLETED || entry.state === TaskState.TIMEOUT) {
        continue;
      }

      // Check for warning threshold
      if (entry.shouldWarn()) {
        this._sendWarning(taskId, entry);
      }

      // Check for timeout
      if (entry.isExpired()) {
        this._handleTimeout(taskId, entry);
      }

      // Check for forced termination
      if (entry.shouldForceTerminate()) {
        this._forceTerminate(taskId);
      }
    }
  }

  /**
   * Send warning for approaching timeout
   * @param {string} taskId - Task ID
   * @param {TaskEntry} entry - Task entry
   * @private
   */
  _sendWarning(taskId, entry) {
    entry.markWarning();
    this.metrics.warningsSent++;

    this.emit('task:warning', {
      taskId,
      workerId: entry.workerId,
      elapsedTime: entry.getElapsedTime(),
      remainingTime: entry.getRemainingTime(),
      progressPercentage: entry.getProgressPercentage(),
      timestamp: Date.now(),
    });
  }

  /**
   * Handle task timeout
   * @param {string} taskId - Task ID
   * @param {TaskEntry} entry - Task entry
   * @private
   */
  async _handleTimeout(taskId, entry) {
    entry.markTimeout();
    this.metrics.timeoutsDetected++;

    this.emit('task:timeout', {
      taskId,
      workerId: entry.workerId,
      elapsedTime: entry.getElapsedTime(),
      timeout: entry.timeout,
      timestamp: Date.now(),
    });

    // Handle based on strategy
    switch (entry.strategy) {
      case TimeoutStrategy.SOFT:
        // Just log, allow to continue
        break;

      case TimeoutStrategy.HARD:
        // Force immediate termination
        await this.cancelTask(taskId, { graceful: false });
        this._forceTerminate(taskId);
        break;

      case TimeoutStrategy.GRACEFUL:
        // Attempt graceful cancellation
        await this.cancelTask(taskId, { graceful: true });
        break;

      default:
        // Default to graceful
        await this.cancelTask(taskId, { graceful: true });
    }
  }

  /**
   * Force terminate a task
   * @param {string} taskId - Task ID
   * @private
   */
  _forceTerminate(taskId) {
    const entry = this.tasks.get(taskId);
    if (!entry) {
      return;
    }

    this.metrics.forcedTerminations++;

    this.emit('task:forced:termination', {
      taskId,
      workerId: entry.workerId,
      elapsedTime: entry.getElapsedTime(),
      timestamp: Date.now(),
    });

    // Remove from tracking
    this.tasks.delete(taskId);
  }

  /**
   * Stop timeout manager and cleanup
   */
  stop() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }

    this.emit('manager:stopped', { timestamp: Date.now() });
  }
}

// Export
module.exports = {
  TimeoutManager,
  TaskEntry,
  TimeoutStrategy,
  TaskState,
  DEFAULT_TIMEOUTS,
};
