/**
 * Workflow Session State Manager
 *
 * Manages persistent state for workflow sessions following IndyDevDan's
 * "Session-Based Correlation" and "Event-Sourced Coordination" patterns.
 *
 * Purpose:
 * - Share state between commands, agents, skills in a workflow
 * - Enable observability and debugging
 * - Support async/parallel workflows with coordination
 *
 * Usage:
 * ```javascript
 * const SessionState = require('./lib/workflow/session-state');
 * const session = new SessionState();
 *
 * // Initialize session
 * await session.initialize();
 *
 * // Update state
 * await session.setState({ input: 'user request', inputType: 'description' });
 *
 * // Read state
 * const state = await session.getState();
 *
 * // Append to event log
 * await session.logEvent('agent_started', { agent: 'planning-orchestrator' });
 * ```
 */

const fs = require('fs').promises;
const path = require('path');
const { randomUUID } = require('crypto');

class SessionState {
  constructor(sessionId = null, baseDir = '.claude/.carl/sessions') {
    this.sessionId = sessionId || randomUUID();
    this.baseDir = baseDir;
    this.sessionDir = path.join(baseDir, this.sessionId);
    this.stateFile = path.join(this.sessionDir, 'state.json');
    this.eventsFile = path.join(this.sessionDir, 'events.log');
  }

  /**
   * Initialize session directory and state file
   * @returns {Promise<boolean>}
   */
  async initialize() {
    try {
      // Create session directory
      await fs.mkdir(this.sessionDir, { recursive: true });

      // Initialize state file if doesn't exist
      try {
        await fs.access(this.stateFile);
      } catch {
        const initialState = {
          sessionId: this.sessionId,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          workflow: {},
          data: {}
        };
        await fs.writeFile(this.stateFile, JSON.stringify(initialState, null, 2));
      }

      return true;
    } catch (error) {
      throw new Error(`Failed to initialize session: ${error.message}`);
    }
  }

  /**
   * Get current session state
   * @returns {Promise<Object>}
   */
  async getState() {
    try {
      const content = await fs.readFile(this.stateFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to read state: ${error.message}`);
    }
  }

  /**
   * Update session state (merges with existing)
   * @param {Object} updates - State updates to merge
   * @returns {Promise<Object>} - Updated state
   */
  async setState(updates) {
    try {
      const currentState = await this.getState();

      // Merge updates
      const newState = {
        ...currentState,
        data: {
          ...currentState.data,
          ...updates
        },
        updated: new Date().toISOString()
      };

      await fs.writeFile(this.stateFile, JSON.stringify(newState, null, 2));
      return newState;
    } catch (error) {
      throw new Error(`Failed to update state: ${error.message}`);
    }
  }

  /**
   * Update workflow metadata
   * @param {Object} workflow - Workflow info (name, step, status, etc.)
   * @returns {Promise<Object>}
   */
  async setWorkflow(workflow) {
    try {
      const currentState = await this.getState();

      const newState = {
        ...currentState,
        workflow: {
          ...currentState.workflow,
          ...workflow
        },
        updated: new Date().toISOString()
      };

      await fs.writeFile(this.stateFile, JSON.stringify(newState, null, 2));
      return newState;
    } catch (error) {
      throw new Error(`Failed to update workflow: ${error.message}`);
    }
  }

  /**
   * Log an event to the session event log
   * @param {string} eventType - Type of event
   * @param {Object} data - Event data
   * @returns {Promise<boolean>}
   */
  async logEvent(eventType, data = {}) {
    try {
      const event = {
        timestamp: new Date().toISOString(),
        type: eventType,
        sessionId: this.sessionId,
        ...data
      };

      const line = JSON.stringify(event) + '\n';
      await fs.appendFile(this.eventsFile, line);

      return true;
    } catch (error) {
      throw new Error(`Failed to log event: ${error.message}`);
    }
  }

  /**
   * Read event log
   * @returns {Promise<Array>} - Array of events
   */
  async getEvents() {
    try {
      const content = await fs.readFile(this.eventsFile, 'utf-8');
      return content
        .trim()
        .split('\n')
        .filter(line => line.length > 0)
        .map(line => JSON.parse(line));
    } catch (error) {
      if (error.code === 'ENOENT') {
        return []; // No events yet
      }
      throw new Error(`Failed to read events: ${error.message}`);
    }
  }

  /**
   * Clean up session (delete all files)
   * @returns {Promise<boolean>}
   */
  async cleanup() {
    try {
      await fs.rm(this.sessionDir, { recursive: true, force: true });
      return true;
    } catch (error) {
      throw new Error(`Failed to cleanup session: ${error.message}`);
    }
  }

  /**
   * Get path to session artifacts directory
   * @returns {string}
   */
  getArtifactsDir() {
    return path.join(this.sessionDir, 'artifacts');
  }

  /**
   * Create artifacts directory
   * @returns {Promise<string>} - Path to artifacts directory
   */
  async ensureArtifactsDir() {
    const artifactsDir = this.getArtifactsDir();
    await fs.mkdir(artifactsDir, { recursive: true });
    return artifactsDir;
  }

  /**
   * Static: Clean up old sessions (older than N days)
   * @param {number} daysOld - Age threshold in days
   * @param {string} baseDir - Base sessions directory
   * @returns {Promise<number>} - Number of sessions cleaned
   */
  static async cleanupOldSessions(daysOld = 7, baseDir = '.claude/.carl/sessions') {
    try {
      const sessions = await fs.readdir(baseDir);
      const cutoffDate = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
      let cleaned = 0;

      for (const sessionId of sessions) {
        const sessionDir = path.join(baseDir, sessionId);
        const stateFile = path.join(sessionDir, 'state.json');

        try {
          const stats = await fs.stat(stateFile);
          if (stats.mtimeMs < cutoffDate) {
            await fs.rm(sessionDir, { recursive: true, force: true });
            cleaned++;
          }
        } catch {
          // Skip if can't read
        }
      }

      return cleaned;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return 0; // No sessions directory
      }
      throw error;
    }
  }

  /**
   * Static: Resume existing session
   * @param {string} sessionId - Session ID to resume
   * @param {string} baseDir - Base sessions directory
   * @returns {Promise<SessionState>}
   */
  static async resume(sessionId, baseDir = '.claude/.carl/sessions') {
    const session = new SessionState(sessionId, baseDir);

    // Verify session exists
    try {
      await fs.access(session.stateFile);
    } catch {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return session;
  }
}

module.exports = SessionState;
