/**
 * Message Router for HOP/LOP Agent Communication
 *
 * Implements routing logic to:
 * - Match tasks with appropriate worker types
 * - Distribute work efficiently based on capability
 * - Support routing rules based on task complexity and priority
 * - Implement round-robin distribution for load balancing
 * - Track routing metrics and provide logging
 *
 * Follows IndyDevDan's orchestration principles:
 * - Agent specialization (right agent for the job)
 * - Observable by default
 * - Intelligent work distribution
 */

const EventEmitter = require('events');

/**
 * Worker capabilities
 */
const WorkerCapability = {
  CODE_GENERATION: 'code_generation',
  CODE_REVIEW: 'code_review',
  TESTING: 'testing',
  DOCUMENTATION: 'documentation',
  REFACTORING: 'refactoring',
  DEBUGGING: 'debugging',
  ANALYSIS: 'analysis',
  INTEGRATION: 'integration',
  GENERAL: 'general', // General-purpose worker
};

/**
 * Routing strategies
 */
const RoutingStrategy = {
  ROUND_ROBIN: 'round_robin', // Distribute evenly across workers
  LEAST_LOADED: 'least_loaded', // Route to worker with least active tasks
  PRIORITY_BASED: 'priority_based', // High priority to best workers
  CAPABILITY_MATCH: 'capability_match', // Match task to worker capability
  HYBRID: 'hybrid', // Combination of capability + load balancing
};

/**
 * Worker registration entry
 */
class WorkerRegistration {
  constructor(workerId, capabilities, metadata = {}) {
    this.workerId = workerId;
    this.capabilities = Array.isArray(capabilities) ? capabilities : [capabilities];
    this.metadata = metadata;
    this.activeTaskCount = 0;
    this.totalTasksHandled = 0;
    this.successCount = 0;
    this.failureCount = 0;
    this.averageResponseTime = 0;
    this.registeredAt = Date.now();
    this.lastActiveAt = Date.now();
    this.isHealthy = true;
  }

  hasCapability(capability) {
    return this.capabilities.includes(capability) || this.capabilities.includes(WorkerCapability.GENERAL);
  }

  canAcceptTask(maxConcurrent = 10) {
    return this.isHealthy && this.activeTaskCount < maxConcurrent;
  }

  incrementActive() {
    this.activeTaskCount++;
    this.totalTasksHandled++;
    this.lastActiveAt = Date.now();
  }

  decrementActive() {
    this.activeTaskCount = Math.max(0, this.activeTaskCount - 1);
  }

  recordSuccess(responseTime) {
    this.successCount++;
    this._updateAverageResponseTime(responseTime);
  }

  recordFailure(responseTime) {
    this.failureCount++;
    this._updateAverageResponseTime(responseTime);
  }

  _updateAverageResponseTime(responseTime) {
    const totalTasks = this.successCount + this.failureCount;
    this.averageResponseTime = ((this.averageResponseTime * (totalTasks - 1)) + responseTime) / totalTasks;
  }

  getLoad() {
    return this.activeTaskCount;
  }

  getSuccessRate() {
    const total = this.successCount + this.failureCount;
    return total > 0 ? this.successCount / total : 1.0;
  }

  getScore() {
    // Score based on success rate, load, and response time
    const successWeight = 0.4;
    const loadWeight = 0.3;
    const speedWeight = 0.3;

    const successScore = this.getSuccessRate();
    const loadScore = Math.max(0, 1 - (this.activeTaskCount / 10)); // Normalize load
    const speedScore = this.averageResponseTime > 0 ? Math.max(0, 1 - (this.averageResponseTime / 60000)) : 1.0;

    return (successScore * successWeight) + (loadScore * loadWeight) + (speedScore * speedWeight);
  }

  toJSON() {
    return {
      workerId: this.workerId,
      capabilities: this.capabilities,
      metadata: this.metadata,
      activeTaskCount: this.activeTaskCount,
      totalTasksHandled: this.totalTasksHandled,
      successCount: this.successCount,
      failureCount: this.failureCount,
      averageResponseTime: this.averageResponseTime,
      registeredAt: this.registeredAt,
      lastActiveAt: this.lastActiveAt,
      isHealthy: this.isHealthy,
      successRate: this.getSuccessRate(),
      score: this.getScore(),
    };
  }
}

/**
 * Routing rule
 */
class RoutingRule {
  constructor(condition, target, priority = 0) {
    this.condition = condition; // Function: (task) => boolean
    this.target = target; // Worker ID or capability
    this.priority = priority; // Higher priority rules evaluated first
  }

  matches(task) {
    return this.condition(task);
  }
}

/**
 * Message Router
 */
class MessageRouter extends EventEmitter {
  /**
   * Create a message router
   * @param {Object} options - Router configuration
   */
  constructor(options = {}) {
    super();

    this.options = {
      defaultStrategy: options.defaultStrategy || RoutingStrategy.HYBRID,
      maxConcurrentPerWorker: options.maxConcurrentPerWorker || 10,
      enableMetrics: options.enableMetrics !== false,
      healthCheckInterval: options.healthCheckInterval || 30000,
    };

    // Worker registry
    this.workers = new Map(); // workerId -> WorkerRegistration
    this.capabilityIndex = new Map(); // capability -> Set<workerId>

    // Routing rules
    this.rules = [];

    // Round-robin state
    this.roundRobinIndex = 0;

    // Metrics
    this.metrics = {
      routedTasks: 0,
      failedRouting: 0,
      ruleMatches: 0,
      roundRobinRoutes: 0,
      capabilityRoutes: 0,
      loadBalancedRoutes: 0,
    };

    // Task tracking
    this.activeAssignments = new Map(); // taskId -> { workerId, startTime }

    // Health check timer
    this.healthCheckTimer = null;
    this._startHealthCheck();
  }

  /**
   * Register a worker
   * @param {string} workerId - Worker ID
   * @param {Array<string>} capabilities - Worker capabilities
   * @param {Object} metadata - Additional metadata
   * @returns {boolean} Success
   */
  registerWorker(workerId, capabilities, metadata = {}) {
    if (this.workers.has(workerId)) {
      throw new Error(`Worker already registered: ${workerId}`);
    }

    const registration = new WorkerRegistration(workerId, capabilities, metadata);
    this.workers.set(workerId, registration);

    // Index by capabilities
    for (const capability of registration.capabilities) {
      if (!this.capabilityIndex.has(capability)) {
        this.capabilityIndex.set(capability, new Set());
      }
      this.capabilityIndex.get(capability).add(workerId);
    }

    this.emit('worker:registered', {
      workerId,
      capabilities,
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Unregister a worker
   * @param {string} workerId - Worker ID
   * @returns {boolean} Success
   */
  unregisterWorker(workerId) {
    const registration = this.workers.get(workerId);
    if (!registration) {
      return false;
    }

    // Remove from capability index
    for (const capability of registration.capabilities) {
      const workerSet = this.capabilityIndex.get(capability);
      if (workerSet) {
        workerSet.delete(workerId);
        if (workerSet.size === 0) {
          this.capabilityIndex.delete(capability);
        }
      }
    }

    this.workers.delete(workerId);

    this.emit('worker:unregistered', {
      workerId,
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Add a routing rule
   * @param {RoutingRule} rule - Routing rule
   */
  addRule(rule) {
    this.rules.push(rule);
    // Sort by priority (descending)
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove all routing rules
   */
  clearRules() {
    this.rules = [];
  }

  /**
   * Route a task to an appropriate worker
   * @param {Object} task - Task to route
   * @param {Object} options - Routing options
   * @returns {string|null} Worker ID or null if no worker available
   */
  route(task, options = {}) {
    const strategy = options.strategy || this.options.defaultStrategy;

    try {
      // First, check custom routing rules
      const ruleTarget = this._checkRules(task);
      if (ruleTarget) {
        this.metrics.ruleMatches++;
        return this._assignToWorker(task, ruleTarget);
      }

      // Apply routing strategy
      let workerId;
      switch (strategy) {
        case RoutingStrategy.ROUND_ROBIN:
          workerId = this._routeRoundRobin(task);
          this.metrics.roundRobinRoutes++;
          break;

        case RoutingStrategy.LEAST_LOADED:
          workerId = this._routeLeastLoaded(task);
          this.metrics.loadBalancedRoutes++;
          break;

        case RoutingStrategy.PRIORITY_BASED:
          workerId = this._routePriorityBased(task);
          break;

        case RoutingStrategy.CAPABILITY_MATCH:
          workerId = this._routeCapabilityMatch(task);
          this.metrics.capabilityRoutes++;
          break;

        case RoutingStrategy.HYBRID:
          workerId = this._routeHybrid(task);
          this.metrics.capabilityRoutes++;
          break;

        default:
          throw new Error(`Unknown routing strategy: ${strategy}`);
      }

      if (workerId) {
        this.metrics.routedTasks++;
        return this._assignToWorker(task, workerId);
      }

      this.metrics.failedRouting++;
      this.emit('routing:failed', {
        taskId: task.workItemId,
        strategy,
        timestamp: Date.now(),
      });

      return null;
    } catch (error) {
      this.metrics.failedRouting++;
      this.emit('routing:error', {
        taskId: task.workItemId,
        error: error.message,
        timestamp: Date.now(),
      });
      return null;
    }
  }

  /**
   * Mark task as completed
   * @param {string} taskId - Task ID
   * @param {boolean} success - Whether task succeeded
   */
  completeTask(taskId, success = true) {
    const assignment = this.activeAssignments.get(taskId);
    if (!assignment) {
      return;
    }

    const registration = this.workers.get(assignment.workerId);
    if (registration) {
      registration.decrementActive();
      const responseTime = Date.now() - assignment.startTime;
      if (success) {
        registration.recordSuccess(responseTime);
      } else {
        registration.recordFailure(responseTime);
      }
    }

    this.activeAssignments.delete(taskId);

    this.emit('task:completed', {
      taskId,
      workerId: assignment.workerId,
      success,
      duration: Date.now() - assignment.startTime,
      timestamp: Date.now(),
    });
  }

  /**
   * Get worker by ID
   * @param {string} workerId - Worker ID
   * @returns {WorkerRegistration|null}
   */
  getWorker(workerId) {
    return this.workers.get(workerId) || null;
  }

  /**
   * Get all workers
   * @returns {Array<WorkerRegistration>}
   */
  getAllWorkers() {
    return Array.from(this.workers.values());
  }

  /**
   * Get workers by capability
   * @param {string} capability - Capability
   * @returns {Array<WorkerRegistration>}
   */
  getWorkersByCapability(capability) {
    const workerIds = this.capabilityIndex.get(capability);
    if (!workerIds) {
      return [];
    }
    return Array.from(workerIds).map(id => this.workers.get(id)).filter(Boolean);
  }

  /**
   * Get routing statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      totalWorkers: this.workers.size,
      availableWorkers: Array.from(this.workers.values()).filter(w =>
        w.canAcceptTask(this.options.maxConcurrentPerWorker)
      ).length,
      activeAssignments: this.activeAssignments.size,
      capabilities: Array.from(this.capabilityIndex.keys()),
      metrics: { ...this.metrics },
      workers: Array.from(this.workers.values()).map(w => w.toJSON()),
    };
  }

  /**
   * Check routing rules
   * @param {Object} task - Task
   * @returns {string|null} Target worker ID or null
   * @private
   */
  _checkRules(task) {
    for (const rule of this.rules) {
      if (rule.matches(task)) {
        return rule.target;
      }
    }
    return null;
  }

  /**
   * Assign task to worker
   * @param {Object} task - Task
   * @param {string} workerId - Worker ID
   * @returns {string} Worker ID
   * @private
   */
  _assignToWorker(task, workerId) {
    const registration = this.workers.get(workerId);
    if (!registration) {
      throw new Error(`Worker not found: ${workerId}`);
    }

    registration.incrementActive();
    this.activeAssignments.set(task.workItemId, {
      workerId,
      startTime: Date.now(),
    });

    this.emit('task:routed', {
      taskId: task.workItemId,
      workerId,
      timestamp: Date.now(),
    });

    return workerId;
  }

  /**
   * Round-robin routing
   * @param {Object} task - Task
   * @returns {string|null} Worker ID
   * @private
   */
  _routeRoundRobin(task) {
    const workers = Array.from(this.workers.values()).filter(w =>
      w.canAcceptTask(this.options.maxConcurrentPerWorker)
    );

    if (workers.length === 0) {
      return null;
    }

    this.roundRobinIndex = this.roundRobinIndex % workers.length;
    const worker = workers[this.roundRobinIndex];
    this.roundRobinIndex++;

    return worker.workerId;
  }

  /**
   * Least loaded routing
   * @param {Object} task - Task
   * @returns {string|null} Worker ID
   * @private
   */
  _routeLeastLoaded(task) {
    const workers = Array.from(this.workers.values()).filter(w =>
      w.canAcceptTask(this.options.maxConcurrentPerWorker)
    );

    if (workers.length === 0) {
      return null;
    }

    // Sort by load (ascending)
    workers.sort((a, b) => a.getLoad() - b.getLoad());

    return workers[0].workerId;
  }

  /**
   * Priority-based routing (best worker for high priority)
   * @param {Object} task - Task
   * @returns {string|null} Worker ID
   * @private
   */
  _routePriorityBased(task) {
    const workers = Array.from(this.workers.values()).filter(w =>
      w.canAcceptTask(this.options.maxConcurrentPerWorker)
    );

    if (workers.length === 0) {
      return null;
    }

    // Sort by score (descending) for high priority tasks
    if (task.priority && task.priority >= 7) {
      workers.sort((a, b) => b.getScore() - a.getScore());
    } else {
      // Use least loaded for normal priority
      workers.sort((a, b) => a.getLoad() - b.getLoad());
    }

    return workers[0].workerId;
  }

  /**
   * Capability match routing
   * @param {Object} task - Task
   * @returns {string|null} Worker ID
   * @private
   */
  _routeCapabilityMatch(task) {
    const requiredCapability = task.requiredCapability || WorkerCapability.GENERAL;
    const candidates = this.getWorkersByCapability(requiredCapability).filter(w =>
      w.canAcceptTask(this.options.maxConcurrentPerWorker)
    );

    if (candidates.length === 0) {
      // Fallback to general workers
      return this._routeRoundRobin(task);
    }

    // Return least loaded with capability
    candidates.sort((a, b) => a.getLoad() - b.getLoad());
    return candidates[0].workerId;
  }

  /**
   * Hybrid routing (capability + load balancing)
   * @param {Object} task - Task
   * @returns {string|null} Worker ID
   * @private
   */
  _routeHybrid(task) {
    const requiredCapability = task.requiredCapability || WorkerCapability.GENERAL;
    const candidates = this.getWorkersByCapability(requiredCapability).filter(w =>
      w.canAcceptTask(this.options.maxConcurrentPerWorker)
    );

    if (candidates.length === 0) {
      // Fallback to any available worker
      return this._routeLeastLoaded(task);
    }

    // Sort by composite score (capability match + load + success rate)
    candidates.sort((a, b) => b.getScore() - a.getScore());

    return candidates[0].workerId;
  }

  /**
   * Start health check timer
   * @private
   */
  _startHealthCheck() {
    if (this.options.healthCheckInterval > 0) {
      this.healthCheckTimer = setInterval(() => {
        this._performHealthCheck();
      }, this.options.healthCheckInterval);
    }
  }

  /**
   * Perform health check on workers
   * @private
   */
  _performHealthCheck() {
    const now = Date.now();
    const timeout = 120000; // 2 minutes

    for (const [workerId, registration] of this.workers.entries()) {
      // Mark as unhealthy if no activity for 2 minutes
      if (now - registration.lastActiveAt > timeout) {
        registration.isHealthy = false;
        this.emit('worker:unhealthy', {
          workerId,
          lastActiveAt: registration.lastActiveAt,
          timestamp: now,
        });
      }
    }
  }

  /**
   * Stop router and cleanup
   */
  stop() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    this.emit('router:stopped', { timestamp: Date.now() });
  }
}

// Export
module.exports = {
  MessageRouter,
  WorkerRegistration,
  RoutingRule,
  WorkerCapability,
  RoutingStrategy,
};
