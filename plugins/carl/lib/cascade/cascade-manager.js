/**
 * Cascade Work Item Manager
 *
 * Core system for managing work items in Cascade format.
 * This is the ALWAYS-ON local source of truth for work item planning.
 *
 * Directory Structure:
 * .cascade/
 *   ├── P####.md (Project file in root)
 *   ├── state.json (Project state)
 *   ├── work-item-registry.json
 *   └── E####-{slug}/
 *       ├── E####.md
 *       ├── state.json
 *       └── F####-{slug}/
 *           ├── F####.md
 *           ├── state.json
 *           └── ... (continues with S/B/PH/T)
 *
 * State Management:
 * - CARL updates only the work item being worked on (markdown + local state.json)
 * - Cascade VSCode extension watches state.json changes and cascades updates to parents
 *
 * Based on IndyDevDan's principles:
 * - "Success is Planned" - detailed, actionable work items
 * - Atomic tasks with clear boundaries
 * - Clean separation of concerns
 * - Observable by default
 */

const fs = require('fs').promises;
const path = require('path');

class CascadeManager {
  constructor(cascadeDir = '.cascade', registryPath = '.cascade/work-item-registry.json') {
    this.cascadeDir = cascadeDir;
    this.registryPath = registryPath;
    this.workItemTypes = {
      P: { name: 'Project', hasDirectory: false },  // P stays in root
      E: { name: 'Epic', hasDirectory: true },
      F: { name: 'Feature', hasDirectory: true },
      S: { name: 'Story', hasDirectory: true },
      B: { name: 'Bug', hasDirectory: true },
      PH: { name: 'Phase', hasDirectory: true },
      T: { name: 'Task', hasDirectory: false }  // Tasks are leaf files
    };
  }

  /**
   * WORK ITEM CRUD OPERATIONS
   */

  /**
   * Create a new work item
   * TODO: Full implementation
   * @param {string} type - Work item type (P, E, F, S, B, PH, T)
   * @param {Object} data - Work item data (must include: title, parent)
   * @returns {Promise<Object>} - Created work item with ID and path
   */
  async createWorkItem(type, data) {
    // TODO: Implement
    // 1. Get next ID for type
    // 2. Generate directory path based on parent hierarchy
    // 3. Create directory if needed (Epic/Feature/Story/Bug/Phase)
    // 4. Generate markdown file with frontmatter
    // 5. Create initial state.json with status "planned"
    // 6. Write files
    // 7. Update registry with ID and path
    // 8. Return created work item with ID and full path
    throw new Error('createWorkItem() not yet implemented - see TODO in cascade-manager.js');
  }

  /**
   * Read a work item
   * TODO: Full implementation
   * @param {string} id - Work item ID (e.g., E1234)
   * @returns {Promise<Object>} - Work item data with markdown content and state
   */
  async getWorkItem(id) {
    // TODO: Implement
    // 1. Parse ID to get type and number
    // 2. Look up path in registry
    // 3. Read markdown file
    // 4. Parse frontmatter and content
    // 5. Read state.json from same directory
    // 6. Return combined object with markdown data + state
    throw new Error('getWorkItem() not yet implemented - see TODO in cascade-manager.js');
  }

  /**
   * Update a work item (markdown only)
   * TODO: Full implementation
   * @param {string} id - Work item ID
   * @param {Object} updates - Fields to update in frontmatter
   * @returns {Promise<Object>} - Updated work item
   */
  async updateWorkItem(id, updates) {
    // TODO: Implement
    // 1. Load current work item markdown
    // 2. Merge updates into frontmatter
    // 3. Update 'updated' timestamp
    // 4. Write markdown file
    // 5. Return updated work item
    // NOTE: Does NOT update state.json - use updateStatus() for that
    throw new Error('updateWorkItem() not yet implemented - see TODO in cascade-manager.js');
  }

  /**
   * Update work item status (markdown + state.json)
   * This is what CARL calls when completing work
   * Cascade VSCode extension watches state.json and cascades to parents
   *
   * TODO: Full implementation
   * @param {string} id - Work item ID
   * @param {string} status - New status (planned, in-progress, completed, blocked)
   * @returns {Promise<boolean>} - Success indicator
   */
  async updateStatus(id, status) {
    // TODO: Implement
    // 1. Validate status value
    // 2. Look up work item path in registry
    // 3. Update markdown frontmatter: status, updated fields
    // 4. Update local state.json: status, updated fields
    // 5. Write both files
    // 6. Return success
    // NOTE: Cascade VSCode extension handles parent state updates
    throw new Error('updateStatus() not yet implemented - see TODO in cascade-manager.js');
  }

  /**
   * Delete a work item
   * TODO: Full implementation
   * @param {string} id - Work item ID
   * @returns {Promise<boolean>} - Success indicator
   */
  async deleteWorkItem(id) {
    // TODO: Implement
    // 1. Check for children (warn if deleting parent)
    // 2. Remove directory (if has directory) or file (if Task)
    // 3. Remove state.json
    // 4. Update registry (mark as deleted, don't actually remove)
    // 5. Return success
    throw new Error('deleteWorkItem() not yet implemented - see TODO in cascade-manager.js');
  }

  /**
   * HIERARCHY OPERATIONS
   */

  /**
   * Get all children of a work item
   * TODO: Full implementation
   * @param {string} parentId - Parent work item ID
   * @returns {Promise<Array>} - Array of child work items
   */
  async getChildren(parentId) {
    // TODO: Implement
    // 1. Look up parent path in registry
    // 2. List subdirectories (for Epics/Features/Stories/Bugs/Phases)
    // 3. List markdown files (for Tasks)
    // 4. Load each child work item
    // 5. Return array of children
    throw new Error('getChildren() not yet implemented - see TODO in cascade-manager.js');
  }

  /**
   * Get complete hierarchy tree for a work item
   * TODO: Full implementation
   * @param {string} id - Work item ID
   * @returns {Promise<Object>} - Work item with nested children
   */
  async getHierarchy(id) {
    // TODO: Implement
    // 1. Load work item
    // 2. Recursively load all children
    // 3. Build tree structure
    // 4. Return complete hierarchy
    throw new Error('getHierarchy() not yet implemented - see TODO in cascade-manager.js');
  }

  /**
   * Get parent of a work item
   * TODO: Full implementation
   * @param {string} id - Work item ID
   * @returns {Promise<Object|null>} - Parent work item or null
   */
  async getParent(id) {
    // TODO: Implement
    // 1. Load work item
    // 2. Get parent ID from frontmatter
    // 3. Load parent work item
    // 4. Return parent or null
    throw new Error('getParent() not yet implemented - see TODO in cascade-manager.js');
  }

  /**
   * STATE OPERATIONS
   */

  /**
   * Get work item state from state.json
   * TODO: Full implementation
   * @param {string} id - Work item ID
   * @returns {Promise<Object>} - State object { status, progress, children, updated }
   */
  async getState(id) {
    // TODO: Implement
    // 1. Look up work item path in registry
    // 2. Read state.json from work item directory
    // 3. Return state object
    throw new Error('getState() not yet implemented - see TODO in cascade-manager.js');
  }

  /**
   * Create initial state.json for a work item
   * TODO: Full implementation
   * @param {string} dirPath - Directory path where state.json should be created
   * @param {string} id - Work item ID
   * @param {string} status - Initial status
   * @returns {Promise<boolean>} - Success indicator
   */
  async createState(dirPath, id, status = 'planned') {
    // TODO: Implement
    // 1. Create state object:
    //    { id, status, progress: { total_items: 0, completed: 0, ... }, children: {}, updated: timestamp }
    // 2. Write to state.json in dirPath
    // 3. Return success
    throw new Error('createState() not yet implemented - see TODO in cascade-manager.js');
  }

  /**
   * ID MANAGEMENT
   */

  /**
   * Get next available ID for work item type
   * TODO: Full implementation
   * @param {string} type - Work item type (P, E, F, S, B, PH, T)
   * @returns {Promise<string>} - Next ID (e.g., E0001)
   */
  async getNextId(type) {
    // TODO: Implement
    // 1. Load registry
    // 2. Get global counter from registry.global_id_counter
    // 3. Increment counter
    // 4. Save registry
    // 5. Return formatted ID (e.g., E0001)
    // NOTE: Uses global counter to ensure unique numeric IDs across all work item types
    throw new Error('getNextId() not yet implemented - see TODO in cascade-manager.js');
  }

  /**
   * Validate that ID is unique
   * TODO: Full implementation
   * @param {string} id - Work item ID to validate
   * @returns {Promise<boolean>} - True if unique
   */
  async validateId(id) {
    // TODO: Implement
    // 1. Load registry
    // 2. Check if ID exists in registry.work_items
    // 3. Return true if unique, false if exists
    throw new Error('validateId() not yet implemented - see TODO in cascade-manager.js');
  }

  /**
   * REGISTRY OPERATIONS
   */

  /**
   * Load the work item registry
   * TODO: Full implementation
   * @returns {Promise<Object>} - Registry object
   */
  async loadRegistry() {
    // TODO: Implement
    // 1. Check if registry file exists
    // 2. If not, create empty registry with structure:
    //    { version, last_updated, work_items: {}, global_id_counter: 0 }
    // 3. Read and parse JSON
    // 4. Return registry object
    throw new Error('loadRegistry() not yet implemented - see TODO in cascade-manager.js');
  }

  /**
   * Save the work item registry
   * TODO: Full implementation
   * @param {Object} registry - Registry object
   * @returns {Promise<boolean>} - Success indicator
   */
  async saveRegistry(registry) {
    // TODO: Implement
    // 1. Update last_updated timestamp
    // 2. Validate registry structure
    // 3. Write JSON to file (pretty-printed with 2 spaces)
    // 4. Return success
    throw new Error('saveRegistry() not yet implemented - see TODO in cascade-manager.js');
  }

  /**
   * Add work item to registry
   * TODO: Full implementation
   * @param {string} id - Work item ID
   * @param {Object} metadata - Work item metadata { type, path, title, status, parent, created, updated }
   * @returns {Promise<boolean>} - Success indicator
   */
  async addToRegistry(id, metadata) {
    // TODO: Implement
    // 1. Load registry
    // 2. Add entry: registry.work_items[id] = metadata
    // 3. Save registry
    // 4. Return success
    throw new Error('addToRegistry() not yet implemented - see TODO in cascade-manager.js');
  }

  /**
   * Remove work item from registry (marks as deleted, doesn't actually remove)
   * TODO: Full implementation
   * @param {string} id - Work item ID
   * @returns {Promise<boolean>} - Success indicator
   */
  async removeFromRegistry(id) {
    // TODO: Implement
    // 1. Load registry
    // 2. Mark as deleted: registry.work_items[id].deleted = true
    // 3. Don't actually remove (audit trail)
    // 4. Save registry
    // 5. Return success
    throw new Error('removeFromRegistry() not yet implemented - see TODO in cascade-manager.js');
  }

  /**
   * SEARCH AND QUERY
   */

  /**
   * Search work items by criteria
   * TODO: Full implementation
   * @param {Object} criteria - Search criteria { type, status, parent, etc. }
   * @returns {Promise<Array>} - Matching work items
   */
  async searchWorkItems(criteria) {
    // TODO: Implement
    // 1. Load registry
    // 2. Filter registry.work_items by criteria
    // 3. Load matching work items
    // 4. Return array of matches
    throw new Error('searchWorkItems() not yet implemented - see TODO in cascade-manager.js');
  }

  /**
   * Get all work items of a type
   * TODO: Full implementation
   * @param {string} type - Work item type
   * @returns {Promise<Array>} - All work items of type
   */
  async getWorkItemsByType(type) {
    // TODO: Implement
    // 1. Load registry
    // 2. Filter by type
    // 3. Load work items
    // 4. Return array
    throw new Error('getWorkItemsByType() not yet implemented - see TODO in cascade-manager.js');
  }

  /**
   * PATH AND DIRECTORY OPERATIONS
   */

  /**
   * Get the directory path for a work item based on parent hierarchy
   * TODO: Full implementation
   * @param {string} id - Work item ID
   * @param {string} title - Work item title (for slug generation)
   * @param {string} parentId - Parent work item ID (null for Project)
   * @returns {Promise<string>} - Directory path
   *
   * Examples:
   * - P0001 → .cascade/
   * - E0001 (parent: P0001) → .cascade/E0001-user-authentication/
   * - F0001 (parent: E0001) → .cascade/E0001-user-authentication/F0001-login-functionality/
   * - S0001 (parent: F0001) → .cascade/E0001-.../F0001-.../S0001-login-form/
   * - T0001 (parent: S0001) → .cascade/E0001-.../F0001-.../S0001-login-form/
   */
  async getWorkItemPath(id, title, parentId) {
    // TODO: Implement
    // 1. If parentId is null, return root (.cascade/)
    // 2. Look up parent path in registry
    // 3. Generate directory name: {id}-{slug}
    // 4. Combine parent path + directory name
    // 5. Return full path
    throw new Error('getWorkItemPath() not yet implemented - see TODO in cascade-manager.js');
  }

  /**
   * UTILITY FUNCTIONS
   */

  /**
   * Initialize Cascade directory structure
   * TODO: Full implementation
   * @returns {Promise<boolean>} - Success indicator
   */
  async initialize() {
    // TODO: Implement
    // 1. Create .cascade/ directory
    // 2. Create empty registry with structure:
    //    { version: "1.0.0", last_updated, work_items: {}, global_id_counter: 0 }
    // 3. Create root state.json (empty project state)
    // 4. Return success
    throw new Error('initialize() not yet implemented - see TODO in cascade-manager.js');
  }

  /**
   * Parse work item ID to get type and number
   * @param {string} id - Work item ID (e.g., E1234)
   * @returns {Object} - { type: 'E', number: 1234 }
   */
  parseId(id) {
    const match = id.match(/^([A-Z]+)(\d+)$/);
    if (!match) {
      throw new Error(`Invalid work item ID format: ${id}`);
    }
    return {
      type: match[1],
      number: parseInt(match[2], 10)
    };
  }

  /**
   * Generate filename slug from title
   * @param {string} title - Work item title
   * @returns {string} - URL-safe slug
   */
  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Generate directory name for work item
   * @param {string} id - Work item ID
   * @param {string} title - Work item title
   * @returns {string} - Directory name (e.g., "E0001-user-authentication")
   */
  generateDirectoryName(id, title) {
    const slug = this.generateSlug(title);
    return `${id}-${slug}`;
  }

  /**
   * Check if work item type has a directory (vs just being a file)
   * @param {string} type - Work item type
   * @returns {boolean} - True if type has directory
   */
  hasDirectory(type) {
    const typeInfo = this.workItemTypes[type];
    if (!typeInfo) {
      throw new Error(`Unknown work item type: ${type}`);
    }
    return typeInfo.hasDirectory;
  }

  /**
   * Validate work item type
   * @param {string} type - Work item type
   * @returns {boolean} - True if valid
   */
  isValidType(type) {
    return type in this.workItemTypes;
  }

  /**
   * Validate status value
   * @param {string} status - Status to validate
   * @returns {boolean} - True if valid
   */
  isValidStatus(status) {
    const validStatuses = ['planned', 'in-progress', 'completed', 'blocked'];
    return validStatuses.includes(status);
  }
}

module.exports = CascadeManager;
