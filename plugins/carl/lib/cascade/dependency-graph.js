/**
 * Dependency Graph for Work Items
 *
 * Represents dependencies between work items as a directed graph.
 * Supports both implicit (parent-child) and explicit (depends_on) dependencies.
 *
 * Based on IndyDevDan's principles:
 * - Clear dependency modeling for orchestration
 * - Efficient traversal for execution planning
 * - Observable by default
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Graph Node representing a work item
 */
class GraphNode {
  /**
   * @param {string} id - Work item ID (e.g., "E0001", "F0001")
   * @param {Object} metadata - Work item metadata
   * @param {string} metadata.type - Work item type (P, E, F, S, B, PH, T)
   * @param {string} metadata.title - Work item title
   * @param {string} metadata.status - Work item status
   * @param {string} [metadata.parent] - Parent work item ID
   * @param {string[]} [metadata.depends_on] - Explicit dependencies
   */
  constructor(id, metadata = {}) {
    this.id = id;
    this.type = metadata.type;
    this.title = metadata.title;
    this.status = metadata.status || 'planned';
    this.parent = metadata.parent || null;
    this.depends_on = metadata.depends_on || [];

    // Additional metadata
    this.priority = metadata.priority;
    this.complexity = metadata.complexity;
    this.created = metadata.created;
    this.updated = metadata.updated;
  }

  /**
   * Convert node to plain object
   */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      title: this.title,
      status: this.status,
      parent: this.parent,
      depends_on: this.depends_on,
      priority: this.priority,
      complexity: this.complexity,
      created: this.created,
      updated: this.updated
    };
  }
}

/**
 * Graph Edge representing a dependency
 */
class GraphEdge {
  /**
   * @param {string} from - Source node ID (dependent)
   * @param {string} to - Target node ID (dependency)
   * @param {Object} metadata - Edge metadata
   * @param {string} metadata.type - Edge type: 'parent-child' or 'explicit'
   * @param {string} [metadata.reason] - Reason for dependency (optional)
   */
  constructor(from, to, metadata = {}) {
    this.from = from;
    this.to = to;
    this.type = metadata.type || 'explicit'; // 'parent-child' or 'explicit'
    this.reason = metadata.reason || null;
  }

  /**
   * Convert edge to plain object
   */
  toJSON() {
    return {
      from: this.from,
      to: this.to,
      type: this.type,
      reason: this.reason
    };
  }
}

/**
 * Dependency Graph
 */
class DependencyGraph {
  constructor() {
    // Map of node ID -> GraphNode
    this.nodes = new Map();

    // Adjacency list: node ID -> Set of outgoing edges (dependencies)
    // edges.get(nodeId) returns Set of node IDs that nodeId depends on
    this.edges = new Map();

    // Reverse adjacency list: node ID -> Set of incoming edges (dependents)
    // reverseEdges.get(nodeId) returns Set of node IDs that depend on nodeId
    this.reverseEdges = new Map();

    // Edge metadata: "from->to" -> GraphEdge
    this.edgeMetadata = new Map();
  }

  /**
   * Add a node to the graph
   * @param {string} id - Work item ID
   * @param {Object} metadata - Work item metadata
   */
  addNode(id, metadata = {}) {
    if (this.nodes.has(id)) {
      throw new Error(`Node ${id} already exists`);
    }

    const node = new GraphNode(id, metadata);
    this.nodes.set(id, node);

    // Initialize empty edge sets
    if (!this.edges.has(id)) {
      this.edges.set(id, new Set());
    }
    if (!this.reverseEdges.has(id)) {
      this.reverseEdges.set(id, new Set());
    }

    return node;
  }

  /**
   * Add an edge to the graph
   * @param {string} from - Source node ID (dependent)
   * @param {string} to - Target node ID (dependency)
   * @param {Object} metadata - Edge metadata
   */
  addEdge(from, to, metadata = {}) {
    // Validate nodes exist
    if (!this.nodes.has(from)) {
      throw new Error(`Source node ${from} does not exist`);
    }
    if (!this.nodes.has(to)) {
      throw new Error(`Target node ${to} does not exist`);
    }

    // Add edge to adjacency list
    this.edges.get(from).add(to);

    // Add reverse edge
    this.reverseEdges.get(to).add(from);

    // Store edge metadata
    const edgeKey = `${from}->${to}`;
    const edge = new GraphEdge(from, to, metadata);
    this.edgeMetadata.set(edgeKey, edge);

    return edge;
  }

  /**
   * Get a node by ID
   * @param {string} id - Node ID
   * @returns {GraphNode|null}
   */
  getNode(id) {
    return this.nodes.get(id) || null;
  }

  /**
   * Check if a node exists
   * @param {string} id - Node ID
   * @returns {boolean}
   */
  hasNode(id) {
    return this.nodes.has(id);
  }

  /**
   * Check if an edge exists
   * @param {string} from - Source node ID
   * @param {string} to - Target node ID
   * @returns {boolean}
   */
  hasEdge(from, to) {
    return this.edges.has(from) && this.edges.get(from).has(to);
  }

  /**
   * Get edge metadata
   * @param {string} from - Source node ID
   * @param {string} to - Target node ID
   * @returns {GraphEdge|null}
   */
  getEdge(from, to) {
    const edgeKey = `${from}->${to}`;
    return this.edgeMetadata.get(edgeKey) || null;
  }

  /**
   * Get all nodes
   * @returns {GraphNode[]}
   */
  getAllNodes() {
    return Array.from(this.nodes.values());
  }

  /**
   * Get all edges
   * @returns {GraphEdge[]}
   */
  getAllEdges() {
    return Array.from(this.edgeMetadata.values());
  }

  /**
   * Get direct dependencies of a node (nodes that this node depends on)
   * @param {string} nodeId - Node ID
   * @returns {string[]} Array of node IDs
   */
  getDependencies(nodeId) {
    if (!this.edges.has(nodeId)) {
      return [];
    }
    return Array.from(this.edges.get(nodeId));
  }

  /**
   * Get direct dependents of a node (nodes that depend on this node)
   * @param {string} nodeId - Node ID
   * @returns {string[]} Array of node IDs
   */
  getDependents(nodeId) {
    if (!this.reverseEdges.has(nodeId)) {
      return [];
    }
    return Array.from(this.reverseEdges.get(nodeId));
  }

  /**
   * Get all ancestors of a node (all upstream nodes)
   * @param {string} nodeId - Node ID
   * @returns {string[]} Array of ancestor node IDs
   */
  getAncestors(nodeId) {
    const ancestors = new Set();
    const visited = new Set();
    const queue = [nodeId];

    while (queue.length > 0) {
      const current = queue.shift();

      if (visited.has(current)) {
        continue;
      }
      visited.add(current);

      const dependencies = this.getDependencies(current);
      for (const dep of dependencies) {
        if (!ancestors.has(dep)) {
          ancestors.add(dep);
          queue.push(dep);
        }
      }
    }

    return Array.from(ancestors);
  }

  /**
   * Get all descendants of a node (all downstream nodes)
   * @param {string} nodeId - Node ID
   * @returns {string[]} Array of descendant node IDs
   */
  getDescendants(nodeId) {
    const descendants = new Set();
    const visited = new Set();
    const queue = [nodeId];

    while (queue.length > 0) {
      const current = queue.shift();

      if (visited.has(current)) {
        continue;
      }
      visited.add(current);

      const dependents = this.getDependents(current);
      for (const dep of dependents) {
        if (!descendants.has(dep)) {
          descendants.add(dep);
          queue.push(dep);
        }
      }
    }

    return Array.from(descendants);
  }

  /**
   * Check if there is a path from one node to another
   * @param {string} fromId - Source node ID
   * @param {string} toId - Target node ID
   * @returns {boolean}
   */
  hasPath(fromId, toId) {
    if (fromId === toId) {
      return true;
    }

    const visited = new Set();
    const queue = [fromId];

    while (queue.length > 0) {
      const current = queue.shift();

      if (visited.has(current)) {
        continue;
      }
      visited.add(current);

      if (current === toId) {
        return true;
      }

      const dependencies = this.getDependencies(current);
      for (const dep of dependencies) {
        if (!visited.has(dep)) {
          queue.push(dep);
        }
      }
    }

    return false;
  }

  /**
   * Get the size of the graph
   * @returns {Object} { nodes: number, edges: number }
   */
  size() {
    return {
      nodes: this.nodes.size,
      edges: this.edgeMetadata.size
    };
  }

  /**
   * Remove a node from the graph
   * @param {string} id - Node ID to remove
   * @returns {boolean} True if node was removed
   */
  removeNode(id) {
    if (!this.nodes.has(id)) {
      return false;
    }

    // Remove all edges connected to this node
    // Remove outgoing edges
    const outgoing = this.edges.get(id);
    if (outgoing) {
      for (const toId of outgoing) {
        const edgeKey = `${id}->${toId}`;
        this.edgeMetadata.delete(edgeKey);
        this.reverseEdges.get(toId)?.delete(id);
      }
    }

    // Remove incoming edges
    const incoming = this.reverseEdges.get(id);
    if (incoming) {
      for (const fromId of incoming) {
        const edgeKey = `${fromId}->${id}`;
        this.edgeMetadata.delete(edgeKey);
        this.edges.get(fromId)?.delete(id);
      }
    }

    // Remove the node itself
    this.nodes.delete(id);
    this.edges.delete(id);
    this.reverseEdges.delete(id);

    return true;
  }

  /**
   * Remove an edge from the graph
   * @param {string} from - Source node ID
   * @param {string} to - Target node ID
   * @returns {boolean} True if edge was removed
   */
  removeEdge(from, to) {
    const edgeKey = `${from}->${to}`;

    if (!this.edgeMetadata.has(edgeKey)) {
      return false;
    }

    // Remove from edge metadata
    this.edgeMetadata.delete(edgeKey);

    // Remove from adjacency lists
    this.edges.get(from)?.delete(to);
    this.reverseEdges.get(to)?.delete(from);

    return true;
  }

  /**
   * Update node metadata
   * @param {string} id - Node ID
   * @param {Object} metadata - New metadata (partial update)
   * @returns {boolean} True if node was updated
   */
  updateNode(id, metadata) {
    const node = this.nodes.get(id);
    if (!node) {
      return false;
    }

    // Update node properties
    Object.assign(node, metadata);
    return true;
  }

  /**
   * Clear the graph
   */
  clear() {
    this.nodes.clear();
    this.edges.clear();
    this.reverseEdges.clear();
    this.edgeMetadata.clear();
  }

  /**
   * Export graph to JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      nodes: Array.from(this.nodes.values()).map(n => n.toJSON()),
      edges: Array.from(this.edgeMetadata.values()).map(e => e.toJSON())
    };
  }

  /**
   * Import graph from JSON
   * @param {Object} data - Graph data
   */
  fromJSON(data) {
    this.clear();

    // Add nodes
    for (const nodeData of data.nodes) {
      this.addNode(nodeData.id, nodeData);
    }

    // Add edges
    for (const edgeData of data.edges) {
      this.addEdge(edgeData.from, edgeData.to, {
        type: edgeData.type,
        reason: edgeData.reason
      });
    }
  }
}

module.exports = {
  DependencyGraph,
  GraphNode,
  GraphEdge
};
