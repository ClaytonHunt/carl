/**
 * Work Orchestration Helpers
 *
 * Simple utility functions for the Work Orchestrator agent.
 * These handle data operations only - the agent does all the reasoning.
 *
 * Philosophy:
 * - Code handles data (load work items, validate, build context)
 * - Agent handles reasoning (execution strategy, coordination, delegation)
 *
 * Based on IndyDevDan's patterns:
 * - Agent-first approach: helpers do data, agents do decisions
 * - Observable by default: every operation can be logged
 * - Clean separation: code ≠ reasoning
 */

const CascadeManager = require('../cascade/cascade-manager');
const path = require('path');

/**
 * Custom error types for work orchestration
 */

class WorkItemNotFoundError extends Error {
  constructor(id, message) {
    super(message || `Work item not found: ${id}`);
    this.name = 'WorkItemNotFoundError';
    this.workItemId = id;
  }
}

class WorkItemValidationError extends Error {
  constructor(id, errors) {
    super(`Work item validation failed for ${id}: ${errors.join(', ')}`);
    this.name = 'WorkItemValidationError';
    this.workItemId = id;
    this.validationErrors = errors;
  }
}

class WorkItemDeletedError extends Error {
  constructor(id) {
    super(`Work item has been deleted: ${id}`);
    this.name = 'WorkItemDeletedError';
    this.workItemId = id;
  }
}

/**
 * WORK ITEM LIFECYCLE PHASES
 *
 * Defines the complete lifecycle for work item execution from initialization to completion.
 * Each phase represents a distinct stage with specific responsibilities and valid transitions.
 */

/**
 * Lifecycle Phase Definitions
 *
 * The work item execution lifecycle consists of the following phases:
 *
 * 1. INITIALIZED - Work item execution has been initialized
 *    - Entry: When execution state is first created
 *    - Responsibilities: Set up initial execution state
 *    - Next: VALIDATING
 *
 * 2. VALIDATING - Validating work item structure and prerequisites
 *    - Entry: After initialization
 *    - Responsibilities: Validate work item data, check prerequisites
 *    - Next: LOADING_CONTEXT (success) or FAILED (validation error)
 *
 * 3. LOADING_CONTEXT - Loading execution context (parent, children, siblings)
 *    - Entry: After successful validation
 *    - Responsibilities: Load related work items, build dependency graph
 *    - Next: EXECUTING (success) or FAILED (load error)
 *
 * 4. EXECUTING - Actively executing work item
 *    - Entry: After context is loaded
 *    - Responsibilities: Execute work item logic, track progress
 *    - Next: MONITORING (during execution) or COMPLETING (finished)
 *
 * 5. MONITORING - Monitoring execution progress
 *    - Entry: During execution
 *    - Responsibilities: Track status, handle progress updates
 *    - Next: EXECUTING (continue) or COMPLETING (finished)
 *
 * 6. COMPLETING - Finalizing execution and cleanup
 *    - Entry: After execution finishes
 *    - Responsibilities: Sync state to Cascade, update progress
 *    - Next: COMPLETED (success) or FAILED (finalization error)
 *
 * 7. COMPLETED - Execution completed successfully
 *    - Entry: After successful completion
 *    - Responsibilities: None (terminal state)
 *    - Next: None (terminal)
 *
 * 8. FAILED - Execution failed with error
 *    - Entry: From any phase on error
 *    - Responsibilities: Log error, preserve state for debugging
 *    - Next: ROLLING_BACK (if rollback enabled) or terminal
 *
 * 9. ROLLING_BACK - Rolling back changes due to failure
 *    - Entry: After failure if rollback is enabled
 *    - Responsibilities: Undo changes, restore previous state
 *    - Next: ROLLED_BACK (success) or FAILED (rollback error)
 *
 * 10. ROLLED_BACK - Successfully rolled back after failure
 *     - Entry: After successful rollback
 *     - Responsibilities: None (terminal state)
 *     - Next: None (terminal)
 */

const LifecyclePhase = {
  INITIALIZED: 'initialized',
  VALIDATING: 'validating',
  LOADING_CONTEXT: 'loading_context',
  EXECUTING: 'executing',
  MONITORING: 'monitoring',
  COMPLETING: 'completing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  ROLLING_BACK: 'rolling_back',
  ROLLED_BACK: 'rolled_back'
};

/**
 * Valid state transitions for lifecycle phases
 * Maps from current phase to allowed next phases
 */
const ValidTransitions = {
  [LifecyclePhase.INITIALIZED]: [LifecyclePhase.VALIDATING],
  [LifecyclePhase.VALIDATING]: [LifecyclePhase.LOADING_CONTEXT, LifecyclePhase.FAILED],
  [LifecyclePhase.LOADING_CONTEXT]: [LifecyclePhase.EXECUTING, LifecyclePhase.FAILED],
  [LifecyclePhase.EXECUTING]: [LifecyclePhase.MONITORING, LifecyclePhase.COMPLETING, LifecyclePhase.FAILED],
  [LifecyclePhase.MONITORING]: [LifecyclePhase.EXECUTING, LifecyclePhase.COMPLETING, LifecyclePhase.FAILED],
  [LifecyclePhase.COMPLETING]: [LifecyclePhase.COMPLETED, LifecyclePhase.FAILED],
  [LifecyclePhase.COMPLETED]: [], // Terminal state
  [LifecyclePhase.FAILED]: [LifecyclePhase.ROLLING_BACK], // Can attempt rollback
  [LifecyclePhase.ROLLING_BACK]: [LifecyclePhase.ROLLED_BACK, LifecyclePhase.FAILED],
  [LifecyclePhase.ROLLED_BACK]: [] // Terminal state
};

/**
 * Check if a phase transition is valid
 *
 * @param {string} fromPhase - Current phase
 * @param {string} toPhase - Target phase
 * @returns {boolean} True if transition is valid
 */
function isValidTransition(fromPhase, toPhase) {
  const validNextPhases = ValidTransitions[fromPhase] || [];
  return validNextPhases.includes(toPhase);
}

/**
 * Get valid next phases for current phase
 *
 * @param {string} currentPhase - Current lifecycle phase
 * @returns {string[]} Array of valid next phases
 */
function getValidNextPhases(currentPhase) {
  return ValidTransitions[currentPhase] || [];
}

/**
 * Load a work item by ID
 *
 * Loads a work item from Cascade format using CascadeManager.
 * Returns the complete work item with frontmatter, content, and state.
 *
 * @param {string} id - Work item ID (e.g., "S0010", "T0013")
 * @param {string} cascadeDir - Path to .cascade directory (default: '.cascade')
 * @returns {Promise<Object>} Work item object with id, title, status, content, state, etc.
 * @throws {Error} If work item not found or invalid ID format
 *
 * @example
 * const workItem = await loadWorkItem('S0010');
 * console.log(workItem.title); // "Work Item Loading and Validation"
 * console.log(workItem.status); // "planned"
 * console.log(workItem.state.progress); // { total_items: 5, completed: 0, ... }
 */
async function loadWorkItem(id, cascadeDir = '.cascade') {
  try {
    const manager = new CascadeManager(cascadeDir);
    const workItem = await manager.getWorkItem(id);
    return workItem;
  } catch (error) {
    // Handle specific error cases
    if (error.message.includes('not found')) {
      throw new WorkItemNotFoundError(id);
    }
    if (error.message.includes('deleted')) {
      throw new WorkItemDeletedError(id);
    }
    // Re-throw with more context for other errors
    throw new Error(`Failed to load work item ${id}: ${error.message}`);
  }
}

/**
 * Validate a work item's structure and required fields
 *
 * Checks that a work item has all required fields for execution.
 * Returns validation result with any errors found.
 *
 * @param {Object} workItem - Work item object to validate
 * @returns {Object} Validation result: { valid: boolean, errors: string[] }
 *
 * Required fields:
 * - id: Work item ID (e.g., "S0010")
 * - type: Work item type code (P, E, F, S, B, PH, T)
 * - title: Work item title
 * - status: Current status (planned, in_progress, completed, blocked, failed)
 * - parent: Parent ID (except for Projects)
 *
 * @example
 * const result = validateWorkItem(workItem);
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 */
function validateWorkItem(workItem) {
  const errors = [];
  const validTypes = ['P', 'E', 'F', 'S', 'B', 'PH', 'T'];
  const validStatuses = ['planned', 'in_progress', 'completed', 'blocked', 'failed'];

  // Check for null/undefined
  if (!workItem) {
    return { valid: false, errors: ['Work item is null or undefined'] };
  }

  // Required fields
  if (!workItem.id) {
    errors.push('Missing required field: id');
  } else if (!/^[A-Z]+\d+$/.test(workItem.id)) {
    errors.push(`Invalid ID format: ${workItem.id} (expected format: P0001, E0001, etc.)`);
  }

  if (!workItem.type) {
    errors.push('Missing required field: type');
  } else if (!validTypes.includes(workItem.type)) {
    errors.push(`Invalid type: ${workItem.type} (must be one of: ${validTypes.join(', ')})`);
  }

  if (!workItem.title) {
    errors.push('Missing required field: title');
  } else if (typeof workItem.title !== 'string' || workItem.title.trim().length === 0) {
    errors.push('Title must be a non-empty string');
  }

  if (!workItem.status) {
    errors.push('Missing required field: status');
  } else if (!validStatuses.includes(workItem.status)) {
    errors.push(`Invalid status: ${workItem.status} (must be one of: ${validStatuses.join(', ')})`);
  }

  // Parent is required for all except Projects
  if (workItem.type !== 'P' && !workItem.parent) {
    errors.push(`Parent is required for ${workItem.type} work items`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Load execution context for a work item
 *
 * Loads the work item along with all related work items needed for execution:
 * - The work item itself
 * - Parent work item (if exists)
 * - Child work items (for orchestrating sub-items)
 * - Sibling work items (for context and dependencies)
 *
 * This provides complete context for the orchestrator to make execution decisions.
 *
 * @param {string} id - Work item ID (e.g., "S0010", "F0003")
 * @param {string} cascadeDir - Path to .cascade directory (default: '.cascade')
 * @returns {Promise<Object>} Execution context object
 *
 * Returned object structure:
 * {
 *   workItem: Object,     // The target work item
 *   parent: Object|null,  // Parent work item (null for Projects)
 *   children: Array,      // Array of child work items
 *   siblings: Array,      // Array of sibling work items (same parent)
 *   manager: CascadeManager // Manager instance for further operations
 * }
 *
 * @example
 * const context = await loadExecutionContext('S0010');
 * console.log(context.workItem.title); // "Work Item Loading and Validation"
 * console.log(context.parent.title);   // "Core Execution Engine"
 * console.log(context.children.length); // 5 (tasks)
 * console.log(context.siblings.length); // 2 (other stories in same feature)
 */
async function loadExecutionContext(id, cascadeDir = '.cascade') {
  try {
    const manager = new CascadeManager(cascadeDir);

    // Load the work item
    const workItem = await manager.getWorkItem(id);

    // Load parent (null for Projects)
    const parent = workItem.parent ? await manager.getParent(id) : null;

    // Load children
    const children = await manager.getChildren(id);

    // Load siblings (other children of the same parent)
    let siblings = [];
    if (parent) {
      const allSiblings = await manager.getChildren(parent.id);
      // Filter out the current work item from siblings
      siblings = allSiblings.filter(sibling => sibling.id !== id);
    }

    return {
      workItem,
      parent,
      children,
      siblings,
      manager
    };
  } catch (error) {
    throw new Error(`Failed to load execution context for ${id}: ${error.message}`);
  }
}

/**
 * Safely load and validate a work item
 *
 * Loads a work item and validates it in one operation.
 * Throws WorkItemValidationError if validation fails.
 * Useful for ensuring work items are ready for execution.
 *
 * @param {string} id - Work item ID
 * @param {string} cascadeDir - Path to .cascade directory (default: '.cascade')
 * @returns {Promise<Object>} Validated work item
 * @throws {WorkItemNotFoundError} If work item not found
 * @throws {WorkItemDeletedError} If work item has been deleted
 * @throws {WorkItemValidationError} If work item validation fails
 *
 * @example
 * try {
 *   const workItem = await loadAndValidateWorkItem('S0010');
 *   // Work item is guaranteed to be valid here
 * } catch (error) {
 *   if (error instanceof WorkItemValidationError) {
 *     console.error('Validation failed:', error.validationErrors);
 *   }
 * }
 */
async function loadAndValidateWorkItem(id, cascadeDir = '.cascade') {
  // Load the work item (may throw WorkItemNotFoundError or WorkItemDeletedError)
  const workItem = await loadWorkItem(id, cascadeDir);

  // Validate the work item
  const validation = validateWorkItem(workItem);

  if (!validation.valid) {
    throw new WorkItemValidationError(id, validation.errors);
  }

  return workItem;
}

/**
 * EXECUTION STATE MANAGEMENT
 */

/**
 * Initialize execution state for a work item
 *
 * Creates a new execution state object with all required fields.
 * This should be called at the start of work item execution.
 *
 * @param {string} id - Work item ID
 * @param {Object} options - Execution options
 * @param {string} options.sessionId - Session ID for correlation
 * @param {Object} options.context - Additional execution context
 * @returns {Object} Initialized execution state
 *
 * @example
 * const state = initializeExecution('S0010', {
 *   sessionId: 'session-123',
 *   context: { triggeredBy: 'user' }
 * });
 */
function initializeExecution(id, options = {}) {
  const now = new Date().toISOString();

  return {
    workItemId: id,
    sessionId: options.sessionId || null,
    status: 'pending',
    phase: LifecyclePhase.INITIALIZED, // Current lifecycle phase
    startedAt: now,
    updatedAt: now,
    completedAt: null,
    progress: 0,
    context: options.context || {},
    history: [
      {
        timestamp: now,
        event: 'initialized',
        phase: LifecyclePhase.INITIALIZED,
        status: 'pending',
        message: 'Execution state initialized'
      }
    ],
    errors: [],
    retryCount: 0,
    rollbackData: null // Stores data needed for rollback
  };
}

/**
 * Update execution status with state transition
 *
 * Updates the execution state with a new status and logs the transition.
 * Valid transitions: pending → in_progress → completed/failed/blocked
 *
 * @param {Object} executionState - Current execution state
 * @param {string} newStatus - New status (in_progress, completed, failed, blocked)
 * @param {Object} options - Update options
 * @param {string} options.message - Optional message describing the transition
 * @param {Error} options.error - Optional error if transition is due to failure
 * @returns {Object} Updated execution state
 *
 * @example
 * const updated = updateExecutionStatus(state, 'in_progress', {
 *   message: 'Starting execution'
 * });
 */
function updateExecutionStatus(executionState, newStatus, options = {}) {
  const now = new Date().toISOString();
  const validStatuses = ['pending', 'in_progress', 'completed', 'failed', 'blocked'];

  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}. Must be one of: ${validStatuses.join(', ')}`);
  }

  // Create history entry
  const historyEntry = {
    timestamp: now,
    event: 'status_changed',
    previousStatus: executionState.status,
    status: newStatus,
    message: options.message || `Status changed to ${newStatus}`
  };

  // If error provided, add to errors array
  if (options.error) {
    const errorEntry = {
      timestamp: now,
      message: options.error.message,
      stack: options.error.stack,
      type: options.error.name
    };
    executionState.errors.push(errorEntry);
    historyEntry.error = errorEntry;
  }

  // Update state
  executionState.status = newStatus;
  executionState.updatedAt = now;
  executionState.history.push(historyEntry);

  // Set completion timestamp if completed/failed
  if (['completed', 'failed'].includes(newStatus)) {
    executionState.completedAt = now;
    executionState.progress = newStatus === 'completed' ? 100 : executionState.progress;
  }

  return executionState;
}

/**
 * Synchronize execution state back to Cascade state.json
 *
 * Updates the work item's state.json and markdown frontmatter with execution status.
 * This ensures Cascade files reflect the current execution state.
 *
 * @param {Object} executionState - Current execution state
 * @param {string} cascadeDir - Path to .cascade directory (default: '.cascade')
 * @returns {Promise<boolean>} Success indicator
 *
 * @example
 * await syncToCascade(executionState);
 */
async function syncToCascade(executionState, cascadeDir = '.cascade') {
  try {
    const manager = new CascadeManager(cascadeDir);
    const { workItemId, status } = executionState;

    // Map execution status to Cascade status
    const cascadeStatusMap = {
      'pending': 'planned',
      'in_progress': 'in-progress', // Cascade uses hyphenated status
      'completed': 'completed',
      'failed': 'failed',
      'blocked': 'blocked'
    };

    const cascadeStatus = cascadeStatusMap[status] || status;

    // Update work item status in Cascade
    await manager.updateStatus(workItemId, cascadeStatus);

    return true;
  } catch (error) {
    throw new Error(`Failed to sync to Cascade: ${error.message}`);
  }
}

/**
 * Add entry to execution history
 *
 * Adds a custom event to the execution history for tracking.
 *
 * @param {Object} executionState - Current execution state
 * @param {string} event - Event name
 * @param {Object} data - Event data
 * @returns {Object} Updated execution state
 *
 * @example
 * addExecutionHistory(state, 'dependency_resolved', {
 *   dependency: 'T0013',
 *   result: 'success'
 * });
 */
function addExecutionHistory(executionState, event, data = {}) {
  const historyEntry = {
    timestamp: new Date().toISOString(),
    event,
    ...data
  };

  executionState.history.push(historyEntry);
  executionState.updatedAt = historyEntry.timestamp;

  return executionState;
}

/**
 * Resume execution from saved state
 *
 * Loads and validates a previously saved execution state,
 * allowing execution to resume after interruption.
 *
 * @param {Object} savedState - Previously saved execution state
 * @returns {Object} Validated execution state ready for resumption
 *
 * @example
 * const state = resumeExecution(savedState);
 * // Continue execution from where it left off
 */
function resumeExecution(savedState) {
  // Validate saved state structure
  const requiredFields = ['workItemId', 'status', 'startedAt', 'history'];
  for (const field of requiredFields) {
    if (!savedState[field]) {
      throw new Error(`Invalid saved state: missing required field '${field}'`);
    }
  }

  // Add resumption event to history
  const now = new Date().toISOString();
  savedState.history.push({
    timestamp: now,
    event: 'execution_resumed',
    previousStatus: savedState.status,
    message: 'Execution resumed from saved state'
  });

  savedState.updatedAt = now;

  // If was in_progress, it's still in_progress
  // If was pending, move to pending (could have been interrupted before starting)
  // If completed/failed, keep as is

  return savedState;
}

/**
 * LIFECYCLE PHASE EXECUTION
 */

/**
 * Transition execution state to a new lifecycle phase
 *
 * Validates the transition, updates the phase, and logs the change.
 * Throws error if transition is invalid.
 *
 * @param {Object} executionState - Current execution state
 * @param {string} newPhase - Target lifecycle phase
 * @param {Object} options - Transition options
 * @param {string} options.message - Optional message describing the transition
 * @param {Object} options.data - Optional data to store with the transition
 * @returns {Object} Updated execution state
 *
 * @example
 * const state = initializeExecution('S0010');
 * transitionPhase(state, LifecyclePhase.VALIDATING, {
 *   message: 'Starting validation'
 * });
 */
function transitionPhase(executionState, newPhase, options = {}) {
  const currentPhase = executionState.phase;

  // Validate transition
  if (!isValidTransition(currentPhase, newPhase)) {
    const validPhases = getValidNextPhases(currentPhase);
    throw new Error(
      `Invalid phase transition from ${currentPhase} to ${newPhase}. ` +
      `Valid transitions: ${validPhases.join(', ') || 'none (terminal state)'}`
    );
  }

  const now = new Date().toISOString();

  // Create history entry
  const historyEntry = {
    timestamp: now,
    event: 'phase_transition',
    previousPhase: currentPhase,
    phase: newPhase,
    message: options.message || `Transitioned from ${currentPhase} to ${newPhase}`
  };

  if (options.data) {
    historyEntry.data = options.data;
  }

  // Update state
  executionState.phase = newPhase;
  executionState.updatedAt = now;
  executionState.history.push(historyEntry);

  // Update status based on phase
  if (newPhase === LifecyclePhase.COMPLETED) {
    executionState.status = 'completed';
    executionState.completedAt = now;
    executionState.progress = 100;
  } else if (newPhase === LifecyclePhase.FAILED || newPhase === LifecyclePhase.ROLLED_BACK) {
    executionState.status = 'failed';
    if (!executionState.completedAt) {
      executionState.completedAt = now;
    }
  } else if (newPhase === LifecyclePhase.EXECUTING || newPhase === LifecyclePhase.MONITORING) {
    executionState.status = 'in_progress';
  }

  return executionState;
}

/**
 * Execute a lifecycle phase with automatic transition handling
 *
 * Executes a phase function and automatically transitions to the next phase
 * based on the result. Handles errors and transitions to FAILED phase.
 *
 * @param {Object} executionState - Current execution state
 * @param {string} targetPhase - Phase to execute
 * @param {Function} phaseFunction - Async function to execute for this phase
 * @returns {Promise<Object>} Updated execution state
 *
 * @example
 * await executePhase(state, LifecyclePhase.VALIDATING, async (state) => {
 *   // Validation logic here
 *   return { valid: true };
 * });
 */
async function executePhase(executionState, targetPhase, phaseFunction) {
  try {
    // Transition to target phase
    transitionPhase(executionState, targetPhase, {
      message: `Entering ${targetPhase} phase`
    });

    // Execute phase function
    const result = await phaseFunction(executionState);

    // Store result in state if provided
    if (result) {
      executionState.phaseResults = executionState.phaseResults || {};
      executionState.phaseResults[targetPhase] = result;
    }

    return executionState;
  } catch (error) {
    // Transition to FAILED on error
    const errorEntry = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      type: error.name,
      phase: targetPhase
    };

    executionState.errors.push(errorEntry);

    // Try to transition to FAILED (if not already in a terminal state)
    if (executionState.phase !== LifecyclePhase.COMPLETED &&
        executionState.phase !== LifecyclePhase.FAILED &&
        executionState.phase !== LifecyclePhase.ROLLED_BACK) {
      try {
        transitionPhase(executionState, LifecyclePhase.FAILED, {
          message: `Failed during ${targetPhase}: ${error.message}`,
          data: { error: errorEntry }
        });
      } catch (transitionError) {
        // If we can't transition to FAILED, force it
        executionState.phase = LifecyclePhase.FAILED;
        executionState.status = 'failed';
        executionState.completedAt = new Date().toISOString();
      }
    }

    throw error;
  }
}

/**
 * Get current lifecycle phase info
 *
 * Returns information about the current phase including valid next phases.
 *
 * @param {Object} executionState - Current execution state
 * @returns {Object} Phase information
 *
 * @example
 * const info = getCurrentPhaseInfo(state);
 * console.log(info.currentPhase); // 'validating'
 * console.log(info.validNextPhases); // ['loading_context', 'failed']
 */
function getCurrentPhaseInfo(executionState) {
  const currentPhase = executionState.phase;
  const validNextPhases = getValidNextPhases(currentPhase);
  const isTerminal = validNextPhases.length === 0;

  return {
    currentPhase,
    validNextPhases,
    isTerminal,
    canTransitionTo: (phase) => isValidTransition(currentPhase, phase)
  };
}

/**
 * LIFECYCLE HOOKS SYSTEM
 */

/**
 * Hook registry for lifecycle events
 * Stores registered hooks for each hook point
 */
const lifecycleHooks = {
  'before:phase': [],
  'after:phase': [],
  'on:error': [],
  'on:complete': []
};

/**
 * Register a lifecycle hook
 *
 * Hooks allow plugins and extensions to inject custom behavior at key lifecycle points.
 *
 * @param {string} hookPoint - Hook point ('before:phase', 'after:phase', 'on:error', 'on:complete')
 * @param {Function} hookFunction - Async function to execute at hook point
 * @param {Object} options - Hook options
 * @param {string} options.name - Optional name for the hook
 * @param {string} options.phase - Optional specific phase to hook into
 *
 * @example
 * registerLifecycleHook('before:phase', async (context) => {
 *   console.log(`About to enter ${context.targetPhase}`);
 * }, { name: 'logger', phase: 'executing' });
 */
function registerLifecycleHook(hookPoint, hookFunction, options = {}) {
  if (!lifecycleHooks[hookPoint]) {
    throw new Error(`Invalid hook point: ${hookPoint}. Valid points: ${Object.keys(lifecycleHooks).join(', ')}`);
  }

  const hook = {
    fn: hookFunction,
    name: options.name || 'anonymous',
    phase: options.phase || null // null means hook applies to all phases
  };

  lifecycleHooks[hookPoint].push(hook);

  return () => {
    // Return unregister function
    const index = lifecycleHooks[hookPoint].indexOf(hook);
    if (index > -1) {
      lifecycleHooks[hookPoint].splice(index, 1);
    }
  };
}

/**
 * Execute hooks for a specific hook point
 *
 * @param {string} hookPoint - Hook point to execute
 * @param {Object} context - Context to pass to hooks
 * @returns {Promise<Object>} Modified context
 */
async function executeHooks(hookPoint, context) {
  const hooks = lifecycleHooks[hookPoint] || [];
  let modifiedContext = { ...context };

  for (const hook of hooks) {
    // Skip if hook is phase-specific and doesn't match
    if (hook.phase && hook.phase !== context.targetPhase && hook.phase !== context.currentPhase) {
      continue;
    }

    try {
      const result = await hook.fn(modifiedContext);

      // Allow hooks to modify context
      if (result && typeof result === 'object') {
        modifiedContext = { ...modifiedContext, ...result };
      }
    } catch (error) {
      // Log hook error but don't fail execution
      console.error(`Hook ${hook.name} at ${hookPoint} failed:`, error);

      // Add to errors if context has executionState
      if (modifiedContext.executionState) {
        modifiedContext.executionState.errors.push({
          timestamp: new Date().toISOString(),
          message: `Hook ${hook.name} failed: ${error.message}`,
          type: 'HookError',
          hook: hook.name,
          hookPoint
        });
      }
    }
  }

  return modifiedContext;
}

/**
 * Clear all registered hooks
 *
 * Useful for testing or resetting the hook system.
 */
function clearLifecycleHooks() {
  lifecycleHooks['before:phase'] = [];
  lifecycleHooks['after:phase'] = [];
  lifecycleHooks['on:error'] = [];
  lifecycleHooks['on:complete'] = [];
}

/**
 * Enhanced phase transition with hooks
 *
 * Extends transitionPhase to execute before/after hooks.
 *
 * @param {Object} executionState - Current execution state
 * @param {string} newPhase - Target lifecycle phase
 * @param {Object} options - Transition options
 * @returns {Promise<Object>} Updated execution state
 */
async function transitionPhaseWithHooks(executionState, newPhase, options = {}) {
  // Execute before:phase hooks
  const beforeContext = await executeHooks('before:phase', {
    executionState,
    currentPhase: executionState.phase,
    targetPhase: newPhase,
    options
  });

  // Apply any modifications from hooks
  if (beforeContext.options) {
    options = { ...options, ...beforeContext.options };
  }

  // Perform the actual transition
  const updatedState = transitionPhase(executionState, newPhase, options);

  // Execute after:phase hooks
  await executeHooks('after:phase', {
    executionState: updatedState,
    previousPhase: beforeContext.currentPhase,
    currentPhase: newPhase,
    options
  });

  return updatedState;
}

/**
 * Enhanced phase execution with hooks
 *
 * Extends executePhase to execute hooks and handle errors with on:error hooks.
 *
 * @param {Object} executionState - Current execution state
 * @param {string} targetPhase - Phase to execute
 * @param {Function} phaseFunction - Async function to execute for this phase
 * @returns {Promise<Object>} Updated execution state
 */
async function executePhaseWithHooks(executionState, targetPhase, phaseFunction) {
  try {
    // Use transitionPhaseWithHooks for the transition
    await transitionPhaseWithHooks(executionState, targetPhase, {
      message: `Entering ${targetPhase} phase`
    });

    // Execute phase function
    const result = await phaseFunction(executionState);

    // Store result in state if provided
    if (result) {
      executionState.phaseResults = executionState.phaseResults || {};
      executionState.phaseResults[targetPhase] = result;
    }

    // Execute on:complete hooks if this is a terminal phase
    if (targetPhase === LifecyclePhase.COMPLETED) {
      await executeHooks('on:complete', {
        executionState,
        result
      });
    }

    return executionState;
  } catch (error) {
    // Execute on:error hooks
    await executeHooks('on:error', {
      executionState,
      error,
      phase: targetPhase
    });

    // Transition to FAILED on error (same logic as executePhase)
    const errorEntry = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      type: error.name,
      phase: targetPhase
    };

    executionState.errors.push(errorEntry);

    if (executionState.phase !== LifecyclePhase.COMPLETED &&
        executionState.phase !== LifecyclePhase.FAILED &&
        executionState.phase !== LifecyclePhase.ROLLED_BACK) {
      try {
        await transitionPhaseWithHooks(executionState, LifecyclePhase.FAILED, {
          message: `Failed during ${targetPhase}: ${error.message}`,
          data: { error: errorEntry }
        });
      } catch (transitionError) {
        executionState.phase = LifecyclePhase.FAILED;
        executionState.status = 'failed';
        executionState.completedAt = new Date().toISOString();
      }
    }

    throw error;
  }
}

/**
 * ROLLBACK MECHANISM
 */

/**
 * Record a reversible operation for potential rollback
 *
 * Tracks operations that can be undone if execution fails.
 * Stores compensation logic to reverse the operation.
 *
 * @param {Object} executionState - Current execution state
 * @param {string} operationName - Name of the operation
 * @param {Function} compensationFn - Async function to undo the operation
 * @param {Object} metadata - Optional metadata about the operation
 *
 * @example
 * recordRollbackOperation(state, 'update_status', async () => {
 *   await manager.updateStatus(workItemId, previousStatus);
 * }, { previousStatus: 'planned' });
 */
function recordRollbackOperation(executionState, operationName, compensationFn, metadata = {}) {
  if (!executionState.rollbackData) {
    executionState.rollbackData = {
      operations: [],
      canRollback: true
    };
  }

  executionState.rollbackData.operations.push({
    name: operationName,
    compensate: compensationFn,
    timestamp: new Date().toISOString(),
    metadata
  });

  return executionState;
}

/**
 * Execute rollback of recorded operations
 *
 * Attempts to undo all recorded operations in reverse order (LIFO).
 * Transitions to ROLLING_BACK phase, then ROLLED_BACK on success or stays FAILED on error.
 *
 * @param {Object} executionState - Current execution state
 * @param {Object} options - Rollback options
 * @param {boolean} options.continueOnError - Continue rollback even if operation fails
 * @returns {Promise<Object>} Updated execution state
 *
 * @example
 * await executeRollback(state, { continueOnError: true });
 */
async function executeRollback(executionState, options = {}) {
  const { continueOnError = false } = options;

  // Check if rollback is possible
  if (!executionState.rollbackData || !executionState.rollbackData.canRollback) {
    throw new Error('Cannot rollback: no rollback data available or rollback not enabled');
  }

  if (executionState.phase !== LifecyclePhase.FAILED) {
    throw new Error(`Cannot rollback from phase ${executionState.phase}. Must be in FAILED phase.`);
  }

  // Transition to ROLLING_BACK
  await transitionPhaseWithHooks(executionState, LifecyclePhase.ROLLING_BACK, {
    message: 'Starting rollback of failed execution'
  });

  const operations = executionState.rollbackData.operations;
  const rollbackResults = [];
  let rollbackFailed = false;

  // Execute compensation functions in reverse order (LIFO)
  for (let i = operations.length - 1; i >= 0; i--) {
    const operation = operations[i];

    try {
      await operation.compensate();

      rollbackResults.push({
        operation: operation.name,
        status: 'success',
        timestamp: new Date().toISOString()
      });

      // Log successful rollback
      addExecutionHistory(executionState, 'rollback_operation_success', {
        operation: operation.name,
        metadata: operation.metadata
      });
    } catch (error) {
      rollbackResults.push({
        operation: operation.name,
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });

      // Log failed rollback
      addExecutionHistory(executionState, 'rollback_operation_failed', {
        operation: operation.name,
        error: error.message,
        metadata: operation.metadata
      });

      executionState.errors.push({
        timestamp: new Date().toISOString(),
        message: `Rollback operation ${operation.name} failed: ${error.message}`,
        type: 'RollbackError',
        operation: operation.name
      });

      rollbackFailed = true;

      if (!continueOnError) {
        // Stop rollback on first error
        break;
      }
    }
  }

  // Store rollback results
  executionState.rollbackData.results = rollbackResults;
  executionState.rollbackData.completedAt = new Date().toISOString();

  // Transition to appropriate final state
  if (rollbackFailed && !continueOnError) {
    // Rollback failed - stay in FAILED state
    transitionPhase(executionState, LifecyclePhase.FAILED, {
      message: 'Rollback failed - execution remains in failed state'
    });
  } else {
    // Rollback succeeded (or completed with errors in continueOnError mode)
    await transitionPhaseWithHooks(executionState, LifecyclePhase.ROLLED_BACK, {
      message: rollbackFailed
        ? 'Rollback completed with errors'
        : 'Rollback completed successfully'
    });
  }

  return executionState;
}

/**
 * Disable rollback for current execution
 *
 * Prevents rollback from being executed. Useful when operations are not reversible.
 *
 * @param {Object} executionState - Current execution state
 * @param {string} reason - Reason for disabling rollback
 */
function disableRollback(executionState, reason) {
  if (!executionState.rollbackData) {
    executionState.rollbackData = {
      operations: [],
      canRollback: false
    };
  }

  executionState.rollbackData.canRollback = false;
  executionState.rollbackData.disabledReason = reason;

  addExecutionHistory(executionState, 'rollback_disabled', { reason });

  return executionState;
}

/**
 * Check if rollback is available
 *
 * @param {Object} executionState - Current execution state
 * @returns {Object} Rollback availability info
 */
function canRollback(executionState) {
  if (!executionState.rollbackData) {
    return {
      canRollback: false,
      reason: 'No rollback data recorded'
    };
  }

  if (!executionState.rollbackData.canRollback) {
    return {
      canRollback: false,
      reason: executionState.rollbackData.disabledReason || 'Rollback explicitly disabled'
    };
  }

  if (executionState.phase !== LifecyclePhase.FAILED) {
    return {
      canRollback: false,
      reason: `Cannot rollback from phase ${executionState.phase}`
    };
  }

  return {
    canRollback: true,
    operationCount: executionState.rollbackData.operations.length
  };
}

module.exports = {
  // Core functions
  loadWorkItem,
  validateWorkItem,
  loadExecutionContext,
  loadAndValidateWorkItem,

  // Execution state management
  initializeExecution,
  updateExecutionStatus,
  syncToCascade,
  addExecutionHistory,
  resumeExecution,

  // Lifecycle phase management
  LifecyclePhase,
  isValidTransition,
  getValidNextPhases,
  transitionPhase,
  executePhase,
  getCurrentPhaseInfo,

  // Lifecycle hooks
  registerLifecycleHook,
  clearLifecycleHooks,
  transitionPhaseWithHooks,
  executePhaseWithHooks,

  // Rollback mechanism
  recordRollbackOperation,
  executeRollback,
  disableRollback,
  canRollback,

  // Error types
  WorkItemNotFoundError,
  WorkItemValidationError,
  WorkItemDeletedError
};
