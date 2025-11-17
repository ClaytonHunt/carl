/**
 * Execution Report Generator
 *
 * Generate comprehensive execution reports combining progress data, event logs,
 * and work item state changes for user visibility and debugging.
 *
 * Features:
 * - Format progress summary with percentages and counts
 * - Display recent events chronologically
 * - Show work item state transitions
 * - Highlight errors and warnings
 * - Output markdown-formatted reports
 * - Support multiple report formats (full, summary, timeline)
 *
 * Based on IndyDevDan's principles:
 * - Observable by default
 * - Clear, actionable reporting
 * - User-centric presentation
 */

const ProgressTracker = require('./progress-tracker');
const EventLogger = require('./event-logger');
const { EventType, EventPriority } = require('./event-logger');

/**
 * Report Format Types
 */
const ReportFormat = {
  FULL: 'full',           // Complete report with all sections
  SUMMARY: 'summary',     // Brief overview with key metrics
  TIMELINE: 'timeline',   // Chronological event timeline
  PROGRESS: 'progress',   // Progress-focused report
  ERRORS: 'errors',       // Error and warning focus
};

/**
 * Execution Report Generator
 */
class ExecutionReportGenerator {
  /**
   * Create a report generator
   * @param {Object} config - Configuration options
   * @param {ProgressTracker} config.progressTracker - Progress tracker instance
   * @param {EventLogger} config.eventLogger - Event logger instance
   */
  constructor(config = {}) {
    this.config = {
      progressTracker: config.progressTracker || null,
      eventLogger: config.eventLogger || null,
      defaultFormat: config.defaultFormat || ReportFormat.FULL,
      includeTimestamps: config.includeTimestamps !== undefined ? config.includeTimestamps : true,
      maxTimelineEvents: config.maxTimelineEvents || 50,
      maxErrorEvents: config.maxErrorEvents || 20,
      ...config,
    };

    if (!this.config.progressTracker) {
      throw new Error('ProgressTracker is required');
    }
    if (!this.config.eventLogger) {
      throw new Error('EventLogger is required');
    }

    this.progressTracker = this.config.progressTracker;
    this.eventLogger = this.config.eventLogger;
  }

  /**
   * Generate execution report
   * @param {Object} options - Report options
   * @param {string} [options.format] - Report format (full, summary, timeline, progress, errors)
   * @param {boolean} [options.includeTimestamps] - Include timestamps in output
   * @param {number} [options.maxEvents] - Maximum events to include
   * @returns {string} Formatted markdown report
   */
  generateReport(options = {}) {
    const format = options.format || this.config.defaultFormat;

    switch (format) {
      case ReportFormat.SUMMARY:
        return this.generateSummaryReport(options);
      case ReportFormat.TIMELINE:
        return this.generateTimelineReport(options);
      case ReportFormat.PROGRESS:
        return this.generateProgressReport(options);
      case ReportFormat.ERRORS:
        return this.generateErrorReport(options);
      case ReportFormat.FULL:
      default:
        return this.generateFullReport(options);
    }
  }

  /**
   * Generate full comprehensive report
   * @param {Object} options - Report options
   * @returns {string} Formatted markdown report
   */
  generateFullReport(options = {}) {
    const sections = [];

    // Header
    sections.push('# Execution Report\n');

    // Progress summary
    sections.push('## Progress Summary\n');
    sections.push(this.formatProgressSummary(options));
    sections.push('');

    // Recent events
    sections.push('## Recent Events\n');
    sections.push(this.formatRecentEvents(options));
    sections.push('');

    // State changes
    sections.push('## Work Item State Changes\n');
    sections.push(this.formatStateChanges(options));
    sections.push('');

    // Errors and warnings
    const errorSection = this.formatErrorsAndWarnings(options);
    if (errorSection) {
      sections.push('## Errors and Warnings\n');
      sections.push(errorSection);
      sections.push('');
    }

    // Statistics
    sections.push('## Execution Statistics\n');
    sections.push(this.formatStatistics(options));

    return sections.join('\n');
  }

  /**
   * Generate summary report (brief overview)
   * @param {Object} options - Report options
   * @returns {string} Formatted markdown report
   */
  generateSummaryReport(options = {}) {
    const sections = [];

    sections.push('# Execution Summary\n');
    sections.push(this.formatProgressSummary(options));

    const snapshot = this.progressTracker.getSnapshot();
    const stats = this.eventLogger.getStatistics();

    sections.push('');
    sections.push(`**Total Events**: ${stats.totalEvents}`);
    sections.push(`**Duration**: ${this._formatDuration(snapshot.duration)}`);

    if (snapshot.failedItems > 0) {
      sections.push(`**Failures**: ${snapshot.failedItems} items failed`);
    }

    return sections.join('\n');
  }

  /**
   * Generate timeline report (chronological events)
   * @param {Object} options - Report options
   * @returns {string} Formatted markdown report
   */
  generateTimelineReport(options = {}) {
    const sections = [];

    sections.push('# Execution Timeline\n');
    sections.push(this.formatRecentEvents(options));

    return sections.join('\n');
  }

  /**
   * Generate progress-focused report
   * @param {Object} options - Report options
   * @returns {string} Formatted markdown report
   */
  generateProgressReport(options = {}) {
    const sections = [];

    sections.push('# Progress Report\n');
    sections.push(this.formatProgressSummary(options));
    sections.push('');
    sections.push(this.formatProgressDetails(options));

    return sections.join('\n');
  }

  /**
   * Generate error-focused report
   * @param {Object} options - Report options
   * @returns {string} Formatted markdown report
   */
  generateErrorReport(options = {}) {
    const sections = [];

    sections.push('# Error Report\n');
    const errorSection = this.formatErrorsAndWarnings(options);
    if (errorSection) {
      sections.push(errorSection);
    } else {
      sections.push('No errors or warnings found.');
    }

    return sections.join('\n');
  }

  /**
   * Format progress summary with percentages
   * @param {Object} options - Formatting options
   * @returns {string} Formatted progress summary
   */
  formatProgressSummary(options = {}) {
    const snapshot = this.progressTracker.getSnapshot();
    const lines = [];

    // Progress bar
    const progressBar = this._createProgressBar(snapshot.progressPercent);
    lines.push(`**Progress**: ${progressBar} ${snapshot.progressPercent.toFixed(1)}%`);
    lines.push('');

    // Counts
    lines.push(`**Completed**: ${snapshot.completedItems} / ${snapshot.totalItems}`);

    if (snapshot.inProgressItems > 0) {
      lines.push(`**In Progress**: ${snapshot.inProgressItems}`);
    }

    if (snapshot.failedItems > 0) {
      lines.push(`**Failed**: ${snapshot.failedItems}`);
    }

    if (snapshot.blockedItems > 0) {
      lines.push(`**Blocked**: ${snapshot.blockedItems}`);
    }

    if (snapshot.pendingItems > 0) {
      lines.push(`**Pending**: ${snapshot.pendingItems}`);
    }

    // Status
    lines.push('');
    lines.push(`**Status**: ${this._formatStatus(snapshot.status)}`);

    // Timing
    if (snapshot.duration > 0) {
      lines.push(`**Duration**: ${this._formatDuration(snapshot.duration)}`);
    }

    if (snapshot.estimatedCompletion && snapshot.status === 'executing') {
      const remaining = snapshot.estimatedCompletion - Date.now();
      if (remaining > 0) {
        lines.push(`**Est. Completion**: ${this._formatDuration(remaining)}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Format progress details
   * @param {Object} options - Formatting options
   * @returns {string} Formatted progress details
   */
  formatProgressDetails(options = {}) {
    const snapshot = this.progressTracker.getSnapshot();
    const lines = [];

    // Wave information
    if (snapshot.totalWaves > 0) {
      lines.push('### Execution Waves\n');
      lines.push(`**Total Waves**: ${snapshot.totalWaves}`);
      lines.push(`**Completed Waves**: ${snapshot.completedWaves}`);
      if (snapshot.currentWave >= 0) {
        lines.push(`**Current Wave**: ${snapshot.currentWave + 1}`);
      }
      lines.push('');
    }

    // Performance metrics
    lines.push('### Performance Metrics\n');
    lines.push(`**Items per Second**: ${snapshot.itemsPerSecond.toFixed(2)}`);
    lines.push(`**Avg Item Duration**: ${snapshot.averageItemDuration.toFixed(0)}ms`);

    return lines.join('\n');
  }

  /**
   * Format recent events chronologically
   * @param {Object} options - Formatting options
   * @returns {string} Formatted event timeline
   */
  formatRecentEvents(options = {}) {
    const maxEvents = options.maxEvents || this.config.maxTimelineEvents;
    const includeTimestamps = options.includeTimestamps !== undefined
      ? options.includeTimestamps
      : this.config.includeTimestamps;

    // Get recent events sorted by timestamp
    const events = this.eventLogger.getEvents({
      sortBy: 'timestamp',
      sortOrder: 'desc',
      limit: maxEvents,
    });

    if (events.length === 0) {
      return 'No events recorded.';
    }

    const lines = [];

    // Reverse to show chronological order (oldest first)
    for (const event of events.reverse()) {
      const line = this._formatEventLine(event, includeTimestamps);
      lines.push(line);
    }

    return lines.join('\n');
  }

  /**
   * Format work item state changes
   * @param {Object} options - Formatting options
   * @returns {string} Formatted state changes
   */
  formatStateChanges(options = {}) {
    const includeTimestamps = options.includeTimestamps !== undefined
      ? options.includeTimestamps
      : this.config.includeTimestamps;

    // Get state transition events
    const events = this.eventLogger.getEvents({
      type: EventType.STATE_TRANSITION,
      sortBy: 'timestamp',
      sortOrder: 'desc',
    });

    if (events.length === 0) {
      return 'No state changes recorded.';
    }

    const lines = [];

    // Reverse to show chronological order
    for (const event of events.reverse()) {
      const timestamp = includeTimestamps ? `[${this._formatTimestamp(event.timestamp)}] ` : '';
      const itemId = event.workItemId || 'Unknown';
      const oldState = event.oldState || '?';
      const newState = event.newState || '?';

      lines.push(`${timestamp}**${itemId}**: ${oldState} → ${newState}`);
    }

    return lines.join('\n');
  }

  /**
   * Format errors and warnings
   * @param {Object} options - Formatting options
   * @returns {string|null} Formatted errors/warnings or null if none
   */
  formatErrorsAndWarnings(options = {}) {
    const maxErrors = options.maxErrors || this.config.maxErrorEvents;
    const includeTimestamps = options.includeTimestamps !== undefined
      ? options.includeTimestamps
      : this.config.includeTimestamps;

    // Get error-related events
    const errorEvents = this.eventLogger.getEvents({
      category: 'error',
      sortBy: 'timestamp',
      sortOrder: 'desc',
      limit: maxErrors,
    });

    // Get failed item events
    const failedEvents = this.eventLogger.getEvents({
      type: EventType.WORKER_FAILED,
      sortBy: 'timestamp',
      sortOrder: 'desc',
      limit: maxErrors,
    });

    // Combine and deduplicate
    const allErrors = [...errorEvents, ...failedEvents];
    const uniqueErrors = Array.from(new Map(allErrors.map(e => [e.eventId, e])).values());

    // Sort by timestamp descending
    uniqueErrors.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });

    if (uniqueErrors.length === 0) {
      return null;
    }

    const lines = [];

    // Reverse to show chronological order
    for (const event of uniqueErrors.reverse().slice(0, maxErrors)) {
      const timestamp = includeTimestamps ? `[${this._formatTimestamp(event.timestamp)}] ` : '';
      const icon = this._getEventIcon(event);
      const message = event.message || 'Unknown error';

      lines.push(`${timestamp}${icon} **${message}**`);

      if (event.error) {
        lines.push(`  Error: ${event.error}`);
      }

      if (event.workItemId) {
        lines.push(`  Work Item: ${event.workItemId}`);
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format execution statistics
   * @param {Object} options - Formatting options
   * @returns {string} Formatted statistics
   */
  formatStatistics(options = {}) {
    const stats = this.eventLogger.getStatistics();
    const snapshot = this.progressTracker.getSnapshot();
    const lines = [];

    // Event statistics
    lines.push('### Event Statistics\n');
    lines.push(`**Total Events**: ${stats.totalEvents}`);
    lines.push('');

    lines.push('**Events by Category**:');
    for (const [category, count] of Object.entries(stats.eventsByCategory)) {
      lines.push(`- ${category}: ${count}`);
    }
    lines.push('');

    // Execution metrics
    lines.push('### Execution Metrics\n');
    lines.push(`**Total Items**: ${snapshot.totalItems}`);
    lines.push(`**Success Rate**: ${this._calculateSuccessRate(snapshot)}%`);

    if (snapshot.duration > 0) {
      lines.push(`**Total Duration**: ${this._formatDuration(snapshot.duration)}`);
      lines.push(`**Throughput**: ${snapshot.itemsPerSecond.toFixed(2)} items/sec`);
    }

    return lines.join('\n');
  }

  /**
   * Format event line
   * @param {Event} event - Event to format
   * @param {boolean} includeTimestamps - Include timestamps
   * @returns {string} Formatted event line
   * @private
   */
  _formatEventLine(event, includeTimestamps) {
    const timestamp = includeTimestamps ? `[${this._formatTimestamp(event.timestamp)}] ` : '';
    const icon = this._getEventIcon(event);
    const message = event.message || event.type;

    return `${timestamp}${icon} ${message}`;
  }

  /**
   * Get icon for event type
   * @param {Event} event - Event
   * @returns {string} Icon/emoji
   * @private
   */
  _getEventIcon(event) {
    // Map event types/priorities to icons
    if (event.priority === EventPriority.CRITICAL || event.type === EventType.WORKFLOW_FAILED) {
      return '🚨';
    }
    if (event.priority === EventPriority.HIGH || event.type.includes('failed')) {
      return '❌';
    }
    if (event.type.includes('completed')) {
      return '✓';
    }
    if (event.type.includes('started')) {
      return '▶';
    }
    if (event.type.includes('blocked')) {
      return '🚧';
    }
    if (event.priority === EventPriority.DEBUG) {
      return '🔍';
    }
    return '•';
  }

  /**
   * Format status with icon
   * @param {string} status - Status
   * @returns {string} Formatted status
   * @private
   */
  _formatStatus(status) {
    const statusMap = {
      'pending': '⏳ Pending',
      'executing': '▶ Executing',
      'completed': '✓ Completed',
      'failed': '❌ Failed',
      'cancelled': '⊗ Cancelled',
    };
    return statusMap[status] || status;
  }

  /**
   * Create progress bar
   * @param {number} percent - Progress percentage (0-100)
   * @returns {string} Progress bar
   * @private
   */
  _createProgressBar(percent) {
    const barLength = 20;
    const filledLength = Math.round((percent / 100) * barLength);
    const emptyLength = barLength - filledLength;

    const filled = '█'.repeat(filledLength);
    const empty = '░'.repeat(emptyLength);

    return `[${filled}${empty}]`;
  }

  /**
   * Format timestamp
   * @param {string} timestamp - ISO timestamp
   * @returns {string} Formatted time
   * @private
   */
  _formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  /**
   * Format duration
   * @param {number} ms - Duration in milliseconds
   * @returns {string} Formatted duration
   * @private
   */
  _formatDuration(ms) {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }
    if (ms < 3600000) {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }

  /**
   * Calculate success rate
   * @param {ProgressSnapshot} snapshot - Progress snapshot
   * @returns {number} Success rate percentage
   * @private
   */
  _calculateSuccessRate(snapshot) {
    const totalProcessed = snapshot.completedItems + snapshot.failedItems;
    if (totalProcessed === 0) return 0;
    return ((snapshot.completedItems / totalProcessed) * 100).toFixed(1);
  }
}

// Export
module.exports = ExecutionReportGenerator;
module.exports.ReportFormat = ReportFormat;
