# Dependency Graph Usage Guide

## Overview

The Dependency Graph system provides a powerful way to model and analyze dependencies between work items in the Cascade system. It supports both implicit (parent-child) and explicit (depends_on) dependencies.

## Quick Start

```javascript
const { DependencyGraphBuilder } = require('./dependency-graph-builder');

// Build graph from Cascade directory
const builder = new DependencyGraphBuilder('.cascade');
const graph = await builder.build();

// Check for errors
if (builder.hasErrors()) {
  console.error('Build errors:', builder.getErrors());
}

// Check for warnings
if (builder.hasWarnings()) {
  console.warn('Build warnings:', builder.getWarnings());
}
```

## Basic Graph Operations

### Querying Dependencies

```javascript
// Get direct dependencies (nodes this node depends on)
const deps = graph.getDependencies('F0001');
// Returns: ['E0001'] (if F0001 is a child of E0001)

// Get direct dependents (nodes that depend on this node)
const dependents = graph.getDependents('E0001');
// Returns: ['F0001', 'F0002', ...] (children of E0001)

// Get all ancestors (all upstream dependencies)
const ancestors = graph.getAncestors('S0001');
// Returns: ['F0001', 'E0001'] (all work items up the tree)

// Get all descendants (all downstream dependents)
const descendants = graph.getDescendants('E0001');
// Returns: ['F0001', 'F0002', 'S0001', ...] (all children recursively)

// Check if path exists between nodes
const hasPath = graph.hasPath('S0001', 'E0001');
// Returns: true (S0001 depends on E0001 through F0001)
```

### Node Operations

```javascript
// Get node metadata
const node = graph.getNode('F0001');
console.log(node.id);          // 'F0001'
console.log(node.type);        // 'F'
console.log(node.title);       // 'Feature Title'
console.log(node.status);      // 'planned'
console.log(node.parent);      // 'E0001'
console.log(node.depends_on);  // ['F0002', ...]

// Check if node exists
if (graph.hasNode('F0001')) {
  // Node exists
}

// Get all nodes
const allNodes = graph.getAllNodes();
```

### Edge Operations

```javascript
// Check if edge exists
if (graph.hasEdge('F0001', 'E0001')) {
  // Edge exists
}

// Get edge metadata
const edge = graph.getEdge('F0001', 'E0001');
console.log(edge.from);   // 'F0001'
console.log(edge.to);     // 'E0001'
console.log(edge.type);   // 'parent-child' or 'explicit'

// Get all edges
const allEdges = graph.getAllEdges();
```

## Advanced Usage

### Building Custom Graphs

```javascript
const { DependencyGraph } = require('./dependency-graph');

const graph = new DependencyGraph();

// Add nodes
graph.addNode('E0001', {
  type: 'E',
  title: 'Epic 1',
  status: 'in_progress'
});

graph.addNode('F0001', {
  type: 'F',
  title: 'Feature 1',
  status: 'planned',
  parent: 'E0001'
});

// Add edges
graph.addEdge('F0001', 'E0001', {
  type: 'parent-child'
});
```

### Graph Serialization

```javascript
// Export to JSON
const json = graph.toJSON();
// Save to file or send over network

// Import from JSON
const newGraph = new DependencyGraph();
newGraph.fromJSON(json);
```

### Error Handling

```javascript
const builder = new DependencyGraphBuilder('.cascade');
const graph = await builder.build();

// Check for missing dependencies
const warnings = builder.getWarnings();
const missingDeps = warnings.filter(w =>
  w.type === 'missing_dependency' || w.type === 'missing_parent'
);

if (missingDeps.length > 0) {
  console.log('Missing dependencies:');
  missingDeps.forEach(w => {
    console.log(`  ${w.item} -> ${w.dependency || w.parent}`);
  });
}
```

## Work Item Dependency Format

### Parent-Child Dependencies (Implicit)

Work items automatically depend on their parent through the `parent` field:

```yaml
---
id: F0001
type: F
title: Feature 1
parent: E0001
status: planned
---
```

This creates an edge: `F0001` depends on `E0001`

### Explicit Dependencies

Work items can explicitly depend on other items using the `depends_on` field:

```yaml
---
id: F0002
type: F
title: Feature 2
parent: E0001
depends_on: [F0001]
status: planned
---
```

This creates two edges:
- `F0002` depends on `E0001` (parent-child)
- `F0002` depends on `F0001` (explicit)

## Use Cases

### 1. Execution Ordering

```javascript
// Get all ancestors of a work item to know what must complete first
const mustCompleteFirst = graph.getAncestors('F0002');
// Returns all dependencies that must be completed before F0002
```

### 2. Impact Analysis

```javascript
// Get all descendants to understand impact of changes
const impactedItems = graph.getDescendants('F0001');
// Returns all work items that depend on F0001
```

### 3. Dependency Validation

```javascript
// Check if adding a dependency would create a cycle
function wouldCreateCycle(graph, from, to) {
  // If there's already a path from 'to' to 'from',
  // adding an edge from 'from' to 'to' would create a cycle
  return graph.hasPath(to, from);
}

if (wouldCreateCycle(graph, 'F0001', 'F0002')) {
  console.error('Cannot add dependency: would create cycle');
}
```

### 4. Parallel Execution Planning

```javascript
// Find work items with no dependencies (can start immediately)
const readyToStart = graph.getAllNodes()
  .filter(node => graph.getDependencies(node.id).length === 0)
  .map(node => node.id);

console.log('Can start:', readyToStart);
```

## Performance Notes

- **Node lookup**: O(1) - uses Map internally
- **Edge lookup**: O(1) - uses Map internally
- **getDependencies**: O(1) - returns Set as array
- **getDependents**: O(1) - returns Set as array
- **getAncestors**: O(V + E) - breadth-first traversal
- **getDescendants**: O(V + E) - breadth-first traversal
- **hasPath**: O(V + E) - breadth-first traversal

Where:
- V = number of nodes
- E = number of edges

## Integration with Work Orchestrator

The dependency graph is designed to integrate with the Work Orchestrator for:

1. **Topological Sorting** - Determine execution order
2. **Cycle Detection** - Validate dependencies before execution
3. **Parallel Execution** - Identify independent work items
4. **Dynamic Updates** - Handle runtime dependency changes

See the related modules:
- `S0029`: Cycle Detection
- `S0030`: Topological Sort
- `S0031`: Parallel Execution Analysis
- `S0032`: Dynamic Dependency Resolution
