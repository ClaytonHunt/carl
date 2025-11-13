/**
 * Dynamic Dependency Manager
 *
 * Manages runtime dependency updates and maintains graph consistency.
 * Supports incremental updates, status tracking, and cycle prevention.
 *
 * Based on IndyDevDan's principles:
 * - Event-driven state updates
 * - Defensive validation
 * - Observable by default
 */

const { CycleDetector } = require('./cycle-detector');
const { TopologicalSorter } = require('./topological-sorter');
const { ParallelExecutionAnalyzer } = require('./parallel-execution-analyzer');
const { IncrementalTopologicalSorter } = require('./incremental-topological-sorter');

/**
 * Work item status
 */
const WorkItemStatus = {
  PLANNED: 'planned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  BLOCKED: 'blocked',
  FAILED: 'failed'
};

/**
 * Update event
 * @typedef {Object} UpdateEvent
 * @property {string} type - Event type
 * @property {string} nodeId - Affected node ID
 * @property {Object} data - Event data
 */

class DynamicDependencyManager {
  /**
   * @param {DependencyGraph} graph - The dependency graph to manage
   */
  constructor(graph, options = {}) {
    this.graph = graph;
    this.statusMap = new Map(); // nodeId -> status
    this.eventHandlers = new Map(); // eventType -> Set of handlers
    this.completedItems = new Set();
    this.inProgressItems = new Set();

    // Incremental topological sorter (optional optimization)
    this.useIncrementalSort = options.useIncrementalSort !== false; // default true
    this.incrementalSorter = this.useIncrementalSort
      ? new IncrementalTopologicalSorter(graph)
      : null;
  }

  /**
   * Add a new work item to the graph
   * @param {string} id - Work item ID
   * @param {Object} metadata - Work item metadata
   * @returns {boolean} True if added successfully
   */
  addWorkItem(id, metadata = {}) {
    if (this.graph.hasNode(id)) {
      return false;
    }

    this.graph.addNode(id, metadata);
    this.statusMap.set(id, metadata.status || WorkItemStatus.PLANNED);

    // Update incremental sorter
    if (this.incrementalSorter) {
      this.incrementalSorter.addNode(id);
    }

    this._emit('workitem:added', { nodeId: id, metadata });

    return true;
  }

  /**
   * Remove a work item from the graph
   * @param {string} id - Work item ID
   * @returns {boolean} True if removed successfully
   */
  removeWorkItem(id) {
    if (!this.graph.hasNode(id)) {
      return false;
    }

    // Get dependents before removal for notification
    const dependents = this.graph.getDependents(id);

    this.graph.removeNode(id);
    this.statusMap.delete(id);
    this.completedItems.delete(id);
    this.inProgressItems.delete(id);

    // Update incremental sorter
    if (this.incrementalSorter) {
      this.incrementalSorter.removeNode(id);
    }

    this._emit('workitem:removed', { nodeId: id, affectedDependents: dependents });

    return true;
  }

  /**
   * Add a dependency between work items
   * @param {string} fromId - Dependent item ID
   * @param {string} toId - Dependency item ID
   * @param {Object} metadata - Edge metadata
   * @returns {Object} { success: boolean, error?: string }
   */
  addDependency(fromId, toId, metadata = {}) {
    // Validate nodes exist
    if (!this.graph.hasNode(fromId)) {
      return { success: false, error: `Node ${fromId} does not exist` };
    }
    if (!this.graph.hasNode(toId)) {
      return { success: false, error: `Node ${toId} does not exist` };
    }

    // Check if adding edge would create cycle (incremental check)
    const cycleDetector = new CycleDetector(this.graph);
    if (cycleDetector.wouldCreateCycle(fromId, toId)) {
      return { success: false, error: `Adding dependency would create a cycle: ${fromId} -> ${toId}` };
    }

    this.graph.addEdge(fromId, toId, metadata);

    // Update incremental sorter
    if (this.incrementalSorter) {
      this.incrementalSorter.addEdge(fromId, toId);
    }

    this._emit('dependency:added', { from: fromId, to: toId, metadata });

    return { success: true };
  }

  /**
   * Remove a dependency between work items
   * @param {string} fromId - Dependent item ID
   * @param {string} toId - Dependency item ID
   * @returns {boolean} True if removed successfully
   */
  removeDependency(fromId, toId) {
    const removed = this.graph.removeEdge(fromId, toId);

    if (removed) {
      // Update incremental sorter
      if (this.incrementalSorter) {
        this.incrementalSorter.removeEdge(fromId, toId);
      }

      this._emit('dependency:removed', { from: fromId, to: toId });
    }

    return removed;
  }

  /**
   * Update work item status
   * @param {string} id - Work item ID
   * @param {string} newStatus - New status
   * @returns {boolean} True if updated successfully
   */
  updateStatus(id, newStatus) {
    if (!this.graph.hasNode(id)) {
      return false;
    }

    const oldStatus = this.statusMap.get(id);

    // Update status tracking
    this.statusMap.set(id, newStatus);
    this.graph.updateNode(id, { status: newStatus });

    // Update status sets
    if (newStatus === WorkItemStatus.COMPLETED) {
      this.completedItems.add(id);
      this.inProgressItems.delete(id);
    } else if (newStatus === WorkItemStatus.IN_PROGRESS) {
      this.inProgressItems.add(id);
      this.completedItems.delete(id);
    } else {
      this.completedItems.delete(id);
      this.inProgressItems.delete(id);
    }

    this._emit('status:changed', {
      nodeId: id,
      oldStatus,
      newStatus,
      unlockedItems: newStatus === WorkItemStatus.COMPLETED
        ? this._getUnlockedItems(id)
        : []
    });

    return true;
  }

  /**
   * Get items unlocked by completing a work item
   * @private
   */
  _getUnlockedItems(completedId) {
    const analyzer = new ParallelExecutionAnalyzer(this.graph);
    const dependents = this.graph.getDependents(completedId);
    const unlocked = [];

    for (const depId of dependents) {
      // Skip if already completed or in progress
      if (this.completedItems.has(depId) || this.inProgressItems.has(depId)) {
        continue;
      }

      // Check if all dependencies are completed
      const dependencies = this.graph.getDependencies(depId);
      const allCompleted = dependencies.every(id => this.completedItems.has(id));

      if (allCompleted) {
        unlocked.push(depId);
      }
    }

    return unlocked;
  }

  /**
   * Get next available work items (ready to execute)
   * @returns {string[]}
   */
  getAvailableWork() {
    const analyzer = new ParallelExecutionAnalyzer(this.graph);
    return analyzer.getNextReadyItems(
      Array.from(this.completedItems),
      Array.from(this.inProgressItems)
    );
  }

  /**
   * Get current execution plan
   * @param {Object} options - Plan options
   * @returns {ExecutionPlan}
   */
  getExecutionPlan(options = {}) {
    const analyzer = new ParallelExecutionAnalyzer(this.graph);
    return analyzer.analyze(options);
  }

  /**
   * Get current topological order
   * @param {Object} options - Sort options
   * @returns {TopologicalSortResult}
   */
  getExecutionOrder(options = {}) {
    // Use incremental sorter if available and no special options
    if (this.incrementalSorter && Object.keys(options).length === 0) {
      const order = this.incrementalSorter.getOrder();
      return {
        order,
        success: true,
        algorithm: 'incremental'
      };
    }

    // Fall back to full sort
    const sorter = new TopologicalSorter(this.graph);
    return sorter.sort(options);
  }

  /**
   * Validate graph consistency
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validate() {
    const errors = [];

    // Check for cycles
    const cycleDetector = new CycleDetector(this.graph);
    if (!cycleDetector.isAcyclic()) {
      const cycles = cycleDetector.getAllCycles();
      cycles.forEach(cycle => {
        errors.push(cycle.message);
      });
    }

    // Check for orphaned edges
    for (const edge of this.graph.getAllEdges()) {
      if (!this.graph.hasNode(edge.from)) {
        errors.push(`Edge references non-existent source: ${edge.from}`);
      }
      if (!this.graph.hasNode(edge.to)) {
        errors.push(`Edge references non-existent target: ${edge.to}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Register event handler
   * @param {string} eventType - Event type
   * @param {Function} handler - Event handler
   */
  on(eventType, handler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType).add(handler);
  }

  /**
   * Unregister event handler
   * @param {string} eventType - Event type
   * @param {Function} handler - Event handler
   */
  off(eventType, handler) {
    if (this.eventHandlers.has(eventType)) {
      this.eventHandlers.get(eventType).delete(handler);
    }
  }

  /**
   * Emit event
   * @private
   */
  _emit(eventType, data) {
    if (this.eventHandlers.has(eventType)) {
      for (const handler of this.eventHandlers.get(eventType)) {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${eventType}:`, error);
        }
      }
    }
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    return {
      totalItems: this.graph.size().nodes,
      totalDependencies: this.graph.size().edges,
      completed: this.completedItems.size,
      inProgress: this.inProgressItems.size,
      pending: this.graph.size().nodes - this.completedItems.size - this.inProgressItems.size
    };
  }

  /**
   * Reset all status tracking
   */
  resetStatus() {
    this.completedItems.clear();
    this.inProgressItems.clear();

    for (const node of this.graph.getAllNodes()) {
      this.statusMap.set(node.id, WorkItemStatus.PLANNED);
      this.graph.updateNode(node.id, { status: WorkItemStatus.PLANNED });
    }

    this._emit('status:reset', {});
  }
}

module.exports = {
  DynamicDependencyManager,
  WorkItemStatus
};
