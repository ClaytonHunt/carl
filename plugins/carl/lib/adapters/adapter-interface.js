/**
 * Work Item Adapter Interface
 *
 * Base interface for all work item adapters (ADO, GitHub Issues, Kanban Flow, etc.)
 *
 * DESIGN PRINCIPLE:
 * - Cascade format is the LOCAL canonical format (always active)
 * - Adapters are EXTENSIONS that import/export to external systems
 * - External systems provide high-level items (Epics, Stories)
 * - Cascade provides detailed implementation planning (Phases, Tasks)
 *
 * Based on IndyDevDan's orchestration patterns:
 * - Clean separation of concerns
 * - Composable building blocks
 * - Event-driven coordination
 */

class WorkItemAdapter {
  constructor(config) {
    this.config = config;
    this.adapterType = 'base';
  }

  /**
   * IMPORT OPERATIONS
   * Pull work items FROM external system → Create Cascade work items
   */

  /**
   * Import a work item from external system
   * @param {string} externalId - ID in external system (e.g., ADO work item #, GitHub issue #)
   * @returns {Promise<Object>} - Cascade work item data
   */
  async importWorkItem(externalId) {
    throw new Error('importWorkItem() must be implemented by adapter');
  }

  /**
   * Import all work items matching criteria
   * @param {Object} criteria - Filter criteria (e.g., { project: 'MyProject', type: 'Epic' })
   * @returns {Promise<Array>} - Array of Cascade work item data
   */
  async importWorkItems(criteria) {
    throw new Error('importWorkItems() must be implemented by adapter');
  }

  /**
   * Map external work item to Cascade format
   * @param {Object} externalItem - Work item from external system
   * @returns {Object} - Cascade-formatted work item
   */
  mapToCascade(externalItem) {
    throw new Error('mapToCascade() must be implemented by adapter');
  }

  /**
   * EXPORT OPERATIONS
   * Push updates FROM Cascade → External system
   */

  /**
   * Export work item status update to external system
   * @param {string} cascadeId - Cascade work item ID (e.g., E1234)
   * @param {string} status - New status
   * @returns {Promise<boolean>} - Success indicator
   */
  async exportStatus(cascadeId, status) {
    throw new Error('exportStatus() must be implemented by adapter');
  }

  /**
   * Export work item comments to external system
   * @param {string} cascadeId - Cascade work item ID
   * @param {string} comment - Comment text
   * @returns {Promise<boolean>} - Success indicator
   */
  async exportComment(cascadeId, comment) {
    throw new Error('exportComment() must be implemented by adapter');
  }

  /**
   * Export work item progress update
   * @param {string} cascadeId - Cascade work item ID
   * @param {number} percentComplete - Progress percentage
   * @returns {Promise<boolean>} - Success indicator
   */
  async exportProgress(cascadeId, percentComplete) {
    throw new Error('exportProgress() must be implemented by adapter');
  }

  /**
   * WORKFLOW MAPPING
   * Map Cascade statuses to external system workflows
   */

  /**
   * Map Cascade status to external system status
   * @param {string} cascadeStatus - Cascade status (planned, in-progress, completed, blocked)
   * @param {Object} workflowConfig - Team-specific workflow configuration
   * @returns {string} - External system status
   *
   * Example workflow configs:
   * ADO: { completed: 'Resolved', in-progress: 'Active', planned: 'New' }
   * GitHub: { completed: 'closed', in-progress: 'in progress', planned: 'open' }
   * Jira: { completed: 'Done', in-progress: 'In QA', planned: 'To Do' }
   */
  mapStatus(cascadeStatus, workflowConfig) {
    throw new Error('mapStatus() must be implemented by adapter');
  }

  /**
   * SYNC OPERATIONS
   * Bidirectional sync between Cascade and external system
   */

  /**
   * Sync work item bidirectionally
   * @param {string} cascadeId - Cascade work item ID
   * @param {string} syncDirection - 'import', 'export', or 'bidirectional'
   * @returns {Promise<Object>} - Sync result with any conflicts
   */
  async syncWorkItem(cascadeId, syncDirection = 'bidirectional') {
    throw new Error('syncWorkItem() must be implemented by adapter');
  }

  /**
   * REGISTRY OPERATIONS
   * Manage mapping between Cascade IDs and external IDs
   */

  /**
   * Link Cascade work item to external work item
   * @param {string} cascadeId - Cascade work item ID
   * @param {string} externalId - External system ID
   * @param {Object} metadata - Additional mapping metadata
   * @returns {Promise<boolean>} - Success indicator
   */
  async linkWorkItems(cascadeId, externalId, metadata = {}) {
    throw new Error('linkWorkItems() must be implemented by adapter');
  }

  /**
   * Get external ID for Cascade work item
   * @param {string} cascadeId - Cascade work item ID
   * @returns {Promise<string|null>} - External ID or null if not linked
   */
  async getExternalId(cascadeId) {
    throw new Error('getExternalId() must be implemented by adapter');
  }

  /**
   * Get Cascade ID for external work item
   * @param {string} externalId - External system ID
   * @returns {Promise<string|null>} - Cascade ID or null if not linked
   */
  async getCascadeId(externalId) {
    throw new Error('getCascadeId() must be implemented by adapter');
  }

  /**
   * VALIDATION
   * Validate adapter configuration and connectivity
   */

  /**
   * Validate adapter configuration
   * @returns {Promise<boolean>} - True if config is valid
   */
  async validateConfig() {
    throw new Error('validateConfig() must be implemented by adapter');
  }

  /**
   * Test connectivity to external system
   * @returns {Promise<boolean>} - True if connection successful
   */
  async testConnection() {
    throw new Error('testConnection() must be implemented by adapter');
  }

  /**
   * UTILITY
   */

  /**
   * Get adapter type identifier
   * @returns {string} - Adapter type (e.g., 'ado', 'github', 'jira')
   */
  getAdapterType() {
    return this.adapterType;
  }

  /**
   * Get adapter capabilities
   * @returns {Object} - Supported operations
   */
  getCapabilities() {
    return {
      import: true,
      export: true,
      bidirectionalSync: true,
      comments: true,
      statusMapping: true,
      workflowMapping: true
    };
  }
}

module.exports = WorkItemAdapter;
