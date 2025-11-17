/**
 * Failure Report Generator
 *
 * Generates comprehensive, actionable failure reports for execution failures:
 * - Detailed failure analysis
 * - Blocked item tracking
 * - Actionable recommendations
 * - Formatted output for humans and machines
 * - Integration with monitoring systems
 */

class FailureReportGenerator {
  /**
   * Generate comprehensive failure report
   * @param {Object} options - Report options
   * @param {string} options.executionId - Execution ID
   * @param {Map} options.workItems - Work item definitions
   * @param {Map} options.itemStates - Item states
   * @param {Map} options.itemResults - Item results
   * @param {Map} options.itemErrors - Item errors
   * @param {Map} options.retryHistory - Retry history per item
   * @param {Object} options.dependencyGraph - Dependency graph
   * @param {Object} options.metrics - Execution metrics
   * @param {number} options.duration - Total execution duration
   * @returns {Object} Failure report
   */
  static generate(options) {
    const {
      executionId,
      workItems,
      itemStates,
      itemResults,
      itemErrors,
      retryHistory,
      dependencyGraph,
      metrics,
      duration,
    } = options;

    // Calculate summary
    const summary = this._calculateSummary(itemStates, metrics);

    // Collect failures
    const failures = this._collectFailures(workItems, itemStates, itemErrors, retryHistory);

    // Collect blocked items
    const blockedItems = this._collectBlockedItems(workItems, itemStates, dependencyGraph, failures);

    // Generate recommendations
    const recommendations = this._generateRecommendations(failures, blockedItems, summary);

    // Build report
    const report = {
      executionId,
      timestamp: new Date().toISOString(),
      summary,
      failures,
      blockedItems,
      recommendations,
      duration,
      metrics,
    };

    return report;
  }

  /**
   * Calculate execution summary
   * @private
   */
  static _calculateSummary(itemStates, metrics) {
    const states = Array.from(itemStates.values());
    const totalItems = states.length;
    const completed = states.filter(s => s === 'completed').length;
    const failed = states.filter(s => s === 'failed').length;
    const blocked = states.filter(s => s === 'blocked').length;
    const skipped = states.filter(s => s === 'skipped').length;

    return {
      totalItems,
      completed,
      failed,
      blocked,
      skipped,
      pending: totalItems - completed - failed - blocked - skipped,
      successRate: totalItems > 0 ? ((completed / totalItems) * 100).toFixed(1) + '%' : '0%',
      completionRate: totalItems > 0 ? (((completed + failed + skipped) / totalItems) * 100).toFixed(1) + '%' : '0%',
    };
  }

  /**
   * Collect failure details
   * @private
   */
  static _collectFailures(workItems, itemStates, itemErrors, retryHistory) {
    const failures = [];

    for (const [itemId, state] of itemStates) {
      if (state === 'failed') {
        const item = workItems.get(itemId);
        const error = itemErrors.get(itemId);
        const history = retryHistory?.get(itemId);

        failures.push({
          itemId,
          name: item?.name || itemId,
          type: item?.type || 'unknown',
          failureType: this._classifyFailure(error),
          error: error?.message || String(error),
          errorCode: error?.code,
          errorStack: error?.stack,
          attempts: history?.totalAttempts || 1,
          firstFailure: history?.startTime ? new Date(history.startTime).toISOString() : null,
          lastAttempt: history?.attempts?.length > 0
            ? new Date(history.attempts[history.attempts.length - 1].timestamp).toISOString()
            : null,
          retryHistory: history?.attempts || [],
          context: item?.metadata || {},
        });
      }
    }

    return failures.sort((a, b) => {
      // Sort by type (permanent first, then transient)
      if (a.failureType !== b.failureType) {
        return a.failureType === 'permanent' ? -1 : 1;
      }
      // Then by name
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Collect blocked items
   * @private
   */
  static _collectBlockedItems(workItems, itemStates, dependencyGraph, failures) {
    const blocked = [];
    const failedIds = new Set(failures.map(f => f.itemId));

    for (const [itemId, state] of itemStates) {
      if (state === 'blocked') {
        const item = workItems.get(itemId);

        // Find which dependencies caused the block
        const blockedBy = [];
        if (item?.dependencies) {
          for (const depId of item.dependencies) {
            if (failedIds.has(depId)) {
              blockedBy.push(depId);
            }
          }
        }

        blocked.push({
          itemId,
          name: item?.name || itemId,
          type: item?.type || 'unknown',
          blockedBy,
          reason: blockedBy.length > 0
            ? `Depends on failed item(s): ${blockedBy.join(', ')}`
            : 'Blocked by upstream failure',
        });
      }
    }

    return blocked;
  }

  /**
   * Classify failure type
   * @private
   */
  static _classifyFailure(error) {
    if (!error) return 'unknown';

    // HTTP status codes
    if (error.statusCode) {
      if ([408, 429, 503, 504, 502].includes(error.statusCode)) {
        return 'transient';
      }
      if ([400, 401, 403, 404, 405, 409, 410, 422].includes(error.statusCode)) {
        return 'permanent';
      }
    }

    // Network errors
    if (error.code) {
      const transientCodes = ['ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND'];
      if (transientCodes.includes(error.code)) {
        return 'transient';
      }
    }

    // Error message patterns
    const message = (error.message || '').toLowerCase();
    if (message.includes('timeout') || message.includes('rate limit')) {
      return 'transient';
    }
    if (message.includes('invalid') || message.includes('forbidden')) {
      return 'permanent';
    }

    return 'unknown';
  }

  /**
   * Generate actionable recommendations
   * @private
   */
  static _generateRecommendations(failures, blockedItems, summary) {
    const recommendations = [];

    // Analyze failure patterns
    const transientFailures = failures.filter(f => f.failureType === 'transient');
    const permanentFailures = failures.filter(f => f.failureType === 'permanent');

    // Recommendations for transient failures
    if (transientFailures.length > 0) {
      if (transientFailures.some(f => f.attempts > 3)) {
        recommendations.push({
          type: 'configuration',
          severity: 'medium',
          message: 'Multiple transient failures exhausted retry attempts',
          action: 'Consider increasing maxRetries or adjusting backoff strategy',
          items: transientFailures.filter(f => f.attempts > 3).map(f => f.itemId),
        });
      }

      const timeoutFailures = transientFailures.filter(f =>
        f.error.toLowerCase().includes('timeout')
      );
      if (timeoutFailures.length > 0) {
        recommendations.push({
          type: 'configuration',
          severity: 'medium',
          message: 'Multiple timeout failures detected',
          action: 'Consider increasing timeout values or breaking down long-running tasks',
          items: timeoutFailures.map(f => f.itemId),
        });
      }

      const rateLimitFailures = transientFailures.filter(f =>
        f.error.toLowerCase().includes('rate limit')
      );
      if (rateLimitFailures.length > 0) {
        recommendations.push({
          type: 'configuration',
          severity: 'high',
          message: 'Rate limiting detected',
          action: 'Reduce concurrency or implement backoff strategy for rate-limited services',
          items: rateLimitFailures.map(f => f.itemId),
        });
      }
    }

    // Recommendations for permanent failures
    if (permanentFailures.length > 0) {
      recommendations.push({
        type: 'data',
        severity: 'high',
        message: `${permanentFailures.length} item(s) failed with permanent errors`,
        action: 'Review and fix input data or configuration for failed items',
        items: permanentFailures.map(f => f.itemId),
      });

      const authFailures = permanentFailures.filter(f =>
        f.error.toLowerCase().includes('auth') ||
        f.error.toLowerCase().includes('forbidden') ||
        f.errorCode === 401 ||
        f.errorCode === 403
      );
      if (authFailures.length > 0) {
        recommendations.push({
          type: 'security',
          severity: 'critical',
          message: 'Authentication/authorization failures detected',
          action: 'Verify credentials and permissions',
          items: authFailures.map(f => f.itemId),
        });
      }

      const validationFailures = permanentFailures.filter(f =>
        f.error.toLowerCase().includes('invalid') ||
        f.error.toLowerCase().includes('validation') ||
        f.errorCode === 400 ||
        f.errorCode === 422
      );
      if (validationFailures.length > 0) {
        recommendations.push({
          type: 'data',
          severity: 'high',
          message: 'Input validation failures detected',
          action: 'Review and correct input data format and values',
          items: validationFailures.map(f => f.itemId),
        });
      }
    }

    // Recommendations for blocked items
    if (blockedItems.length > 0) {
      const criticalBlocks = blockedItems.filter(b => b.blockedBy.length > 0);
      if (criticalBlocks.length > 0) {
        // Group by blocking item
        const blockingMap = new Map();
        for (const blocked of criticalBlocks) {
          for (const blockerId of blocked.blockedBy) {
            if (!blockingMap.has(blockerId)) {
              blockingMap.set(blockerId, []);
            }
            blockingMap.get(blockerId).push(blocked.itemId);
          }
        }

        // Find items blocking the most downstream items
        const topBlockers = Array.from(blockingMap.entries())
          .sort((a, b) => b[1].length - a[1].length)
          .slice(0, 3);

        for (const [blockerId, blockedByIt] of topBlockers) {
          recommendations.push({
            type: 'priority',
            severity: 'high',
            message: `Fixing item ${blockerId} will unblock ${blockedByIt.length} dependent item(s)`,
            action: `Prioritize fixing item ${blockerId} to unblock execution`,
            items: [blockerId, ...blockedByIt],
          });
        }
      }
    }

    // General recommendations based on success rate
    const successRate = parseFloat(summary.successRate);
    if (successRate < 50) {
      recommendations.push({
        type: 'strategy',
        severity: 'critical',
        message: `Low success rate (${summary.successRate})`,
        action: 'Review execution strategy, dependency structure, and error handling configuration',
        items: [],
      });
    }

    return recommendations.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Format report as human-readable text
   * @param {Object} report - Failure report
   * @returns {string} Formatted report
   */
  static formatText(report) {
    const lines = [];

    lines.push('=== EXECUTION FAILURE REPORT ===');
    lines.push('');
    lines.push(`Execution ID: ${report.executionId}`);
    lines.push(`Timestamp: ${report.timestamp}`);
    lines.push(`Duration: ${(report.duration / 1000).toFixed(2)}s`);
    lines.push('');

    // Summary
    lines.push('SUMMARY:');
    lines.push(`  Total Items: ${report.summary.totalItems}`);
    lines.push(`  Completed: ${report.summary.completed}`);
    lines.push(`  Failed: ${report.summary.failed}`);
    lines.push(`  Blocked: ${report.summary.blocked}`);
    lines.push(`  Skipped: ${report.summary.skipped}`);
    lines.push(`  Success Rate: ${report.summary.successRate}`);
    lines.push('');

    // Failures
    if (report.failures.length > 0) {
      lines.push('FAILURES:');
      for (const failure of report.failures) {
        lines.push(`  [${failure.failureType.toUpperCase()}] ${failure.name} (${failure.itemId})`);
        lines.push(`    Error: ${failure.error}`);
        lines.push(`    Attempts: ${failure.attempts}`);
        if (failure.retryHistory.length > 0) {
          lines.push(`    Retry History:`);
          for (const attempt of failure.retryHistory) {
            lines.push(`      - Attempt ${attempt.attempt + 1}: ${attempt.error} (delay: ${attempt.delay}ms)`);
          }
        }
        lines.push('');
      }
    }

    // Blocked items
    if (report.blockedItems.length > 0) {
      lines.push('BLOCKED ITEMS:');
      for (const blocked of report.blockedItems) {
        lines.push(`  ${blocked.name} (${blocked.itemId})`);
        lines.push(`    Reason: ${blocked.reason}`);
        lines.push('');
      }
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      lines.push('RECOMMENDATIONS:');
      for (let i = 0; i < report.recommendations.length; i++) {
        const rec = report.recommendations[i];
        lines.push(`  ${i + 1}. [${rec.severity.toUpperCase()}] ${rec.message}`);
        lines.push(`     Action: ${rec.action}`);
        if (rec.items.length > 0) {
          lines.push(`     Affected Items: ${rec.items.join(', ')}`);
        }
        lines.push('');
      }
    }

    lines.push('=== END OF REPORT ===');

    return lines.join('\n');
  }

  /**
   * Format report as JSON
   * @param {Object} report - Failure report
   * @returns {string} JSON string
   */
  static formatJSON(report) {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Format report as Markdown
   * @param {Object} report - Failure report
   * @returns {string} Markdown string
   */
  static formatMarkdown(report) {
    const lines = [];

    lines.push('# Execution Failure Report');
    lines.push('');
    lines.push(`**Execution ID:** ${report.executionId}  `);
    lines.push(`**Timestamp:** ${report.timestamp}  `);
    lines.push(`**Duration:** ${(report.duration / 1000).toFixed(2)}s  `);
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Total Items | ${report.summary.totalItems} |`);
    lines.push(`| Completed | ${report.summary.completed} |`);
    lines.push(`| Failed | ${report.summary.failed} |`);
    lines.push(`| Blocked | ${report.summary.blocked} |`);
    lines.push(`| Skipped | ${report.summary.skipped} |`);
    lines.push(`| Success Rate | ${report.summary.successRate} |`);
    lines.push('');

    // Failures
    if (report.failures.length > 0) {
      lines.push('## Failures');
      lines.push('');
      for (const failure of report.failures) {
        lines.push(`### ${failure.name} (${failure.itemId})`);
        lines.push('');
        lines.push(`**Type:** ${failure.failureType}  `);
        lines.push(`**Error:** ${failure.error}  `);
        lines.push(`**Attempts:** ${failure.attempts}  `);
        lines.push('');
      }
    }

    // Blocked items
    if (report.blockedItems.length > 0) {
      lines.push('## Blocked Items');
      lines.push('');
      for (const blocked of report.blockedItems) {
        lines.push(`- **${blocked.name}** (${blocked.itemId}): ${blocked.reason}`);
      }
      lines.push('');
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      lines.push('## Recommendations');
      lines.push('');
      for (let i = 0; i < report.recommendations.length; i++) {
        const rec = report.recommendations[i];
        lines.push(`### ${i + 1}. ${rec.message}`);
        lines.push('');
        lines.push(`**Severity:** ${rec.severity}  `);
        lines.push(`**Action:** ${rec.action}  `);
        if (rec.items.length > 0) {
          lines.push(`**Affected Items:** ${rec.items.join(', ')}  `);
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }
}

module.exports = FailureReportGenerator;
