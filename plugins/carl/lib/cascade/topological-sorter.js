/**
 * Topological Sorter for Dependency Graphs
 *
 * Implements topological sorting algorithms to determine valid execution order.
 * Supports both Kahn's algorithm and DFS-based sorting with priority support.
 *
 * Based on IndyDevDan's principles:
 * - Deterministic execution ordering
 * - Priority-aware scheduling
 * - Observable by default
 */

const { CycleDetector } = require('./cycle-detector');

/**
 * Result of topological sort
 * @typedef {Object} TopologicalSortResult
 * @property {string[]} order - Ordered list of node IDs
 * @property {boolean} success - Whether sort was successful
 * @property {string} [error] - Error message if sort failed
 * @property {string} algorithm - Algorithm used ('kahn' or 'dfs')
 */

class TopologicalSorter {
  /**
   * @param {DependencyGraph} graph - The dependency graph to sort
   */
  constructor(graph) {
    this.graph = graph;
    this.priorityMap = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1
    };
  }

  /**
   * Sort using Kahn's algorithm (default)
   * @param {Object} options - Sort options
   * @param {boolean} [options.respectPriority=false] - Whether to sort by priority within levels
   * @returns {TopologicalSortResult}
   */
  sort(options = {}) {
    return this.sortKahn(options);
  }

  /**
   * Sort using Kahn's algorithm
   * @param {Object} options - Sort options
   * @param {boolean} [options.respectPriority=false] - Whether to sort by priority
   * @returns {TopologicalSortResult}
   */
  sortKahn(options = {}) {
    const { respectPriority = false } = options;

    // Check for cycles first
    const cycleDetector = new CycleDetector(this.graph);
    if (!cycleDetector.isAcyclic()) {
      const cycles = cycleDetector.getAllCycles();
      return {
        order: [],
        success: false,
        error: `Cannot sort graph with cycles: ${cycles[0].message}`,
        algorithm: 'kahn'
      };
    }

    // Calculate in-degrees for all nodes
    const inDegree = new Map();
    const allNodes = this.graph.getAllNodes();

    for (const node of allNodes) {
      const dependencies = this.graph.getDependencies(node.id);
      inDegree.set(node.id, dependencies.length);
    }

    // Find all nodes with zero in-degree
    const queue = [];
    for (const node of allNodes) {
      if (inDegree.get(node.id) === 0) {
        queue.push(node.id);
      }
    }

    // Sort initial queue by priority if requested
    if (respectPriority) {
      this._sortByPriority(queue);
    }

    const result = [];

    while (queue.length > 0) {
      // Take node from queue
      const nodeId = queue.shift();
      result.push(nodeId);

      // Get all dependents (nodes that depend on this node)
      const dependents = this.graph.getDependents(nodeId);

      // Reduce in-degree for each dependent
      for (const depId of dependents) {
        const newInDegree = inDegree.get(depId) - 1;
        inDegree.set(depId, newInDegree);

        // If in-degree becomes zero, add to queue
        if (newInDegree === 0) {
          queue.push(depId);
        }
      }

      // Sort queue by priority if requested
      if (respectPriority && queue.length > 0) {
        this._sortByPriority(queue);
      }
    }

    // Check if all nodes were processed (no cycles)
    if (result.length !== allNodes.length) {
      return {
        order: result,
        success: false,
        error: `Incomplete sort: ${result.length}/${allNodes.length} nodes processed`,
        algorithm: 'kahn'
      };
    }

    return {
      order: result,
      success: true,
      algorithm: 'kahn'
    };
  }

  /**
   * Sort using DFS-based algorithm
   * @param {Object} options - Sort options
   * @param {boolean} [options.respectPriority=false] - Whether to sort by priority
   * @returns {TopologicalSortResult}
   */
  sortDFS(options = {}) {
    const { respectPriority = false } = options;

    // Check for cycles first
    const cycleDetector = new CycleDetector(this.graph);
    if (!cycleDetector.isAcyclic()) {
      const cycles = cycleDetector.getAllCycles();
      return {
        order: [],
        success: false,
        error: `Cannot sort graph with cycles: ${cycles[0].message}`,
        algorithm: 'dfs'
      };
    }

    const visited = new Set();
    const result = [];
    const allNodes = this.graph.getAllNodes();

    // Get all node IDs
    let nodeIds = allNodes.map(n => n.id);

    // Sort by priority if requested (process higher priority first)
    if (respectPriority) {
      nodeIds = this._sortNodeIdsByPriority(nodeIds);
    }

    // DFS from each unvisited node
    for (const nodeId of nodeIds) {
      if (!visited.has(nodeId)) {
        this._dfsVisit(nodeId, visited, result, respectPriority);
      }
    }

    // No need to reverse - visiting dependencies first and post-order
    // naturally gives us topological order

    return {
      order: result,
      success: true,
      algorithm: 'dfs'
    };
  }

  /**
   * DFS visit helper
   * @private
   */
  _dfsVisit(nodeId, visited, result, respectPriority) {
    visited.add(nodeId);

    // Visit all dependencies first
    let dependencies = this.graph.getDependencies(nodeId);

    // Sort dependencies by priority if requested
    if (respectPriority) {
      dependencies = this._sortNodeIdsByPriority(dependencies);
    }

    for (const depId of dependencies) {
      if (!visited.has(depId)) {
        this._dfsVisit(depId, visited, result, respectPriority);
      }
    }

    // Add to result after visiting all dependencies (post-order)
    result.push(nodeId);
  }

  /**
   * Sort node IDs by priority (highest priority first)
   * @private
   */
  _sortNodeIdsByPriority(nodeIds) {
    return [...nodeIds].sort((a, b) => {
      const nodeA = this.graph.getNode(a);
      const nodeB = this.graph.getNode(b);

      const priorityA = this.priorityMap[nodeA?.priority] || this.priorityMap.medium;
      const priorityB = this.priorityMap[nodeB?.priority] || this.priorityMap.medium;

      // Higher priority first (descending)
      return priorityB - priorityA;
    });
  }

  /**
   * Sort array of node IDs by priority (in-place)
   * @private
   */
  _sortByPriority(nodeIds) {
    nodeIds.sort((a, b) => {
      const nodeA = this.graph.getNode(a);
      const nodeB = this.graph.getNode(b);

      const priorityA = this.priorityMap[nodeA?.priority] || this.priorityMap.medium;
      const priorityB = this.priorityMap[nodeB?.priority] || this.priorityMap.medium;

      // Higher priority first (descending)
      return priorityB - priorityA;
    });
  }

  /**
   * Get execution order for a specific subgraph
   * @param {string} rootNodeId - Root node to start from
   * @param {Object} options - Sort options
   * @returns {TopologicalSortResult}
   */
  sortSubgraph(rootNodeId, options = {}) {
    // Get all descendants
    const descendants = this.graph.getDescendants(rootNodeId);
    const subgraphNodes = [rootNodeId, ...descendants];

    // Create a temporary filtered graph view
    // For simplicity, we'll use the full graph but filter results
    const fullResult = this.sort(options);

    if (!fullResult.success) {
      return fullResult;
    }

    // Filter to only include subgraph nodes
    const filteredOrder = fullResult.order.filter(id => subgraphNodes.includes(id));

    return {
      order: filteredOrder,
      success: true,
      algorithm: fullResult.algorithm
    };
  }

  /**
   * Validate that the sort order is valid
   * @param {string[]} order - The sorted order to validate
   * @returns {boolean}
   */
  isValidOrder(order) {
    const position = new Map();

    // Record position of each node
    order.forEach((nodeId, index) => {
      position.set(nodeId, index);
    });

    // Check that all dependencies come before their dependents
    for (const nodeId of order) {
      const dependencies = this.graph.getDependencies(nodeId);

      for (const depId of dependencies) {
        // Dependency must come before this node
        if (!position.has(depId) || position.get(depId) >= position.get(nodeId)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Get all valid topological orderings (warning: can be expensive!)
   * @returns {string[][]} Array of all valid orderings
   */
  getAllValidOrderings() {
    // This is computationally expensive - only use for small graphs
    const allNodes = this.graph.getAllNodes();

    if (allNodes.length > 10) {
      throw new Error('getAllValidOrderings is too expensive for graphs with > 10 nodes');
    }

    // Use Kahn's algorithm variation to generate all orderings
    const results = [];
    this._generateAllOrderings([], new Set(), results);

    return results;
  }

  /**
   * Generate all valid orderings recursively
   * @private
   */
  _generateAllOrderings(current, used, results) {
    const allNodes = this.graph.getAllNodes();

    // Base case: all nodes used
    if (current.length === allNodes.length) {
      results.push([...current]);
      return;
    }

    // Find all nodes that can be added next (all dependencies satisfied)
    for (const node of allNodes) {
      if (used.has(node.id)) {
        continue;
      }

      const dependencies = this.graph.getDependencies(node.id);
      const allDepsSatisfied = dependencies.every(depId => used.has(depId));

      if (allDepsSatisfied) {
        // Add this node and recurse
        current.push(node.id);
        used.add(node.id);

        this._generateAllOrderings(current, used, results);

        // Backtrack
        current.pop();
        used.delete(node.id);
      }
    }
  }
}

module.exports = {
  TopologicalSorter
};
