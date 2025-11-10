#!/usr/bin/env node
/**
 * Cascade Utilities for CARL
 *
 * Provides Node.js utilities for interacting with Cascade work items.
 * This module handles:
 * - Work item registry management
 * - Task status updates
 * - File creation and updates
 * - ID generation
 */

const fs = require('fs');
const path = require('path');

/**
 * Get the project root directory (where .cascade is located)
 */
function getProjectRoot() {
  // Try to find .cascade directory starting from current working directory
  let currentDir = process.cwd();

  while (currentDir !== path.parse(currentDir).root) {
    const cascadePath = path.join(currentDir, '.cascade');
    if (fs.existsSync(cascadePath)) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  throw new Error('.cascade directory not found. Are you in a Cascade-enabled project?');
}

/**
 * Get the .cascade directory path
 */
function getCascadeDir() {
  return path.join(getProjectRoot(), '.cascade');
}

/**
 * Get the registry file path
 */
function getRegistryPath() {
  return path.join(getCascadeDir(), 'work-item-registry.json');
}

/**
 * Read the work item registry
 */
function readRegistry() {
  const registryPath = getRegistryPath();

  if (!fs.existsSync(registryPath)) {
    throw new Error('work-item-registry.json not found in .cascade directory');
  }

  const content = fs.readFileSync(registryPath, 'utf8');
  return JSON.parse(content);
}

/**
 * Write the work item registry
 */
function writeRegistry(registry) {
  const registryPath = getRegistryPath();
  registry.last_updated = new Date().toISOString();
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf8');
}

/**
 * Get next available ID for a work item type
 * Uses a global counter to ensure unique numeric IDs across all work item types.
 * For example, if E0001 exists, the next Feature will be F0002 (not F0001).
 *
 * @param {string} type - Work item type prefix (P, E, F, S, B, PH, T)
 * @returns {string} Next ID (e.g., "T0042")
 */
function getNextId(type) {
  const registry = readRegistry();

  // Validate type exists
  const validTypes = ['P', 'E', 'F', 'S', 'B', 'PH', 'T'];
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid work item type: ${type}`);
  }

  // Initialize global counter if it doesn't exist
  if (!registry.global_id_counter) {
    // Find the highest numeric ID from existing work items
    let maxId = 0;
    for (const workItemId in registry.work_items) {
      const numericPart = parseInt(workItemId.match(/\d+$/)[0], 10);
      if (numericPart > maxId) {
        maxId = numericPart;
      }
    }
    registry.global_id_counter = maxId;
  }

  const nextNumber = registry.global_id_counter + 1;
  return `${type}${String(nextNumber).padStart(4, '0')}`;
}

/**
 * Increment ID counter in registry
 * Uses global counter to ensure unique numeric IDs across all work item types.
 * @param {string} type - Work item type prefix (unused, kept for backward compatibility)
 */
function incrementIdCounter(type) {
  const registry = readRegistry();

  // Initialize global counter if it doesn't exist
  if (!registry.global_id_counter) {
    // Find the highest numeric ID from existing work items
    let maxId = 0;
    for (const workItemId in registry.work_items) {
      const numericPart = parseInt(workItemId.match(/\d+$/)[0], 10);
      if (numericPart > maxId) {
        maxId = numericPart;
      }
    }
    registry.global_id_counter = maxId;
  }

  registry.global_id_counter++;
  writeRegistry(registry);
}

/**
 * Add work item to registry
 * @param {object} workItem - Work item object
 */
function addToRegistry(workItem) {
  const registry = readRegistry();

  // Validate required fields
  const required = ['id', 'type', 'path', 'title', 'status', 'parent', 'created', 'updated'];
  for (const field of required) {
    if (!workItem[field] && field !== 'parent') { // parent can be null for Projects
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Add to registry
  registry.work_items[workItem.id] = workItem;

  // Initialize global counter if it doesn't exist
  if (!registry.global_id_counter) {
    registry.global_id_counter = 0;
  }

  // Extract numeric part from ID and update global counter if necessary
  const numericPart = parseInt(workItem.id.match(/\d+$/)[0], 10);
  if (numericPart > registry.global_id_counter) {
    registry.global_id_counter = numericPart;
  }

  writeRegistry(registry);
}

/**
 * Update work item in registry
 * @param {string} workItemId - Work item ID
 * @param {object} updates - Fields to update
 */
function updateRegistry(workItemId, updates) {
  const registry = readRegistry();

  if (!registry.work_items[workItemId]) {
    throw new Error(`Work item not found: ${workItemId}`);
  }

  registry.work_items[workItemId] = {
    ...registry.work_items[workItemId],
    ...updates,
    updated: new Date().toISOString().split('T')[0]
  };

  writeRegistry(registry);
}

/**
 * Find work item by ID
 * @param {string} workItemId - Work item ID
 * @returns {object|null} Work item object or null if not found
 */
function findWorkItem(workItemId) {
  const registry = readRegistry();
  return registry.work_items[workItemId] || null;
}

/**
 * Create frontmatter from work item data
 * @param {object} workItem - Work item object
 * @returns {string} Frontmatter YAML
 */
function createFrontmatter(workItem) {
  const fields = ['id', 'type', 'title', 'parent', 'created', 'updated'];
  const lines = ['---'];

  for (const field of fields) {
    if (workItem[field] !== undefined && workItem[field] !== null) {
      lines.push(`${field}: ${workItem[field]}`);
    }
  }

  lines.push('---');
  return lines.join('\n');
}

/**
 * Create work item markdown file
 * @param {object} workItem - Work item object
 * @param {string} content - Markdown content (without frontmatter)
 */
function createWorkItemFile(workItem, content = '') {
  const cascadeDir = getCascadeDir();
  const filePath = path.join(cascadeDir, workItem.path);

  // Ensure directory exists
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  // Create frontmatter
  const frontmatter = createFrontmatter(workItem);

  // Default content if none provided
  if (!content) {
    content = `\n# ${workItem.title}\n\n## Description\n\nTODO: Add description\n`;
  }

  // Write file
  const fullContent = `${frontmatter}\n${content}`;
  fs.writeFileSync(filePath, fullContent, 'utf8');
}

/**
 * Create initial state.json for a parent work item
 * @param {string} parentId - Parent work item ID
 * @param {string} workItemType - Work item type (Epic, Feature, Story, Phase)
 */
function createStateFile(parentId, workItemType) {
  const registry = readRegistry();
  const workItem = registry.work_items[parentId];

  if (!workItem) {
    throw new Error(`Work item not found: ${parentId}`);
  }

  const cascadeDir = getCascadeDir();
  const workItemPath = path.join(cascadeDir, workItem.path);
  const stateDir = path.dirname(workItemPath);
  const statePath = path.join(stateDir, 'state.json');

  // Create initial state
  const state = {
    id: parentId,
    status: 'planned',
    progress: {
      total_items: 0,
      completed: 0,
      in_progress: 0,
      planned: 0,
      percentage: 0
    },
    children: {},
    updated: new Date().toISOString()
  };

  // Ensure directory exists
  fs.mkdirSync(stateDir, { recursive: true });

  // Write state file
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Read state.json file
 * @param {string} stateFilePath - Path to state.json
 * @returns {object} State object
 */
function readStateFile(stateFilePath) {
  if (!fs.existsSync(stateFilePath)) {
    throw new Error(`State file not found: ${stateFilePath}`);
  }

  const content = fs.readFileSync(stateFilePath, 'utf8');
  return JSON.parse(content);
}

/**
 * Write state.json file
 * @param {string} stateFilePath - Path to state.json
 * @param {object} state - State object
 */
function writeStateFile(stateFilePath, state) {
  state.updated = new Date().toISOString();
  fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Update task status in parent state.json
 * @param {string} taskId - Task ID
 * @param {string} parentId - Parent work item ID (Story or Phase)
 * @param {string} status - New status (planned, in-progress, completed)
 * @param {number} progress - Progress percentage (0-100)
 */
function updateTaskStatus(taskId, parentId, status, progress) {
  const registry = readRegistry();
  const parent = registry.work_items[parentId];

  if (!parent) {
    throw new Error(`Parent work item not found: ${parentId}`);
  }

  // Get parent state file path
  const cascadeDir = getCascadeDir();
  const parentPath = path.join(cascadeDir, parent.path);
  const stateDir = path.dirname(parentPath);
  const statePath = path.join(stateDir, 'state.json');

  // Read state
  const state = readStateFile(statePath);

  // Initialize children if not exists
  if (!state.children) {
    state.children = {};
  }

  // Update task status
  state.children[taskId] = {
    status: status,
    progress: progress
  };

  // Recalculate parent progress
  const children = Object.values(state.children);
  const totalItems = children.length;
  const completed = children.filter(c => c.status === 'completed').length;
  const inProgress = children.filter(c => c.status === 'in-progress').length;
  const planned = children.filter(c => c.status === 'planned').length;
  const avgProgress = children.reduce((sum, c) => sum + c.progress, 0) / totalItems;

  state.progress = {
    total_items: totalItems,
    completed: completed,
    in_progress: inProgress,
    planned: planned,
    percentage: Math.round(avgProgress)
  };

  // Update parent status based on children
  if (completed === totalItems) {
    state.status = 'completed';
  } else if (inProgress > 0 || completed > 0) {
    state.status = 'in-progress';
  } else {
    state.status = 'planned';
  }

  // Write state
  writeStateFile(statePath, state);
}

/**
 * Get all tasks for a parent work item
 * @param {string} parentId - Parent work item ID
 * @returns {object} Object with task IDs as keys and status/progress as values
 */
function getTasks(parentId) {
  const registry = readRegistry();
  const parent = registry.work_items[parentId];

  if (!parent) {
    throw new Error(`Parent work item not found: ${parentId}`);
  }

  const cascadeDir = getCascadeDir();
  const parentPath = path.join(cascadeDir, parent.path);
  const stateDir = path.dirname(parentPath);
  const statePath = path.join(stateDir, 'state.json');

  if (!fs.existsSync(statePath)) {
    return {};
  }

  const state = readStateFile(statePath);
  return state.children || {};
}

/**
 * Generate a slug from a title
 * @param {string} title - Work item title
 * @returns {string} URL-friendly slug
 */
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Export all functions
module.exports = {
  getProjectRoot,
  getCascadeDir,
  getRegistryPath,
  readRegistry,
  writeRegistry,
  getNextId,
  incrementIdCounter,
  addToRegistry,
  updateRegistry,
  findWorkItem,
  createFrontmatter,
  createWorkItemFile,
  createStateFile,
  readStateFile,
  writeStateFile,
  updateTaskStatus,
  getTasks,
  generateSlug
};

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'next-id':
        const type = args[1];
        console.log(getNextId(type));
        break;

      case 'find':
        const id = args[1];
        console.log(JSON.stringify(findWorkItem(id), null, 2));
        break;

      case 'tasks':
        const parentId = args[1];
        console.log(JSON.stringify(getTasks(parentId), null, 2));
        break;

      case 'slug':
        const title = args.slice(1).join(' ');
        console.log(generateSlug(title));
        break;

      default:
        console.log('Usage:');
        console.log('  cascade-utils.cjs next-id <type>');
        console.log('  cascade-utils.cjs find <id>');
        console.log('  cascade-utils.cjs tasks <parent-id>');
        console.log('  cascade-utils.cjs slug <title>');
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}
