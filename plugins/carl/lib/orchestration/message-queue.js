/**
 * Message Queue for HOP/LOP Agent Communication
 *
 * Implements an in-memory message queue with:
 * - FIFO ordering with priority support
 * - Message persistence for crash recovery
 * - Message acknowledgment and retry logic
 * - Message expiration and cleanup
 * - Event-driven notifications
 *
 * Follows IndyDevDan's async orchestration principles:
 * - Event-driven coordination
 * - Observable by default
 * - Graceful degradation
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Message priority levels
 */
const Priority = {
  CRITICAL: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
};

/**
 * Message states
 */
const MessageState = {
  QUEUED: 'queued',
  PROCESSING: 'processing',
  ACKNOWLEDGED: 'acknowledged',
  FAILED: 'failed',
  EXPIRED: 'expired',
};

/**
 * Queue entry wrapper
 */
class QueueEntry {
  constructor(message, options = {}) {
    this.id = crypto.randomUUID ? crypto.randomUUID() : this._generateId();
    this.message = message;
    this.priority = options.priority || Priority.NORMAL;
    this.state = MessageState.QUEUED;
    this.enqueuedAt = Date.now();
    this.processingStartedAt = null;
    this.acknowledgedAt = null;
    this.expiresAt = options.ttl ? Date.now() + options.ttl : null;
    this.retryCount = 0;
    this.maxRetries = options.maxRetries || 3;
    this.lastError = null;
  }

  _generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  isExpired() {
    return this.expiresAt !== null && Date.now() > this.expiresAt;
  }

  canRetry() {
    return this.retryCount < this.maxRetries;
  }

  markProcessing() {
    this.state = MessageState.PROCESSING;
    this.processingStartedAt = Date.now();
  }

  markAcknowledged() {
    this.state = MessageState.ACKNOWLEDGED;
    this.acknowledgedAt = Date.now();
  }

  markFailed(error) {
    this.state = MessageState.FAILED;
    this.lastError = error;
    this.retryCount++;
  }

  markExpired() {
    this.state = MessageState.EXPIRED;
  }

  toJSON() {
    return {
      id: this.id,
      message: this.message,
      priority: this.priority,
      state: this.state,
      enqueuedAt: this.enqueuedAt,
      processingStartedAt: this.processingStartedAt,
      acknowledgedAt: this.acknowledgedAt,
      expiresAt: this.expiresAt,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      lastError: this.lastError,
    };
  }

  static fromJSON(data) {
    const entry = new QueueEntry(data.message, {
      priority: data.priority,
      maxRetries: data.maxRetries,
    });
    entry.id = data.id;
    entry.state = data.state;
    entry.enqueuedAt = data.enqueuedAt;
    entry.processingStartedAt = data.processingStartedAt;
    entry.acknowledgedAt = data.acknowledgedAt;
    entry.expiresAt = data.expiresAt;
    entry.retryCount = data.retryCount;
    entry.lastError = data.lastError;
    return entry;
  }
}

/**
 * Message Queue
 */
class MessageQueue extends EventEmitter {
  /**
   * Create a message queue
   * @param {Object} options - Queue configuration
   */
  constructor(options = {}) {
    super();

    this.options = {
      maxSize: options.maxSize || 10000,
      persistencePath: options.persistencePath || null,
      persistenceInterval: options.persistenceInterval || 5000,
      cleanupInterval: options.cleanupInterval || 60000,
      defaultTTL: options.defaultTTL || null, // null = no expiration
      enableMetrics: options.enableMetrics !== false,
    };

    // Priority queues (one per priority level)
    this.queues = {
      [Priority.CRITICAL]: [],
      [Priority.HIGH]: [],
      [Priority.NORMAL]: [],
      [Priority.LOW]: [],
    };

    // Processing entries (by entry ID)
    this.processing = new Map();

    // Acknowledged entries (kept for history)
    this.acknowledged = new Map();

    // Failed entries (for retry)
    this.failed = new Map();

    // Metrics
    this.metrics = {
      enqueued: 0,
      dequeued: 0,
      acknowledged: 0,
      failed: 0,
      expired: 0,
      retried: 0,
    };

    // Intervals
    this.persistenceTimer = null;
    this.cleanupTimer = null;

    // Start background tasks
    this._startBackgroundTasks();
  }

  /**
   * Enqueue a message
   * @param {Object} message - Message to enqueue
   * @param {Object} options - Enqueue options
   * @returns {string} Entry ID
   */
  enqueue(message, options = {}) {
    // Check queue size
    if (this.size() >= this.options.maxSize) {
      throw new Error(`Queue full: maximum size ${this.options.maxSize} reached`);
    }

    // Create queue entry
    const entry = new QueueEntry(message, {
      priority: options.priority || Priority.NORMAL,
      ttl: options.ttl || this.options.defaultTTL,
      maxRetries: options.maxRetries,
    });

    // Add to appropriate priority queue
    this.queues[entry.priority].push(entry);

    // Update metrics
    this.metrics.enqueued++;

    // Emit event
    this.emit('message:enqueued', {
      entryId: entry.id,
      messageId: message.messageId,
      priority: entry.priority,
      timestamp: Date.now(),
    });

    return entry.id;
  }

  /**
   * Dequeue the next message (highest priority first)
   * @returns {QueueEntry|null} Next queue entry or null if empty
   */
  dequeue() {
    // Check each priority level from highest to lowest
    for (const priority of [Priority.CRITICAL, Priority.HIGH, Priority.NORMAL, Priority.LOW]) {
      const queue = this.queues[priority];

      // Skip empty queues
      if (queue.length === 0) continue;

      // Remove expired entries
      while (queue.length > 0 && queue[0].isExpired()) {
        const expired = queue.shift();
        expired.markExpired();
        this.metrics.expired++;
        this.emit('message:expired', {
          entryId: expired.id,
          messageId: expired.message.messageId,
          timestamp: Date.now(),
        });
      }

      // Get next entry
      if (queue.length > 0) {
        const entry = queue.shift();
        entry.markProcessing();
        this.processing.set(entry.id, entry);
        this.metrics.dequeued++;

        this.emit('message:dequeued', {
          entryId: entry.id,
          messageId: entry.message.messageId,
          priority: entry.priority,
          timestamp: Date.now(),
        });

        return entry;
      }
    }

    return null;
  }

  /**
   * Peek at the next message without removing it
   * @returns {QueueEntry|null} Next queue entry or null if empty
   */
  peek() {
    for (const priority of [Priority.CRITICAL, Priority.HIGH, Priority.NORMAL, Priority.LOW]) {
      const queue = this.queues[priority];
      if (queue.length > 0 && !queue[0].isExpired()) {
        return queue[0];
      }
    }
    return null;
  }

  /**
   * Acknowledge a message (mark as successfully processed)
   * @param {string} entryId - Entry ID
   * @returns {boolean} Success
   */
  acknowledge(entryId) {
    const entry = this.processing.get(entryId);
    if (!entry) {
      return false;
    }

    entry.markAcknowledged();
    this.processing.delete(entryId);
    this.acknowledged.set(entryId, entry);
    this.metrics.acknowledged++;

    this.emit('message:acknowledged', {
      entryId: entry.id,
      messageId: entry.message.messageId,
      duration: Date.now() - entry.processingStartedAt,
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Fail a message (mark as failed, potentially for retry)
   * @param {string} entryId - Entry ID
   * @param {Error} error - Error that occurred
   * @returns {boolean} Whether message will be retried
   */
  fail(entryId, error) {
    const entry = this.processing.get(entryId);
    if (!entry) {
      return false;
    }

    entry.markFailed(error.message);
    this.processing.delete(entryId);
    this.metrics.failed++;

    // Check if can retry
    if (entry.canRetry()) {
      // Re-queue with same priority
      this.queues[entry.priority].push(entry);
      entry.state = MessageState.QUEUED;
      this.metrics.retried++;

      this.emit('message:retry', {
        entryId: entry.id,
        messageId: entry.message.messageId,
        retryCount: entry.retryCount,
        maxRetries: entry.maxRetries,
        timestamp: Date.now(),
      });

      return true;
    } else {
      // Max retries exceeded
      this.failed.set(entryId, entry);

      this.emit('message:failed', {
        entryId: entry.id,
        messageId: entry.message.messageId,
        error: error.message,
        retryCount: entry.retryCount,
        timestamp: Date.now(),
      });

      return false;
    }
  }

  /**
   * Get queue size (all priorities)
   * @returns {number} Total queued messages
   */
  size() {
    return Object.values(this.queues).reduce((sum, queue) => sum + queue.length, 0);
  }

  /**
   * Get queue size by priority
   * @param {number} priority - Priority level
   * @returns {number} Queued messages at priority
   */
  sizeByPriority(priority) {
    return this.queues[priority]?.length || 0;
  }

  /**
   * Check if queue is empty
   * @returns {boolean}
   */
  isEmpty() {
    return this.size() === 0;
  }

  /**
   * Clear all queues
   */
  clear() {
    for (const priority in this.queues) {
      this.queues[priority] = [];
    }
    this.processing.clear();
    this.acknowledged.clear();
    this.failed.clear();

    this.emit('queue:cleared', { timestamp: Date.now() });
  }

  /**
   * Get queue statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      queued: {
        total: this.size(),
        critical: this.sizeByPriority(Priority.CRITICAL),
        high: this.sizeByPriority(Priority.HIGH),
        normal: this.sizeByPriority(Priority.NORMAL),
        low: this.sizeByPriority(Priority.LOW),
      },
      processing: this.processing.size,
      acknowledged: this.acknowledged.size,
      failed: this.failed.size,
      metrics: { ...this.metrics },
    };
  }

  /**
   * Get all entries (for inspection/debugging)
   * @returns {Object} All entries by state
   */
  getAllEntries() {
    const queued = [];
    for (const priority in this.queues) {
      queued.push(...this.queues[priority]);
    }

    return {
      queued,
      processing: Array.from(this.processing.values()),
      acknowledged: Array.from(this.acknowledged.values()),
      failed: Array.from(this.failed.values()),
    };
  }

  /**
   * Persist queue state to disk
   * @returns {Promise<void>}
   */
  async persist() {
    if (!this.options.persistencePath) {
      return;
    }

    try {
      const state = {
        version: '1.0.0',
        timestamp: Date.now(),
        queues: {},
        processing: Array.from(this.processing.values()).map(e => e.toJSON()),
        acknowledged: Array.from(this.acknowledged.values()).map(e => e.toJSON()),
        failed: Array.from(this.failed.values()).map(e => e.toJSON()),
        metrics: { ...this.metrics },
      };

      // Serialize queues
      for (const priority in this.queues) {
        state.queues[priority] = this.queues[priority].map(e => e.toJSON());
      }

      const json = JSON.stringify(state, null, 2);
      await fs.writeFile(this.options.persistencePath, json, 'utf8');

      this.emit('queue:persisted', {
        path: this.options.persistencePath,
        timestamp: Date.now(),
      });
    } catch (error) {
      this.emit('queue:persistence:error', {
        error: error.message,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Restore queue state from disk
   * @returns {Promise<void>}
   */
  async restore() {
    if (!this.options.persistencePath) {
      return;
    }

    try {
      const json = await fs.readFile(this.options.persistencePath, 'utf8');
      const state = JSON.parse(json);

      // Restore queues
      for (const priority in state.queues) {
        this.queues[priority] = state.queues[priority].map(e => QueueEntry.fromJSON(e));
      }

      // Restore processing (back to queued state)
      for (const entryData of state.processing) {
        const entry = QueueEntry.fromJSON(entryData);
        entry.state = MessageState.QUEUED;
        this.queues[entry.priority].push(entry);
      }

      // Restore acknowledged
      for (const entryData of state.acknowledged) {
        const entry = QueueEntry.fromJSON(entryData);
        this.acknowledged.set(entry.id, entry);
      }

      // Restore failed
      for (const entryData of state.failed) {
        const entry = QueueEntry.fromJSON(entryData);
        this.failed.set(entry.id, entry);
      }

      // Restore metrics
      this.metrics = { ...state.metrics };

      this.emit('queue:restored', {
        path: this.options.persistencePath,
        timestamp: Date.now(),
      });
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.emit('queue:restore:error', {
          error: error.message,
          timestamp: Date.now(),
        });
      }
    }
  }

  /**
   * Start background tasks (persistence, cleanup)
   * @private
   */
  _startBackgroundTasks() {
    // Persistence
    if (this.options.persistencePath && this.options.persistenceInterval > 0) {
      this.persistenceTimer = setInterval(() => {
        this.persist().catch(error => {
          console.error('Queue persistence failed:', error);
        });
      }, this.options.persistenceInterval);
    }

    // Cleanup (remove old acknowledged/failed entries)
    if (this.options.cleanupInterval > 0) {
      this.cleanupTimer = setInterval(() => {
        this._cleanup();
      }, this.options.cleanupInterval);
    }
  }

  /**
   * Cleanup old entries
   * @private
   */
  _cleanup() {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour

    // Cleanup acknowledged entries older than 1 hour
    for (const [id, entry] of this.acknowledged.entries()) {
      if (now - entry.acknowledgedAt > maxAge) {
        this.acknowledged.delete(id);
      }
    }

    // Cleanup failed entries older than 1 hour
    for (const [id, entry] of this.failed.entries()) {
      if (now - entry.enqueuedAt > maxAge) {
        this.failed.delete(id);
      }
    }

    this.emit('queue:cleaned', { timestamp: Date.now() });
  }

  /**
   * Stop background tasks and cleanup
   * @returns {Promise<void>}
   */
  async stop() {
    // Stop timers
    if (this.persistenceTimer) {
      clearInterval(this.persistenceTimer);
      this.persistenceTimer = null;
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Final persistence
    await this.persist();

    this.emit('queue:stopped', { timestamp: Date.now() });
  }
}

// Export
module.exports = {
  MessageQueue,
  QueueEntry,
  Priority,
  MessageState,
};
