#!/usr/bin/env node

/**
 * Session Cleanup Utility
 *
 * Cleans up old workflow session files.
 * Can be run manually or via hook/cron.
 *
 * Usage:
 *   node plugins/carl/lib/workflow/cleanup-sessions.js [days]
 *
 * Examples:
 *   node plugins/carl/lib/workflow/cleanup-sessions.js        # Clean sessions older than 7 days
 *   node plugins/carl/lib/workflow/cleanup-sessions.js 14     # Clean sessions older than 14 days
 *   node plugins/carl/lib/workflow/cleanup-sessions.js 0      # Clean ALL sessions
 */

const SessionState = require('./session-state');

async function main() {
  const args = process.argv.slice(2);
  const daysOld = args[0] ? parseInt(args[0], 10) : 7;

  if (isNaN(daysOld) || daysOld < 0) {
    console.error('Error: Days must be a non-negative number');
    process.exit(1);
  }

  console.log(`Cleaning up sessions older than ${daysOld} days...`);

  try {
    const cleaned = await SessionState.cleanupOldSessions(daysOld);
    console.log(`✓ Cleaned ${cleaned} session(s)`);

    if (cleaned === 0) {
      console.log('  No old sessions to clean');
    }

    process.exit(0);
  } catch (error) {
    console.error(`✗ Cleanup failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = main;
