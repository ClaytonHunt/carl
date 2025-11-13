/**
 * Cascade Module Exports
 *
 * Central export point for all Cascade-related functionality
 */

const CascadeManager = require('./cascade-manager');
const { DependencyGraph, GraphNode, GraphEdge } = require('./dependency-graph');
const { DependencyGraphBuilder } = require('./dependency-graph-builder');
const { CycleDetector } = require('./cycle-detector');
const { TopologicalSorter } = require('./topological-sorter');
const { IncrementalTopologicalSorter } = require('./incremental-topological-sorter');
const { ParallelExecutionAnalyzer } = require('./parallel-execution-analyzer');
const { DynamicDependencyManager, WorkItemStatus } = require('./dynamic-dependency-manager');
const workItemTemplates = require('./work-item-templates');

module.exports = {
  // Core Cascade Manager
  CascadeManager,

  // Dependency Graph Components
  DependencyGraph,
  GraphNode,
  GraphEdge,
  DependencyGraphBuilder,
  CycleDetector,
  TopologicalSorter,
  IncrementalTopologicalSorter,
  ParallelExecutionAnalyzer,
  DynamicDependencyManager,
  WorkItemStatus,

  // Templates
  workItemTemplates
};
