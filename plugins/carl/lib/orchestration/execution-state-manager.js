/**
 * Execution State Manager
 *
 * Manages persistent state for execution recovery:
 * - Save execution state to durable storage
 * - Load and resume from saved state
 * - Track completed, failed, and blocked items
 * - Enable recovery after process restart
 * - Provide state audit trail
 *
 * State is saved to filesystem in JSON format for easy inspection and debugging.
 */

const fs = require('fs').promises;
const path = require('path');
const { randomUUID } = require('crypto');

class ExecutionStateManager {
  /**
   * Create an execution state manager
   * @param {Object} options - Configuration options
   * @param {string} [options.stateDirectory='.cascade/.execution-state'] - Directory for state files
   * @param {boolean} [options.enabled=true] - Enable state persistence
   * @param {number} [options.saveInterval=5000] - Auto-save interval in milliseconds (0 = disabled)
   * @param {number} [options.retentionDays=7] - Days to retain completed execution state
   */
  constructor(options = {}) {
    this.stateDirectory = options.stateDirectory || '.cascade/.execution-state';
    this.enabled = options.enabled !== undefined ? options.enabled : true;
    this.saveInterval = options.saveInterval || 5000;
    this.retentionDays = options.retentionDays || 7;

    this.executionId = null;
    this.state = null;
    this.autoSaveTimer = null;
  }

  /**
   * Initialize state manager
   * @param {string} [executionId] - Execution ID (generates new if not provided)
   * @returns {Promise<string>} Execution ID
   */
  async initialize(executionId = null) {
    if (!this.enabled) {
      return null;
    }

    this.executionId = executionId || randomUUID();

    // Create state directory if it doesn't exist
    try {
      await fs.mkdir(this.stateDirectory, { recursive: true });
    } catch (error) {
      console.warn(`Failed to create state directory: ${error.message}`);
      this.enabled = false;
      return this.executionId;
    }

    // Clean up old state files
    await this._cleanupOldStates();

    return this.executionId;
  }

  /**
   * Create initial execution state
   * @param {Object} options - State options
   * @param {Array} options.workItems - Work item definitions
   * @param {Object} [options.metadata] - Additional metadata
   * @returns {Promise<void>}
   */
  async createState(options) {
    if (!this.enabled) {
      return;
    }

    this.state = {
      executionId: this.executionId,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      status: 'initialized',
      workItems: options.workItems || [],
      completedItems: [],
      failedItems: {},
      blockedItems: {},
      pendingItems: options.workItems?.map(item => item.id) || [],
      currentWave: -1,
      context: {},
      metadata: options.metadata || {},
    };

    await this._saveState();

    // Start auto-save timer
    if (this.saveInterval > 0) {
      this._startAutoSave();
    }
  }

  /**
   * Load existing execution state
   * @param {string} executionId - Execution ID to load
   * @returns {Promise<Object>} Loaded state
   */
  async loadState(executionId) {
    if (!this.enabled) {
      return null;
    }

    this.executionId = executionId;
    const statePath = this._getStatePath();

    try {
      const content = await fs.readFile(statePath, 'utf8');
      this.state = JSON.parse(content);
      return this.state;
    } catch (error) {
      throw new Error(`Failed to load execution state ${executionId}: ${error.message}`);
    }
  }

  /**
   * Update execution state
   * @param {Object} updates - State updates
   * @returns {Promise<void>}
   */
  async updateState(updates) {
    if (!this.enabled || !this.state) {
      return;
    }

    // Merge updates
    this.state = {
      ...this.state,
      ...updates,
      updated: new Date().toISOString(),
    };

    // Immediate save for critical updates (status changes)
    if (updates.status) {
      await this._saveState();
    }
    // Otherwise, rely on auto-save
  }

  /**
   * Mark item as completed
   * @param {string} itemId - Item ID
   * @param {*} result - Item result
   * @returns {Promise<void>}
   */
  async markCompleted(itemId, result = null) {
    if (!this.enabled || !this.state) {
      return;
    }

    // Remove from pending
    this.state.pendingItems = this.state.pendingItems.filter(id => id !== itemId);

    // Add to completed
    if (!this.state.completedItems.includes(itemId)) {
      this.state.completedItems.push(itemId);
    }

    // Store result if provided
    if (result !== null) {
      this.state.results = this.state.results || {};
      this.state.results[itemId] = result;
    }

    this.state.updated = new Date().toISOString();
  }

  /**
   * Mark item as failed
   * @param {string} itemId - Item ID
   * @param {Error} error - Error object
   * @param {Object} [metadata] - Additional failure metadata
   * @returns {Promise<void>}
   */
  async markFailed(itemId, error, metadata = {}) {
    if (!this.enabled || !this.state) {
      return;
    }

    // Remove from pending
    this.state.pendingItems = this.state.pendingItems.filter(id => id !== itemId);

    // Add to failed with details
    this.state.failedItems[itemId] = {
      error: error.message || String(error),
      errorStack: error.stack,
      failureType: metadata.failureType || 'unknown',
      attempts: metadata.attempts || 1,
      firstFailure: metadata.firstFailure || new Date().toISOString(),
      lastAttempt: new Date().toISOString(),
      retryHistory: metadata.retryHistory || [],
    };

    this.state.updated = new Date().toISOString();
    await this._saveState(); // Immediate save for failures
  }

  /**
   * Mark items as blocked
   * @param {Array<string>} itemIds - Item IDs to block
   * @param {string} reason - Reason for blocking
   * @param {Array<string>} blockedBy - IDs of items causing the block
   * @returns {Promise<void>}
   */
  async markBlocked(itemIds, reason, blockedBy = []) {
    if (!this.enabled || !this.state) {
      return;
    }

    for (const itemId of itemIds) {
      // Remove from pending
      this.state.pendingItems = this.state.pendingItems.filter(id => id !== itemId);

      // Add to blocked
      this.state.blockedItems[itemId] = {
        reason,
        blockedBy,
        timestamp: new Date().toISOString(),
      };
    }

    this.state.updated = new Date().toISOString();
  }

  /**
   * Unblock items
   * @param {Array<string>} itemIds - Item IDs to unblock
   * @returns {Promise<void>}
   */
  async unblockItems(itemIds) {
    if (!this.enabled || !this.state) {
      return;
    }

    for (const itemId of itemIds) {
      // Remove from blocked
      delete this.state.blockedItems[itemId];

      // Add back to pending
      if (!this.state.pendingItems.includes(itemId) &&
          !this.state.completedItems.includes(itemId) &&
          !this.state.failedItems[itemId]) {
        this.state.pendingItems.push(itemId);
      }
    }

    this.state.updated = new Date().toISOString();
  }

  /**
   * Update context
   * @param {Object} context - Updated context
   * @returns {Promise<void>}
   */
  async updateContext(context) {
    if (!this.enabled || !this.state) {
      return;
    }

    this.state.context = { ...this.state.context, ...context };
    this.state.updated = new Date().toISOString();
  }

  /**
   * Get current state
   * @returns {Object} Current state
   */
  getState() {
    return this.state ? { ...this.state } : null;
  }

  /**
   * Check if can resume execution
   * @returns {boolean} True if state exists and is resumable
   */
  canResume() {
    if (!this.state) {
      return false;
    }

    const resumableStatuses = ['executing', 'paused', 'failed'];
    return resumableStatuses.includes(this.state.status) &&
           (this.state.pendingItems.length > 0 || Object.keys(this.state.blockedItems).length > 0);
  }

  /**
   * Finalize execution
   * @param {string} finalStatus - Final status (completed, failed, cancelled)
   * @returns {Promise<void>}
   */
  async finalize(finalStatus) {
    if (!this.enabled || !this.state) {
      return;
    }

    this.state.status = finalStatus;
    this.state.completed = new Date().toISOString();
    this.state.updated = new Date().toISOString();

    await this._saveState();

    // Stop auto-save
    this._stopAutoSave();
  }

  /**
   * Delete execution state
   * @returns {Promise<void>}
   */
  async deleteState() {
    if (!this.enabled) {
      return;
    }

    this._stopAutoSave();

    try {
      const statePath = this._getStatePath();
      await fs.unlink(statePath);
    } catch (error) {
      // Ignore errors (file may not exist)
    }

    this.state = null;
  }

  /**
   * List all saved execution states
   * @returns {Promise<Array>} Array of execution state summaries
   */
  async listStates() {
    if (!this.enabled) {
      return [];
    }

    try {
      const files = await fs.readdir(this.stateDirectory);
      const states = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const content = await fs.readFile(path.join(this.stateDirectory, file), 'utf8');
            const state = JSON.parse(content);
            states.push({
              executionId: state.executionId,
              status: state.status,
              created: state.created,
              updated: state.updated,
              completed: state.completed,
              totalItems: state.workItems.length,
              completedItems: state.completedItems.length,
              failedItems: Object.keys(state.failedItems).length,
              blockedItems: Object.keys(state.blockedItems).length,
              pendingItems: state.pendingItems.length,
            });
          } catch (error) {
            // Skip invalid files
          }
        }
      }

      return states.sort((a, b) => new Date(b.created) - new Date(a.created));
    } catch (error) {
      return [];
    }
  }

  /**
   * Save state to disk
   * @private
   */
  async _saveState() {
    if (!this.enabled || !this.state) {
      return;
    }

    try {
      const statePath = this._getStatePath();
      const content = JSON.stringify(this.state, null, 2);
      await fs.writeFile(statePath, content, 'utf8');
    } catch (error) {
      console.warn(`Failed to save execution state: ${error.message}`);
    }
  }

  /**
   * Get state file path
   * @private
   */
  _getStatePath() {
    return path.join(this.stateDirectory, `${this.executionId}.json`);
  }

  /**
   * Start auto-save timer
   * @private
   */
  _startAutoSave() {
    if (this.autoSaveTimer) {
      return;
    }

    this.autoSaveTimer = setInterval(() => {
      this._saveState().catch(error => {
        console.warn(`Auto-save failed: ${error.message}`);
      });
    }, this.saveInterval);
  }

  /**
   * Stop auto-save timer
   * @private
   */
  _stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * Clean up old execution states
   * @private
   */
  async _cleanupOldStates() {
    if (!this.enabled || this.retentionDays <= 0) {
      return;
    }

    try {
      const states = await this.listStates();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      for (const state of states) {
        // Only clean up completed or failed executions
        if (['completed', 'failed', 'cancelled'].includes(state.status)) {
          const stateDate = new Date(state.completed || state.updated);
          if (stateDate < cutoffDate) {
            try {
              const statePath = path.join(this.stateDirectory, `${state.executionId}.json`);
              await fs.unlink(statePath);
            } catch (error) {
              // Ignore deletion errors
            }
          }
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

module.exports = ExecutionStateManager;
