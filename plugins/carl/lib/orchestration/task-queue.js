/**
 * Task Queue - Priority-based queue for managing task distribution
 *
 * Supports multiple queuing strategies:
 * - FIFO (First-In-First-Out)
 * - Priority-based (high > medium > low)
 * - LIFO (Last-In-First-Out)
 */

class TaskQueue {
  constructor(strategy = 'fifo') {
    this.strategy = strategy;
    this.queue = [];
    this.taskMap = new Map(); // taskId -> task
  }

  /**
   * Add task to queue
   * @param {Object} task - Task object with id, priority, etc.
   */
  enqueue(task) {
    if (!task.id) {
      throw new Error('Task must have an id');
    }

    if (this.taskMap.has(task.id)) {
      throw new Error(`Task ${task.id} already in queue`);
    }

    const queuedTask = {
      ...task,
      enqueuedAt: new Date(),
      retryCount: task.retryCount || 0,
      maxRetries: task.maxRetries || 3,
      priority: task.priority || 'medium',
      timeout: task.timeout || 600000, // 10 minutes default
    };

    this.queue.push(queuedTask);
    this.taskMap.set(task.id, queuedTask);

    // Reorder based on strategy
    this._reorder();

    return queuedTask;
  }

  /**
   * Remove and return next task from queue
   * @returns {Object|null} Next task or null if empty
   */
  dequeue() {
    if (this.isEmpty()) {
      return null;
    }

    // For LIFO, pop from end; for FIFO/priority, shift from beginning
    const task = this.strategy === 'lifo' ? this.queue.pop() : this.queue.shift();
    this.taskMap.delete(task.id);
    return task;
  }

  /**
   * View next task without removing
   * @returns {Object|null} Next task or null if empty
   */
  peek() {
    return this.queue.length > 0 ? this.queue[0] : null;
  }

  /**
   * Remove specific task from queue
   * @param {string} taskId - Task ID to remove
   * @returns {boolean} True if removed, false if not found
   */
  remove(taskId) {
    const index = this.queue.findIndex(t => t.id === taskId);
    if (index === -1) {
      return false;
    }

    this.queue.splice(index, 1);
    this.taskMap.delete(taskId);
    return true;
  }

  /**
   * Clear all tasks from queue
   */
  clear() {
    this.queue = [];
    this.taskMap.clear();
  }

  /**
   * Get queue size
   * @returns {number} Number of tasks in queue
   */
  size() {
    return this.queue.length;
  }

  /**
   * Check if queue is empty
   * @returns {boolean} True if empty
   */
  isEmpty() {
    return this.queue.length === 0;
  }

  /**
   * Check if task is in queue
   * @param {string} taskId - Task ID to check
   * @returns {boolean} True if in queue
   */
  contains(taskId) {
    return this.taskMap.has(taskId);
  }

  /**
   * Get task by ID
   * @param {string} taskId - Task ID
   * @returns {Object|undefined} Task object or undefined
   */
  getTask(taskId) {
    return this.taskMap.get(taskId);
  }

  /**
   * Update task priority
   * @param {string} taskId - Task ID
   * @param {string} priority - New priority (high, medium, low)
   */
  setPriority(taskId, priority) {
    const task = this.taskMap.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found in queue`);
    }

    task.priority = priority;
    this._reorder();
  }

  /**
   * Get all tasks as array
   * @returns {Array} Array of tasks
   */
  toArray() {
    return [...this.queue];
  }

  /**
   * Reorder queue based on strategy
   * @private
   */
  _reorder() {
    switch (this.strategy) {
      case 'fifo':
        // Already in FIFO order
        break;

      case 'priority':
        this._sortByPriority();
        break;

      case 'lifo':
        // For LIFO, we don't reorder the whole queue
        // Just ensure newest items are at the front during dequeue
        // This is handled in dequeue method
        break;

      default:
        // Don't throw on unknown strategy during enqueue
        // Will fail more gracefully on dequeue
        break;
    }
  }

  /**
   * Sort queue by priority (high > medium > low)
   * Within same priority, maintain FIFO order
   * @private
   */
  _sortByPriority() {
    const priorityMap = { high: 3, medium: 2, low: 1 };

    this.queue.sort((a, b) => {
      const priorityDiff = priorityMap[b.priority] - priorityMap[a.priority];

      // If same priority, maintain FIFO order (earlier enqueuedAt first)
      if (priorityDiff === 0) {
        return a.enqueuedAt - b.enqueuedAt;
      }

      return priorityDiff;
    });
  }

  /**
   * Get queue statistics
   * @returns {Object} Stats object
   */
  getStats() {
    const stats = {
      total: this.queue.length,
      byPriority: {
        high: 0,
        medium: 0,
        low: 0,
      },
      oldestTask: null,
      newestTask: null,
    };

    if (this.queue.length > 0) {
      // Count by priority
      this.queue.forEach(task => {
        stats.byPriority[task.priority]++;
      });

      // Find oldest and newest
      const sorted = [...this.queue].sort((a, b) => a.enqueuedAt - b.enqueuedAt);
      stats.oldestTask = {
        id: sorted[0].id,
        enqueuedAt: sorted[0].enqueuedAt,
        waitTime: Date.now() - sorted[0].enqueuedAt.getTime(),
      };
      stats.newestTask = {
        id: sorted[sorted.length - 1].id,
        enqueuedAt: sorted[sorted.length - 1].enqueuedAt,
        waitTime: Date.now() - sorted[sorted.length - 1].enqueuedAt.getTime(),
      };
    }

    return stats;
  }
}

module.exports = TaskQueue;
