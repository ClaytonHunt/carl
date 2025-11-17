/**
 * Cascade State Synchronization
 *
 * Bi-directional synchronization between session state and Cascade state.json files.
 * Implements safe concurrent updates and parent state propagation.
 *
 * Based on IndyDevDan's principles:
 * - Observable by default - all state changes are tracked
 * - Event-driven coordination - state changes emit events
 * - Clean separation of concerns - state sync is isolated from core operations
 */

const fs = require('fs').promises;
const path = require('path');
const { randomUUID } = require('crypto');

class StateSync {
  constructor(cascadeManager, sessionState = null) {
    this.cascadeManager = cascadeManager;
    this.sessionState = sessionState;
    this.lockDir = path.join(cascadeManager.cascadeDir, '.locks');
  }

  /**
   * T0121: Read current state from Cascade state.json
   *
   * Reads and validates state.json for a work item, handling missing or corrupt files.
   *
   * @param {string} workItemId - Work item ID (e.g., E0001, F0002)
   * @returns {Promise<Object|null>} - Structured state object or null if not found
   *
   * @example
   * const state = await stateSync.readCascadeState('S0105');
   * // Returns: { id, status, progress, children, updated }
   */
  async readCascadeState(workItemId) {
    try {
      // Validate ID format
      const { type } = this.cascadeManager.parseId(workItemId);

      // Tasks don't have state.json
      if (type === 'T') {
        return null;
      }

      // Use CascadeManager's getState() as foundation
      const state = await this.cascadeManager.getState(workItemId);

      if (!state) {
        return null;
      }

      // Validate state structure
      const validatedState = this._validateStateStructure(state, workItemId);

      return validatedState;
    } catch (error) {
      // Handle corrupt or invalid state files
      if (error instanceof SyntaxError) {
        console.warn(`Corrupt state.json for ${workItemId}: ${error.message}`);
        return null;
      }

      // Re-throw validation errors
      if (error.message.includes('Invalid work item ID format')) {
        throw error;
      }

      // Handle file not found gracefully
      if (error.code === 'ENOENT' || error.message.includes('not found')) {
        return null;
      }

      throw new Error(`Failed to read Cascade state for ${workItemId}: ${error.message}`);
    }
  }

  /**
   * Validate state structure and provide defaults for missing fields
   * @private
   * @param {Object} state - Raw state object
   * @param {string} workItemId - Work item ID for error context
   * @returns {Object} - Validated state object
   */
  _validateStateStructure(state, workItemId) {
    // Ensure required fields exist
    const validated = {
      id: state.id || workItemId,
      status: state.status || 'planned',
      progress: state.progress || {
        total_items: 0,
        completed: 0,
        in_progress: 0,
        planned: 0,
        blocked: 0,
        percentage: 0
      },
      children: state.children || {},
      updated: state.updated || new Date().toISOString()
    };

    // Validate status value
    const validStatuses = ['planned', 'in-progress', 'completed', 'blocked'];
    if (!validStatuses.includes(validated.status)) {
      console.warn(`Invalid status "${validated.status}" for ${workItemId}, defaulting to "planned"`);
      validated.status = 'planned';
    }

    // Ensure progress has all required fields
    validated.progress = {
      total_items: validated.progress.total_items || 0,
      completed: validated.progress.completed || 0,
      in_progress: validated.progress.in_progress || 0,
      planned: validated.progress.planned || 0,
      blocked: validated.progress.blocked || 0,
      percentage: validated.progress.percentage || 0
    };

    // Ensure children is an object
    if (typeof validated.children !== 'object' || Array.isArray(validated.children)) {
      console.warn(`Invalid children structure for ${workItemId}, resetting to empty object`);
      validated.children = {};
    }

    return validated;
  }

  /**
   * Read state for multiple work items in parallel
   * @param {Array<string>} workItemIds - Array of work item IDs
   * @returns {Promise<Object>} - Map of { workItemId: state }
   */
  async readCascadeStateBatch(workItemIds) {
    const results = {};

    // Read all states in parallel (IndyDevDan: "Do more when possible")
    const states = await Promise.all(
      workItemIds.map(async (id) => {
        try {
          const state = await this.readCascadeState(id);
          return { id, state };
        } catch (error) {
          console.warn(`Failed to read state for ${id}: ${error.message}`);
          return { id, state: null };
        }
      })
    );

    // Build result map
    states.forEach(({ id, state }) => {
      results[id] = state;
    });

    return results;
  }

  /**
   * T0122: Write updated state to Cascade state.json
   *
   * Writes state updates atomically, preserving existing fields and only
   * updating changed fields. Handles write errors gracefully.
   *
   * @param {string} workItemId - Work item ID
   * @param {Object} stateUpdates - Partial state object with fields to update
   * @returns {Promise<boolean>} - Success indicator
   *
   * @example
   * await stateSync.writeCascadeState('S0105', {
   *   status: 'in-progress',
   *   progress: { completed: 1, in_progress: 3 }
   * });
   */
  async writeCascadeState(workItemId, stateUpdates) {
    try {
      // Validate ID format
      const { type } = this.cascadeManager.parseId(workItemId);

      // Tasks don't have state.json
      if (type === 'T') {
        return false;
      }

      // Read current state
      const currentState = await this.readCascadeState(workItemId);

      if (!currentState) {
        throw new Error(`Cannot update state for non-existent work item: ${workItemId}`);
      }

      // Merge updates (deep merge for nested objects like progress)
      const updatedState = {
        ...currentState,
        ...stateUpdates,
        progress: {
          ...currentState.progress,
          ...(stateUpdates.progress || {})
        },
        children: {
          ...currentState.children,
          ...(stateUpdates.children || {})
        },
        updated: new Date().toISOString()
      };

      // Validate merged state
      const validatedState = this._validateStateStructure(updatedState, workItemId);

      // Get state.json path
      const statePath = await this._getStatePath(workItemId);

      // Write atomically (write to temp file, then rename)
      const tempPath = `${statePath}.${randomUUID()}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(validatedState, null, 2), 'utf-8');
      await fs.rename(tempPath, statePath);

      return true;
    } catch (error) {
      // Clean up temp file if it exists
      try {
        const statePath = await this._getStatePath(workItemId);
        const tempFiles = await fs.readdir(path.dirname(statePath));
        for (const file of tempFiles) {
          if (file.startsWith('state.json.') && file.endsWith('.tmp')) {
            await fs.unlink(path.join(path.dirname(statePath), file)).catch(() => {});
          }
        }
      } catch {}

      throw new Error(`Failed to write Cascade state for ${workItemId}: ${error.message}`);
    }
  }

  /**
   * Get path to state.json file for a work item
   * @private
   * @param {string} workItemId - Work item ID
   * @returns {Promise<string>} - Absolute path to state.json
   */
  async _getStatePath(workItemId) {
    const { type } = this.cascadeManager.parseId(workItemId);

    if (type === 'P') {
      // Project state.json is in cascade root
      return path.join(this.cascadeManager.cascadeDir, 'state.json');
    }

    // Look up work item path in registry
    const registry = await this.cascadeManager.loadRegistry();
    const metadata = registry.work_items[workItemId];

    if (!metadata) {
      throw new Error(`Work item not found in registry: ${workItemId}`);
    }

    // metadata.path includes filename, get directory and join with state.json
    const filePath = path.join(this.cascadeManager.cascadeDir, metadata.path);
    const dirPath = path.dirname(filePath);
    return path.join(dirPath, 'state.json');
  }

  /**
   * T0123: Acquire lock for work item state
   *
   * Implements file-based locking to prevent concurrent write conflicts.
   * Uses optimistic locking with timeout.
   *
   * @param {string} workItemId - Work item ID to lock
   * @param {number} timeoutMs - Lock timeout in milliseconds (default: 5000)
   * @returns {Promise<Function>} - Unlock function
   */
  async acquireLock(workItemId, timeoutMs = 5000) {
    // Ensure lock directory exists
    await fs.mkdir(this.lockDir, { recursive: true });

    const lockPath = path.join(this.lockDir, `${workItemId}.lock`);
    const lockId = randomUUID();
    const startTime = Date.now();

    // Try to acquire lock with exponential backoff
    while (Date.now() - startTime < timeoutMs) {
      try {
        // Try to create lock file (exclusive)
        await fs.writeFile(lockPath, JSON.stringify({
          lockId,
          workItemId,
          acquired: new Date().toISOString(),
          pid: process.pid
        }), { flag: 'wx' }); // 'wx' = write exclusive (fails if exists)

        // Lock acquired successfully - return unlock function
        return async () => {
          try {
            // Verify we still own the lock before releasing
            const lockContent = await fs.readFile(lockPath, 'utf-8');
            const lockData = JSON.parse(lockContent);
            if (lockData.lockId === lockId) {
              await fs.unlink(lockPath);
            }
          } catch (error) {
            // Lock already released or stolen - this is fine
          }
        };
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }

        // Lock exists - check if it's stale (older than 30 seconds)
        try {
          const stats = await fs.stat(lockPath);
          const age = Date.now() - stats.mtimeMs;
          if (age > 30000) {
            // Stale lock - remove it
            await fs.unlink(lockPath).catch(() => {});
          }
        } catch {}

        // Wait before retrying (exponential backoff: 10ms, 20ms, 40ms, 80ms, 160ms)
        const elapsed = Date.now() - startTime;
        const backoff = Math.min(10 * Math.pow(2, Math.floor(elapsed / 1000)), 200);
        await new Promise(resolve => setTimeout(resolve, backoff));
      }
    }

    throw new Error(`Failed to acquire lock for ${workItemId} after ${timeoutMs}ms`);
  }

  /**
   * T0123: Write state with lock protection
   *
   * Writes state with automatic lock acquisition and release.
   *
   * @param {string} workItemId - Work item ID
   * @param {Object} stateUpdates - State updates
   * @returns {Promise<boolean>} - Success indicator
   */
  async writeCascadeStateWithLock(workItemId, stateUpdates) {
    const unlock = await this.acquireLock(workItemId);
    try {
      return await this.writeCascadeState(workItemId, stateUpdates);
    } finally {
      await unlock();
    }
  }

  /**
   * T0124: Propagate state changes to parent items
   *
   * Updates parent work item state based on child states.
   * Maintains state hierarchy integrity.
   *
   * @param {string} childId - Child work item ID that changed
   * @returns {Promise<boolean>} - Success indicator
   */
  async propagateToParent(childId) {
    try {
      // Get parent ID from registry
      const registry = await this.cascadeManager.loadRegistry();
      const childMetadata = registry.work_items[childId];

      if (!childMetadata || !childMetadata.parent) {
        // No parent to propagate to
        return false;
      }

      const parentId = childMetadata.parent;

      // Acquire lock on parent
      const unlock = await this.acquireLock(parentId);
      try {
        // Read parent state
        const parentState = await this.readCascadeState(parentId);
        if (!parentState) {
          return false;
        }

        // Get all children of parent
        const children = await this.cascadeManager.getChildren(parentId);

        // Calculate aggregate progress
        const progress = this._calculateAggregateProgress(children);

        // Determine parent status based on children
        const status = this._determineParentStatus(children);

        // Update parent state (state.json)
        await this.writeCascadeState(parentId, {
          status,
          progress
        });

        // Also update markdown frontmatter so getChildren() sees correct status
        await this.cascadeManager.updateWorkItem(parentId, { status });

        // Recursively propagate to grandparent
        await this.propagateToParent(parentId);

        return true;
      } finally {
        await unlock();
      }
    } catch (error) {
      console.error(`Failed to propagate state to parent: ${error.message}`);
      return false;
    }
  }

  /**
   * Calculate aggregate progress from children
   * @private
   * @param {Array<Object>} children - Array of child work items
   * @returns {Object} - Progress object
   */
  _calculateAggregateProgress(children) {
    const progress = {
      total_items: children.length,
      completed: 0,
      in_progress: 0,
      planned: 0,
      blocked: 0,
      percentage: 0
    };

    children.forEach(child => {
      const status = child.status || 'planned';
      switch (status) {
        case 'completed':
          progress.completed++;
          break;
        case 'in-progress':
          progress.in_progress++;
          break;
        case 'planned':
          progress.planned++;
          break;
        case 'blocked':
          progress.blocked++;
          break;
      }
    });

    // Calculate percentage (completed / total)
    if (progress.total_items > 0) {
      progress.percentage = Math.round((progress.completed / progress.total_items) * 100);
    }

    return progress;
  }

  /**
   * Determine parent status based on children
   * @private
   * @param {Array<Object>} children - Array of child work items
   * @returns {string} - Parent status
   */
  _determineParentStatus(children) {
    if (children.length === 0) {
      return 'planned';
    }

    const statuses = children.map(c => c.status || 'planned');

    // If all children completed -> parent completed
    if (statuses.every(s => s === 'completed')) {
      return 'completed';
    }

    // If any child in-progress -> parent in-progress
    if (statuses.some(s => s === 'in-progress')) {
      return 'in-progress';
    }

    // If some children completed but not all -> parent in-progress
    if (statuses.some(s => s === 'completed')) {
      return 'in-progress';
    }

    // If any child blocked and none in-progress/completed -> parent blocked
    if (statuses.some(s => s === 'blocked')) {
      return 'blocked';
    }

    // Otherwise planned (all children are planned)
    return 'planned';
  }

  /**
   * Sync session state to Cascade state
   * @param {string} workItemId - Work item ID
   * @param {Object} sessionStateData - Session state data
   * @returns {Promise<boolean>} - Success indicator
   */
  async syncFromSession(workItemId, sessionStateData) {
    if (!this.sessionState) {
      throw new Error('SessionState not configured');
    }

    // Extract relevant fields from session state
    const stateUpdates = {
      status: sessionStateData.status,
      progress: sessionStateData.progress,
      // Don't overwrite children from session state
    };

    return await this.writeCascadeStateWithLock(workItemId, stateUpdates);
  }

  /**
   * Sync Cascade state to session state
   * @param {string} workItemId - Work item ID
   * @returns {Promise<boolean>} - Success indicator
   */
  async syncToSession(workItemId) {
    if (!this.sessionState) {
      throw new Error('SessionState not configured');
    }

    const cascadeState = await this.readCascadeState(workItemId);
    if (!cascadeState) {
      return false;
    }

    await this.sessionState.setState({
      workItemId,
      cascadeState
    });

    return true;
  }

  /**
   * Clean up old lock files (older than 1 minute)
   * @returns {Promise<number>} - Number of locks cleaned
   */
  async cleanupStaleLocks() {
    try {
      const locks = await fs.readdir(this.lockDir);
      const cutoff = Date.now() - 60000; // 1 minute
      let cleaned = 0;

      for (const lock of locks) {
        if (!lock.endsWith('.lock')) continue;

        const lockPath = path.join(this.lockDir, lock);
        try {
          const stats = await fs.stat(lockPath);
          if (stats.mtimeMs < cutoff) {
            await fs.unlink(lockPath);
            cleaned++;
          }
        } catch {}
      }

      return cleaned;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return 0;
      }
      throw error;
    }
  }
}

module.exports = StateSync;
