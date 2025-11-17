/**
 * Hybrid Execution Coordinator
 *
 * Intelligently orchestrates work items using a hybrid approach that combines:
 * - Parallel execution for independent work items (using WorkerPool)
 * - Sequential execution for dependent chains (using ChainExecutor)
 * - Dynamic scheduling based on dependency analysis
 * - Automatic optimization for maximum throughput
 *
 * Based on IndyDevDan's orchestration principles:
 * - "Do more when possible, wait when needed"
 * - Async-first execution with clean context separation
 * - Observable by default with real-time progress tracking
 * - Graceful degradation with partial failure handling
 * - Event-driven coordination
 *
 * Architecture:
 * 1. Analyze dependency graph to identify execution waves
 * 2. Within each wave, execute independent items in parallel
 * 3. Between waves, wait for all items to complete before proceeding
 * 4. Handle failures gracefully and continue with unaffected work
 * 5. Provide real-time progress updates and execution metrics
 */

const EventEmitter = require('events');
const WorkerPool = require('./worker-pool');
const ChainExecutor = require('./chain-executor');
const { ParallelExecutionAnalyzer } = require('../cascade/parallel-execution-analyzer');
const { DependencyGraph } = require('../cascade/dependency-graph');
const { CycleDetector } = require('../cascade/cycle-detector');
const RetryPolicy = require('./retry-policy');
const ExecutionStateManager = require('./execution-state-manager');
const FailureReportGenerator = require('./failure-report-generator');
const ProgressTracker = require('./progress-tracker');
const SessionState = require('../workflow/session-state');

// Coordinator states
const CoordinatorState = {
  INITIALIZING: 'initializing',
  READY: 'ready',
  ANALYZING: 'analyzing',
  EXECUTING: 'executing',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

// Execution strategies
const ExecutionStrategy = {
  PURE_PARALLEL: 'pure_parallel',      // All items in parallel (no dependencies)
  PURE_SEQUENTIAL: 'pure_sequential',  // All items sequential (linear chain)
  HYBRID: 'hybrid',                     // Mixed parallel and sequential
};

// Work item execution states
const ItemState = {
  PENDING: 'pending',
  READY: 'ready',
  EXECUTING: 'executing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
  BLOCKED: 'blocked',  // New: blocked by failed dependencies
};

class HybridCoordinator extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      maxConcurrency: 4,
      enableOptimization: true,
      enableFailureRecovery: true,
      continueOnFailure: true,
      timeout: 3600000, // 1 hour default
      stepTimeout: 300000, // 5 minutes per item
      // New failure recovery options
      defaultRetryPolicy: config.defaultRetryPolicy || RetryPolicy.preset('default'),
      enableStatePersistence: config.enableStatePersistence !== undefined ? config.enableStatePersistence : false,
      stateDirectory: config.stateDirectory || '.cascade/.execution-state',
      enableFailureReports: config.enableFailureReports !== undefined ? config.enableFailureReports : true,
      failureReportPath: config.failureReportPath || '.cascade/.failure-reports',
      // Progress tracking options
      enableProgressTracking: config.enableProgressTracking !== undefined ? config.enableProgressTracking : true,
      progressUpdateInterval: config.progressUpdateInterval || 100,
      enableProgressPersistence: config.enableProgressPersistence !== undefined ? config.enableProgressPersistence : false,
      progressDirectory: config.progressDirectory || '.cascade/.progress-history',
      // Session state options
      enableSessionState: config.enableSessionState !== undefined ? config.enableSessionState : true,
      sessionId: config.sessionId || null, // null = new session, string = resume existing
      sessionBaseDir: config.sessionBaseDir || '.claude/.carl/sessions',
      ...config,
    };

    this.state = CoordinatorState.INITIALIZING;
    this.workItems = new Map(); // itemId -> item definition
    this.itemStates = new Map(); // itemId -> ItemState
    this.itemResults = new Map(); // itemId -> result
    this.itemErrors = new Map(); // itemId -> error
    this.retryHistory = new Map(); // itemId -> retry history

    this.dependencyGraph = null;
    this.executionPlan = null;
    this.strategy = null;

    this.workerPool = null;
    this.chainExecutor = null;

    // New: State management
    this.stateManager = new ExecutionStateManager({
      stateDirectory: this.config.stateDirectory,
      enabled: this.config.enableStatePersistence,
    });
    this.executionId = null;

    // Progress tracking
    this.progressTracker = null;
    if (this.config.enableProgressTracking) {
      this.progressTracker = new ProgressTracker({
        updateInterval: this.config.progressUpdateInterval,
        enablePersistence: this.config.enableProgressPersistence,
        persistenceDirectory: this.config.progressDirectory,
      });
      // Forward progress events to coordinator listeners
      this.progressTracker.on('progress', (snapshot) => {
        this.emit('progress:update', snapshot);
      });
      this.progressTracker.on('timeline', (entry) => {
        this.emit('progress:timeline', entry);
      });
    }

    // Session state management
    this.sessionState = null;
    if (this.config.enableSessionState) {
      // Create new session or resume existing based on sessionId config
      this.sessionState = new SessionState(
        this.config.sessionId,
        this.config.sessionBaseDir
      );
    }

    this.currentWave = -1;
    this.startTime = null;
    this.endTime = null;

    this.metrics = {
      totalItems: 0,
      completedItems: 0,
      failedItems: 0,
      skippedItems: 0,
      blockedItems: 0,  // New: track blocked items
      totalWaves: 0,
      completedWaves: 0,
    };
  }

  /**
   * Add a work item to be executed
   * @param {Object} item - Work item definition
   * @param {string} item.id - Unique item identifier
   * @param {string} item.name - Human-readable name
   * @param {Function} item.execute - Async function (context) => result
   * @param {string[]} [item.dependencies] - Array of item IDs this depends on
   * @param {string} [item.priority] - Priority level (critical, high, medium, low)
   * @param {string} [item.type] - Work item type for organization
   * @param {Object} [item.metadata] - Additional metadata
   * @returns {HybridCoordinator} This coordinator for chaining
   */
  addItem(item) {
    if (!item.id) {
      throw new Error('Work item must have an id');
    }

    if (!item.execute || typeof item.execute !== 'function') {
      throw new Error('Work item must have an execute function');
    }

    if (this.workItems.has(item.id)) {
      throw new Error(`Work item ${item.id} already exists`);
    }

    const itemDef = {
      ...item,
      dependencies: item.dependencies || [],
      priority: item.priority || 'medium',
      type: item.type || 'task',
      metadata: item.metadata || {},
    };

    this.workItems.set(item.id, itemDef);
    this.itemStates.set(item.id, ItemState.PENDING);
    this.metrics.totalItems++;

    return this;
  }

  /**
   * Add multiple work items at once
   * @param {Array<Object>} items - Array of work item definitions
   * @returns {HybridCoordinator} This coordinator for chaining
   */
  addItems(items) {
    for (const item of items) {
      this.addItem(item);
    }
    return this;
  }

  /**
   * Analyze dependencies and build execution plan
   * @returns {Promise<HybridCoordinator>} This coordinator for chaining
   */
  async analyze() {
    this._setState(CoordinatorState.ANALYZING);

    this.emit('analysis:started', {
      totalItems: this.workItems.size,
      timestamp: Date.now(),
    });

    try {
      // Build dependency graph
      this.dependencyGraph = this._buildDependencyGraph();

      // Check for circular dependencies
      const cycleDetector = new CycleDetector(this.dependencyGraph);
      const cycleResult = cycleDetector.detectCycles();
      if (cycleResult.hasCycle) {
        const cycleDescription = cycleResult.cycles.map(c => c.path.join(' -> ')).join('; ');
        throw new Error(`Circular dependencies detected: ${cycleDescription}`);
      }

      // Analyze for parallel execution (without maxConcurrency constraints)
      // The maxConcurrency is enforced during execution, not analysis
      const analyzer = new ParallelExecutionAnalyzer(this.dependencyGraph);
      this.executionPlan = analyzer.analyze({
        respectPriority: true,
      });

      // Determine execution strategy
      this.strategy = this._determineStrategy();

      // Apply optimizations if enabled
      if (this.config.enableOptimization) {
        this._optimizeExecutionPlan();
      }

      this.metrics.totalWaves = this.executionPlan.waves.length;

      this._setState(CoordinatorState.READY);

      this.emit('analysis:completed', {
        strategy: this.strategy,
        totalWaves: this.executionPlan.waves.length,
        metrics: this.executionPlan.metrics,
        timestamp: Date.now(),
      });

      return this;
    } catch (error) {
      this.emit('analysis:failed', {
        error: error.message,
        timestamp: Date.now(),
      });
      throw error;
    }
  }

  /**
   * Mark dependent items as blocked when an item fails
   * @param {string} failedItemId - ID of the failed item
   * @private
   */
  _blockDependentItems(failedItemId) {
    const blockedItems = [];

    // Find all items that depend on the failed item (directly or transitively)
    for (const [itemId, item] of this.workItems) {
      // Skip if already completed, failed, or blocked
      const currentState = this.itemStates.get(itemId);
      if (currentState === ItemState.COMPLETED ||
          currentState === ItemState.FAILED ||
          currentState === ItemState.BLOCKED) {
        continue;
      }

      // Check if this item depends on the failed item
      if (this._dependsOn(itemId, failedItemId)) {
        this.itemStates.set(itemId, ItemState.BLOCKED);
        this.metrics.blockedItems++;
        blockedItems.push(itemId);

        // Track item blocked
        if (this.progressTracker) {
          this.progressTracker.itemBlocked(itemId, {
            name: item.name,
            reason: `Depends on failed item ${failedItemId}`,
            blockedBy: [failedItemId],
          });
        }

        this.emit('item:blocked', {
          itemId,
          name: item.name,
          reason: `Depends on failed item ${failedItemId}`,
          blockedBy: [failedItemId],
          timestamp: Date.now(),
        });
      }
    }

    return blockedItems;
  }

  /**
   * Check if an item depends on another (directly or transitively)
   * @param {string} itemId - Item to check
   * @param {string} dependencyId - Potential dependency
   * @returns {boolean} True if itemId depends on dependencyId
   * @private
   */
  _dependsOn(itemId, dependencyId) {
    const item = this.workItems.get(itemId);
    if (!item || !item.dependencies || item.dependencies.length === 0) {
      return false;
    }

    // Direct dependency
    if (item.dependencies.includes(dependencyId)) {
      return true;
    }

    // Transitive dependency (check each direct dependency)
    for (const depId of item.dependencies) {
      if (this._dependsOn(depId, dependencyId)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get retry policy for an item
   * @param {Object} item - Work item
   * @returns {RetryPolicy} Retry policy instance
   * @private
   */
  _getRetryPolicy(item) {
    // Use item-specific policy if provided
    if (item.retryPolicy) {
      return item.retryPolicy;
    }

    // Clone default policy for this item
    return this.config.defaultRetryPolicy.clone();
  }

  /**
   * Execute item with retry logic
   * @param {Object} task - Task to execute
   * @param {Object} context - Execution context
   * @returns {Promise<*>} Task result
   * @private
   */
  async _executeWithRetry(task, context) {
    const item = this.workItems.get(task.id);
    const retryPolicy = this._getRetryPolicy(item);

    let lastError;
    let attempt = 0;

    while (true) {
      try {
        const result = await task.execute();

        // Store retry history if there were attempts
        if (attempt > 0) {
          this.retryHistory.set(task.id, retryPolicy.getHistory());
        }

        return result;
      } catch (error) {
        lastError = error;

        // Check if should retry
        if (!retryPolicy.shouldRetry(error, attempt)) {
          // Store retry history
          retryPolicy.recordAttempt(attempt, error, 0);
          this.retryHistory.set(task.id, retryPolicy.getHistory());
          throw error;
        }

        // Calculate delay
        const delay = retryPolicy.getDelay(attempt);
        retryPolicy.recordAttempt(attempt, error, delay);

        // Track item retry
        if (this.progressTracker) {
          this.progressTracker.itemRetry(task.id, {
            name: task.name,
            attempt: attempt + 1,
            maxRetries: retryPolicy.maxRetries,
            error: error.message,
            delay,
          });
        }

        // Emit retry event
        this.emit('item:retry', {
          itemId: task.id,
          name: task.name,
          attempt: attempt + 1,
          maxRetries: retryPolicy.maxRetries,
          error: error.message,
          delay,
          timestamp: Date.now(),
        });

        // Wait before retry
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        attempt++;
      }
    }
  }

  /**
   * Generate failure report
   * @returns {Object} Failure report
   * @private
   */
  _generateFailureReport() {
    return FailureReportGenerator.generate({
      executionId: this.executionId,
      workItems: this.workItems,
      itemStates: this.itemStates,
      itemResults: this.itemResults,
      itemErrors: this.itemErrors,
      retryHistory: this.retryHistory,
      dependencyGraph: this.dependencyGraph,
      metrics: this.metrics,
      duration: this.endTime ? this.endTime - this.startTime : Date.now() - this.startTime,
    });
  }

  /**
   * Execute all work items according to the execution plan
   * @param {Object} initialContext - Initial context for execution
   * @returns {Promise<Object>} Execution result
   */
  async execute(initialContext = {}) {
    if (this.state !== CoordinatorState.READY) {
      throw new Error(`Cannot execute in state: ${this.state}`);
    }

    this._setState(CoordinatorState.EXECUTING);
    this.startTime = Date.now();
    const context = { ...initialContext };

    // Initialize state persistence
    this.executionId = await this.stateManager.initialize();
    if (this.config.enableStatePersistence) {
      await this.stateManager.createState({
        workItems: Array.from(this.workItems.values()),
        metadata: {
          strategy: this.strategy,
          totalWaves: this.executionPlan.waves.length,
          startTime: this.startTime,
        },
      });
      await this.stateManager.updateState({
        status: 'executing',
        context,
      });
    }

    // Initialize progress tracking
    if (this.progressTracker) {
      await this.progressTracker.initialize({
        executionId: this.executionId,
        totalItems: this.workItems.size,
        totalWaves: this.executionPlan.waves.length,
      });
    }

    // Initialize session state
    if (this.sessionState) {
      await this.sessionState.initialize();

      // Store workflow metadata
      await this.sessionState.setWorkflow({
        name: 'hybrid-coordinator',
        agent: 'work-orchestrator',
        status: 'executing',
        executionId: this.executionId,
        strategy: this.strategy,
        totalWaves: this.executionPlan.waves.length,
        totalItems: this.workItems.size,
        startTime: new Date(this.startTime).toISOString(),
      });

      // Log session started event
      await this.sessionState.logEvent('workflow:started', {
        executionId: this.executionId,
        strategy: this.strategy,
        totalWaves: this.executionPlan.waves.length,
        totalItems: this.workItems.size,
      });
    }

    this.emit('execution:started', {
      executionId: this.executionId,
      strategy: this.strategy,
      totalWaves: this.executionPlan.waves.length,
      totalItems: this.workItems.size,
      startTime: this.startTime,
    });

    try {
      let result;

      // Execute based on strategy
      switch (this.strategy) {
        case ExecutionStrategy.PURE_PARALLEL:
          result = await this._executePureParallel(context);
          break;

        case ExecutionStrategy.PURE_SEQUENTIAL:
          result = await this._executePureSequential(context);
          break;

        case ExecutionStrategy.HYBRID:
          result = await this._executeHybrid(context);
          break;

        default:
          throw new Error(`Unknown strategy: ${this.strategy}`);
      }

      this._setState(CoordinatorState.COMPLETED);
      this.endTime = Date.now();

      // Finalize state persistence
      if (this.config.enableStatePersistence) {
        await this.stateManager.finalize('completed');
      }

      // Finalize progress tracking
      if (this.progressTracker) {
        await this.progressTracker.complete({
          strategy: this.strategy,
          totalItems: this.metrics.totalItems,
          completedItems: this.metrics.completedItems,
          failedItems: this.metrics.failedItems,
        });
      }

      // Finalize session state
      if (this.sessionState) {
        await this.sessionState.setWorkflow({
          status: 'completed',
          endTime: new Date(this.endTime).toISOString(),
          duration: this.endTime - this.startTime,
        });

        await this.sessionState.logEvent('workflow:completed', {
          executionId: this.executionId,
          totalItems: this.metrics.totalItems,
          completedItems: this.metrics.completedItems,
          failedItems: this.metrics.failedItems,
          skippedItems: this.metrics.skippedItems,
          blockedItems: this.metrics.blockedItems,
          duration: this.endTime - this.startTime,
        });
      }

      const finalResult = {
        success: true,
        executionId: this.executionId,
        strategy: this.strategy,
        totalItems: this.metrics.totalItems,
        completedItems: this.metrics.completedItems,
        failedItems: this.metrics.failedItems,
        skippedItems: this.metrics.skippedItems,
        blockedItems: this.metrics.blockedItems,
        duration: this.endTime - this.startTime,
        context: result.context || context,
        results: Object.fromEntries(this.itemResults),
        metrics: this.executionPlan.metrics,
      };

      this.emit('execution:completed', finalResult);
      return finalResult;
    } catch (error) {
      return this._handleExecutionFailure(error, context);
    }
  }

  /**
   * Build dependency graph from work items
   * @private
   */
  _buildDependencyGraph() {
    const graph = new DependencyGraph();

    // Add all work items as nodes
    for (const [itemId, item] of this.workItems) {
      graph.addNode(itemId, {
        type: item.type,
        title: item.name,
        priority: item.priority,
        status: 'planned',
      });
    }

    // Add dependency edges
    for (const [itemId, item] of this.workItems) {
      for (const depId of item.dependencies) {
        if (!this.workItems.has(depId)) {
          throw new Error(`Item ${itemId} depends on unknown item ${depId}`);
        }
        graph.addEdge(itemId, depId, { type: 'explicit' });
      }
    }

    return graph;
  }

  /**
   * Determine optimal execution strategy
   * @private
   */
  _determineStrategy() {
    const { waves } = this.executionPlan;

    // Check if there are any actual dependencies in the graph
    const hasDependencies = Array.from(this.workItems.values()).some(
      item => item.dependencies && item.dependencies.length > 0
    );

    // Pure parallel: no dependencies (even if split into multiple waves for concurrency)
    if (!hasDependencies) {
      return ExecutionStrategy.PURE_PARALLEL;
    }

    // Pure parallel: single wave
    if (waves.length === 1) {
      return ExecutionStrategy.PURE_PARALLEL;
    }

    // Pure sequential: all waves have single item
    const allSingleItem = waves.every(wave => wave.length === 1);
    if (allSingleItem) {
      return ExecutionStrategy.PURE_SEQUENTIAL;
    }

    // Hybrid: mix of parallel and sequential
    return ExecutionStrategy.HYBRID;
  }

  /**
   * Optimize execution plan
   * @private
   */
  _optimizeExecutionPlan() {
    // Future optimization strategies:
    // 1. Critical path prioritization
    // 2. Resource-aware scheduling
    // 3. Adaptive wave sizing based on historical performance
    // 4. Load balancing across workers

    // For now, plan is already optimized by ParallelExecutionAnalyzer
  }

  /**
   * Execute all items in parallel (no dependencies)
   * @private
   */
  async _executePureParallel(context) {
    this.emit('strategy:parallel', {
      itemCount: this.workItems.size,
      timestamp: Date.now(),
    });

    // Initialize worker pool
    this.workerPool = new WorkerPool({
      maxConcurrency: this.config.maxConcurrency,
      mode: 'fixed',
    });

    await this.workerPool.initialize();
    await this.workerPool.start();

    // Listen to worker pool events
    this._attachWorkerPoolListeners();

    const sharedContext = { ...context };

    // Submit all items
    const tasks = Array.from(this.workItems.values()).map(item => ({
      id: item.id,
      name: item.name,
      execute: async () => {
        const result = await item.execute(sharedContext);
        return result;
      },
      maxRetries: this.config.enableFailureRecovery ? 3 : 0,
      retryCount: 0,
    }));

    try {
      // Submit with retry logic
      const results = await Promise.allSettled(
        tasks.map(async (task) => {
          let lastError;
          const maxRetries = task.maxRetries || 0;

          for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
              const result = await this.workerPool.submit(task);
              return result;
            } catch (error) {
              lastError = error;

              if (attempt < maxRetries) {
                // Emit retry event
                this.emit('item:retry', {
                  itemId: task.id,
                  name: task.name,
                  attempt: attempt + 1,
                  maxRetries,
                  error: error.message,
                  timestamp: Date.now(),
                });

                // Wait a bit before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
              }
            }
          }

          // All retries exhausted
          throw lastError;
        })
      );

      // Process results
      let hasFailures = false;
      let firstError = null;

      results.forEach((result, index) => {
        const task = tasks[index];

        if (result.status === 'fulfilled') {
          const value = result.value;
          this.itemResults.set(task.id, value);
          this.itemStates.set(task.id, ItemState.COMPLETED);
          this.metrics.completedItems++;

          // Merge result into shared context if it's an object
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            Object.assign(sharedContext, value);
          }
        } else {
          hasFailures = true;
          if (!firstError) {
            firstError = result.reason;
          }

          this.itemErrors.set(task.id, result.reason);
          this.itemStates.set(task.id, ItemState.FAILED);
          this.metrics.failedItems++;
        }
      });

      // If we have failures and shouldn't continue, throw
      if (hasFailures && !this.config.continueOnFailure) {
        throw firstError;
      }

      return { context: sharedContext };
    } finally {
      await this.workerPool.terminate();
    }
  }

  /**
   * Execute all items sequentially (linear chain)
   * @private
   */
  async _executePureSequential(context) {
    this.emit('strategy:sequential', {
      itemCount: this.workItems.size,
      timestamp: Date.now(),
    });

    // Initialize chain executor
    this.chainExecutor = new ChainExecutor({
      enableRollback: false, // Items don't support rollback
      rollbackOnFailure: false,
      continueOnNonCriticalFailure: this.config.continueOnFailure,
      stepTimeout: this.config.stepTimeout,
    });

    // Add all items as steps
    const sortedItems = this.executionPlan.waves.flat();
    for (const itemId of sortedItems) {
      const item = this.workItems.get(itemId);
      this.chainExecutor.addStep({
        id: item.id,
        name: item.name,
        execute: item.execute,
        dependencies: item.dependencies,
        priority: item.priority,
      });
    }

    // Listen to chain events
    this._attachChainExecutorListeners();

    // Build and execute
    await this.chainExecutor.build();
    const result = await this.chainExecutor.execute(context);

    // Update states and metrics
    for (const [itemId, state] of this.chainExecutor.stepStates) {
      this.itemStates.set(itemId, state);
      if (state === 'completed') {
        this.metrics.completedItems++;
        this.itemResults.set(itemId, this.chainExecutor.stepResults.get(itemId));
      } else if (state === 'failed') {
        this.metrics.failedItems++;
        this.itemErrors.set(itemId, this.chainExecutor.stepErrors.get(itemId));
      } else if (state === 'skipped') {
        this.metrics.skippedItems++;
      }
    }

    return result;
  }

  /**
   * Execute items using hybrid approach (waves of parallel execution)
   * @private
   */
  async _executeHybrid(context) {
    this.emit('strategy:hybrid', {
      totalWaves: this.executionPlan.waves.length,
      timestamp: Date.now(),
    });

    // Initialize worker pool
    this.workerPool = new WorkerPool({
      maxConcurrency: this.config.maxConcurrency,
      mode: 'fixed',
    });

    await this.workerPool.initialize();
    await this.workerPool.start();

    // Listen to worker pool events
    this._attachWorkerPoolListeners();

    const sharedContext = { ...context };

    try {
      // Execute waves sequentially
      for (let waveIndex = 0; waveIndex < this.executionPlan.waves.length; waveIndex++) {
        this.currentWave = waveIndex;
        const wave = this.executionPlan.waves[waveIndex];

        // Track wave started
        if (this.progressTracker) {
          this.progressTracker.waveStarted(waveIndex, {
            totalWaves: this.executionPlan.waves.length,
            itemsInWave: wave.length,
            items: wave,
          });
        }

        this.emit('wave:started', {
          waveIndex,
          totalWaves: this.executionPlan.waves.length,
          itemsInWave: wave.length,
          items: wave,
          timestamp: Date.now(),
        });

        // Execute all items in this wave in parallel
        const tasks = wave.map(itemId => {
          const item = this.workItems.get(itemId);
          this.itemStates.set(itemId, ItemState.READY);

          // Track item started
          if (this.progressTracker) {
            this.progressTracker.itemStarted(item.id, {
              name: item.name,
              wave: waveIndex,
            });
          }

          // Emit item:started before submitting to pool
          this.emit('item:started', {
            itemId: item.id,
            name: item.name,
            wave: waveIndex,
            timestamp: Date.now(),
          });

          return {
            id: item.id,
            name: item.name,
            execute: async () => {
              this.itemStates.set(item.id, ItemState.EXECUTING);
              // Pass sharedContext to the item's execute function
              const result = await item.execute(sharedContext);
              return result;
            },
            maxRetries: this.config.enableFailureRecovery ? 3 : 0,
            retryCount: 0,
          };
        });

        // Submit wave and wait for completion (with new retry logic)
        const waveResults = await Promise.allSettled(
          tasks.map(async (task) => {
            // Skip items that are already blocked
            if (this.itemStates.get(task.id) === ItemState.BLOCKED) {
              throw new Error(`Item ${task.id} is blocked by failed dependencies`);
            }

            // Use new retry mechanism
            return await this._executeWithRetry({
              id: task.id,
              name: task.name,
              execute: async () => {
                return await this.workerPool.submit(task);
              },
            }, sharedContext);
          })
        );

        // Process wave results
        let hasFailures = false;
        let firstError = null;

        for (let i = 0; i < waveResults.length; i++) {
          const itemId = wave[i];
          const result = waveResults[i];

          if (result.status === 'fulfilled') {
            const value = result.value;
            this.itemResults.set(itemId, value);
            this.itemStates.set(itemId, ItemState.COMPLETED);
            this.metrics.completedItems++;

            // Update state persistence
            if (this.config.enableStatePersistence) {
              await this.stateManager.markCompleted(itemId, value);
              await this.stateManager.updateContext(sharedContext);
            }

            // Track item completed
            if (this.progressTracker) {
              this.progressTracker.itemCompleted(itemId, {
                name: this.workItems.get(itemId).name,
                wave: waveIndex,
                result: value,
              });
            }

            // Emit item:completed
            this.emit('item:completed', {
              itemId,
              name: this.workItems.get(itemId).name,
              wave: waveIndex,
              result: value,
              timestamp: Date.now(),
            });

            // Merge result into shared context if it's an object
            if (value && typeof value === 'object' && !Array.isArray(value)) {
              Object.assign(sharedContext, value);
            }
          } else {
            hasFailures = true;
            if (!firstError) {
              firstError = result.reason;
            }

            this.itemErrors.set(itemId, result.reason);
            this.itemStates.set(itemId, ItemState.FAILED);
            this.metrics.failedItems++;

            // Block dependent items
            const blockedItems = this._blockDependentItems(itemId);

            // Update state persistence
            if (this.config.enableStatePersistence) {
              const retryHistory = this.retryHistory.get(itemId);
              await this.stateManager.markFailed(itemId, result.reason, {
                failureType: retryHistory?.attempts?.[0]?.errorType || 'unknown',
                attempts: retryHistory?.totalAttempts || 1,
                firstFailure: retryHistory?.startTime,
                retryHistory: retryHistory?.attempts || [],
              });

              if (blockedItems.length > 0) {
                await this.stateManager.markBlocked(
                  blockedItems,
                  `Depends on failed item ${itemId}`,
                  [itemId]
                );
              }
            }

            // Track item failed
            if (this.progressTracker) {
              this.progressTracker.itemFailed(itemId, {
                name: this.workItems.get(itemId).name,
                wave: waveIndex,
                error: result.reason?.message || String(result.reason),
                blockedDependents: blockedItems.length,
              });
            }

            // Emit item:failed
            this.emit('item:failed', {
              itemId,
              name: this.workItems.get(itemId).name,
              wave: waveIndex,
              error: result.reason,
              blockedDependents: blockedItems.length,
              timestamp: Date.now(),
            });
          }
        }

        // Check if we should continue or fail after processing all results
        if (hasFailures && !this.config.continueOnFailure) {
          throw firstError;
        }

        this.metrics.completedWaves++;

        // Track wave completed
        if (this.progressTracker) {
          this.progressTracker.waveCompleted(waveIndex, {
            totalWaves: this.executionPlan.waves.length,
            completedItems: wave.filter(id => this.itemStates.get(id) === ItemState.COMPLETED).length,
            failedItems: wave.filter(id => this.itemStates.get(id) === ItemState.FAILED).length,
          });
        }

        this.emit('wave:completed', {
          waveIndex,
          totalWaves: this.executionPlan.waves.length,
          completedItems: wave.filter(id => this.itemStates.get(id) === ItemState.COMPLETED).length,
          failedItems: wave.filter(id => this.itemStates.get(id) === ItemState.FAILED).length,
          timestamp: Date.now(),
        });
      }

      return { context: sharedContext };
    } finally {
      await this.workerPool.terminate();
    }
  }

  /**
   * Attach worker pool event listeners
   * @private
   */
  _attachWorkerPoolListeners() {
    if (!this.workerPool) return;

    this.workerPool.on('task:queued', data => {
      this.emit('item:queued', data);
    });

    this.workerPool.on('task:completed', data => {
      this.emit('item:completed', data);
    });

    this.workerPool.on('task:failed', data => {
      this.emit('item:failed', data);
    });

    this.workerPool.on('task:retry', data => {
      this.emit('item:retry', data);
    });
  }

  /**
   * Attach chain executor event listeners
   * @private
   */
  _attachChainExecutorListeners() {
    if (!this.chainExecutor) return;

    this.chainExecutor.on('step:started', data => {
      this.emit('item:started', data);
    });

    this.chainExecutor.on('step:completed', data => {
      this.emit('item:completed', data);
    });

    this.chainExecutor.on('step:failed', data => {
      this.emit('item:failed', data);
    });

    this.chainExecutor.on('step:skipped', data => {
      this.emit('item:skipped', data);
    });
  }

  /**
   * Handle execution failure
   * @private
   */
  async _handleExecutionFailure(error, context) {
    this._setState(CoordinatorState.FAILED);
    this.endTime = Date.now();

    // Finalize state persistence
    if (this.config.enableStatePersistence) {
      await this.stateManager.finalize('failed');
    }

    // Finalize progress tracking
    if (this.progressTracker) {
      await this.progressTracker.fail({
        error: error.message,
        totalItems: this.metrics.totalItems,
        completedItems: this.metrics.completedItems,
        failedItems: this.metrics.failedItems,
      });
    }

    // Finalize session state
    if (this.sessionState) {
      await this.sessionState.setWorkflow({
        status: 'failed',
        endTime: new Date(this.endTime).toISOString(),
        duration: this.endTime - this.startTime,
        error: error.message,
      });

      await this.sessionState.logEvent('workflow:failed', {
        executionId: this.executionId,
        error: error.message,
        totalItems: this.metrics.totalItems,
        completedItems: this.metrics.completedItems,
        failedItems: this.metrics.failedItems,
        skippedItems: this.metrics.skippedItems,
        blockedItems: this.metrics.blockedItems,
        duration: this.endTime - this.startTime,
      });
    }

    // Generate failure report
    let failureReport = null;
    if (this.config.enableFailureReports) {
      failureReport = this._generateFailureReport();

      // Emit failure report
      this.emit('failure:report', failureReport);

      // Optionally save to file
      if (this.config.failureReportPath) {
        try {
          const fs = require('fs').promises;
          const path = require('path');
          await fs.mkdir(this.config.failureReportPath, { recursive: true });
          const reportPath = path.join(
            this.config.failureReportPath,
            `${this.executionId || Date.now()}.json`
          );
          await fs.writeFile(reportPath, FailureReportGenerator.formatJSON(failureReport), 'utf8');
        } catch (err) {
          console.warn(`Failed to save failure report: ${err.message}`);
        }
      }
    }

    const failureResult = {
      success: false,
      executionId: this.executionId,
      error: error.message,
      strategy: this.strategy,
      totalItems: this.metrics.totalItems,
      completedItems: this.metrics.completedItems,
      failedItems: this.metrics.failedItems,
      skippedItems: this.metrics.skippedItems,
      blockedItems: this.metrics.blockedItems,
      completedWaves: this.metrics.completedWaves,
      totalWaves: this.metrics.totalWaves,
      duration: this.endTime - this.startTime,
      context,
      results: Object.fromEntries(this.itemResults),
      errors: Object.fromEntries(this.itemErrors),
      failureReport,
    };

    this.emit('execution:failed', failureResult);

    // Cleanup
    if (this.workerPool) {
      await this.workerPool.terminate().catch(() => {});
    }

    return failureResult;
  }

  /**
   * Pause execution
   */
  async pause() {
    if (this.state !== CoordinatorState.EXECUTING) {
      throw new Error(`Cannot pause in state: ${this.state}`);
    }

    this._setState(CoordinatorState.PAUSED);

    if (this.workerPool) {
      await this.workerPool.pause();
    }

    if (this.chainExecutor) {
      await this.chainExecutor.pause();
    }

    this.emit('paused', { timestamp: Date.now() });
  }

  /**
   * Resume execution
   */
  async resume() {
    if (this.state !== CoordinatorState.PAUSED) {
      throw new Error(`Cannot resume in state: ${this.state}`);
    }

    this._setState(CoordinatorState.EXECUTING);

    if (this.workerPool) {
      await this.workerPool.resume();
    }

    if (this.chainExecutor) {
      await this.chainExecutor.resume();
    }

    this.emit('resumed', { timestamp: Date.now() });
  }

  /**
   * Cancel execution
   */
  async cancel() {
    if (this.state !== CoordinatorState.EXECUTING && this.state !== CoordinatorState.PAUSED) {
      throw new Error(`Cannot cancel in state: ${this.state}`);
    }

    this._setState(CoordinatorState.CANCELLED);
    this.endTime = Date.now();

    // Terminate worker pool (with timeout)
    if (this.workerPool) {
      try {
        await Promise.race([
          this.workerPool.terminate(),
          new Promise((resolve) => setTimeout(resolve, 1000)) // 1 second timeout
        ]);
      } catch (error) {
        // Ignore termination errors during cancel
      }
    }

    // Cancel chain executor
    if (this.chainExecutor) {
      try {
        await this.chainExecutor.cancel();
      } catch (error) {
        // Ignore cancellation errors
      }
    }

    this.emit('cancelled', {
      completedItems: this.metrics.completedItems,
      totalItems: this.metrics.totalItems,
      timestamp: Date.now(),
    });
  }

  /**
   * Get coordinator status
   * @returns {Object} Status object
   */
  getStatus() {
    const progress =
      this.metrics.totalItems > 0 ? (this.metrics.completedItems / this.metrics.totalItems) * 100 : 0;

    return {
      executionId: this.executionId,
      state: this.state,
      strategy: this.strategy,
      totalItems: this.metrics.totalItems,
      completedItems: this.metrics.completedItems,
      failedItems: this.metrics.failedItems,
      skippedItems: this.metrics.skippedItems,
      blockedItems: this.metrics.blockedItems,
      totalWaves: this.metrics.totalWaves,
      completedWaves: this.metrics.completedWaves,
      currentWave: this.currentWave,
      progress,
      duration: this.endTime
        ? this.endTime - this.startTime
        : this.startTime
          ? Date.now() - this.startTime
          : 0,
    };
  }

  /**
   * Get detailed progress snapshot (from ProgressTracker)
   * @returns {Object|null} Progress snapshot or null if tracking disabled
   */
  getProgressSnapshot() {
    return this.progressTracker ? this.progressTracker.getSnapshot() : null;
  }

  /**
   * Get progress timeline
   * @param {Object} options - Filter options
   * @returns {Array|null} Timeline entries or null if tracking disabled
   */
  getProgressTimeline(options) {
    return this.progressTracker ? this.progressTracker.getTimeline(options) : null;
  }

  /**
   * Subscribe to progress updates
   * @param {Function} callback - Callback function
   * @returns {Function|null} Unsubscribe function or null if tracking disabled
   */
  subscribeToProgress(callback) {
    return this.progressTracker ? this.progressTracker.subscribe(callback) : null;
  }

  /**
   * Format progress as text
   * @param {Object} options - Formatting options
   * @returns {string|null} Formatted progress or null if tracking disabled
   */
  formatProgress(options) {
    return this.progressTracker ? this.progressTracker.formatText(options) : null;
  }

  /**
   * Get detailed execution report
   * @returns {string} Formatted report
   */
  getReport() {
    const lines = [];

    lines.push('=== Hybrid Execution Coordinator Report ===');
    lines.push('');
    lines.push(`State: ${this.state}`);
    lines.push(`Strategy: ${this.strategy}`);
    lines.push('');

    if (this.executionPlan) {
      lines.push('Execution Plan:');
      lines.push(`  Total Waves: ${this.executionPlan.waves.length}`);
      lines.push(`  Max Concurrency: ${this.executionPlan.metrics.maxConcurrency}`);
      lines.push(`  Critical Path Length: ${this.executionPlan.metrics.criticalPathLength}`);
      lines.push(`  Parallelism Factor: ${this.executionPlan.metrics.parallelismFactor}x`);
      lines.push('');
    }

    lines.push('Execution Metrics:');
    lines.push(`  Total Items: ${this.metrics.totalItems}`);
    lines.push(`  Completed: ${this.metrics.completedItems}`);
    lines.push(`  Failed: ${this.metrics.failedItems}`);
    lines.push(`  Blocked: ${this.metrics.blockedItems}`);
    lines.push(`  Skipped: ${this.metrics.skippedItems}`);
    lines.push(`  Progress: ${this.getStatus().progress.toFixed(1)}%`);
    lines.push('');

    if (this.startTime) {
      const duration = (this.endTime || Date.now()) - this.startTime;
      lines.push(`Duration: ${(duration / 1000).toFixed(2)}s`);
    }

    return lines.join('\n');
  }

  /**
   * Set coordinator state
   * @private
   */
  _setState(state) {
    const oldState = this.state;
    this.state = state;
    this.emit('stateChange', {
      oldState,
      newState: state,
      timestamp: Date.now(),
    });
  }
}

// Export class and constants
module.exports = HybridCoordinator;
module.exports.CoordinatorState = CoordinatorState;
module.exports.ExecutionStrategy = ExecutionStrategy;
module.exports.ItemState = ItemState;
