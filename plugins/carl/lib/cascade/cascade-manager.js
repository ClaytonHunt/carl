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
  constructor(cascadeDir = '.cascade', registryPath = null) {
    this.cascadeDir = cascadeDir;
    // If registry path not specified, use cascadeDir/work-item-registry.json
    this.registryPath = registryPath || path.join(cascadeDir, 'work-item-registry.json');
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
   * @param {string} type - Work item type (P, E, F, S, B, PH, T)
   * @param {Object} data - Work item data (must include: title, parent for non-Project)
   * @returns {Promise<Object>} - Created work item with ID and path
   */
  async createWorkItem(type, data) {
    try {
      // Validate type
      if (!this.isValidType(type)) {
        throw new Error(`Invalid work item type: ${type}`);
      }

      // Validate required fields
      if (!data.title) {
        throw new Error('Work item title is required');
      }

      if (type !== 'P' && !data.parent) {
        throw new Error(`Parent is required for ${type} work items`);
      }

      // 1. Get next ID for type
      const id = await this.getNextId(type);

      // 2. Generate directory path based on parent hierarchy
      const dirPath = await this.getWorkItemPath(id, data.title, data.parent || null);

      // 3. Create directory if needed (Epic/Feature/Story/Bug/Phase have directories)
      if (this.hasDirectory(type)) {
        await fs.mkdir(dirPath, { recursive: true });
      }

      // 4. Generate markdown file with frontmatter
      const now = new Date().toISOString();
      const frontmatter = {
        id,
        type,  // Use the type code (P, E, F, etc.), not the name
        title: data.title,
        status: data.status || 'planned',
        priority: data.priority || 'medium',
        complexity: data.complexity || 'medium',
        ...(data.parent && { parent: data.parent }),
        created: now,
        updated: now
      };

      // Add optional fields
      if (data.description) frontmatter.description = data.description;
      if (data.assignee) frontmatter.assignee = data.assignee;
      if (data.tags) frontmatter.tags = data.tags;

      // Generate markdown content
      const markdown = this._generateMarkdown(frontmatter, data);

      // Determine file path
      const fileName = `${id}.md`;
      const filePath = path.join(dirPath, fileName);

      // Write markdown file
      await fs.writeFile(filePath, markdown, 'utf-8');

      // 5. Create initial state.json (except for Tasks - they don't have state.json)
      if (type !== 'T') {
        const statePath = path.join(dirPath, 'state.json');
        const state = {
          id,
          status: data.status || 'planned',
          progress: {
            total_items: 0,
            completed: 0,
            in_progress: 0,
            planned: 0,
            percentage: 0
          },
          children: {},
          updated: now
        };
        await fs.writeFile(statePath, JSON.stringify(state, null, 2), 'utf-8');
      }

      // 7. Update registry with ID and path
      // Convert type code to full name (P → Project, E → Epic, etc.)
      const typeName = this.workItemTypes[type].name;

      // Calculate relative path to markdown file (Cascade expects paths relative to .cascade dir)
      // Project: "P0001.md" (just filename in root)
      // Others: "E0003-slug/E0003.md" (relative path from .cascade)
      let relativePath;
      if (type === 'P') {
        relativePath = `${id}.md`;
      } else if (type === 'T') {
        // Tasks: parent directory + filename (e.g., "S0014-slug/T0023.md")
        const relativeDir = dirPath.replace(this.cascadeDir + path.sep, '').replace(this.cascadeDir, '');
        relativePath = path.join(relativeDir, `${id}.md`);
      } else {
        // Epic/Feature/Story/Bug/Phase: directory + filename
        const relativeDir = dirPath.replace(this.cascadeDir + path.sep, '').replace(this.cascadeDir, '');
        relativePath = path.join(relativeDir, `${id}.md`);
      }

      const metadata = {
        id: id,
        type: typeName,
        path: relativePath,
        title: data.title,
        status: data.status || 'planned',
        parent: data.parent || null,
        created: now,
        updated: now
      };
      await this.addToRegistry(id, metadata);

      // 8. Update parent's state.json to include this child
      if (data.parent) {
        await this.addChildToParentState(data.parent, id, data.status || 'planned');
      }

      // 9. Return created work item with ID and full path
      return {
        id,
        type,
        title: data.title,
        status: data.status || 'planned',
        path: dirPath,
        filePath,
        ...frontmatter
      };
    } catch (error) {
      throw new Error(`Failed to create work item: ${error.message}`);
    }
  }

  /**
   * Generate markdown content from frontmatter and data
   * @private
   * @param {Object} frontmatter - Frontmatter fields
   * @param {Object} data - Additional data
   * @returns {string} - Markdown content
   */
  _generateMarkdown(frontmatter, data) {
    // Generate frontmatter
    const frontmatterLines = Object.entries(frontmatter)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}: [${value.join(', ')}]`;
        }
        return `${key}: ${value}`;
      });

    const frontmatterBlock = `---\n${frontmatterLines.join('\n')}\n---\n\n`;

    // Generate content
    let content = `# ${frontmatter.title}\n\n`;

    if (data.description) {
      content += `## Description\n\n${data.description}\n\n`;
    } else {
      content += `## Description\n\n[Description goes here]\n\n`;
    }

    content += `## Acceptance Criteria\n\n`;
    if (data.acceptanceCriteria && Array.isArray(data.acceptanceCriteria)) {
      data.acceptanceCriteria.forEach(criterion => {
        content += `- [ ] ${criterion}\n`;
      });
    } else {
      content += `- [ ] Criterion 1\n- [ ] Criterion 2\n- [ ] Criterion 3\n`;
    }
    content += `\n`;

    if (data.dependencies && data.dependencies.length > 0) {
      content += `## Dependencies\n\n`;
      data.dependencies.forEach(dep => {
        content += `- Depends on: ${dep}\n`;
      });
      content += `\n`;
    }

    content += `## Notes\n\n`;
    if (data.notes) {
      content += `${data.notes}\n`;
    } else {
      content += `Additional notes and context go here.\n`;
    }

    return frontmatterBlock + content;
  }

  /**
   * Read a work item
   * @param {string} id - Work item ID (e.g., E1234)
   * @returns {Promise<Object>} - Work item data with markdown content and state
   */
  async getWorkItem(id) {
    try {
      // 1. Parse ID to get type and number
      this.parseId(id); // Validates format

      // 2. Look up path in registry
      const registry = await this.loadRegistry();
      const metadata = registry.work_items[id];

      if (!metadata) {
        throw new Error(`Work item not found: ${id}`);
      }

      if (metadata.deleted) {
        throw new Error(`Work item has been deleted: ${id}`);
      }

      // 3. Read markdown file
      // metadata.path is relative to cascadeDir and includes the filename
      const filePath = path.join(this.cascadeDir, metadata.path);
      const markdownContent = await fs.readFile(filePath, 'utf-8');

      // 4. Parse frontmatter and content
      const parsed = this._parseMarkdown(markdownContent);

      // 5. Read state.json from same directory (if it exists - Tasks don't have state.json)
      let state = null;
      const { type } = this.parseId(id);
      if (type !== 'T') {
        // Get directory containing the work item file
        const workItemDir = path.dirname(filePath);
        const statePath = path.join(workItemDir, 'state.json');
        try {
          const stateContent = await fs.readFile(statePath, 'utf-8');
          state = JSON.parse(stateContent);
        } catch (error) {
          // State file might not exist for older work items
          console.warn(`State file not found for ${id}: ${error.message}`);
        }
      }

      // 6. Return combined object with markdown data + state
      // Note: frontmatter spreads last so it overwrites registry metadata (e.g., type code wins over type name)
      return {
        id,
        ...metadata,
        ...parsed.frontmatter,
        content: parsed.content,
        state,
        filePath
      };
    } catch (error) {
      throw new Error(`Failed to get work item: ${error.message}`);
    }
  }

  /**
   * Parse markdown with frontmatter
   * @private
   * @param {string} markdown - Markdown content
   * @returns {Object} - { frontmatter, content }
   */
  _parseMarkdown(markdown) {
    // Match frontmatter block
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = markdown.match(frontmatterRegex);

    if (!match) {
      // No frontmatter
      return {
        frontmatter: {},
        content: markdown
      };
    }

    // Parse frontmatter
    const frontmatterText = match[1];
    const content = match[2];

    const frontmatter = {};
    const lines = frontmatterText.split('\n');

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        let value = line.substring(colonIndex + 1).trim();

        // Parse arrays
        if (value.startsWith('[') && value.endsWith(']')) {
          value = value
            .slice(1, -1)
            .split(',')
            .map(item => item.trim())
            .filter(item => item.length > 0);
        }

        frontmatter[key] = value;
      }
    }

    return { frontmatter, content };
  }

  /**
   * Update a work item (markdown only)
   * @param {string} id - Work item ID
   * @param {Object} updates - Fields to update in frontmatter
   * @returns {Promise<Object>} - Updated work item
   */
  async updateWorkItem(id, updates) {
    try {
      // 1. Load current work item
      const workItem = await this.getWorkItem(id);

      // 2. Merge updates into frontmatter
      const updatedFrontmatter = {
        ...workItem,
        ...updates,
        updated: new Date().toISOString()
      };

      // Remove properties that shouldn't be in frontmatter
      delete updatedFrontmatter.content;
      delete updatedFrontmatter.state;
      delete updatedFrontmatter.filePath;
      delete updatedFrontmatter.path;

      // 3. Generate updated markdown
      const markdown = this._generateMarkdown(updatedFrontmatter, updates);

      // 4. Write markdown file
      await fs.writeFile(workItem.filePath, markdown, 'utf-8');

      // 5. Update registry
      const registry = await this.loadRegistry();
      if (registry.work_items[id]) {
        registry.work_items[id].updated = updatedFrontmatter.updated;
        if (updates.title) registry.work_items[id].title = updates.title;
        if (updates.status) registry.work_items[id].status = updates.status;
        await this.saveRegistry(registry);
      }

      // 6. Return updated work item
      return await this.getWorkItem(id);
    } catch (error) {
      throw new Error(`Failed to update work item: ${error.message}`);
    }
  }

  /**
   * Update work item status (markdown + state.json)
   * This is what CARL calls when completing work
   * Cascade VSCode extension watches state.json and cascades to parents
   *
   * @param {string} id - Work item ID
   * @param {string} status - New status (planned, in-progress, completed, blocked)
   * @returns {Promise<boolean>} - Success indicator
   */
  async updateStatus(id, status) {
    try {
      // 1. Validate status value
      if (!this.isValidStatus(status)) {
        throw new Error(`Invalid status: ${status}`);
      }

      const { type } = this.parseId(id);

      // 2. Update markdown frontmatter
      await this.updateWorkItem(id, { status });

      // 3. Update state.json (Tasks don't have state.json)
      if (type !== 'T') {
        // Load current state
        const state = await this.getState(id);

        // Update status and timestamp
        state.status = status;
        state.updated = new Date().toISOString();

        // Write updated state
        const registry = await this.loadRegistry();
        const metadata = registry.work_items[id];
        // metadata.path includes filename, get directory and join with state.json
        const filePath = path.join(this.cascadeDir, metadata.path);
        const dirPath = path.dirname(filePath);
        const statePath = path.join(dirPath, 'state.json');

        await fs.writeFile(statePath, JSON.stringify(state, null, 2), 'utf-8');
      }

      // 4. Update registry
      const registry = await this.loadRegistry();
      if (registry.work_items[id]) {
        registry.work_items[id].status = status;
        registry.work_items[id].updated = new Date().toISOString();
        await this.saveRegistry(registry);
      }

      // NOTE: Cascade VSCode extension watches state.json and cascades to parents
      return true;
    } catch (error) {
      throw new Error(`Failed to update status: ${error.message}`);
    }
  }

  /**
   * Add child to parent's state.json children map
   * Required by Cascade v0.2.0 validation
   * @param {string} parentId - Parent work item ID
   * @param {string} childId - Child work item ID
   * @param {string} childStatus - Child's initial status
   * @returns {Promise<void>}
   */
  async addChildToParentState(parentId, childId, childStatus) {
    try {
      const { type: parentType } = this.parseId(parentId);

      // Projects and non-Task items have state.json
      if (parentType !== 'T') {
        // Get parent's state.json path
        const registry = await this.loadRegistry();
        const parentEntry = registry.work_items[parentId];

        if (!parentEntry) {
          throw new Error(`Parent work item not found: ${parentId}`);
        }

        // Construct state.json path for parent
        let parentStatePath;
        if (parentType === 'P') {
          parentStatePath = path.join(this.cascadeDir, 'state.json');
        } else {
          const parentDir = path.dirname(parentEntry.path);
          parentStatePath = path.join(this.cascadeDir, parentDir, 'state.json');
        }

        // Load parent's state
        const stateContent = await fs.readFile(parentStatePath, 'utf-8');
        const parentState = JSON.parse(stateContent);

        // Add child to children map
        if (!parentState.children) {
          parentState.children = {};
        }

        parentState.children[childId] = {
          status: childStatus,
          progress: 0  // Initial progress is 0
        };

        // Update timestamp
        parentState.updated = new Date().toISOString();

        // Write updated state
        await fs.writeFile(parentStatePath, JSON.stringify(parentState, null, 2), 'utf-8');
      }
    } catch (error) {
      throw new Error(`Failed to add child to parent state: ${error.message}`);
    }
  }

  /**
   * Delete a work item
   * @param {string} id - Work item ID
   * @returns {Promise<boolean>} - Success indicator
   */
  async deleteWorkItem(id) {
    try {
      // Get work item to find path
      const workItem = await this.getWorkItem(id);
      const { type } = this.parseId(id);

      // 1. Check for children (warn if deleting parent with children)
      if (workItem.state && workItem.state.children) {
        const childCount = Object.keys(workItem.state.children).length;
        if (childCount > 0) {
          console.warn(`Warning: Deleting ${id} which has ${childCount} children`);
        }
      }

      // 2. Remove directory (if has directory) or file (if Task)
      if (this.hasDirectory(type)) {
        // Remove entire directory
        // workItem.filePath points to the markdown file, get its directory
        const dirPath = path.dirname(workItem.filePath);
        await fs.rm(dirPath, { recursive: true, force: true });
      } else {
        // Remove just the file (Task)
        await fs.unlink(workItem.filePath);
      }

      // 4. Update registry (mark as deleted, don't actually remove - audit trail)
      await this.removeFromRegistry(id);

      // 5. Return success
      return true;
    } catch (error) {
      throw new Error(`Failed to delete work item: ${error.message}`);
    }
  }

  /**
   * HIERARCHY OPERATIONS
   */

  /**
   * Get all children of a work item
   * @param {string} parentId - Parent work item ID
   * @returns {Promise<Array>} - Array of child work items
   */
  async getChildren(parentId) {
    try {
      // Validate ID format
      this.parseId(parentId);

      // 1. Look up parent path in registry
      const registry = await this.loadRegistry();
      const parentMetadata = registry.work_items[parentId];

      if (!parentMetadata) {
        return []; // Parent not found - return empty array
      }

      // parentMetadata.path is the file path (e.g., "S0004-story/S0004.md")
      // For directories with children, we need the directory path
      // For Projects (P####.md), the directory is the cascade root
      const parentFilePath = path.join(this.cascadeDir, parentMetadata.path);
      const parentDirPath = path.dirname(parentFilePath);
      const children = [];

      // 2. List items in parent directory
      const items = await fs.readdir(parentDirPath, { withFileTypes: true });

      // 3. Process subdirectories (Epics/Features/Stories/Bugs/Phases)
      for (const item of items) {
        if (item.isDirectory()) {
          // Directory names are like: E0001-slug, F0002-slug, etc.
          const match = item.name.match(/^([A-Z]+\d+)-/);
          if (match) {
            const childId = match[1];
            try {
              const child = await this.getWorkItem(childId);
              children.push(child);
            } catch (error) {
              console.warn(`Skipping invalid child directory: ${item.name}`);
            }
          }
        } else if (item.isFile() && item.name.endsWith('.md')) {
          // Markdown files (Tasks or Projects in root)
          const match = item.name.match(/^([A-Z]+\d+)\.md$/);
          if (match) {
            const childId = match[1];
            // Skip parent's own file
            if (childId !== parentId) {
              try {
                const child = await this.getWorkItem(childId);
                // Only include if this is actually a child of the parent
                if (child.parent === parentId) {
                  children.push(child);
                }
              } catch (error) {
                console.warn(`Skipping invalid child file: ${item.name}`);
              }
            }
          }
        }
      }

      // 5. Return array of children
      return children;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return []; // Directory doesn't exist, no children
      }
      if (error.message.includes('Invalid work item ID format')) {
        throw error; // Re-throw validation errors
      }
      throw new Error(`Failed to get children: ${error.message}`);
    }
  }

  /**
   * Get complete hierarchy tree for a work item
   * @param {string} id - Work item ID
   * @returns {Promise<Object>} - Work item with nested children
   */
  async getHierarchy(id) {
    try {
      // Validate ID format
      this.parseId(id);

      // 1. Load work item
      const workItem = await this.getWorkItem(id);

      if (!workItem) {
        return null; // Work item not found
      }

      // 2. Recursively load all children
      const children = await this.getChildren(id);

      // 3. Build tree structure - recursively load hierarchy for each child
      const childrenWithHierarchy = await Promise.all(
        children.map(async (child) => {
          return await this.getHierarchy(child.id);
        })
      );

      // 4. Return complete hierarchy
      return {
        ...workItem,
        children: childrenWithHierarchy
      };
    } catch (error) {
      if (error.message.includes('not found')) {
        return null; // Work item not found - return null
      }
      if (error.message.includes('Invalid work item ID format')) {
        throw error; // Re-throw validation errors
      }
      throw new Error(`Failed to get hierarchy: ${error.message}`);
    }
  }

  /**
   * Get parent of a work item
   * @param {string} id - Work item ID
   * @returns {Promise<Object|null>} - Parent work item or null
   */
  async getParent(id) {
    try {
      // 1. Load work item
      const workItem = await this.getWorkItem(id);

      // 2. Get parent ID from frontmatter or registry
      const parentId = workItem.parent;

      if (!parentId) {
        return null; // No parent (e.g., Project)
      }

      // 3. Load parent work item
      try {
        const parent = await this.getWorkItem(parentId);
        return parent;
      } catch (parentError) {
        // Parent not found or deleted - return null
        if (parentError.message.includes('not found') ||
            parentError.message.includes('deleted') ||
            parentError.message.includes('ENOENT')) {
          return null;
        }
        throw parentError;
      }
    } catch (error) {
      if (error.message.includes('not found') ||
          error.message.includes('ENOENT')) {
        return null;
      }
      throw new Error(`Failed to get parent: ${error.message}`);
    }
  }

  /**
   * STATE OPERATIONS
   */

  /**
   * Get work item state from state.json
   * @param {string} id - Work item ID
   * @returns {Promise<Object>} - State object { status, progress, children, updated }
   */
  async getState(id) {
    try {
      // Tasks don't have state.json
      const { type } = this.parseId(id);
      if (type === 'T') {
        return null;
      }

      // 1. Look up work item path in registry
      const registry = await this.loadRegistry();
      const metadata = registry.work_items[id];

      if (!metadata) {
        return null;  // Work item not found - return null
      }

      // 2. Read state.json from work item directory
      // metadata.path includes filename, get directory and join with state.json
      const filePath = path.join(this.cascadeDir, metadata.path);
      const dirPath = path.dirname(filePath);
      const statePath = path.join(dirPath, 'state.json');
      const stateContent = await fs.readFile(statePath, 'utf-8');

      // 3. Return state object
      return JSON.parse(stateContent);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;  // State file not found - return null
      }
      throw new Error(`Failed to get state: ${error.message}`);
    }
  }

  /**
   * Create initial state.json for a work item
   * @param {string} dirPath - Directory path where state.json should be created
   * @param {string} id - Work item ID
   * @param {string} status - Initial status
   * @returns {Promise<boolean>} - Success indicator
   */
  async createState(dirPath, id, status = 'planned') {
    try {
      // Validate status
      if (!this.isValidStatus(status)) {
        throw new Error(`Invalid status: ${status}`);
      }

      // Ensure directory exists
      await fs.mkdir(dirPath, { recursive: true });

      // 1. Create state object
      const state = {
        id,
        status,
        progress: {
          total_items: 0,
          completed: 0,
          in_progress: 0,
          planned: 0,
          blocked: 0
        },
        children: {},
        updated: new Date().toISOString()
      };

      // 2. Write to state.json in dirPath
      const statePath = path.join(dirPath, 'state.json');
      await fs.writeFile(statePath, JSON.stringify(state, null, 2), 'utf-8');

      // 3. Return success
      return true;
    } catch (error) {
      throw new Error(`Failed to create state: ${error.message}`);
    }
  }

  /**
   * ID MANAGEMENT
   */

  /**
   * Get next available ID for work item type
   * @param {string} type - Work item type (P, E, F, S, B, PH, T)
   * @returns {Promise<string>} - Next ID (e.g., E0001)
   */
  async getNextId(type) {
    try {
      // Validate type
      if (!this.isValidType(type)) {
        throw new Error(`Invalid work item type: ${type}`);
      }

      // Load registry
      const registry = await this.loadRegistry();

      // Find the maximum ID across all types to maintain global uniqueness
      let maxId = 0;
      Object.values(registry.id_counters).forEach(count => {
        if (count > maxId) maxId = count;
      });

      // Use next global number
      const idNumber = maxId + 1;

      // Update the specific type counter
      if (!registry.id_counters[type]) {
        registry.id_counters[type] = 0;
      }
      registry.id_counters[type] = idNumber;

      // Save registry with updated counter
      await this.saveRegistry(registry);

      // Return formatted ID (e.g., E0001)
      return `${type}${String(idNumber).padStart(4, '0')}`;
    } catch (error) {
      throw new Error(`Failed to get next ID: ${error.message}`);
    }
  }

  /**
   * Validate that ID is unique
   * @param {string} id - Work item ID to validate
   * @returns {Promise<boolean>} - True if unique
   */
  async validateId(id) {
    try {
      // Parse and validate ID format
      this.parseId(id);

      // Load registry
      const registry = await this.loadRegistry();

      // Check if ID exists in registry.work_items
      // Also check if not marked as deleted
      const exists = id in registry.work_items && !registry.work_items[id].deleted;

      // Return true if unique (doesn't exist), false if exists
      return !exists;
    } catch (error) {
      throw new Error(`Failed to validate ID: ${error.message}`);
    }
  }

  /**
   * REGISTRY OPERATIONS
   */

  /**
   * Load the work item registry
   * @returns {Promise<Object>} - Registry object
   */
  async loadRegistry() {
    try {
      // Check if registry file exists
      await fs.access(this.registryPath);

      // Read and parse JSON
      const data = await fs.readFile(this.registryPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Registry doesn't exist, create empty one
        const emptyRegistry = {
          version: '1.0.0',
          last_updated: new Date().toISOString(),
          work_items: {},
          id_counters: {
            P: 0,
            E: 0,
            F: 0,
            S: 0,
            B: 0,
            PH: 0,
            T: 0
          }
        };
        return emptyRegistry;
      }
      throw new Error(`Failed to load registry: ${error.message}`);
    }
  }

  /**
   * Save the work item registry
   * @param {Object} registry - Registry object
   * @returns {Promise<boolean>} - Success indicator
   */
  async saveRegistry(registry) {
    try {
      // Update last_updated timestamp
      registry.last_updated = new Date().toISOString();

      // Validate registry structure
      if (!registry.version || !registry.work_items || !registry.id_counters) {
        throw new Error('Invalid registry structure');
      }

      // Ensure .cascade directory exists
      await fs.mkdir(path.dirname(this.registryPath), { recursive: true });

      // Write JSON to file (pretty-printed with 2 spaces)
      await fs.writeFile(this.registryPath, JSON.stringify(registry, null, 2), 'utf-8');

      return true;
    } catch (error) {
      throw new Error(`Failed to save registry: ${error.message}`);
    }
  }

  /**
   * Add work item to registry
   * @param {string} id - Work item ID
   * @param {Object} metadata - Work item metadata { type, path, title, status, parent, created, updated }
   * @returns {Promise<boolean>} - Success indicator
   */
  async addToRegistry(id, metadata) {
    try {
      // Load registry
      const registry = await this.loadRegistry();

      // Add entry
      registry.work_items[id] = metadata;

      // Save registry
      await this.saveRegistry(registry);

      return true;
    } catch (error) {
      throw new Error(`Failed to add to registry: ${error.message}`);
    }
  }

  /**
   * Remove work item from registry (marks as deleted, doesn't actually remove)
   * @param {string} id - Work item ID
   * @returns {Promise<boolean>} - Success indicator
   */
  async removeFromRegistry(id) {
    try {
      // Load registry
      const registry = await this.loadRegistry();

      if (!registry.work_items[id]) {
        throw new Error(`Work item not found in registry: ${id}`);
      }

      // Mark as deleted (audit trail - don't actually remove)
      registry.work_items[id].deleted = true;
      registry.work_items[id].deleted_at = new Date().toISOString();

      // Save registry
      await this.saveRegistry(registry);

      return true;
    } catch (error) {
      throw new Error(`Failed to remove from registry: ${error.message}`);
    }
  }

  /**
   * SEARCH AND QUERY
   */

  /**
   * Search work items by criteria
   * @param {Object} criteria - Search criteria { type, status, parent, title, deleted }
   * @returns {Promise<Array>} - Matching work items
   *
   * Examples:
   * - searchWorkItems({ type: 'F' }) - All Features
   * - searchWorkItems({ status: 'in-progress' }) - All in-progress items
   * - searchWorkItems({ parent: 'E0001' }) - All children of E0001
   * - searchWorkItems({ type: 'S', status: 'completed' }) - All completed Stories
   * - searchWorkItems({ deleted: false }) - All active items (default)
   */
  async searchWorkItems(criteria = {}) {
    try {
      // 1. Load registry
      const registry = await this.loadRegistry();

      // 2. Filter registry.work_items by criteria
      const matchingIds = Object.keys(registry.work_items).filter(id => {
        const metadata = registry.work_items[id];

        // By default, exclude deleted items unless explicitly requested
        if (criteria.deleted === undefined && metadata.deleted) {
          return false;
        }

        // Check each criterion
        for (const [key, value] of Object.entries(criteria)) {
          // Skip if value is undefined/null
          if (value === undefined || value === null) continue;

          // Special handling for 'deleted' criterion
          if (key === 'deleted') {
            const isDeleted = !!metadata.deleted;
            if (isDeleted !== value) {
              return false;
            }
            continue;
          }

          // Special handling for 'type' criterion - convert code to name
          if (key === 'type') {
            // If searching by type code (e.g., 'E'), convert to type name (e.g., 'Epic')
            let searchValue = value;
            if (this.workItemTypes[value]) {
              searchValue = this.workItemTypes[value].name;
            }
            if (metadata.type !== searchValue) {
              return false;
            }
            continue;
          }

          // Check if metadata matches criterion
          if (metadata[key] !== value) {
            return false;
          }
        }

        return true;
      });

      // 3. Load matching work items in parallel
      // For deleted items, return registry metadata directly
      // For active items, load full work item data
      const workItems = await Promise.all(
        matchingIds.map(async id => {
          const metadata = registry.work_items[id];

          // If deleted, return registry metadata only
          if (metadata.deleted) {
            return {
              id,
              ...metadata,
              state: null,
              content: null
            };
          }

          // Otherwise load full work item
          return await this.getWorkItem(id);
        })
      );

      // 4. Return array of matches
      return workItems;
    } catch (error) {
      throw new Error(`Failed to search work items: ${error.message}`);
    }
  }

  /**
   * Get all work items of a type
   * @param {string} type - Work item type (P, E, F, S, B, PH, T)
   * @returns {Promise<Array>} - All work items of type
   *
   * Examples:
   * - getWorkItemsByType('E') - All Epics
   * - getWorkItemsByType('S') - All Stories
   * - getWorkItemsByType('T') - All Tasks
   */
  async getWorkItemsByType(type) {
    try {
      // Validate type
      if (!this.isValidType(type)) {
        throw new Error(`Invalid work item type: ${type}`);
      }

      // Use searchWorkItems with type criterion
      return await this.searchWorkItems({ type });
    } catch (error) {
      throw new Error(`Failed to get work items by type: ${error.message}`);
    }
  }

  /**
   * PATH AND DIRECTORY OPERATIONS
   */

  /**
   * Get the directory path for a work item based on parent hierarchy
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
    try {
      const { type } = this.parseId(id);

      // Projects live in root
      if (!parentId || type === 'P') {
        return this.cascadeDir;
      }

      // Load registry to get parent path
      const registry = await this.loadRegistry();
      const parentEntry = registry.work_items[parentId];

      if (!parentEntry) {
        throw new Error(`Parent work item not found: ${parentId}`);
      }

      // Get parent directory from registry path (which is now a markdown file path)
      // Registry now stores:
      // - Project: "P0001.md" → directory is .cascade/
      // - Epic: "E0002-slug/E0002.md" → directory is .cascade/E0002-slug/
      let parentDir;
      const { type: parentType } = this.parseId(parentId);
      if (parentType === 'P') {
        // Project markdown file is in cascade root, so children go in cascade root
        parentDir = this.cascadeDir;
      } else {
        // Extract directory from markdown path (e.g., "E0002-slug/E0002.md" → "E0002-slug")
        const parentRelativeDir = path.dirname(parentEntry.path);
        parentDir = path.join(this.cascadeDir, parentRelativeDir);
      }

      // Tasks don't have their own directory - they live in parent directory
      if (type === 'T') {
        return parentDir;
      }

      // Generate directory name for this work item
      const dirName = this.generateDirectoryName(id, title);

      // Combine parent directory + this item's directory name
      return path.join(parentDir, dirName);
    } catch (error) {
      throw new Error(`Failed to get work item path: ${error.message}`);
    }
  }

  /**
   * UTILITY FUNCTIONS
   */

  /**
   * Initialize Cascade directory structure
   * @returns {Promise<boolean>} - Success indicator
   */
  async initialize() {
    try {
      // 1. Create .cascade/ directory
      await fs.mkdir(this.cascadeDir, { recursive: true });

      // 2. Create empty registry with structure
      const registry = {
        version: '1.0.0',
        last_updated: new Date().toISOString(),
        work_items: {},
        id_counters: {
          P: 0,
          E: 0,
          F: 0,
          S: 0,
          B: 0,
          PH: 0,
          T: 0
        }
      };
      await this.saveRegistry(registry);

      // 3. Create root state.json (empty project state)
      const rootStatePath = path.join(this.cascadeDir, 'state.json');
      const rootState = {
        id: 'root',
        status: 'in-progress',
        progress: {
          total_items: 0,
          completed: 0,
          in_progress: 0,
          planned: 0,
          blocked: 0
        },
        children: {},
        updated: new Date().toISOString()
      };
      await fs.writeFile(rootStatePath, JSON.stringify(rootState, null, 2), 'utf-8');

      return true;
    } catch (error) {
      throw new Error(`Failed to initialize Cascade directory: ${error.message}`);
    }
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
