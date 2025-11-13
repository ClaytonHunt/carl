/**
 * Cycle Detector for Dependency Graphs
 *
 * Detects circular dependencies in work item graphs using DFS.
 * Provides detailed cycle information for error reporting.
 *
 * Based on IndyDevDan's principles:
 * - Early validation prevents runtime failures
 * - Clear error messages enable quick fixes
 * - Observable by default
 */

/**
 * Result of cycle detection
 * @typedef {Object} CycleDetectionResult
 * @property {boolean} hasCycle - Whether a cycle was detected
 * @property {Array<CycleInfo>} cycles - Array of detected cycles
 */

/**
 * Information about a detected cycle
 * @typedef {Object} CycleInfo
 * @property {string[]} path - Array of node IDs forming the cycle
 * @property {Object[]} edges - Array of edge objects in the cycle
 * @property {string} message - Human-readable error message
 * @property {string[]} suggestions - Suggestions for breaking the cycle
 */

class CycleDetector {
  /**
   * @param {DependencyGraph} graph - The dependency graph to analyze
   */
  constructor(graph) {
    this.graph = graph;
    this.visited = new Set();
    this.recursionStack = new Set();
    this.parent = new Map();
    this.cycles = [];
  }

  /**
   * Detect all cycles in the graph
   * @returns {CycleDetectionResult}
   */
  detectCycles() {
    this.visited.clear();
    this.recursionStack.clear();
    this.parent.clear();
    this.cycles = [];

    // Check all nodes to handle disconnected components
    const allNodes = this.graph.getAllNodes();

    for (const node of allNodes) {
      if (!this.visited.has(node.id)) {
        this._dfs(node.id);
      }
    }

    return {
      hasCycle: this.cycles.length > 0,
      cycles: this.cycles.map(cycle => this._formatCycle(cycle))
    };
  }

  /**
   * Depth-first search for cycle detection
   * @private
   * @param {string} nodeId - Current node ID
   * @returns {boolean} True if cycle detected from this node
   */
  _dfs(nodeId) {
    this.visited.add(nodeId);
    this.recursionStack.add(nodeId);

    // Get dependencies (outgoing edges)
    const dependencies = this.graph.getDependencies(nodeId);

    for (const depId of dependencies) {
      // If not visited, recurse
      if (!this.visited.has(depId)) {
        this.parent.set(depId, nodeId);

        if (this._dfs(depId)) {
          return true;
        }
      }
      // If in recursion stack, we found a back edge (cycle)
      else if (this.recursionStack.has(depId)) {
        // Reconstruct cycle path
        const cyclePath = this._reconstructCycle(nodeId, depId);
        this.cycles.push(cyclePath);

        // Don't return immediately - continue to find all cycles
      }
    }

    this.recursionStack.delete(nodeId);
    return false;
  }

  /**
   * Reconstruct the cycle path when a back edge is detected
   * @private
   * @param {string} from - Node where back edge starts
   * @param {string} to - Node where back edge ends (creating cycle)
   * @returns {string[]} Array of node IDs forming the cycle
   */
  _reconstructCycle(from, to) {
    const path = [];
    let current = from;

    // Trace back through parent pointers until we reach 'to'
    while (current && current !== to) {
      path.unshift(current);
      current = this.parent.get(current);

      // Safety check to prevent infinite loop
      if (path.length > this.graph.size().nodes) {
        break;
      }
    }

    // Add 'to' at the beginning and end to close the cycle
    path.unshift(to);
    path.push(to);

    return path;
  }

  /**
   * Format cycle information for error reporting
   * @private
   * @param {string[]} cyclePath - Array of node IDs in the cycle
   * @returns {CycleInfo}
   */
  _formatCycle(cyclePath) {
    const nodes = cyclePath.map(id => this.graph.getNode(id));
    const edges = [];

    // Collect edge information
    for (let i = 0; i < cyclePath.length - 1; i++) {
      const from = cyclePath[i];
      const to = cyclePath[i + 1];
      const edge = this.graph.getEdge(from, to);

      if (edge) {
        edges.push({
          from,
          to,
          type: edge.type
        });
      }
    }

    // Generate human-readable message
    const pathStr = cyclePath
      .map(id => {
        const node = this.graph.getNode(id);
        return node ? `${id} (${node.title})` : id;
      })
      .join(' → ');

    const message = `Circular dependency detected: ${pathStr}`;

    // Generate suggestions
    const suggestions = this._generateSuggestions(cyclePath, edges);

    return {
      path: cyclePath,
      edges,
      message,
      suggestions
    };
  }

  /**
   * Generate suggestions for breaking the cycle
   * @private
   * @param {string[]} cyclePath - The cycle path
   * @param {Object[]} edges - The edges in the cycle
   * @returns {string[]}
   */
  _generateSuggestions(cyclePath, edges) {
    const suggestions = [];

    // Find explicit dependencies (easier to remove)
    const explicitEdges = edges.filter(e => e.type === 'explicit');

    if (explicitEdges.length > 0) {
      suggestions.push(
        `Remove explicit dependency: ${explicitEdges[0].from} → ${explicitEdges[0].to}`
      );
    }

    // Find parent-child dependencies
    const parentChildEdges = edges.filter(e => e.type === 'parent-child');

    if (parentChildEdges.length > 0 && explicitEdges.length === 0) {
      suggestions.push(
        `Restructure hierarchy: The parent-child relationship creates a cycle`
      );
    }

    // General suggestion
    if (cyclePath.length === 2) {
      suggestions.push(
        `Remove the bidirectional dependency between ${cyclePath[0]} and ${cyclePath[1]}`
      );
    } else {
      suggestions.push(
        `Break the cycle by removing one of the dependencies in the chain`
      );
    }

    return suggestions;
  }

  /**
   * Check if adding an edge would create a cycle
   * @param {string} from - Source node ID
   * @param {string} to - Target node ID
   * @returns {boolean} True if adding edge would create cycle
   */
  wouldCreateCycle(from, to) {
    // If there's already a path from 'to' to 'from',
    // adding an edge from 'from' to 'to' would create a cycle
    return this.graph.hasPath(to, from);
  }

  /**
   * Validate graph has no cycles
   * @throws {Error} If cycles are detected
   */
  validate() {
    const result = this.detectCycles();

    if (result.hasCycle) {
      const errors = result.cycles.map(cycle => {
        return `${cycle.message}\nSuggestions:\n${cycle.suggestions.map(s => `  - ${s}`).join('\n')}`;
      }).join('\n\n');

      throw new Error(`Dependency graph contains ${result.cycles.length} cycle(s):\n\n${errors}`);
    }
  }

  /**
   * Get all cycles in the graph
   * @returns {CycleInfo[]}
   */
  getAllCycles() {
    const result = this.detectCycles();
    return result.cycles;
  }

  /**
   * Check if graph is acyclic (DAG)
   * @returns {boolean}
   */
  isAcyclic() {
    const result = this.detectCycles();
    return !result.hasCycle;
  }
}

module.exports = {
  CycleDetector
};
