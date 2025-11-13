/**
 * Incremental Topological Sorter
 *
 * Maintains topological order and updates incrementally when graph changes.
 * More efficient than full re-sort for graphs with frequent small updates.
 *
 * Based on IndyDevDan's principles:
 * - Optimize for common case (small changes)
 * - Maintain consistency
 * - Observable by default
 */

const { TopologicalSorter } = require('./topological-sorter');
const { CycleDetector } = require('./cycle-detector');

class IncrementalTopologicalSorter {
  /**
   * @param {DependencyGraph} graph - The dependency graph
   */
  constructor(graph) {
    this.graph = graph;
    this.order = [];
    this.position = new Map(); // nodeId -> position in order
    this.initialized = false;
  }

  /**
   * Initialize or refresh the topological order
   * @param {Object} options - Sort options
   * @returns {TopologicalSortResult}
   */
  initialize(options = {}) {
    const sorter = new TopologicalSorter(this.graph);
    const result = sorter.sort(options);

    if (result.success) {
      this.order = result.order;
      this._updatePositions();
      this.initialized = true;
    }

    return result;
  }

  /**
   * Update positions map
   * @private
   */
  _updatePositions() {
    this.position.clear();
    this.order.forEach((nodeId, index) => {
      this.position.set(nodeId, index);
    });
  }

  /**
   * Get current topological order
   * @returns {string[]}
   */
  getOrder() {
    if (!this.initialized) {
      this.initialize();
    }
    return [...this.order];
  }

  /**
   * Add a new node to the ordering
   * @param {string} nodeId - Node ID to add
   * @returns {boolean} True if added successfully
   */
  addNode(nodeId) {
    if (this.position.has(nodeId)) {
      return false;
    }

    if (!this.initialized) {
      this.initialize();
      return true;
    }

    // Get dependencies of new node
    const dependencies = this.graph.getDependencies(nodeId);

    if (dependencies.length === 0) {
      // No dependencies - can go at the beginning
      this.order.unshift(nodeId);
      this._updatePositions();
      return true;
    }

    // Find the position after all dependencies
    let maxDepPosition = -1;
    for (const depId of dependencies) {
      const depPos = this.position.get(depId);
      if (depPos !== undefined && depPos > maxDepPosition) {
        maxDepPosition = depPos;
      }
    }

    // Insert after the last dependency
    const insertPos = maxDepPosition + 1;
    this.order.splice(insertPos, 0, nodeId);
    this._updatePositions();

    return true;
  }

  /**
   * Remove a node from the ordering
   * @param {string} nodeId - Node ID to remove
   * @returns {boolean} True if removed successfully
   */
  removeNode(nodeId) {
    const pos = this.position.get(nodeId);
    if (pos === undefined) {
      return false;
    }

    this.order.splice(pos, 1);
    this._updatePositions();

    return true;
  }

  /**
   * Handle adding an edge (dependency)
   * @param {string} fromId - Dependent node
   * @param {string} toId - Dependency node
   * @returns {boolean} True if order updated successfully
   */
  addEdge(fromId, toId) {
    if (!this.initialized) {
      this.initialize();
      return true;
    }

    // Check if this would violate topological order
    const fromPos = this.position.get(fromId);
    const toPos = this.position.get(toId);

    if (fromPos === undefined || toPos === undefined) {
      // One or both nodes not in order - re-initialize
      this.initialize();
      return true;
    }

    // If toId is already before fromId, order is fine
    if (toPos < fromPos) {
      return true;
    }

    // Need to move fromId (and its dependents) after toId
    this._moveNodeAfterDependency(fromId, toId);

    return true;
  }

  /**
   * Move a node to appear after its dependency
   * @private
   */
  _moveNodeAfterDependency(nodeId, depId) {
    const nodePos = this.position.get(nodeId);
    const depPos = this.position.get(depId);

    if (nodePos === undefined || depPos === undefined) {
      return;
    }

    // If already in correct order, nothing to do
    if (depPos < nodePos) {
      return;
    }

    // Need to move nodeId and all its dependents to after depId

    // Collect all nodes that depend on nodeId (directly or transitively)
    const toMove = this._collectDependents(nodeId);
    toMove.add(nodeId);

    // Remove these nodes from current order
    const movedNodes = [];
    this.order = this.order.filter(id => {
      if (toMove.has(id)) {
        movedNodes.push(id);
        return false;
      }
      return true;
    });

    // Find new insertion point (after depId's new position)
    this._updatePositions();
    const newDepPos = this.position.get(depId);

    // Sort movedNodes to maintain their relative order
    movedNodes.sort((a, b) => {
      const posA = this.position.get(a) ?? Infinity;
      const posB = this.position.get(b) ?? Infinity;
      return posA - posB;
    });

    // Insert after dependency
    this.order.splice(newDepPos + 1, 0, ...movedNodes);
    this._updatePositions();
  }

  /**
   * Collect all dependents of a node (transitive)
   * @private
   */
  _collectDependents(nodeId) {
    const dependents = new Set();
    const visited = new Set();
    const queue = [nodeId];

    while (queue.length > 0) {
      const current = queue.shift();

      if (visited.has(current)) {
        continue;
      }
      visited.add(current);

      const directDependents = this.graph.getDependents(current);
      for (const dep of directDependents) {
        if (!dependents.has(dep) && dep !== nodeId) {
          dependents.add(dep);
          queue.push(dep);
        }
      }
    }

    return dependents;
  }

  /**
   * Handle removing an edge (dependency)
   * @param {string} fromId - Dependent node
   * @param {string} toId - Dependency node
   * @returns {boolean} True if order updated successfully
   */
  removeEdge(fromId, toId) {
    if (!this.initialized) {
      this.initialize();
      return true;
    }

    // Removing an edge might allow nodes to move earlier
    // For now, keep the order (it's still valid, just not optimal)
    // A full optimization would try to move nodes earlier if possible

    // Optional: Try to move fromId earlier if all its dependencies allow
    this._tryMoveEarlier(fromId);

    return true;
  }

  /**
   * Try to move a node earlier in the order if dependencies allow
   * @private
   */
  _tryMoveEarlier(nodeId) {
    const currentPos = this.position.get(nodeId);
    if (currentPos === undefined || currentPos === 0) {
      return;
    }

    const dependencies = this.graph.getDependencies(nodeId);
    if (dependencies.length === 0) {
      return; // Could move to start, but skip optimization for now
    }

    // Find earliest position allowed by dependencies
    let maxDepPosition = -1;
    for (const depId of dependencies) {
      const depPos = this.position.get(depId);
      if (depPos !== undefined && depPos > maxDepPosition) {
        maxDepPosition = depPos;
      }
    }

    const earliestPos = maxDepPosition + 1;

    if (earliestPos < currentPos) {
      // Can move earlier
      const node = this.order.splice(currentPos, 1)[0];
      this.order.splice(earliestPos, 0, node);
      this._updatePositions();
    }
  }

  /**
   * Validate current order is still topologically valid
   * @returns {boolean}
   */
  isValid() {
    if (!this.initialized) {
      return false;
    }

    // Check that all dependencies come before their dependents
    for (let i = 0; i < this.order.length; i++) {
      const nodeId = this.order[i];
      const dependencies = this.graph.getDependencies(nodeId);

      for (const depId of dependencies) {
        const depPos = this.position.get(depId);
        if (depPos === undefined) {
          return false; // Dependency not in order
        }
        if (depPos >= i) {
          return false; // Dependency comes after dependent
        }
      }
    }

    return true;
  }

  /**
   * Get position of a node in the order
   * @param {string} nodeId - Node ID
   * @returns {number} Position (or -1 if not found)
   */
  getPosition(nodeId) {
    if (!this.initialized) {
      this.initialize();
    }
    return this.position.get(nodeId) ?? -1;
  }

  /**
   * Clear the maintained order
   */
  clear() {
    this.order = [];
    this.position.clear();
    this.initialized = false;
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    return {
      initialized: this.initialized,
      orderLength: this.order.length,
      isValid: this.initialized ? this.isValid() : null
    };
  }
}

module.exports = {
  IncrementalTopologicalSorter
};
