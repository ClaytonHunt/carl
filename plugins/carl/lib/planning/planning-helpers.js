/**
 * Planning Helpers
 *
 * Simple utility functions for the Planning Orchestrator agent.
 * These handle data operations only - the agent does all the reasoning.
 *
 * Philosophy:
 * - Code handles data (load files, save files, format output)
 * - Agent handles reasoning (analysis, breakdown, estimation)
 */

const CascadeManager = require('../cascade/cascade-manager');
const path = require('path');

/**
 * Load context for planning
 *
 * If ID provided: Loads existing work item with parent and children
 * If no ID: Just loads registry
 *
 * @param {string|null} id - Work item ID (e.g., "E0001") or null for new items
 * @param {string} cascadeDir - Path to .cascade directory
 * @returns {Promise<Object>} Context object with workItem, parent, children, registry, manager
 */
async function loadContext(id = null, cascadeDir = '.cascade') {
  const manager = new CascadeManager(cascadeDir);
  const registry = await manager.loadRegistry();

  // If no ID provided, just return registry (for creating new items)
  if (!id) {
    return {
      registry,
      manager,
      workItem: null,
      parent: null,
      children: []
    };
  }

  // Load existing work item
  try {
    const workItem = await manager.getWorkItem(id);
    const parent = workItem.parent ? await manager.getParent(id) : null;
    const children = await manager.getChildren(id);

    return {
      workItem,
      parent,
      children,
      registry,
      manager
    };
  } catch (error) {
    throw new Error(`Failed to load work item ${id}: ${error.message}`);
  }
}

/**
 * Create work items from breakdown structure
 *
 * Takes an array of work item specifications and creates them using CascadeManager.
 * Handles parent-child relationships automatically.
 *
 * @param {Array<Object>} breakdown - Array of work item specs
 *   Each spec: { type: 'E'|'F'|'S'|etc, data: { title, description, parent, ... } }
 * @param {string} cascadeDir - Path to .cascade directory
 * @returns {Promise<Object>} Result with created items and manager
 *
 * Example breakdown:
 * [
 *   {
 *     type: 'E',
 *     data: {
 *       title: 'User Authentication System',
 *       description: 'Implement comprehensive auth',
 *       status: 'planned',
 *       priority: 'high',
 *       complexity: 'complex'
 *     }
 *   },
 *   {
 *     type: 'F',
 *     data: {
 *       title: 'Login Functionality',
 *       parent: 'E0001',  // Reference to created Epic
 *       description: 'Email/password login',
 *       complexity: 'medium'
 *     }
 *   }
 * ]
 */
async function createWorkItems(breakdown, cascadeDir = '.cascade') {
  const manager = new CascadeManager(cascadeDir);
  const created = [];
  const idMap = {}; // Track created IDs for parent references

  for (const item of breakdown) {
    // Validate item structure
    if (!item.type) {
      throw new Error('Work item must have a type');
    }
    if (!item.data || !item.data.title) {
      throw new Error('Work item must have data with title');
    }

    // Replace placeholder parent references with actual IDs
    if (item.data.parent && item.data.parent.startsWith('$')) {
      // e.g., "$0" means "first created item"
      const index = parseInt(item.data.parent.substring(1));
      if (created[index]) {
        item.data.parent = created[index].id;
      } else {
        throw new Error(`Invalid parent reference: ${item.data.parent}`);
      }
    }

    // Create work item
    try {
      const result = await manager.createWorkItem(item.type, item.data);
      created.push(result);

      // Track ID for future references
      idMap[created.length - 1] = result.id;
    } catch (error) {
      throw new Error(`Failed to create ${item.type} "${item.data.title}": ${error.message}`);
    }
  }

  return {
    created,
    manager,
    summary: {
      total: created.length,
      byType: created.reduce((acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      }, {})
    }
  };
}

/**
 * Check if input string looks like a work item ID
 *
 * Valid formats:
 * - P0001 (Project)
 * - E0001 (Epic)
 * - F0001 (Feature)
 * - S0001 (Story)
 * - B0001 (Bug)
 * - PH0001 (Phase)
 * - T0001 (Task)
 *
 * @param {string} input - Input string to check
 * @returns {boolean} True if looks like work item ID
 */
function isWorkItemId(input) {
  if (typeof input !== 'string') {
    return false;
  }

  // Match: one or more uppercase letters followed by exactly 4 digits
  // Examples: E0001, F0123, PH0001
  // Not valid: E001 (only 3 digits), E00001 (5 digits)
  return /^[A-Z]+\d{4}$/.test(input.trim());
}

/**
 * Format result for display to user
 *
 * @param {Array<Object>} createdItems - Array of created work items
 * @param {string} cascadeDir - Path to .cascade directory
 * @returns {Object} Formatted result
 */
function formatResult(createdItems, cascadeDir = '.cascade') {
  if (!createdItems || createdItems.length === 0) {
    return {
      summary: 'No work items created',
      items: [],
      next_steps: []
    };
  }

  // Group by type for summary
  const byType = createdItems.reduce((acc, item) => {
    const typeName = getTypeName(item.type);
    acc[typeName] = (acc[typeName] || 0) + 1;
    return acc;
  }, {});

  const summaryParts = Object.entries(byType)
    .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
    .join(', ');

  // Get top-level item (first created, usually)
  const topLevel = createdItems[0];

  return {
    summary: `Created ${createdItems.length} work item${createdItems.length > 1 ? 's' : ''}: ${summaryParts}`,
    items: createdItems.map(item => ({
      id: item.id,
      type: item.type,
      typeName: getTypeName(item.type),
      title: item.title,
      path: item.filePath,
      status: item.status,
      complexity: item.complexity
    })),
    next_steps: [
      `Review work items in ${cascadeDir}/`,
      topLevel ? `To break down further, run: /carl:plan ${topLevel.id}` : null,
      topLevel ? `To start work, run: /carl:work ${topLevel.id}` : null
    ].filter(Boolean)
  };
}

/**
 * Get human-readable type name
 * @private
 */
function getTypeName(type) {
  const typeMap = {
    'P': 'Project',
    'E': 'Epic',
    'F': 'Feature',
    'S': 'Story',
    'B': 'Bug',
    'PH': 'Phase',
    'T': 'Task'
  };
  return typeMap[type] || type;
}

/**
 * Parse work item ID to get type and number
 *
 * @param {string} id - Work item ID (e.g., "E0001")
 * @returns {Object|null} { type: 'E', number: 1 } or null if invalid
 */
function parseWorkItemId(id) {
  if (!isWorkItemId(id)) {
    return null;
  }

  const match = id.match(/^([A-Z]+)(\d+)$/);
  if (!match) {
    return null;
  }

  return {
    type: match[1],
    number: parseInt(match[2], 10),
    id: id
  };
}

module.exports = {
  loadContext,
  createWorkItems,
  isWorkItemId,
  formatResult,
  parseWorkItemId
};
