/**
 * Event Logger
 *
 * Comprehensive event logging framework for all execution activities.
 * Provides structured event data with timestamps, correlation IDs, and metadata.
 *
 * Features:
 * - Log workflow lifecycle events (started, completed, failed)
 * - Log work item state transitions
 * - Log worker agent activities
 * - Include timestamps and correlation IDs
 * - Support structured event metadata
 * - Store events in session state
 * - Query and filter events
 *
 * Based on IndyDevDan's principles:
 * - Observable by default
 * - Event-driven coordination
 * - Session-based correlation
 * - Event-sourced coordination
 */

const EventEmitter = require('events');
const { randomUUID } = require('crypto');

/**
 * Event Types
 * Comprehensive enumeration of all event types in the system
 */
const EventType = {
  // Workflow lifecycle events
  WORKFLOW_STARTED: 'workflow:started',
  WORKFLOW_COMPLETED: 'workflow:completed',
  WORKFLOW_FAILED: 'workflow:failed',
  WORKFLOW_PAUSED: 'workflow:paused',
  WORKFLOW_RESUMED: 'workflow:resumed',
  WORKFLOW_CANCELLED: 'workflow:cancelled',

  // Work item state transitions
  STATE_TRANSITION: 'state:transition',
  ITEM_CREATED: 'item:created',
  ITEM_UPDATED: 'item:updated',
  ITEM_DELETED: 'item:deleted',

  // Worker agent activities
  WORKER_ASSIGNED: 'worker:assigned',
  WORKER_STARTED: 'worker:started',
  WORKER_COMPLETED: 'worker:completed',
  WORKER_FAILED: 'worker:failed',
  WORKER_RETRY: 'worker:retry',
  WORKER_TIMEOUT: 'worker:timeout',

  // Wave execution events
  WAVE_STARTED: 'wave:started',
  WAVE_COMPLETED: 'wave:completed',
  WAVE_FAILED: 'wave:failed',

  // Task execution events
  TASK_QUEUED: 'task:queued',
  TASK_STARTED: 'task:started',
  TASK_COMPLETED: 'task:completed',
  TASK_FAILED: 'task:failed',
  TASK_BLOCKED: 'task:blocked',
  TASK_SKIPPED: 'task:skipped',

  // Progress tracking events
  PROGRESS_UPDATE: 'progress:update',
  PROGRESS_MILESTONE: 'progress:milestone',

  // Error and recovery events
  ERROR_OCCURRED: 'error:occurred',
  RECOVERY_STARTED: 'recovery:started',
  RECOVERY_COMPLETED: 'recovery:completed',
  RECOVERY_FAILED: 'recovery:failed',

  // Custom events
  CUSTOM: 'custom',
};

/**
 * Event Priority Levels
 */
const EventPriority = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  DEBUG: 'debug',
};

/**
 * Event Schema
 * Defines the structure of an event object
 */
class Event {
  /**
   * Create an event
   * @param {Object} data - Event data
   */
  constructor(data = {}) {
    // Core fields (required)
    this.eventId = data.eventId || randomUUID();
    this.timestamp = data.timestamp || new Date().toISOString();
    this.type = data.type || EventType.CUSTOM;

    // Correlation fields
    this.correlationId = data.correlationId || null; // Links related events
    this.executionId = data.executionId || null; // Execution context
    this.sessionId = data.sessionId || null; // Session context
    this.workItemId = data.workItemId || null; // Work item context
    this.workerId = data.workerId || null; // Worker context

    // Event classification
    this.priority = data.priority || EventPriority.MEDIUM;
    this.category = data.category || this._inferCategory(this.type);

    // Event data
    this.message = data.message || '';
    this.metadata = data.metadata || {};

    // State transition specific fields (optional)
    this.oldState = data.oldState || null;
    this.newState = data.newState || null;

    // Error specific fields (optional)
    this.error = data.error || null;
    this.errorStack = data.errorStack || null;

    // Duration tracking (optional)
    this.duration = data.duration || null;
  }

  /**
   * Infer event category from type
   * @param {string} type - Event type
   * @returns {string} Category
   * @private
   */
  _inferCategory(type) {
    if (type.startsWith('workflow:')) return 'workflow';
    if (type.startsWith('state:')) return 'state';
    if (type.startsWith('worker:')) return 'worker';
    if (type.startsWith('wave:')) return 'wave';
    if (type.startsWith('task:')) return 'task';
    if (type.startsWith('progress:')) return 'progress';
    if (type.startsWith('error:') || type.startsWith('recovery:')) return 'error';
    return 'custom';
  }

  /**
   * Convert event to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    const obj = { ...this };

    // Remove null fields to reduce storage size
    Object.keys(obj).forEach(key => {
      if (obj[key] === null) {
        delete obj[key];
      }
    });

    return obj;
  }

  /**
   * Create event from JSON
   * @param {Object} json - JSON data
   * @returns {Event} Event instance
   */
  static fromJSON(json) {
    return new Event(json);
  }
}

/**
 * Event Logger
 * Main event logging class with storage and query capabilities
 */
class EventLogger extends EventEmitter {
  /**
   * Create an event logger
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    super();

    this.config = {
      maxEvents: config.maxEvents || 10000, // Maximum events to keep in memory
      enablePersistence: config.enablePersistence !== undefined ? config.enablePersistence : true,
      sessionState: config.sessionState || null, // SessionState instance for persistence
      enableEmit: config.enableEmit !== undefined ? config.enableEmit : true, // Emit events via EventEmitter
      defaultCorrelationId: config.defaultCorrelationId || null,
      defaultExecutionId: config.defaultExecutionId || null,
      defaultSessionId: config.defaultSessionId || null,
      ...config,
    };

    // In-memory event store
    this.events = [];

    // Event indexes for fast querying
    this.eventsByType = new Map(); // type -> [events]
    this.eventsByCorrelation = new Map(); // correlationId -> [events]
    this.eventsByWorkItem = new Map(); // workItemId -> [events]
    this.eventsByWorker = new Map(); // workerId -> [events]
  }

  /**
   * Log an event
   * @param {string} type - Event type
   * @param {Object} data - Event data
   * @returns {Event} Logged event
   */
  async logEvent(type, data = {}) {
    // Create event with defaults from config
    const eventData = {
      type,
      correlationId: data.correlationId || this.config.defaultCorrelationId,
      executionId: data.executionId || this.config.defaultExecutionId,
      sessionId: data.sessionId || this.config.defaultSessionId,
      ...data,
    };

    const event = new Event(eventData);

    // Store in memory
    this.events.push(event);

    // Update indexes
    this._updateIndexes(event);

    // Enforce max events limit
    if (this.events.length > this.config.maxEvents) {
      const removed = this.events.shift();
      this._removeFromIndexes(removed);
    }

    // Persist to session state if enabled
    if (this.config.enablePersistence && this.config.sessionState) {
      try {
        await this.config.sessionState.logEvent(type, event.toJSON());
      } catch (error) {
        // Emit error but don't fail the logging operation
        this.emit('persistence:error', {
          error: error.message,
          event: event.toJSON(),
        });
      }
    }

    // Emit event if enabled
    if (this.config.enableEmit) {
      this.emit('event', event);
      this.emit(type, event);
    }

    return event;
  }

  /**
   * Log workflow started event
   * @param {Object} data - Event data
   * @returns {Event} Logged event
   */
  async logWorkflowStarted(data = {}) {
    return this.logEvent(EventType.WORKFLOW_STARTED, {
      priority: EventPriority.HIGH,
      message: data.message || 'Workflow execution started',
      ...data,
    });
  }

  /**
   * Log workflow completed event
   * @param {Object} data - Event data
   * @returns {Event} Logged event
   */
  async logWorkflowCompleted(data = {}) {
    return this.logEvent(EventType.WORKFLOW_COMPLETED, {
      priority: EventPriority.HIGH,
      message: data.message || 'Workflow execution completed',
      ...data,
    });
  }

  /**
   * Log workflow failed event
   * @param {Object} data - Event data
   * @returns {Event} Logged event
   */
  async logWorkflowFailed(data = {}) {
    // Extract error details properly
    let errorMessage = null;
    let errorStack = null;
    if (data.error) {
      if (data.error instanceof Error) {
        errorMessage = data.error.message;
        errorStack = data.error.stack;
      } else {
        errorMessage = String(data.error);
      }
    }

    // Remove error from data to prevent it from overriding our extracted values
    const { error, ...restData } = data;

    return this.logEvent(EventType.WORKFLOW_FAILED, {
      priority: EventPriority.CRITICAL,
      message: data.message || 'Workflow execution failed',
      error: errorMessage,
      errorStack: errorStack,
      ...restData,
    });
  }

  /**
   * Log state transition event
   * @param {Object} data - Event data with oldState and newState
   * @returns {Event} Logged event
   */
  async logStateTransition(data = {}) {
    return this.logEvent(EventType.STATE_TRANSITION, {
      priority: EventPriority.MEDIUM,
      message: data.message || `State transition: ${data.oldState} -> ${data.newState}`,
      oldState: data.oldState,
      newState: data.newState,
      ...data,
    });
  }

  /**
   * Log worker assigned event
   * @param {Object} data - Event data
   * @returns {Event} Logged event
   */
  async logWorkerAssigned(data = {}) {
    return this.logEvent(EventType.WORKER_ASSIGNED, {
      priority: EventPriority.MEDIUM,
      message: data.message || `Worker ${data.workerId} assigned to task ${data.workItemId}`,
      ...data,
    });
  }

  /**
   * Log worker started event
   * @param {Object} data - Event data
   * @returns {Event} Logged event
   */
  async logWorkerStarted(data = {}) {
    return this.logEvent(EventType.WORKER_STARTED, {
      priority: EventPriority.MEDIUM,
      message: data.message || `Worker ${data.workerId} started task ${data.workItemId}`,
      ...data,
    });
  }

  /**
   * Log worker completed event
   * @param {Object} data - Event data
   * @returns {Event} Logged event
   */
  async logWorkerCompleted(data = {}) {
    return this.logEvent(EventType.WORKER_COMPLETED, {
      priority: EventPriority.MEDIUM,
      message: data.message || `Worker ${data.workerId} completed task ${data.workItemId}`,
      ...data,
    });
  }

  /**
   * Log worker failed event
   * @param {Object} data - Event data
   * @returns {Event} Logged event
   */
  async logWorkerFailed(data = {}) {
    // Extract error details properly
    let errorMessage = null;
    let errorStack = null;
    if (data.error) {
      if (data.error instanceof Error) {
        errorMessage = data.error.message;
        errorStack = data.error.stack;
      } else {
        errorMessage = String(data.error);
      }
    }

    // Remove error from data to prevent it from overriding our extracted values
    const { error, ...restData } = data;

    return this.logEvent(EventType.WORKER_FAILED, {
      priority: EventPriority.HIGH,
      message: data.message || `Worker ${data.workerId} failed on task ${data.workItemId}`,
      error: errorMessage,
      errorStack: errorStack,
      ...restData,
    });
  }

  /**
   * Update event indexes
   * @param {Event} event - Event to index
   * @private
   */
  _updateIndexes(event) {
    // Index by type
    if (!this.eventsByType.has(event.type)) {
      this.eventsByType.set(event.type, []);
    }
    this.eventsByType.get(event.type).push(event);

    // Index by correlation ID
    if (event.correlationId) {
      if (!this.eventsByCorrelation.has(event.correlationId)) {
        this.eventsByCorrelation.set(event.correlationId, []);
      }
      this.eventsByCorrelation.get(event.correlationId).push(event);
    }

    // Index by work item ID
    if (event.workItemId) {
      if (!this.eventsByWorkItem.has(event.workItemId)) {
        this.eventsByWorkItem.set(event.workItemId, []);
      }
      this.eventsByWorkItem.get(event.workItemId).push(event);
    }

    // Index by worker ID
    if (event.workerId) {
      if (!this.eventsByWorker.has(event.workerId)) {
        this.eventsByWorker.set(event.workerId, []);
      }
      this.eventsByWorker.get(event.workerId).push(event);
    }
  }

  /**
   * Remove event from indexes
   * @param {Event} event - Event to remove
   * @private
   */
  _removeFromIndexes(event) {
    // Remove from type index
    if (this.eventsByType.has(event.type)) {
      const events = this.eventsByType.get(event.type);
      const index = events.indexOf(event);
      if (index !== -1) events.splice(index, 1);
    }

    // Remove from correlation index
    if (event.correlationId && this.eventsByCorrelation.has(event.correlationId)) {
      const events = this.eventsByCorrelation.get(event.correlationId);
      const index = events.indexOf(event);
      if (index !== -1) events.splice(index, 1);
    }

    // Remove from work item index
    if (event.workItemId && this.eventsByWorkItem.has(event.workItemId)) {
      const events = this.eventsByWorkItem.get(event.workItemId);
      const index = events.indexOf(event);
      if (index !== -1) events.splice(index, 1);
    }

    // Remove from worker index
    if (event.workerId && this.eventsByWorker.has(event.workerId)) {
      const events = this.eventsByWorker.get(event.workerId);
      const index = events.indexOf(event);
      if (index !== -1) events.splice(index, 1);
    }
  }

  /**
   * Get all events
   * @param {Object} options - Query options
   * @returns {Array<Event>} Events
   */
  getEvents(options = {}) {
    let events = this.events;

    // Filter by type
    if (options.type) {
      events = this.eventsByType.get(options.type) || [];
    }

    // Filter by correlation ID
    if (options.correlationId) {
      events = this.eventsByCorrelation.get(options.correlationId) || [];
    }

    // Filter by work item ID
    if (options.workItemId) {
      events = this.eventsByWorkItem.get(options.workItemId) || [];
    }

    // Filter by worker ID
    if (options.workerId) {
      events = this.eventsByWorker.get(options.workerId) || [];
    }

    // Filter by category
    if (options.category) {
      events = events.filter(e => e.category === options.category);
    }

    // Filter by priority
    if (options.priority) {
      events = events.filter(e => e.priority === options.priority);
    }

    // Filter by time range
    if (options.startTime) {
      events = events.filter(e => new Date(e.timestamp) >= new Date(options.startTime));
    }
    if (options.endTime) {
      events = events.filter(e => new Date(e.timestamp) <= new Date(options.endTime));
    }

    // Sort
    if (options.sortBy === 'timestamp') {
      events = [...events].sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return options.sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
    }

    // Limit results
    if (options.limit) {
      events = events.slice(0, options.limit);
    }

    return events;
  }

  /**
   * Get event count
   * @param {Object} options - Query options
   * @returns {number} Event count
   */
  getEventCount(options = {}) {
    return this.getEvents(options).length;
  }

  /**
   * Clear all events
   */
  clear() {
    this.events = [];
    this.eventsByType.clear();
    this.eventsByCorrelation.clear();
    this.eventsByWorkItem.clear();
    this.eventsByWorker.clear();
  }

  /**
   * Get event statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    const stats = {
      totalEvents: this.events.length,
      eventsByType: {},
      eventsByCategory: {},
      eventsByPriority: {},
    };

    for (const event of this.events) {
      // Count by type
      stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1;

      // Count by category
      stats.eventsByCategory[event.category] = (stats.eventsByCategory[event.category] || 0) + 1;

      // Count by priority
      stats.eventsByPriority[event.priority] = (stats.eventsByPriority[event.priority] || 0) + 1;
    }

    return stats;
  }
}

// Export
module.exports = EventLogger;
module.exports.EventType = EventType;
module.exports.EventPriority = EventPriority;
module.exports.Event = Event;
