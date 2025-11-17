/**
 * Message Serializer for HOP/LOP Agent Communication
 *
 * Provides robust serialization/deserialization for converting messages
 * to/from wire format with error handling, validation, and compression.
 *
 * Features:
 * - JSON serialization with schema validation
 * - Error handling for malformed messages
 * - Optional compression for large payloads
 * - Circular reference detection
 * - Performance metrics
 */

const { MessageSchemaValidator } = require('./message-schema');
const crypto = require('crypto');
const zlib = require('zlib');
const { promisify } = require('util');

// UUID v4 generator using crypto.randomUUID (Node 14.17+) or fallback
const uuidv4 = () => {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older Node versions
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * Serialization options
 */
const DEFAULT_OPTIONS = {
  validate: true, // Validate messages against schema
  compress: false, // Compress large payloads
  compressionThreshold: 10240, // Compress if > 10KB
  includeMetrics: true, // Include serialization metrics
  prettyPrint: false, // Pretty-print JSON (dev mode)
};

/**
 * Message serializer
 */
class MessageSerializer {
  /**
   * Create a message serializer
   * @param {Object} options - Serializer options
   */
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.metrics = {
      serialized: 0,
      deserialized: 0,
      validationErrors: 0,
      serializationErrors: 0,
      deserializationErrors: 0,
      compressionSavings: 0,
    };
  }

  /**
   * Serialize a message to wire format
   * @param {Object} message - Message object
   * @param {Object} options - Override options
   * @returns {Promise<Buffer|string>} Serialized message
   * @throws {Error} If serialization fails
   */
  async serialize(message, options = {}) {
    const opts = { ...this.options, ...options };
    const startTime = Date.now();

    try {
      // Validate message if enabled
      if (opts.validate) {
        const validation = MessageSchemaValidator.validate(message);
        if (!validation.valid) {
          this.metrics.validationErrors++;
          throw new Error(`Message validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Handle circular references
      const safeMessage = this._removeCircularReferences(message);

      // Convert to JSON string
      const jsonString = opts.prettyPrint
        ? JSON.stringify(safeMessage, null, 2)
        : JSON.stringify(safeMessage);

      const originalSize = Buffer.byteLength(jsonString, 'utf8');

      // Compress if enabled and above threshold
      let result;
      let compressed = false;

      if (opts.compress && originalSize > opts.compressionThreshold) {
        result = await gzip(Buffer.from(jsonString, 'utf8'));
        compressed = true;
        this.metrics.compressionSavings += originalSize - result.length;
      } else {
        result = jsonString;
      }

      // Add metrics if enabled
      if (opts.includeMetrics) {
        const duration = Date.now() - startTime;
        this._recordSerializationMetrics(originalSize, compressed, duration);
      }

      this.metrics.serialized++;

      return result;
    } catch (error) {
      this.metrics.serializationErrors++;
      throw new Error(`Serialization failed: ${error.message}`);
    }
  }

  /**
   * Deserialize a message from wire format
   * @param {Buffer|string} data - Serialized message
   * @param {Object} options - Override options
   * @returns {Promise<Object>} Deserialized message
   * @throws {Error} If deserialization fails
   */
  async deserialize(data, options = {}) {
    const opts = { ...this.options, ...options };
    const startTime = Date.now();

    try {
      let jsonString;

      // Handle compressed data
      if (Buffer.isBuffer(data)) {
        try {
          // Try to decompress
          const decompressed = await gunzip(data);
          jsonString = decompressed.toString('utf8');
        } catch (error) {
          // Not compressed, treat as UTF-8 buffer
          jsonString = data.toString('utf8');
        }
      } else if (typeof data === 'string') {
        jsonString = data;
      } else {
        throw new Error('Invalid data type: expected Buffer or string');
      }

      // Parse JSON
      const message = JSON.parse(jsonString);

      // Validate if enabled
      if (opts.validate) {
        const validation = MessageSchemaValidator.validate(message);
        if (!validation.valid) {
          this.metrics.validationErrors++;
          throw new Error(`Message validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Add metrics if enabled
      if (opts.includeMetrics) {
        const duration = Date.now() - startTime;
        this._recordDeserializationMetrics(jsonString.length, duration);
      }

      this.metrics.deserialized++;

      return message;
    } catch (error) {
      this.metrics.deserializationErrors++;
      throw new Error(`Deserialization failed: ${error.message}`);
    }
  }

  /**
   * Serialize multiple messages in batch
   * @param {Array<Object>} messages - Array of messages
   * @param {Object} options - Override options
   * @returns {Promise<Array<Buffer|string>>} Serialized messages
   */
  async serializeBatch(messages, options = {}) {
    const results = await Promise.allSettled(
      messages.map(msg => this.serialize(msg, options))
    );

    const serialized = [];
    const errors = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        serialized.push(result.value);
      } else {
        errors.push({
          index,
          message: messages[index],
          error: result.reason,
        });
      }
    });

    if (errors.length > 0) {
      console.warn(`Batch serialization: ${errors.length} of ${messages.length} failed`);
    }

    return serialized;
  }

  /**
   * Deserialize multiple messages in batch
   * @param {Array<Buffer|string>} dataArray - Array of serialized messages
   * @param {Object} options - Override options
   * @returns {Promise<Array<Object>>} Deserialized messages
   */
  async deserializeBatch(dataArray, options = {}) {
    const results = await Promise.allSettled(
      dataArray.map(data => this.deserialize(data, options))
    );

    const deserialized = [];
    const errors = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        deserialized.push(result.value);
      } else {
        errors.push({
          index,
          data: dataArray[index],
          error: result.reason,
        });
      }
    });

    if (errors.length > 0) {
      console.warn(`Batch deserialization: ${errors.length} of ${dataArray.length} failed`);
    }

    return deserialized;
  }

  /**
   * Remove circular references from object
   * Uses a WeakSet to track visited objects
   * @param {Object} obj - Object to process
   * @returns {Object} Object without circular references
   * @private
   */
  _removeCircularReferences(obj) {
    const seen = new WeakSet();

    const recurse = value => {
      // Handle primitives
      if (value === null || typeof value !== 'object') {
        return value;
      }

      // Handle circular references
      if (seen.has(value)) {
        return '[Circular Reference]';
      }

      seen.add(value);

      // Handle arrays
      if (Array.isArray(value)) {
        return value.map(item => recurse(item));
      }

      // Handle objects
      const result = {};
      for (const key in value) {
        if (value.hasOwnProperty(key)) {
          result[key] = recurse(value[key]);
        }
      }

      return result;
    };

    return recurse(obj);
  }

  /**
   * Record serialization metrics
   * @param {number} size - Original size in bytes
   * @param {boolean} compressed - Whether compressed
   * @param {number} duration - Duration in milliseconds
   * @private
   */
  _recordSerializationMetrics(size, compressed, duration) {
    // Could be extended to store detailed metrics
    // For now, just increment counters
  }

  /**
   * Record deserialization metrics
   * @param {number} size - Size in bytes
   * @param {number} duration - Duration in milliseconds
   * @private
   */
  _recordDeserializationMetrics(size, duration) {
    // Could be extended to store detailed metrics
  }

  /**
   * Get serializer metrics
   * @returns {Object} Metrics object
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      serialized: 0,
      deserialized: 0,
      validationErrors: 0,
      serializationErrors: 0,
      deserializationErrors: 0,
      compressionSavings: 0,
    };
  }
}

/**
 * Message factory - Helper for creating valid messages
 */
class MessageFactory {
  /**
   * Create a task assignment message
   * @param {Object} params - Message parameters
   * @returns {Object} Task assignment message
   */
  static createTaskAssignment(params) {
    const { orchestratorId, workerId, task, execution } = params;

    return {
      messageId: uuidv4(),
      messageType: 'task_assignment',
      schemaVersion: '1.0.0',
      timestamp: Date.now(),
      orchestratorId,
      workerId,
      correlationId: params.correlationId || uuidv4(),
      task: {
        workItemId: task.workItemId,
        workItemType: task.workItemType,
        title: task.title,
        description: task.description || '',
        context: task.context || {},
        acceptanceCriteria: task.acceptanceCriteria || {},
      },
      execution: {
        timeout: execution?.timeout || 300000, // 5 minutes default
        priority: execution?.priority || 5,
        maxRetries: execution?.maxRetries || 3,
        allowPartialSuccess: execution?.allowPartialSuccess !== false,
      },
    };
  }

  /**
   * Create a progress update message
   * @param {Object} params - Message parameters
   * @returns {Object} Progress update message
   */
  static createProgressUpdate(params) {
    const { workerId, orchestratorId, correlationId, progress } = params;

    return {
      messageId: uuidv4(),
      messageType: 'progress_update',
      schemaVersion: '1.0.0',
      timestamp: Date.now(),
      workerId,
      orchestratorId,
      correlationId,
      progress: {
        workItemId: progress.workItemId,
        percentage: progress.percentage,
        status: progress.status,
        currentStep: progress.currentStep || '',
        completedSteps: progress.completedSteps || 0,
        totalSteps: progress.totalSteps || 0,
        metrics: progress.metrics || {},
        completedArtifacts: progress.completedArtifacts || [],
      },
    };
  }

  /**
   * Create a completion result message
   * @param {Object} params - Message parameters
   * @returns {Object} Completion result message
   */
  static createCompletionResult(params) {
    const { workerId, orchestratorId, correlationId, result } = params;

    return {
      messageId: uuidv4(),
      messageType: 'completion_result',
      schemaVersion: '1.0.0',
      timestamp: Date.now(),
      workerId,
      orchestratorId,
      correlationId,
      result: {
        workItemId: result.workItemId,
        success: result.success,
        status: result.status,
        output: result.output || {},
        artifacts: result.artifacts || [],
        metrics: result.metrics || {},
        acceptanceCriteria: result.acceptanceCriteria || [],
      },
    };
  }

  /**
   * Create an error message
   * @param {Object} params - Message parameters
   * @returns {Object} Error message
   */
  static createErrorMessage(params) {
    const { workerId, orchestratorId, correlationId, error } = params;

    return {
      messageId: uuidv4(),
      messageType: 'error_message',
      schemaVersion: '1.0.0',
      timestamp: Date.now(),
      workerId,
      orchestratorId,
      correlationId,
      error: {
        workItemId: error.workItemId,
        errorType: error.errorType,
        errorCode: error.errorCode || 'UNKNOWN',
        message: error.message,
        stackTrace: error.stackTrace || '',
        context: error.context || {},
        recovery: error.recovery || {
          isRetryable: false,
          hints: [],
          suggestedRetryDelay: 0,
        },
        impact: error.impact || {
          severity: 'high',
          blocking: true,
          affectedWorkItems: [],
        },
      },
    };
  }

  /**
   * Create a cancellation request message
   * @param {Object} params - Message parameters
   * @returns {Object} Cancellation request message
   */
  static createCancellationRequest(params) {
    const { orchestratorId, workerId, correlationId, cancellation } = params;

    return {
      messageId: uuidv4(),
      messageType: 'cancellation_request',
      schemaVersion: '1.0.0',
      timestamp: Date.now(),
      orchestratorId,
      workerId,
      correlationId,
      cancellation: {
        workItemId: cancellation.workItemId,
        reason: cancellation.reason,
        graceful: cancellation.graceful !== false,
        gracePeriod: cancellation.gracePeriod || 5000,
        savePartialResults: cancellation.savePartialResults !== false,
      },
    };
  }

  /**
   * Create a heartbeat message
   * @param {Object} params - Message parameters
   * @returns {Object} Heartbeat message
   */
  static createHeartbeat(params) {
    const { workerId, orchestratorId, health } = params;

    return {
      messageId: uuidv4(),
      messageType: 'heartbeat',
      schemaVersion: '1.0.0',
      timestamp: Date.now(),
      workerId,
      orchestratorId,
      health: {
        status: health.status || 'healthy',
        uptime: health.uptime || 0,
        metrics: health.metrics || {},
      },
    };
  }
}

module.exports = {
  MessageSerializer,
  MessageFactory,
  DEFAULT_OPTIONS,
};
