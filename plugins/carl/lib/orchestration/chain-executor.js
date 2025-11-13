/**
 * Chain Executor - Sequential execution with dependency ordering
 *
 * Implements sequential execution chains for dependent work items with:
 * - Proper dependency-based ordering (topological sort)
 * - Data flow between steps
 * - Failure propagation and rollback/compensation
 * - Chain interruption and resume
 * - Execution history tracking
 *
 * Based on IndyDevDan's orchestration principles:
 * - "Wait when needed" for sequential dependencies
 * - Observable by default with progress tracking
 * - Graceful degradation with rollback support
 * - Clean context separation between steps
 */

const EventEmitter = require('events');
const { DependencyGraph } = require('../cascade/dependency-graph');
const { TopologicalSorter } = require('../cascade/topological-sorter');

// Chain states
const ChainState = {
  INITIALIZING: 'initializing',
  READY: 'ready',
  EXECUTING: 'executing',
  PAUSED: 'paused',
  ROLLING_BACK: 'rolling_back',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

// Step states
const StepState = {
  PENDING: 'pending',
  EXECUTING: 'executing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
  ROLLED_BACK: 'rolled_back',
};

class ChainExecutor extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      enableRollback: config.enableRollback !== false,
      rollbackOnFailure: config.rollbackOnFailure !== false,
      continueOnNonCriticalFailure: config.continueOnNonCriticalFailure !== false,
      timeout: config.timeout || 600000, // 10 minutes default
      enableProgressReporting: config.enableProgressReporting !== false,
      stepTimeout: config.stepTimeout || 300000, // 5 minutes per step
      ...config,
    };

    this.state = ChainState.INITIALIZING;
    this.steps = []; // Array of step definitions
    this.stepMap = new Map(); // stepId -> step definition
    this.executionOrder = []; // Topologically sorted step IDs
    this.stepStates = new Map(); // stepId -> StepState
    this.stepResults = new Map(); // stepId -> result
    this.stepErrors = new Map(); // stepId -> error
    this.context = {}; // Shared context passed between steps
    this.history = []; // Execution history

    this.currentStepIndex = -1;
    this.startTime = null;
    this.endTime = null;
  }

  /**
   * Add a step to the chain
   * @param {Object} step - Step definition
   * @param {string} step.id - Unique step identifier
   * @param {string} step.name - Human-readable step name
   * @param {Function} step.execute - Async function to execute (context) => result
   * @param {Function} [step.rollback] - Optional rollback function (context) => void
   * @param {string[]} [step.dependencies] - Array of step IDs this step depends on
   * @param {string} [step.priority] - Priority level (critical, high, medium, low)
   * @param {boolean} [step.canSkip] - Whether step can be skipped on failure
   * @param {number} [step.timeout] - Step-specific timeout
   * @returns {ChainExecutor} This executor for chaining
   */
  addStep(step) {
    if (!step.id) {
      throw new Error('Step must have an id');
    }

    if (!step.execute || typeof step.execute !== 'function') {
      throw new Error('Step must have an execute function');
    }

    if (this.stepMap.has(step.id)) {
      throw new Error(`Step ${step.id} already exists`);
    }

    const stepDef = {
      ...step,
      dependencies: step.dependencies || [],
      priority: step.priority || 'medium',
      canSkip: step.canSkip !== false,
      timeout: step.timeout || this.config.stepTimeout,
    };

    this.steps.push(stepDef);
    this.stepMap.set(step.id, stepDef);
    this.stepStates.set(step.id, StepState.PENDING);

    return this;
  }

  /**
   * Add multiple steps at once
   * @param {Array<Object>} steps - Array of step definitions
   * @returns {ChainExecutor} This executor for chaining
   */
  addSteps(steps) {
    for (const step of steps) {
      this.addStep(step);
    }
    return this;
  }

  /**
   * Build execution order based on dependencies
   * @returns {ChainExecutor} This executor for chaining
   */
  async build() {
    // Build dependency graph
    const graph = new DependencyGraph();

    for (const step of this.steps) {
      graph.addNode(step.id, {
        type: 'step',
        priority: step.priority,
        title: step.name,
      });
    }

    // Add dependencies
    for (const step of this.steps) {
      for (const depId of step.dependencies) {
        if (!this.stepMap.has(depId)) {
          throw new Error(`Step ${step.id} depends on unknown step ${depId}`);
        }
        graph.addEdge(step.id, depId, { type: 'explicit' });
      }
    }

    // Perform topological sort
    const sorter = new TopologicalSorter(graph);
    const sortResult = sorter.sort({ respectPriority: true });

    if (!sortResult.success) {
      throw new Error(`Failed to build execution order: ${sortResult.error}`);
    }

    this.executionOrder = sortResult.order;
    this._setState(ChainState.READY);

    this.emit('built', {
      stepCount: this.steps.length,
      executionOrder: this.executionOrder,
      timestamp: Date.now(),
    });

    return this;
  }

  /**
   * Execute the chain
   * @param {Object} initialContext - Initial context to pass to first step
   * @returns {Promise<Object>} Final execution result
   */
  async execute(initialContext = {}) {
    if (this.state !== ChainState.READY && this.state !== ChainState.PAUSED) {
      throw new Error(`Cannot execute chain in state: ${this.state}`);
    }

    this._setState(ChainState.EXECUTING);
    this.startTime = Date.now();
    this.context = { ...initialContext };

    this.emit('started', {
      stepCount: this.executionOrder.length,
      startTime: this.startTime,
    });

    try {
      // Execute steps in order
      for (let i = 0; i < this.executionOrder.length; i++) {
        if (this.state === ChainState.PAUSED) {
          this.currentStepIndex = i;
          return { paused: true, completedSteps: i, totalSteps: this.executionOrder.length };
        }

        if (this.state !== ChainState.EXECUTING) {
          break;
        }

        const stepId = this.executionOrder[i];
        await this._executeStep(stepId, i);
      }

      // Check if all steps completed successfully
      const allCompleted = this.executionOrder.every(
        id => this.stepStates.get(id) === StepState.COMPLETED
      );

      if (allCompleted) {
        this._setState(ChainState.COMPLETED);
        this.endTime = Date.now();

        const result = {
          success: true,
          completedSteps: this.executionOrder.length,
          totalSteps: this.executionOrder.length,
          duration: this.endTime - this.startTime,
          context: this.context,
          results: Object.fromEntries(this.stepResults),
        };

        this.emit('completed', result);
        return result;
      } else {
        throw new Error('Not all steps completed successfully');
      }
    } catch (error) {
      return this._handleChainFailure(error);
    }
  }

  /**
   * Execute a single step
   * @param {string} stepId - Step ID to execute
   * @param {number} index - Step index in execution order
   * @private
   */
  async _executeStep(stepId, index) {
    const step = this.stepMap.get(stepId);
    this.stepStates.set(stepId, StepState.EXECUTING);

    const progress = ((index + 1) / this.executionOrder.length) * 100;

    this.emit('step:started', {
      stepId,
      stepName: step.name,
      index,
      total: this.executionOrder.length,
      progress,
    });

    this._addToHistory({
      event: 'step:started',
      stepId,
      stepName: step.name,
      timestamp: Date.now(),
    });

    try {
      // Execute step with timeout
      const result = await this._executeWithTimeout(step);

      // Store result
      this.stepResults.set(stepId, result);
      this.stepStates.set(stepId, StepState.COMPLETED);

      // Merge result into context if it's an object
      if (result && typeof result === 'object' && !Array.isArray(result)) {
        this.context = { ...this.context, ...result };
      }

      this.emit('step:completed', {
        stepId,
        stepName: step.name,
        result,
        index,
        total: this.executionOrder.length,
        progress,
      });

      this._addToHistory({
        event: 'step:completed',
        stepId,
        stepName: step.name,
        result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      return this._handleStepFailure(stepId, step, error, index);
    }
  }

  /**
   * Execute step with timeout
   * @param {Object} step - Step definition
   * @returns {Promise<Object>} Step result
   * @private
   */
  async _executeWithTimeout(step) {
    return Promise.race([
      step.execute(this.context),
      this._createTimeout(step.timeout, step.id),
    ]);
  }

  /**
   * Create timeout promise
   * @param {number} ms - Timeout in milliseconds
   * @param {string} stepId - Step ID for error message
   * @returns {Promise} Timeout promise
   * @private
   */
  _createTimeout(ms, stepId) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Step ${stepId} timed out after ${ms}ms`));
      }, ms);
    });
  }

  /**
   * Handle step failure
   * @param {string} stepId - Failed step ID
   * @param {Object} step - Step definition
   * @param {Error} error - Error that occurred
   * @param {number} index - Step index
   * @private
   */
  async _handleStepFailure(stepId, step, error, index) {
    this.stepStates.set(stepId, StepState.FAILED);
    this.stepErrors.set(stepId, error);

    this.emit('step:failed', {
      stepId,
      stepName: step.name,
      error: error.message,
      index,
      total: this.executionOrder.length,
    });

    this._addToHistory({
      event: 'step:failed',
      stepId,
      stepName: step.name,
      error: error.message,
      timestamp: Date.now(),
    });

    // Determine if we should continue or rollback
    const isCritical = step.priority === 'critical';
    const shouldRollback =
      this.config.rollbackOnFailure && (isCritical || !this.config.continueOnNonCriticalFailure);

    if (shouldRollback) {
      throw error; // This will trigger chain failure and rollback
    } else if (!step.canSkip) {
      throw error;
    } else {
      // Skip this step and continue
      this.stepStates.set(stepId, StepState.SKIPPED);
      this.emit('step:skipped', {
        stepId,
        stepName: step.name,
        reason: error.message,
      });

      return null; // Continue to next step
    }
  }

  /**
   * Handle chain failure
   * @param {Error} error - Error that caused failure
   * @returns {Promise<Object>} Failure result
   * @private
   */
  async _handleChainFailure(error) {
    this._setState(ChainState.FAILED);
    this.endTime = Date.now();

    const failureResult = {
      success: false,
      error: error.message,
      completedSteps: Array.from(this.stepStates.values()).filter(
        s => s === StepState.COMPLETED
      ).length,
      totalSteps: this.executionOrder.length,
      duration: this.endTime - this.startTime,
      failedStep: this._findFailedStep(),
      context: this.context,
    };

    this.emit('failed', failureResult);

    // Attempt rollback if enabled
    if (this.config.enableRollback && this.config.rollbackOnFailure) {
      await this._rollback();
    }

    return failureResult;
  }

  /**
   * Find the first failed step
   * @returns {string|null} Failed step ID
   * @private
   */
  _findFailedStep() {
    for (const stepId of this.executionOrder) {
      if (this.stepStates.get(stepId) === StepState.FAILED) {
        return stepId;
      }
    }
    return null;
  }

  /**
   * Rollback completed steps in reverse order
   * @returns {Promise<void>}
   * @private
   */
  async _rollback() {
    const previousState = this.state;
    this._setState(ChainState.ROLLING_BACK);

    this.emit('rollback:started', {
      timestamp: Date.now(),
    });

    // Get completed steps in reverse order
    const completedSteps = this.executionOrder
      .filter(id => this.stepStates.get(id) === StepState.COMPLETED)
      .reverse();

    for (const stepId of completedSteps) {
      const step = this.stepMap.get(stepId);

      if (step.rollback && typeof step.rollback === 'function') {
        try {
          await step.rollback(this.context);
          this.stepStates.set(stepId, StepState.ROLLED_BACK);

          this.emit('rollback:step', {
            stepId,
            stepName: step.name,
          });

          this._addToHistory({
            event: 'rollback:step',
            stepId,
            stepName: step.name,
            timestamp: Date.now(),
          });
        } catch (rollbackError) {
          this.emit('rollback:error', {
            stepId,
            stepName: step.name,
            error: rollbackError.message,
          });

          this._addToHistory({
            event: 'rollback:error',
            stepId,
            stepName: step.name,
            error: rollbackError.message,
            timestamp: Date.now(),
          });
        }
      }
    }

    this.emit('rollback:completed', {
      rolledBackSteps: completedSteps.length,
      timestamp: Date.now(),
    });

    // Restore previous state (should be FAILED)
    this._setState(previousState);
  }

  /**
   * Pause chain execution
   */
  async pause() {
    if (this.state !== ChainState.EXECUTING) {
      throw new Error(`Cannot pause chain in state: ${this.state}`);
    }

    this._setState(ChainState.PAUSED);
    this.emit('paused', { timestamp: Date.now() });
  }

  /**
   * Resume chain execution
   * @returns {Promise<Object>} Execution result
   */
  async resume() {
    if (this.state !== ChainState.PAUSED) {
      throw new Error(`Cannot resume chain in state: ${this.state}`);
    }

    this._setState(ChainState.EXECUTING);
    this.emit('resumed', { timestamp: Date.now() });

    // Continue from where we left off
    return this.execute(this.context);
  }

  /**
   * Cancel chain execution
   */
  async cancel() {
    if (this.state !== ChainState.EXECUTING && this.state !== ChainState.PAUSED) {
      throw new Error(`Cannot cancel chain in state: ${this.state}`);
    }

    this._setState(ChainState.CANCELLED);
    this.endTime = Date.now();

    this.emit('cancelled', {
      completedSteps: Array.from(this.stepStates.values()).filter(
        s => s === StepState.COMPLETED
      ).length,
      totalSteps: this.executionOrder.length,
      timestamp: Date.now(),
    });
  }

  /**
   * Get chain status
   * @returns {Object} Status object
   */
  getStatus() {
    const completedSteps = Array.from(this.stepStates.values()).filter(
      s => s === StepState.COMPLETED
    ).length;

    return {
      state: this.state,
      totalSteps: this.executionOrder.length,
      completedSteps,
      failedSteps: Array.from(this.stepStates.values()).filter(s => s === StepState.FAILED).length,
      skippedSteps: Array.from(this.stepStates.values()).filter(s => s === StepState.SKIPPED)
        .length,
      progress: this.executionOrder.length > 0 ? (completedSteps / this.executionOrder.length) * 100 : 0,
      currentStep: this.currentStepIndex >= 0 ? this.executionOrder[this.currentStepIndex] : null,
      duration: this.endTime
        ? this.endTime - this.startTime
        : this.startTime
          ? Date.now() - this.startTime
          : 0,
    };
  }

  /**
   * Get step details
   * @param {string} stepId - Step ID
   * @returns {Object} Step details
   */
  getStepDetails(stepId) {
    const step = this.stepMap.get(stepId);
    if (!step) {
      return null;
    }

    return {
      id: step.id,
      name: step.name,
      state: this.stepStates.get(stepId),
      result: this.stepResults.get(stepId),
      error: this.stepErrors.get(stepId),
      dependencies: step.dependencies,
      priority: step.priority,
    };
  }

  /**
   * Get execution history
   * @returns {Array} History entries
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Add entry to execution history
   * @param {Object} entry - History entry
   * @private
   */
  _addToHistory(entry) {
    this.history.push(entry);
  }

  /**
   * Set chain state
   * @param {string} state - New state
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

// Export ChainExecutor class and constants
module.exports = ChainExecutor;
module.exports.ChainState = ChainState;
module.exports.StepState = StepState;
