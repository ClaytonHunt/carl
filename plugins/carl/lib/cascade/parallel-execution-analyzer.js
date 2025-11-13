/**
 * Parallel Execution Analyzer
 *
 * Analyzes dependency graphs to identify work items that can execute in parallel.
 * Groups items into execution waves and calculates parallelism metrics.
 *
 * Based on IndyDevDan's principles:
 * - Maximize parallel execution
 * - Observable execution planning
 * - Resource-aware scheduling
 */

const { TopologicalSorter } = require('./topological-sorter');

/**
 * Execution wave plan
 * @typedef {Object} ExecutionPlan
 * @property {string[][]} waves - Array of waves, each wave is array of node IDs
 * @property {Object} metrics - Parallelism metrics
 * @property {number} metrics.totalWaves - Total number of execution waves
 * @property {number} metrics.maxConcurrency - Maximum items in any single wave
 * @property {number} metrics.criticalPathLength - Longest dependency chain
 * @property {string[]} metrics.criticalPath - Node IDs on critical path
 * @property {number} metrics.parallelismFactor - Ratio of total items to waves
 */

class ParallelExecutionAnalyzer {
  /**
   * @param {DependencyGraph} graph - The dependency graph to analyze
   */
  constructor(graph) {
    this.graph = graph;
  }

  /**
   * Analyze graph and create execution plan
   * @param {Object} options - Analysis options
   * @param {number} [options.maxConcurrent] - Max concurrent items per wave
   * @param {boolean} [options.respectPriority=false] - Group by priority within waves
   * @returns {ExecutionPlan}
   */
  analyze(options = {}) {
    const { maxConcurrent, respectPriority = false } = options;

    // Calculate execution waves
    const waves = this._calculateWaves(respectPriority);

    // Apply resource constraints if specified
    const constrainedWaves = maxConcurrent
      ? this._applyResourceConstraints(waves, maxConcurrent)
      : waves;

    // Calculate metrics
    const metrics = this._calculateMetrics(constrainedWaves);

    return {
      waves: constrainedWaves,
      metrics
    };
  }

  /**
   * Calculate execution waves using modified topological sort
   * @private
   */
  _calculateWaves(respectPriority) {
    const waves = [];
    const inDegree = new Map();
    const waveAssignment = new Map();
    const allNodes = this.graph.getAllNodes();

    // Initialize in-degrees
    for (const node of allNodes) {
      const dependencies = this.graph.getDependencies(node.id);
      inDegree.set(node.id, dependencies.length);
    }

    let currentWave = 0;

    while (waveAssignment.size < allNodes.length) {
      // Find all nodes with in-degree 0 (can execute now)
      const ready = [];
      for (const node of allNodes) {
        if (!waveAssignment.has(node.id) && inDegree.get(node.id) === 0) {
          ready.push(node.id);
        }
      }

      if (ready.length === 0) {
        // No nodes ready - either done or there's a cycle
        break;
      }

      // Sort by priority if requested
      if (respectPriority) {
        ready.sort((a, b) => {
          const nodeA = this.graph.getNode(a);
          const nodeB = this.graph.getNode(b);
          const priorityMap = { critical: 4, high: 3, medium: 2, low: 1 };
          const priorityA = priorityMap[nodeA?.priority] || 2;
          const priorityB = priorityMap[nodeB?.priority] || 2;
          return priorityB - priorityA; // Higher priority first
        });
      }

      // Assign these nodes to current wave
      waves[currentWave] = ready;
      for (const nodeId of ready) {
        waveAssignment.set(nodeId, currentWave);
      }

      // Update in-degrees for dependents
      for (const nodeId of ready) {
        const dependents = this.graph.getDependents(nodeId);
        for (const depId of dependents) {
          const newInDegree = inDegree.get(depId) - 1;
          inDegree.set(depId, newInDegree);
        }
      }

      currentWave++;
    }

    return waves;
  }

  /**
   * Apply resource constraints to waves
   * @private
   */
  _applyResourceConstraints(waves, maxConcurrent) {
    const constrainedWaves = [];

    for (const wave of waves) {
      if (wave.length <= maxConcurrent) {
        // Wave fits within constraint
        constrainedWaves.push(wave);
      } else {
        // Split wave into multiple sub-waves
        for (let i = 0; i < wave.length; i += maxConcurrent) {
          const subWave = wave.slice(i, i + maxConcurrent);
          constrainedWaves.push(subWave);
        }
      }
    }

    return constrainedWaves;
  }

  /**
   * Calculate parallelism metrics
   * @private
   */
  _calculateMetrics(waves) {
    const totalItems = this.graph.size().nodes;
    const totalWaves = waves.length;

    // Max concurrency - largest wave
    const maxConcurrency = Math.max(...waves.map(w => w.length), 0);

    // Critical path - longest path through graph
    const { length: criticalPathLength, path: criticalPath } = this._findCriticalPath();

    // Parallelism factor - how much parallelism we achieve
    const parallelismFactor = totalItems > 0 ? totalItems / Math.max(totalWaves, 1) : 0;

    return {
      totalWaves,
      maxConcurrency,
      criticalPathLength,
      criticalPath,
      parallelismFactor: Number(parallelismFactor.toFixed(2))
    };
  }

  /**
   * Find the critical path (longest dependency chain)
   * @private
   */
  _findCriticalPath() {
    const allNodes = this.graph.getAllNodes();
    let longestPath = [];
    let maxLength = 0;

    // For each node, calculate longest path to it
    const pathLengths = new Map();
    const pathToNode = new Map();

    // Topological sort to process in order
    const sorter = new TopologicalSorter(this.graph);
    const sortResult = sorter.sort();

    if (!sortResult.success) {
      return { length: 0, path: [] };
    }

    // Process nodes in topological order
    for (const nodeId of sortResult.order) {
      let maxPathLength = 0;
      let maxPathToThis = [];

      // Check all dependencies
      const dependencies = this.graph.getDependencies(nodeId);

      if (dependencies.length === 0) {
        // No dependencies - this is a starting node
        maxPathLength = 1;
        maxPathToThis = [nodeId];
      } else {
        // Find longest path among dependencies
        for (const depId of dependencies) {
          const depPathLength = pathLengths.get(depId) || 0;
          if (depPathLength > maxPathLength) {
            maxPathLength = depPathLength;
            maxPathToThis = [...(pathToNode.get(depId) || [])];
          }
        }
        maxPathLength += 1;
        maxPathToThis.push(nodeId);
      }

      pathLengths.set(nodeId, maxPathLength);
      pathToNode.set(nodeId, maxPathToThis);

      // Track global longest
      if (maxPathLength > maxLength) {
        maxLength = maxPathLength;
        longestPath = maxPathToThis;
      }
    }

    return {
      length: maxLength,
      path: longestPath
    };
  }

  /**
   * Get all items that can execute immediately (no dependencies)
   * @returns {string[]}
   */
  getReadyItems() {
    const allNodes = this.graph.getAllNodes();
    return allNodes
      .filter(node => this.graph.getDependencies(node.id).length === 0)
      .map(node => node.id);
  }

  /**
   * Get items that become ready after completing specified items
   * @param {string[]} completedIds - IDs of completed items
   * @param {string[]} inProgressIds - IDs of items currently in progress
   * @returns {string[]}
   */
  getNextReadyItems(completedIds, inProgressIds = []) {
    const completed = new Set(completedIds);
    const inProgress = new Set(inProgressIds);
    const allNodes = this.graph.getAllNodes();
    const ready = [];

    for (const node of allNodes) {
      const nodeId = node.id;

      // Skip if already completed or in progress
      if (completed.has(nodeId) || inProgress.has(nodeId)) {
        continue;
      }

      // Check if all dependencies are completed
      const dependencies = this.graph.getDependencies(nodeId);
      const allDepsSatisfied = dependencies.every(depId => completed.has(depId));

      if (allDepsSatisfied) {
        ready.push(nodeId);
      }
    }

    return ready;
  }

  /**
   * Get execution wave for a specific item
   * @param {string} nodeId - Node ID
   * @returns {number} Wave number (0-indexed)
   */
  getWaveForItem(nodeId) {
    const plan = this.analyze();

    for (let i = 0; i < plan.waves.length; i++) {
      if (plan.waves[i].includes(nodeId)) {
        return i;
      }
    }

    return -1; // Not found
  }

  /**
   * Check if two items can execute in parallel
   * @param {string} nodeId1 - First node ID
   * @param {string} nodeId2 - Second node ID
   * @returns {boolean}
   */
  canExecuteInParallel(nodeId1, nodeId2) {
    // Items can execute in parallel if there's no dependency path between them
    const path1to2 = this.graph.hasPath(nodeId1, nodeId2);
    const path2to1 = this.graph.hasPath(nodeId2, nodeId1);

    return !path1to2 && !path2to1;
  }

  /**
   * Get parallelism report
   * @returns {string}
   */
  getReport() {
    const plan = this.analyze();
    const lines = [];

    lines.push('=== Parallel Execution Analysis ===');
    lines.push('');
    lines.push(`Total Items: ${this.graph.size().nodes}`);
    lines.push(`Total Waves: ${plan.metrics.totalWaves}`);
    lines.push(`Max Concurrency: ${plan.metrics.maxConcurrency}`);
    lines.push(`Critical Path Length: ${plan.metrics.criticalPathLength}`);
    lines.push(`Parallelism Factor: ${plan.metrics.parallelismFactor}x`);
    lines.push('');
    lines.push('Critical Path:');
    lines.push(`  ${plan.metrics.criticalPath.join(' → ')}`);
    lines.push('');
    lines.push('Execution Waves:');

    plan.waves.forEach((wave, index) => {
      lines.push(`  Wave ${index}: [${wave.join(', ')}] (${wave.length} items)`);
    });

    return lines.join('\n');
  }
}

module.exports = {
  ParallelExecutionAnalyzer
};
