/**
 * Message Schema for HOP/LOP Agent Communication
 *
 * Defines standardized message formats for task assignment, progress updates,
 * completion results, and error reporting between orchestrator and workers.
 *
 * Follows IndyDevDan's async orchestration principles:
 * - Event-driven coordination
 * - Observable by default
 * - Clean context separation
 */

/**
 * Message types for HOP/LOP communication
 */
const MessageType = {
  TASK_ASSIGNMENT: 'task_assignment',
  PROGRESS_UPDATE: 'progress_update',
  COMPLETION_RESULT: 'completion_result',
  ERROR_MESSAGE: 'error_message',
  CANCELLATION_REQUEST: 'cancellation_request',
  HEARTBEAT: 'heartbeat',
};

/**
 * Message schema version
 */
const SCHEMA_VERSION = '1.0.0';

/**
 * Task assignment message
 * Sent from HOP orchestrator to LOP worker to delegate work
 *
 * @typedef {Object} TaskAssignmentMessage
 * @property {string} messageId - Unique message identifier (UUID)
 * @property {string} messageType - Always 'task_assignment'
 * @property {string} schemaVersion - Schema version for compatibility
 * @property {number} timestamp - Message creation timestamp (Unix epoch ms)
 * @property {string} orchestratorId - ID of sending orchestrator (HOP)
 * @property {string} workerId - ID of target worker (LOP)
 * @property {string} correlationId - Correlation ID for tracking related messages
 * @property {Object} task - Task details
 * @property {string} task.workItemId - Cascade work item ID (e.g., T0136, S0090)
 * @property {string} task.workItemType - Type (Epic, Feature, Story, Task, etc.)
 * @property {string} task.title - Human-readable task title
 * @property {string} task.description - Task description
 * @property {Object} task.context - Execution context
 * @property {Array<string>} task.context.filePaths - Relevant file paths
 * @property {Object} task.context.workingDirectory - Working directory path
 * @property {Object} task.context.dependencies - Dependencies on other tasks
 * @property {Object} task.acceptanceCriteria - Acceptance criteria for completion
 * @property {Object} execution - Execution parameters
 * @property {number} execution.timeout - Timeout in milliseconds
 * @property {number} execution.priority - Priority (0-10, higher = more urgent)
 * @property {number} execution.maxRetries - Maximum retry attempts
 * @property {boolean} execution.allowPartialSuccess - Allow partial completion
 */

/**
 * Progress update message
 * Sent from LOP worker to HOP orchestrator during task execution
 *
 * @typedef {Object} ProgressUpdateMessage
 * @property {string} messageId - Unique message identifier (UUID)
 * @property {string} messageType - Always 'progress_update'
 * @property {string} schemaVersion - Schema version
 * @property {number} timestamp - Message creation timestamp
 * @property {string} workerId - ID of reporting worker (LOP)
 * @property {string} orchestratorId - ID of target orchestrator (HOP)
 * @property {string} correlationId - Correlation ID from task assignment
 * @property {Object} progress - Progress details
 * @property {string} progress.workItemId - Work item ID
 * @property {number} progress.percentage - Completion percentage (0-100)
 * @property {string} progress.status - Status (started, in_progress, blocked, etc.)
 * @property {string} progress.currentStep - Current execution step description
 * @property {number} progress.completedSteps - Number of completed steps
 * @property {number} progress.totalSteps - Total expected steps
 * @property {Object} progress.metrics - Performance metrics
 * @property {number} progress.metrics.elapsedTime - Elapsed time in milliseconds
 * @property {number} progress.metrics.estimatedTimeRemaining - Estimated remaining time
 * @property {Array<string>} progress.completedArtifacts - Completed artifacts (file paths)
 */

/**
 * Completion result message
 * Sent from LOP worker to HOP orchestrator upon task completion
 *
 * @typedef {Object} CompletionResultMessage
 * @property {string} messageId - Unique message identifier (UUID)
 * @property {string} messageType - Always 'completion_result'
 * @property {string} schemaVersion - Schema version
 * @property {number} timestamp - Message creation timestamp
 * @property {string} workerId - ID of reporting worker (LOP)
 * @property {string} orchestratorId - ID of target orchestrator (HOP)
 * @property {string} correlationId - Correlation ID from task assignment
 * @property {Object} result - Completion result
 * @property {string} result.workItemId - Work item ID
 * @property {boolean} result.success - Overall success flag
 * @property {string} result.status - Final status (completed, partial, failed)
 * @property {Object} result.output - Task output data
 * @property {string} result.output.summary - Human-readable summary
 * @property {Object} result.output.data - Structured output data
 * @property {Array<Object>} result.artifacts - Created/modified artifacts
 * @property {string} result.artifacts[].type - Artifact type (file, directory, etc.)
 * @property {string} result.artifacts[].path - Artifact path
 * @property {string} result.artifacts[].description - Artifact description
 * @property {Object} result.metrics - Execution metrics
 * @property {number} result.metrics.duration - Total duration in milliseconds
 * @property {number} result.metrics.cpuTime - CPU time used
 * @property {number} result.metrics.memoryPeak - Peak memory usage
 * @property {Array<Object>} result.acceptanceCriteria - Acceptance criteria status
 * @property {string} result.acceptanceCriteria[].criterion - Criterion description
 * @property {boolean} result.acceptanceCriteria[].met - Whether criterion was met
 */

/**
 * Error message
 * Sent from LOP worker to HOP orchestrator when errors occur
 *
 * @typedef {Object} ErrorMessage
 * @property {string} messageId - Unique message identifier (UUID)
 * @property {string} messageType - Always 'error_message'
 * @property {string} schemaVersion - Schema version
 * @property {number} timestamp - Message creation timestamp
 * @property {string} workerId - ID of reporting worker (LOP)
 * @property {string} orchestratorId - ID of target orchestrator (HOP)
 * @property {string} correlationId - Correlation ID from task assignment
 * @property {Object} error - Error details
 * @property {string} error.workItemId - Work item ID
 * @property {string} error.errorType - Error type (validation, execution, timeout, etc.)
 * @property {string} error.errorCode - Machine-readable error code
 * @property {string} error.message - Human-readable error message
 * @property {string} error.stackTrace - Stack trace (if available)
 * @property {Object} error.context - Error context
 * @property {string} error.context.phase - Execution phase when error occurred
 * @property {string} error.context.operation - Operation that failed
 * @property {Object} error.context.details - Additional error details
 * @property {Object} error.recovery - Recovery information
 * @property {boolean} error.recovery.isRetryable - Whether error can be retried
 * @property {Array<string>} error.recovery.hints - Recovery hints for orchestrator
 * @property {number} error.recovery.suggestedRetryDelay - Suggested delay before retry (ms)
 * @property {Object} error.impact - Impact assessment
 * @property {string} error.impact.severity - Severity (critical, high, medium, low)
 * @property {boolean} error.impact.blocking - Whether error blocks dependent tasks
 * @property {Array<string>} error.impact.affectedWorkItems - Affected work item IDs
 */

/**
 * Cancellation request message
 * Sent from HOP orchestrator to LOP worker to cancel ongoing work
 *
 * @typedef {Object} CancellationRequestMessage
 * @property {string} messageId - Unique message identifier (UUID)
 * @property {string} messageType - Always 'cancellation_request'
 * @property {string} schemaVersion - Schema version
 * @property {number} timestamp - Message creation timestamp
 * @property {string} orchestratorId - ID of sending orchestrator (HOP)
 * @property {string} workerId - ID of target worker (LOP)
 * @property {string} correlationId - Correlation ID from task assignment
 * @property {Object} cancellation - Cancellation details
 * @property {string} cancellation.workItemId - Work item ID to cancel
 * @property {string} cancellation.reason - Cancellation reason
 * @property {boolean} cancellation.graceful - Whether to allow graceful shutdown
 * @property {number} cancellation.gracePeriod - Grace period in milliseconds
 * @property {boolean} cancellation.savePartialResults - Whether to save partial results
 */

/**
 * Heartbeat message
 * Periodic message to verify worker health and connectivity
 *
 * @typedef {Object} HeartbeatMessage
 * @property {string} messageId - Unique message identifier (UUID)
 * @property {string} messageType - Always 'heartbeat'
 * @property {string} schemaVersion - Schema version
 * @property {number} timestamp - Message creation timestamp
 * @property {string} workerId - ID of sending worker
 * @property {string} orchestratorId - ID of target orchestrator
 * @property {Object} health - Health status
 * @property {string} health.status - Health status (healthy, degraded, unhealthy)
 * @property {number} health.uptime - Uptime in milliseconds
 * @property {Object} health.metrics - Current metrics
 * @property {number} health.metrics.memoryUsage - Current memory usage
 * @property {number} health.metrics.cpuUsage - Current CPU usage percentage
 * @property {number} health.metrics.activeTaskCount - Number of active tasks
 */

/**
 * Message schema validator
 */
class MessageSchemaValidator {
  /**
   * Validate a message against its schema
   * @param {Object} message - Message to validate
   * @returns {Object} Validation result { valid: boolean, errors: Array<string> }
   */
  static validate(message) {
    const errors = [];

    // Common validations
    if (!message.messageId) {
      errors.push('Missing required field: messageId');
    }
    if (!message.messageType || !Object.values(MessageType).includes(message.messageType)) {
      errors.push('Invalid or missing messageType');
    }
    if (!message.schemaVersion) {
      errors.push('Missing required field: schemaVersion');
    }
    if (!message.timestamp || typeof message.timestamp !== 'number') {
      errors.push('Invalid or missing timestamp');
    }

    // Type-specific validations
    switch (message.messageType) {
      case MessageType.TASK_ASSIGNMENT:
        this._validateTaskAssignment(message, errors);
        break;
      case MessageType.PROGRESS_UPDATE:
        this._validateProgressUpdate(message, errors);
        break;
      case MessageType.COMPLETION_RESULT:
        this._validateCompletionResult(message, errors);
        break;
      case MessageType.ERROR_MESSAGE:
        this._validateErrorMessage(message, errors);
        break;
      case MessageType.CANCELLATION_REQUEST:
        this._validateCancellationRequest(message, errors);
        break;
      case MessageType.HEARTBEAT:
        this._validateHeartbeat(message, errors);
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static _validateTaskAssignment(message, errors) {
    if (!message.orchestratorId) errors.push('Missing orchestratorId');
    if (!message.workerId) errors.push('Missing workerId');
    if (!message.correlationId) errors.push('Missing correlationId');
    if (!message.task) errors.push('Missing task object');
    if (message.task && !message.task.workItemId) errors.push('Missing task.workItemId');
    if (message.task && !message.task.workItemType) errors.push('Missing task.workItemType');
  }

  static _validateProgressUpdate(message, errors) {
    if (!message.workerId) errors.push('Missing workerId');
    if (!message.orchestratorId) errors.push('Missing orchestratorId');
    if (!message.correlationId) errors.push('Missing correlationId');
    if (!message.progress) errors.push('Missing progress object');
    if (message.progress && !message.progress.workItemId) errors.push('Missing progress.workItemId');
    if (message.progress && typeof message.progress.percentage !== 'number') {
      errors.push('Invalid progress.percentage');
    }
  }

  static _validateCompletionResult(message, errors) {
    if (!message.workerId) errors.push('Missing workerId');
    if (!message.orchestratorId) errors.push('Missing orchestratorId');
    if (!message.correlationId) errors.push('Missing correlationId');
    if (!message.result) errors.push('Missing result object');
    if (message.result && !message.result.workItemId) errors.push('Missing result.workItemId');
    if (message.result && typeof message.result.success !== 'boolean') {
      errors.push('Invalid result.success');
    }
  }

  static _validateErrorMessage(message, errors) {
    if (!message.workerId) errors.push('Missing workerId');
    if (!message.orchestratorId) errors.push('Missing orchestratorId');
    if (!message.correlationId) errors.push('Missing correlationId');
    if (!message.error) errors.push('Missing error object');
    if (message.error && !message.error.workItemId) errors.push('Missing error.workItemId');
    if (message.error && !message.error.errorType) errors.push('Missing error.errorType');
    if (message.error && !message.error.message) errors.push('Missing error.message');
  }

  static _validateCancellationRequest(message, errors) {
    if (!message.orchestratorId) errors.push('Missing orchestratorId');
    if (!message.workerId) errors.push('Missing workerId');
    if (!message.correlationId) errors.push('Missing correlationId');
    if (!message.cancellation) errors.push('Missing cancellation object');
    if (message.cancellation && !message.cancellation.workItemId) {
      errors.push('Missing cancellation.workItemId');
    }
  }

  static _validateHeartbeat(message, errors) {
    if (!message.workerId) errors.push('Missing workerId');
    if (!message.orchestratorId) errors.push('Missing orchestratorId');
    if (!message.health) errors.push('Missing health object');
    if (message.health && !message.health.status) errors.push('Missing health.status');
  }
}

// Export message types and schema version
module.exports = {
  MessageType,
  SCHEMA_VERSION,
  MessageSchemaValidator,
};
