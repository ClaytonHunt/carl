/**
 * BaseWorkerAgent - Base class for all worker agents
 *
 * Provides common functionality shared by HOP orchestrators and LOP workers
 * following IndyDevDan's agentic orchestration patterns.
 *
 * Core Responsibilities:
 * - Agent lifecycle management (start, stop, pause, resume)
 * - Session-based state tracking
 * - Event logging and observability
 * - Error handling and reporting
 * - Status and metrics tracking
 */

const EventEmitter = require('events');
const SessionState = require('../workflow/session-state');

/**
 * Agent states aligned with worker lifecycle
 */
const AgentState = {
  CREATED: 'created',
  INITIALIZING: 'initializing',
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  STOPPING: 'stopping',
  STOPPED: 'stopped',
  FAILED: 'failed',
};

/**
 * Agent type definitions
 */
const AgentType = {
  HOP_ORCHESTRATOR: 'hop-orchestrator',
  LOP_WORKER: 'lop-worker',
  GENERIC: 'generic',
};

/**
 * Interface for worker agent configuration
 * @typedef {Object} IWorkerAgentConfig
 * @property {string} id - Unique agent identifier
 * @property {string} type - Agent type (hop-orchestrator, lop-worker, etc.)
 * @property {string} sessionId - Session ID for state coordination
 * @property {Object} context - Agent execution context
 * @property {number} timeout - Maximum execution time in ms
 * @property {boolean} enableLogging - Enable event logging
 */

/**
 * Interface for worker agent
 * @interface IWorkerAgent
 */

/**
 * BaseWorkerAgent - Foundation class for all worker agents
 */
class BaseWorkerAgent extends EventEmitter {
  /**
   * Create a base worker agent
   * @param {IWorkerAgentConfig} config - Agent configuration
   */
  constructor(config = {}) {
    super();

    // Core properties
    this.id = config.id || this._generateId();
    this.type = config.type || AgentType.GENERIC;
    this.state = AgentState.CREATED;

    // Configuration
    this.config = {
      timeout: config.timeout || 600000, // 10 minutes default
      enableLogging: config.enableLogging !== false,
      enableMetrics: config.enableMetrics !== false,
      ...config,
    };

    // Session state for coordination
    this.sessionId = config.sessionId || null;
    this.session = null;

    // Execution context
    this.context = config.context || {};

    // Lifecycle tracking
    this.createdAt = new Date();
    this.startedAt = null;
    this.stoppedAt = null;
    this.pausedAt = null;

    // Metrics
    this.metrics = {
      tasksExecuted: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
    };

    // Error tracking
    this.lastError = null;
    this.errors = [];
  }

  /**
   * Initialize the agent
   * Sets up session state and transitions to IDLE
   * @returns {Promise<void>}
   */
  async initialize() {
    this._setState(AgentState.INITIALIZING);

    try {
      // Initialize session state if sessionId provided
      if (this.sessionId) {
        this.session = await this._initializeSession();
      }

      // Validate configuration
      await this._validate();

      // Log initialization
      if (this.config.enableLogging && this.session) {
        await this.session.logEvent('agent_initialized', {
          agentId: this.id,
          agentType: this.type,
        });
      }

      this._setState(AgentState.IDLE);
      this.emit('initialized', { agentId: this.id, timestamp: Date.now() });
    } catch (error) {
      this._setState(AgentState.FAILED);
      this.lastError = error;
      this.emit('initialization_failed', { agentId: this.id, error });
      throw error;
    }
  }

  /**
   * Start the agent
   * Transitions from IDLE to RUNNING
   * @returns {Promise<void>}
   */
  async start() {
    if (this.state !== AgentState.IDLE && this.state !== AgentState.PAUSED) {
      throw new Error(
        `Cannot start agent in state: ${this.state}. Must be IDLE or PAUSED.`
      );
    }

    const previousState = this.state;
    this._setState(AgentState.RUNNING);
    this.startedAt = new Date();

    if (this.config.enableLogging && this.session) {
      await this.session.logEvent('agent_started', {
        agentId: this.id,
        previousState,
      });
    }

    this.emit('started', { agentId: this.id, timestamp: Date.now() });
  }

  /**
   * Stop the agent
   * Transitions to STOPPING then STOPPED
   * @returns {Promise<void>}
   */
  async stop() {
    if (this.state === AgentState.STOPPED) {
      return; // Already stopped
    }

    this._setState(AgentState.STOPPING);

    try {
      this._setState(AgentState.STOPPED);
      this.stoppedAt = new Date();

      if (this.config.enableLogging && this.session) {
        await this.session.logEvent('agent_stopped', {
          agentId: this.id,
          duration: this.stoppedAt - this.startedAt,
        });
      }

      this.emit('stopped', { agentId: this.id, timestamp: Date.now() });

      // Perform cleanup AFTER emitting event
      await this._cleanup();
    } catch (error) {
      this._setState(AgentState.FAILED);
      this.lastError = error;
      this.emit('stop_failed', { agentId: this.id, error });
      throw error;
    }
  }

  /**
   * Pause the agent
   * Preserves current state for later resumption
   * @returns {Promise<void>}
   */
  async pause() {
    if (this.state !== AgentState.RUNNING) {
      throw new Error(`Cannot pause agent in state: ${this.state}. Must be RUNNING.`);
    }

    // Save current state before pausing
    if (this.session) {
      await this.session.setState({
        pausedState: {
          agentId: this.id,
          pausedAt: new Date().toISOString(),
          context: this.context,
          metrics: this.metrics,
        },
      });
    }

    this._setState(AgentState.PAUSED);
    this.pausedAt = new Date();

    if (this.config.enableLogging && this.session) {
      await this.session.logEvent('agent_paused', { agentId: this.id });
    }

    this.emit('paused', { agentId: this.id, timestamp: Date.now() });
  }

  /**
   * Resume the agent from paused state
   * Restores state and continues execution
   * @returns {Promise<void>}
   */
  async resume() {
    if (this.state !== AgentState.PAUSED) {
      throw new Error(`Cannot resume agent in state: ${this.state}. Must be PAUSED.`);
    }

    // Restore state if available
    if (this.session) {
      const state = await this.session.getState();
      if (state.data?.pausedState?.agentId === this.id) {
        this.context = state.data.pausedState.context || this.context;
        this.metrics = state.data.pausedState.metrics || this.metrics;
      }
    }

    this._setState(AgentState.RUNNING);
    this.pausedAt = null;

    if (this.config.enableLogging && this.session) {
      await this.session.logEvent('agent_resumed', { agentId: this.id });
    }

    this.emit('resumed', { agentId: this.id, timestamp: Date.now() });
  }

  /**
   * Get current agent status
   * @returns {Object} Status object
   */
  getStatus() {
    return {
      id: this.id,
      type: this.type,
      state: this.state,
      sessionId: this.sessionId,
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      stoppedAt: this.stoppedAt,
      pausedAt: this.pausedAt,
      uptime: this.startedAt ? Date.now() - this.startedAt.getTime() : 0,
      metrics: { ...this.metrics },
      lastError: this.lastError
        ? {
            message: this.lastError.message,
            timestamp: this.lastError.timestamp,
          }
        : null,
    };
  }

  /**
   * Get session state
   * @returns {Promise<Object|null>} Session state or null
   */
  async getState() {
    if (!this.session) {
      return null;
    }
    return await this.session.getState();
  }

  /**
   * Set session state
   * @param {Object} updates - State updates to merge
   * @returns {Promise<Object|null>} Updated state or null
   */
  async setState(updates) {
    if (!this.session) {
      return null;
    }
    return await this.session.setState(updates);
  }

  /**
   * Log an event
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   * @returns {Promise<boolean>}
   */
  async logEvent(eventType, data = {}) {
    if (!this.config.enableLogging || !this.session) {
      return false;
    }

    return await this.session.logEvent(eventType, {
      agentId: this.id,
      agentType: this.type,
      ...data,
    });
  }

  /**
   * Update metrics
   * @param {Object} updates - Metric updates
   * @protected
   */
  _updateMetrics(updates) {
    Object.assign(this.metrics, updates);

    // Recalculate averages
    if (this.metrics.tasksCompleted > 0) {
      this.metrics.averageExecutionTime =
        this.metrics.totalExecutionTime / this.metrics.tasksCompleted;
    }
  }

  /**
   * Set agent state and emit events
   * @param {string} state - New state
   * @protected
   */
  _setState(state) {
    const oldState = this.state;
    this.state = state;

    this.emit('state_changed', {
      agentId: this.id,
      oldState,
      newState: state,
      timestamp: Date.now(),
    });
  }

  /**
   * Initialize session state
   * @returns {Promise<SessionState>}
   * @protected
   */
  async _initializeSession() {
    if (this.sessionId) {
      try {
        // Try to resume existing session
        return await SessionState.resume(this.sessionId);
      } catch {
        // Create new session with this ID
        const session = new SessionState(this.sessionId);
        await session.initialize();
        return session;
      }
    } else {
      // Create new session
      const session = new SessionState();
      await session.initialize();
      this.sessionId = session.sessionId;
      return session;
    }
  }

  /**
   * Validate agent configuration
   * @returns {Promise<void>}
   * @protected
   */
  async _validate() {
    if (!this.id) {
      throw new Error('Agent ID is required');
    }

    if (!this.type) {
      throw new Error('Agent type is required');
    }

    if (this.config.timeout && this.config.timeout < 1000) {
      throw new Error('Timeout must be at least 1000ms');
    }
  }

  /**
   * Cleanup resources
   * @returns {Promise<void>}
   * @protected
   */
  async _cleanup() {
    // Base implementation - override in subclasses
    this.removeAllListeners();
  }

  /**
   * Generate unique agent ID
   * @returns {string}
   * @private
   */
  _generateId() {
    return `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Record an error
   * @param {Error} error - Error object
   * @param {Object} context - Error context
   * @protected
   */
  _recordError(error, context = {}) {
    const errorRecord = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context,
    };

    this.lastError = errorRecord;
    this.errors.push(errorRecord);

    // Keep only last 10 errors
    if (this.errors.length > 10) {
      this.errors.shift();
    }
  }
}

// Export class and constants
module.exports = BaseWorkerAgent;
module.exports.AgentState = AgentState;
module.exports.AgentType = AgentType;
