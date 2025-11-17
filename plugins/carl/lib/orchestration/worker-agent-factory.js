/**
 * WorkerAgentFactory - Factory for creating and configuring worker agents
 *
 * Implements the Factory pattern for instantiating different types of
 * worker agents based on work item requirements.
 *
 * Supports:
 * - Generic worker agents
 * - Specialized worker types (code-gen, testing, docs, etc.)
 * - HOP orchestrators
 * - Custom worker class registration
 */

const BaseWorkerAgent = require('./base-worker-agent');
const WorkerOrchestrator = require('./worker-orchestrator');
const { AgentType } = require('./base-worker-agent');

/**
 * Worker type identifiers for specialized workers
 */
const WorkerType = {
  GENERIC: 'generic',
  CODE_GENERATION: 'code-generation',
  TESTING: 'testing',
  DOCUMENTATION: 'documentation',
  CODE_REVIEW: 'code-review',
  ANALYSIS: 'analysis',
  INTEGRATION: 'integration',
  DEPLOYMENT: 'deployment',
  REFACTORING: 'refactoring',
  ORCHESTRATOR: 'orchestrator',
};

/**
 * Default configurations for each worker type
 */
const DefaultConfigs = {
  [WorkerType.GENERIC]: {
    timeout: 600000, // 10 minutes
    enableLogging: true,
    enableMetrics: true,
  },

  [WorkerType.CODE_GENERATION]: {
    timeout: 900000, // 15 minutes
    enableLogging: true,
    enableMetrics: true,
    allowedTools: ['Write', 'Edit', 'Read', 'Glob'],
  },

  [WorkerType.TESTING]: {
    timeout: 1200000, // 20 minutes
    enableLogging: true,
    enableMetrics: true,
    allowedTools: ['Write', 'Edit', 'Read', 'Bash', 'Grep'],
  },

  [WorkerType.DOCUMENTATION]: {
    timeout: 600000, // 10 minutes
    enableLogging: true,
    enableMetrics: true,
    allowedTools: ['Write', 'Edit', 'Read', 'Glob'],
  },

  [WorkerType.CODE_REVIEW]: {
    timeout: 900000, // 15 minutes
    enableLogging: true,
    enableMetrics: true,
    allowedTools: ['Read', 'Grep', 'Glob', 'Bash'],
  },

  [WorkerType.ANALYSIS]: {
    timeout: 1200000, // 20 minutes
    enableLogging: true,
    enableMetrics: true,
    allowedTools: ['Read', 'Grep', 'Glob', 'Bash'],
  },

  [WorkerType.INTEGRATION]: {
    timeout: 900000, // 15 minutes
    enableLogging: true,
    enableMetrics: true,
    allowedTools: ['Write', 'Edit', 'Read', 'Bash', 'Grep'],
  },

  [WorkerType.DEPLOYMENT]: {
    timeout: 1800000, // 30 minutes
    enableLogging: true,
    enableMetrics: true,
    allowedTools: ['Bash', 'Read', 'Write'],
  },

  [WorkerType.REFACTORING]: {
    timeout: 1200000, // 20 minutes
    enableLogging: true,
    enableMetrics: true,
    allowedTools: ['Edit', 'Read', 'Grep', 'Bash'],
  },

  [WorkerType.ORCHESTRATOR]: {
    timeout: 3600000, // 60 minutes
    enableLogging: true,
    enableMetrics: true,
    maxConcurrency: 4,
    strategy: 'hybrid',
  },
};

/**
 * WorkerAgentFactory - Creates and configures worker agents
 */
class WorkerAgentFactory {
  constructor() {
    // Registry of custom worker classes
    this.customWorkerClasses = new Map();

    // Default worker class mappings
    this.workerClasses = new Map([
      [WorkerType.GENERIC, BaseWorkerAgent],
      [WorkerType.ORCHESTRATOR, WorkerOrchestrator],
      // Specialized workers use BaseWorkerAgent with specific configs
      [WorkerType.CODE_GENERATION, BaseWorkerAgent],
      [WorkerType.TESTING, BaseWorkerAgent],
      [WorkerType.DOCUMENTATION, BaseWorkerAgent],
      [WorkerType.CODE_REVIEW, BaseWorkerAgent],
      [WorkerType.ANALYSIS, BaseWorkerAgent],
      [WorkerType.INTEGRATION, BaseWorkerAgent],
      [WorkerType.DEPLOYMENT, BaseWorkerAgent],
      [WorkerType.REFACTORING, BaseWorkerAgent],
    ]);
  }

  /**
   * Create a worker agent
   * @param {string} workerType - Type of worker to create
   * @param {Object} config - Worker configuration (merged with defaults)
   * @returns {BaseWorkerAgent} Worker instance
   */
  createWorker(workerType, config = {}) {
    // Validate worker type
    if (!this._isValidWorkerType(workerType)) {
      throw new Error(`Invalid worker type: ${workerType}`);
    }

    // Get worker class
    const WorkerClass = this._getWorkerClass(workerType);

    // Merge configuration with defaults
    const mergedConfig = this._mergeConfig(workerType, config);

    // Validate configuration
    this._validateConfig(workerType, mergedConfig);

    // Create and return worker instance
    const worker = new WorkerClass(mergedConfig);

    // Set worker type metadata
    worker.workerType = workerType;

    return worker;
  }

  /**
   * Create an orchestrator (HOP)
   * @param {Object} config - Orchestrator configuration
   * @returns {WorkerOrchestrator} Orchestrator instance
   */
  createOrchestrator(config = {}) {
    return this.createWorker(WorkerType.ORCHESTRATOR, config);
  }

  /**
   * Create multiple workers of the same type
   * @param {string} workerType - Type of workers to create
   * @param {number} count - Number of workers to create
   * @param {Object} baseConfig - Base configuration for all workers
   * @returns {Array<BaseWorkerAgent>} Array of worker instances
   */
  createWorkerPool(workerType, count, baseConfig = {}) {
    if (count < 1) {
      throw new Error('Worker pool count must be at least 1');
    }

    const workers = [];
    for (let i = 0; i < count; i++) {
      const config = {
        ...baseConfig,
        id: `${workerType}-worker-${i + 1}-${Date.now()}`,
      };
      workers.push(this.createWorker(workerType, config));
    }

    return workers;
  }

  /**
   * Register a custom worker class
   * @param {string} workerType - Type identifier
   * @param {Function} WorkerClass - Worker class constructor
   * @param {Object} defaultConfig - Default configuration
   */
  registerWorkerType(workerType, WorkerClass, defaultConfig = {}) {
    // Validate that WorkerClass extends BaseWorkerAgent
    if (!(WorkerClass.prototype instanceof BaseWorkerAgent)) {
      throw new Error('Worker class must extend BaseWorkerAgent');
    }

    this.customWorkerClasses.set(workerType, WorkerClass);
    this.workerClasses.set(workerType, WorkerClass);
    DefaultConfigs[workerType] = defaultConfig;
  }

  /**
   * Unregister a custom worker type
   * @param {string} workerType - Type identifier
   * @returns {boolean} Success
   */
  unregisterWorkerType(workerType) {
    if (this._isBuiltInType(workerType)) {
      throw new Error(`Cannot unregister built-in worker type: ${workerType}`);
    }

    const deleted = this.customWorkerClasses.delete(workerType);
    if (deleted) {
      this.workerClasses.delete(workerType);
      delete DefaultConfigs[workerType];
    }

    return deleted;
  }

  /**
   * Get default configuration for a worker type
   * @param {string} workerType - Worker type
   * @returns {Object} Default configuration
   */
  getDefaultConfig(workerType) {
    return { ...DefaultConfigs[workerType] } || {};
  }

  /**
   * Get all registered worker types
   * @returns {Array<string>} Array of worker type identifiers
   */
  getRegisteredTypes() {
    return Array.from(this.workerClasses.keys());
  }

  /**
   * Check if worker type is registered
   * @param {string} workerType - Worker type
   * @returns {boolean}
   */
  isRegistered(workerType) {
    return this.workerClasses.has(workerType);
  }

  /**
   * Create worker from work item requirements
   * @param {Object} workItem - Work item with requirements
   * @returns {BaseWorkerAgent} Worker instance
   */
  createWorkerForWorkItem(workItem) {
    // Determine worker type from work item metadata
    const workerType = this._inferWorkerType(workItem);

    // Extract configuration from work item
    const config = {
      sessionId: workItem.sessionId,
      context: {
        workItemId: workItem.id,
        workItemType: workItem.type,
        ...workItem.context,
      },
    };

    return this.createWorker(workerType, config);
  }

  /**
   * Check if worker type is valid
   * @param {string} workerType - Worker type
   * @returns {boolean}
   * @private
   */
  _isValidWorkerType(workerType) {
    return this.workerClasses.has(workerType);
  }

  /**
   * Get worker class for type
   * @param {string} workerType - Worker type
   * @returns {Function} Worker class
   * @private
   */
  _getWorkerClass(workerType) {
    return this.workerClasses.get(workerType);
  }

  /**
   * Merge configuration with defaults
   * @param {string} workerType - Worker type
   * @param {Object} config - User configuration
   * @returns {Object} Merged configuration
   * @private
   */
  _mergeConfig(workerType, config) {
    const defaultConfig = this.getDefaultConfig(workerType);

    return {
      ...defaultConfig,
      ...config,
      type: config.type || workerType,
    };
  }

  /**
   * Validate worker configuration
   * @param {string} workerType - Worker type
   * @param {Object} config - Configuration to validate
   * @private
   */
  _validateConfig(workerType, config) {
    // Basic validation
    if (config.timeout && config.timeout < 1000) {
      throw new Error('Worker timeout must be at least 1000ms');
    }

    // Orchestrator-specific validation
    if (workerType === WorkerType.ORCHESTRATOR) {
      if (config.maxConcurrency !== undefined && config.maxConcurrency < 1) {
        throw new Error('Orchestrator maxConcurrency must be at least 1');
      }
    }
  }

  /**
   * Check if worker type is built-in
   * @param {string} workerType - Worker type
   * @returns {boolean}
   * @private
   */
  _isBuiltInType(workerType) {
    return Object.values(WorkerType).includes(workerType);
  }

  /**
   * Infer worker type from work item
   * @param {Object} workItem - Work item
   * @returns {string} Worker type
   * @private
   */
  _inferWorkerType(workItem) {
    // Check explicit worker type
    if (workItem.workerType && this.isRegistered(workItem.workerType)) {
      return workItem.workerType;
    }

    // Infer from work item type or description
    const description = (workItem.description || '').toLowerCase();
    const title = (workItem.title || '').toLowerCase();

    if (description.includes('test') || title.includes('test')) {
      return WorkerType.TESTING;
    }

    if (
      description.includes('document') ||
      title.includes('document') ||
      title.includes('doc')
    ) {
      return WorkerType.DOCUMENTATION;
    }

    if (description.includes('review') || title.includes('review')) {
      return WorkerType.CODE_REVIEW;
    }

    if (
      description.includes('analyze') ||
      description.includes('analysis') ||
      title.includes('analyz')
    ) {
      return WorkerType.ANALYSIS;
    }

    if (description.includes('deploy') || title.includes('deploy')) {
      return WorkerType.DEPLOYMENT;
    }

    if (description.includes('refactor') || title.includes('refactor')) {
      return WorkerType.REFACTORING;
    }

    if (description.includes('integrat') || title.includes('integrat')) {
      return WorkerType.INTEGRATION;
    }

    // Default to code generation for implementation tasks
    if (
      description.includes('implement') ||
      description.includes('create') ||
      description.includes('add') ||
      title.includes('implement')
    ) {
      return WorkerType.CODE_GENERATION;
    }

    // Default to generic worker
    return WorkerType.GENERIC;
  }
}

// Export factory and constants
module.exports = WorkerAgentFactory;
module.exports.WorkerType = WorkerType;
module.exports.DefaultConfigs = DefaultConfigs;
