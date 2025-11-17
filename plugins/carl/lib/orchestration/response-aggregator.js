/**
 * Response Aggregator for HOP/LOP Agent Communication
 *
 * Aggregation layer to:
 * - Collect and correlate responses from multiple workers
 * - Handle timeout for late responses
 * - Support partial result aggregation
 * - Merge results from parallel tasks
 * - Validate responses and handle errors
 *
 * Follows IndyDevDan's orchestration principles:
 * - Async-first execution (handle parallel responses)
 * - Observable by default (emit events for tracking)
 * - Graceful degradation (partial results on timeout)
 */

const EventEmitter = require('events');

/**
 * Aggregation strategies
 */
const AggregationStrategy = {
  COLLECT_ALL: 'collect_all', // Wait for all responses
  FIRST_SUCCESS: 'first_success', // Return on first success
  MAJORITY_VOTE: 'majority_vote', // Wait for majority then decide
  PARTIAL_RESULTS: 'partial_results', // Accept partial results on timeout
};

/**
 * Response state
 */
const ResponseState = {
  PENDING: 'pending',
  RECEIVED: 'received',
  TIMEOUT: 'timeout',
  ERROR: 'error',
};

/**
 * Response entry for tracking
 */
class ResponseEntry {
  constructor(correlationId, workerId, options = {}) {
    this.correlationId = correlationId;
    this.workerId = workerId;
    this.state = ResponseState.PENDING;
    this.response = null;
    this.error = null;
    this.requestedAt = Date.now();
    this.receivedAt = null;
    this.timeout = options.timeout || 30000; // 30 seconds default
    this.metadata = options.metadata || {};
  }

  isTimedOut() {
    return this.state === ResponseState.PENDING && Date.now() > this.requestedAt + this.timeout;
  }

  markReceived(response) {
    this.state = ResponseState.RECEIVED;
    this.response = response;
    this.receivedAt = Date.now();
  }

  markTimeout() {
    this.state = ResponseState.TIMEOUT;
    this.receivedAt = Date.now();
  }

  markError(error) {
    this.state = ResponseState.ERROR;
    this.error = error;
    this.receivedAt = Date.now();
  }

  getLatency() {
    return this.receivedAt ? this.receivedAt - this.requestedAt : null;
  }

  toJSON() {
    return {
      correlationId: this.correlationId,
      workerId: this.workerId,
      state: this.state,
      response: this.response,
      error: this.error,
      requestedAt: this.requestedAt,
      receivedAt: this.receivedAt,
      latency: this.getLatency(),
      metadata: this.metadata,
    };
  }
}

/**
 * Aggregation context for a group of related requests
 */
class AggregationContext {
  constructor(contextId, expectedCount, options = {}) {
    this.contextId = contextId;
    this.expectedCount = expectedCount;
    this.strategy = options.strategy || AggregationStrategy.COLLECT_ALL;
    this.timeout = options.timeout || 60000; // 1 minute default
    this.allowPartialResults = options.allowPartialResults !== false;
    this.createdAt = Date.now();
    this.completedAt = null;
    this.entries = new Map(); // correlationId -> ResponseEntry
    this.isComplete = false;
    this.timeoutTimer = null;
  }

  addEntry(entry) {
    this.entries.set(entry.correlationId, entry);
  }

  getEntry(correlationId) {
    return this.entries.get(correlationId);
  }

  getAllEntries() {
    return Array.from(this.entries.values());
  }

  getReceivedCount() {
    return Array.from(this.entries.values()).filter(e => e.state === ResponseState.RECEIVED).length;
  }

  getTimeoutCount() {
    return Array.from(this.entries.values()).filter(e => e.state === ResponseState.TIMEOUT).length;
  }

  getErrorCount() {
    return Array.from(this.entries.values()).filter(e => e.state === ResponseState.ERROR).length;
  }

  getPendingCount() {
    return Array.from(this.entries.values()).filter(e => e.state === ResponseState.PENDING).length;
  }

  isReady() {
    switch (this.strategy) {
      case AggregationStrategy.COLLECT_ALL:
        return this.getReceivedCount() === this.expectedCount;

      case AggregationStrategy.FIRST_SUCCESS:
        return this.getReceivedCount() > 0;

      case AggregationStrategy.MAJORITY_VOTE:
        return this.getReceivedCount() > this.expectedCount / 2;

      case AggregationStrategy.PARTIAL_RESULTS:
        return this.getReceivedCount() > 0 || this.getPendingCount() === 0;

      default:
        return false;
    }
  }

  markComplete() {
    this.isComplete = true;
    this.completedAt = Date.now();
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }

  getResults() {
    const received = Array.from(this.entries.values())
      .filter(e => e.state === ResponseState.RECEIVED)
      .map(e => e.response);

    const errors = Array.from(this.entries.values())
      .filter(e => e.state === ResponseState.ERROR)
      .map(e => ({ workerId: e.workerId, error: e.error }));

    const timedOut = Array.from(this.entries.values())
      .filter(e => e.state === ResponseState.TIMEOUT)
      .map(e => e.workerId);

    return {
      contextId: this.contextId,
      strategy: this.strategy,
      expectedCount: this.expectedCount,
      receivedCount: this.getReceivedCount(),
      errorCount: this.getErrorCount(),
      timeoutCount: this.getTimeoutCount(),
      results: received,
      errors,
      timedOut,
      isPartial: this.getReceivedCount() < this.expectedCount,
      duration: this.completedAt ? this.completedAt - this.createdAt : null,
    };
  }

  toJSON() {
    return {
      contextId: this.contextId,
      expectedCount: this.expectedCount,
      strategy: this.strategy,
      timeout: this.timeout,
      allowPartialResults: this.allowPartialResults,
      createdAt: this.createdAt,
      completedAt: this.completedAt,
      isComplete: this.isComplete,
      receivedCount: this.getReceivedCount(),
      errorCount: this.getErrorCount(),
      timeoutCount: this.getTimeoutCount(),
      pendingCount: this.getPendingCount(),
      entries: Array.from(this.entries.values()).map(e => e.toJSON()),
    };
  }
}

/**
 * Response Aggregator
 */
class ResponseAggregator extends EventEmitter {
  /**
   * Create a response aggregator
   * @param {Object} options - Aggregator configuration
   */
  constructor(options = {}) {
    super();

    this.options = {
      defaultTimeout: options.defaultTimeout || 60000,
      defaultStrategy: options.defaultStrategy || AggregationStrategy.COLLECT_ALL,
      enableMetrics: options.enableMetrics !== false,
      cleanupInterval: options.cleanupInterval || 300000, // 5 minutes
    };

    // Aggregation contexts
    this.contexts = new Map(); // contextId -> AggregationContext

    // Correlation ID index
    this.correlationIndex = new Map(); // correlationId -> contextId

    // Metrics
    this.metrics = {
      contextsCreated: 0,
      contextsCompleted: 0,
      responsesReceived: 0,
      responsesTimeout: 0,
      responsesError: 0,
      partialResults: 0,
    };

    // Cleanup timer
    this.cleanupTimer = null;
    this._startCleanup();
  }

  /**
   * Create aggregation context for a group of requests
   * @param {string} contextId - Unique context identifier
   * @param {Array<Object>} requests - Array of request objects with workerId and correlationId
   * @param {Object} options - Aggregation options
   * @returns {string} Context ID
   */
  createContext(contextId, requests, options = {}) {
    if (this.contexts.has(contextId)) {
      throw new Error(`Context already exists: ${contextId}`);
    }

    const context = new AggregationContext(contextId, requests.length, {
      strategy: options.strategy || this.options.defaultStrategy,
      timeout: options.timeout || this.options.defaultTimeout,
      allowPartialResults: options.allowPartialResults,
    });

    // Create response entries
    for (const request of requests) {
      const entry = new ResponseEntry(request.correlationId, request.workerId, {
        timeout: options.timeout || this.options.defaultTimeout,
        metadata: request.metadata,
      });
      context.addEntry(entry);
      this.correlationIndex.set(request.correlationId, contextId);
    }

    this.contexts.set(contextId, context);
    this.metrics.contextsCreated++;

    // Set global timeout
    context.timeoutTimer = setTimeout(() => {
      this._handleContextTimeout(contextId);
    }, context.timeout);

    this.emit('context:created', {
      contextId,
      expectedCount: requests.length,
      strategy: context.strategy,
      timestamp: Date.now(),
    });

    return contextId;
  }

  /**
   * Add a response to the aggregation
   * @param {string} correlationId - Correlation ID from request
   * @param {Object} response - Response data
   * @returns {boolean} Whether aggregation is complete
   */
  addResponse(correlationId, response) {
    const contextId = this.correlationIndex.get(correlationId);
    if (!contextId) {
      this.emit('response:orphaned', {
        correlationId,
        timestamp: Date.now(),
      });
      return false;
    }

    const context = this.contexts.get(contextId);
    if (!context || context.isComplete) {
      return false;
    }

    const entry = context.getEntry(correlationId);
    if (!entry) {
      return false;
    }

    // Mark as received
    entry.markReceived(response);
    this.metrics.responsesReceived++;

    this.emit('response:received', {
      contextId,
      correlationId,
      workerId: entry.workerId,
      latency: entry.getLatency(),
      timestamp: Date.now(),
    });

    // Check if context is ready
    if (context.isReady()) {
      this._completeContext(contextId);
      return true;
    }

    return false;
  }

  /**
   * Add an error response
   * @param {string} correlationId - Correlation ID
   * @param {Error} error - Error
   * @returns {boolean} Whether aggregation is complete
   */
  addError(correlationId, error) {
    const contextId = this.correlationIndex.get(correlationId);
    if (!contextId) {
      return false;
    }

    const context = this.contexts.get(contextId);
    if (!context || context.isComplete) {
      return false;
    }

    const entry = context.getEntry(correlationId);
    if (!entry) {
      return false;
    }

    entry.markError(error);
    this.metrics.responsesError++;

    this.emit('response:error', {
      contextId,
      correlationId,
      workerId: entry.workerId,
      error: error.message,
      timestamp: Date.now(),
    });

    // Check if should continue or fail
    if (context.allowPartialResults && context.getReceivedCount() > 0) {
      // Continue with partial results
      return false;
    } else if (context.getErrorCount() + context.getTimeoutCount() >= context.expectedCount) {
      // All failed, complete with errors
      this._completeContext(contextId);
      return true;
    }

    return false;
  }

  /**
   * Wait for aggregation context to complete
   * @param {string} contextId - Context ID
   * @param {number} timeout - Optional timeout override
   * @returns {Promise<Object>} Aggregated results
   */
  async waitForCompletion(contextId, timeout = null) {
    const context = this.contexts.get(contextId);
    if (!context) {
      throw new Error(`Context not found: ${contextId}`);
    }

    if (context.isComplete) {
      return context.getResults();
    }

    // Wait for completion or timeout
    return new Promise((resolve, reject) => {
      const effectiveTimeout = timeout || context.timeout;
      const timeoutTimer = setTimeout(() => {
        if (!context.isComplete) {
          this._handleContextTimeout(contextId);
        }
        resolve(context.getResults());
      }, effectiveTimeout);

      // Listen for completion
      const completionHandler = data => {
        if (data.contextId === contextId) {
          clearTimeout(timeoutTimer);
          this.removeListener('context:completed', completionHandler);
          resolve(context.getResults());
        }
      };

      this.on('context:completed', completionHandler);
    });
  }

  /**
   * Get aggregation context
   * @param {string} contextId - Context ID
   * @returns {AggregationContext|null}
   */
  getContext(contextId) {
    return this.contexts.get(contextId) || null;
  }

  /**
   * Get all contexts
   * @returns {Array<AggregationContext>}
   */
  getAllContexts() {
    return Array.from(this.contexts.values());
  }

  /**
   * Merge results from multiple responses
   * @param {Array<Object>} results - Array of result objects
   * @param {Object} options - Merge options
   * @returns {Object} Merged result
   */
  mergeResults(results, options = {}) {
    const mergeStrategy = options.strategy || 'deep';

    if (results.length === 0) {
      return {};
    }

    if (results.length === 1) {
      return results[0];
    }

    switch (mergeStrategy) {
      case 'shallow':
        return Object.assign({}, ...results);

      case 'deep':
        return this._deepMerge(results);

      case 'array':
        return results; // Return as array

      case 'custom':
        return options.customMerge ? options.customMerge(results) : results;

      default:
        return results;
    }
  }

  /**
   * Validate response
   * @param {Object} response - Response to validate
   * @param {Object} schema - Validation schema
   * @returns {Object} Validation result
   */
  validateResponse(response, schema = {}) {
    const errors = [];

    // Basic validation
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in response)) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get aggregator statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      activeContexts: this.contexts.size,
      metrics: { ...this.metrics },
      contexts: Array.from(this.contexts.values()).map(c => ({
        contextId: c.contextId,
        strategy: c.strategy,
        expectedCount: c.expectedCount,
        receivedCount: c.getReceivedCount(),
        isComplete: c.isComplete,
      })),
    };
  }

  /**
   * Complete an aggregation context
   * @param {string} contextId - Context ID
   * @private
   */
  _completeContext(contextId) {
    const context = this.contexts.get(contextId);
    if (!context || context.isComplete) {
      return;
    }

    context.markComplete();
    this.metrics.contextsCompleted++;

    if (context.getReceivedCount() < context.expectedCount) {
      this.metrics.partialResults++;
    }

    const results = context.getResults();

    this.emit('context:completed', {
      contextId,
      results,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle context timeout
   * @param {string} contextId - Context ID
   * @private
   */
  _handleContextTimeout(contextId) {
    const context = this.contexts.get(contextId);
    if (!context || context.isComplete) {
      return;
    }

    // Mark pending entries as timed out
    for (const entry of context.getAllEntries()) {
      if (entry.state === ResponseState.PENDING) {
        entry.markTimeout();
        this.metrics.responsesTimeout++;
      }
    }

    this.emit('context:timeout', {
      contextId,
      receivedCount: context.getReceivedCount(),
      timeoutCount: context.getTimeoutCount(),
      timestamp: Date.now(),
    });

    // Complete with partial results if allowed
    if (context.allowPartialResults && context.getReceivedCount() > 0) {
      this._completeContext(contextId);
    } else {
      context.markComplete();
    }
  }

  /**
   * Deep merge objects
   * @param {Array<Object>} objects - Objects to merge
   * @returns {Object} Merged object
   * @private
   */
  _deepMerge(objects) {
    const result = {};

    for (const obj of objects) {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (typeof obj[key] === 'object' && !Array.isArray(obj[key]) && obj[key] !== null) {
            result[key] = this._deepMerge([result[key] || {}, obj[key]]);
          } else if (Array.isArray(obj[key])) {
            result[key] = [...(result[key] || []), ...obj[key]];
          } else {
            result[key] = obj[key];
          }
        }
      }
    }

    return result;
  }

  /**
   * Start cleanup timer
   * @private
   */
  _startCleanup() {
    if (this.options.cleanupInterval > 0) {
      this.cleanupTimer = setInterval(() => {
        this._cleanup();
      }, this.options.cleanupInterval);
    }
  }

  /**
   * Cleanup old completed contexts
   * @private
   */
  _cleanup() {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour

    for (const [contextId, context] of this.contexts.entries()) {
      if (context.isComplete && now - context.completedAt > maxAge) {
        // Remove from maps
        for (const entry of context.getAllEntries()) {
          this.correlationIndex.delete(entry.correlationId);
        }
        this.contexts.delete(contextId);
      }
    }
  }

  /**
   * Stop aggregator and cleanup
   */
  stop() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Clear all context timers
    for (const context of this.contexts.values()) {
      if (context.timeoutTimer) {
        clearTimeout(context.timeoutTimer);
      }
    }

    this.emit('aggregator:stopped', { timestamp: Date.now() });
  }
}

// Export
module.exports = {
  ResponseAggregator,
  AggregationContext,
  ResponseEntry,
  AggregationStrategy,
  ResponseState,
};
