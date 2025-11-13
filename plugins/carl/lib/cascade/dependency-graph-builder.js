/**
 * Dependency Graph Builder
 *
 * Builds a dependency graph from Cascade work item files.
 * Handles parent-child relationships and explicit dependencies.
 *
 * Based on IndyDevDan's principles:
 * - Read from source of truth (Cascade files)
 * - Handle errors gracefully
 * - Observable by default
 */

const fs = require('fs').promises;
const path = require('path');
const { DependencyGraph } = require('./dependency-graph');

class DependencyGraphBuilder {
  /**
   * @param {string} cascadeDir - Path to .cascade directory
   */
  constructor(cascadeDir = '.cascade') {
    this.cascadeDir = cascadeDir;
    this.graph = new DependencyGraph();
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Build the dependency graph from Cascade files
   * @returns {Promise<DependencyGraph>}
   */
  async build() {
    this.graph.clear();
    this.errors = [];
    this.warnings = [];

    try {
      // Find all work item files
      const workItems = await this.findAllWorkItems();

      // Phase 1: Add all nodes
      for (const item of workItems) {
        try {
          this.graph.addNode(item.id, item);
        } catch (error) {
          this.errors.push({
            type: 'node_creation',
            item: item.id,
            message: error.message
          });
        }
      }

      // Phase 2: Add parent-child edges
      for (const item of workItems) {
        if (item.parent) {
          try {
            // Validate parent exists
            if (!this.graph.hasNode(item.parent)) {
              this.warnings.push({
                type: 'missing_parent',
                item: item.id,
                parent: item.parent,
                message: `Parent ${item.parent} does not exist for ${item.id}`
              });
              continue;
            }

            // Add edge: child depends on parent
            this.graph.addEdge(item.id, item.parent, {
              type: 'parent-child'
            });
          } catch (error) {
            this.errors.push({
              type: 'edge_creation',
              item: item.id,
              parent: item.parent,
              message: error.message
            });
          }
        }
      }

      // Phase 3: Add explicit dependency edges
      for (const item of workItems) {
        if (item.depends_on && Array.isArray(item.depends_on)) {
          for (const dependency of item.depends_on) {
            try {
              // Validate dependency exists
              if (!this.graph.hasNode(dependency)) {
                this.warnings.push({
                  type: 'missing_dependency',
                  item: item.id,
                  dependency: dependency,
                  message: `Dependency ${dependency} does not exist for ${item.id}`
                });
                continue;
              }

              // Add edge: item depends on dependency
              this.graph.addEdge(item.id, dependency, {
                type: 'explicit'
              });
            } catch (error) {
              this.errors.push({
                type: 'dependency_edge_creation',
                item: item.id,
                dependency: dependency,
                message: error.message
              });
            }
          }
        }
      }

      return this.graph;
    } catch (error) {
      this.errors.push({
        type: 'build_failed',
        message: error.message
      });
      throw error;
    }
  }

  /**
   * Find all work item files in the Cascade directory
   * @returns {Promise<Array>} Array of work item objects
   */
  async findAllWorkItems() {
    const workItems = [];
    const cascadeAbsPath = path.resolve(this.cascadeDir);

    try {
      await fs.access(cascadeAbsPath);
    } catch (error) {
      throw new Error(`Cascade directory not found: ${cascadeAbsPath}`);
    }

    // Recursively find all markdown files
    await this._scanDirectory(cascadeAbsPath, workItems);

    return workItems;
  }

  /**
   * Recursively scan directory for work item files
   * @private
   */
  async _scanDirectory(dirPath, workItems) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Skip hidden directories and session directories
          if (entry.name.startsWith('.')) {
            continue;
          }

          // Recursively scan subdirectories
          await this._scanDirectory(fullPath, workItems);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          // Skip non-work-item markdown files
          if (!this._isWorkItemFile(entry.name)) {
            continue;
          }

          // Parse work item
          try {
            const item = await this._parseWorkItem(fullPath);
            if (item) {
              workItems.push(item);
            }
          } catch (error) {
            this.warnings.push({
              type: 'parse_error',
              file: fullPath,
              message: error.message
            });
          }
        }
      }
    } catch (error) {
      this.warnings.push({
        type: 'scan_error',
        directory: dirPath,
        message: error.message
      });
    }
  }

  /**
   * Check if filename matches work item pattern
   * @private
   */
  _isWorkItemFile(filename) {
    // Match patterns: P####.md, E####.md, F####.md, S####.md, B####.md, PH####.md, T####.md
    return /^(P|E|F|S|B|PH|T)\d{4,}\.md$/.test(filename);
  }

  /**
   * Parse work item from markdown file
   * @private
   */
  async _parseWorkItem(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');

      // Extract frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!frontmatterMatch) {
        return null;
      }

      const frontmatter = this._parseFrontmatter(frontmatterMatch[1]);

      // Validate required fields
      if (!frontmatter.id || !frontmatter.type || !frontmatter.title) {
        this.warnings.push({
          type: 'invalid_frontmatter',
          file: filePath,
          message: 'Missing required fields: id, type, or title'
        });
        return null;
      }

      return {
        id: frontmatter.id,
        type: frontmatter.type,
        title: frontmatter.title,
        status: frontmatter.status || 'planned',
        priority: frontmatter.priority || 'medium',
        complexity: frontmatter.complexity || 'medium',
        parent: frontmatter.parent || null,
        depends_on: frontmatter.depends_on || [],
        created: frontmatter.created,
        updated: frontmatter.updated,
        filePath: filePath
      };
    } catch (error) {
      throw new Error(`Failed to parse ${filePath}: ${error.message}`);
    }
  }

  /**
   * Parse YAML-like frontmatter
   * @private
   */
  _parseFrontmatter(text) {
    const result = {};
    const lines = text.split('\n');

    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const key = match[1];
        let value = match[2].trim();

        // Handle arrays (e.g., depends_on: [F0001, F0002])
        if (value.startsWith('[') && value.endsWith(']')) {
          value = value
            .slice(1, -1)
            .split(',')
            .map(v => v.trim())
            .filter(v => v.length > 0);
        }

        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Get build errors
   * @returns {Array}
   */
  getErrors() {
    return this.errors;
  }

  /**
   * Get build warnings
   * @returns {Array}
   */
  getWarnings() {
    return this.warnings;
  }

  /**
   * Check if build had errors
   * @returns {boolean}
   */
  hasErrors() {
    return this.errors.length > 0;
  }

  /**
   * Check if build had warnings
   * @returns {boolean}
   */
  hasWarnings() {
    return this.warnings.length > 0;
  }

  /**
   * Get the built graph
   * @returns {DependencyGraph}
   */
  getGraph() {
    return this.graph;
  }
}

module.exports = {
  DependencyGraphBuilder
};
