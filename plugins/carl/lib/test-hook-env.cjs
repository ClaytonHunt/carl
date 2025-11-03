#!/usr/bin/env node

/**
 * Diagnostic script to test hook environment
 */

console.error('=== Hook Environment Diagnostic ===');
console.error('Platform:', process.platform);
console.error('Shell:', process.env.SHELL || 'unknown');
console.error('CLAUDE_PLUGIN_ROOT:', process.env.CLAUDE_PLUGIN_ROOT || 'NOT SET');
console.error('CLAUDE_PROJECT_DIR:', process.env.CLAUDE_PROJECT_DIR || 'NOT SET');
console.error('CLAUDE_ENV_FILE:', process.env.CLAUDE_ENV_FILE || 'NOT SET');
console.error('Current working directory:', process.cwd());
console.error('Script location:', __filename);
console.error('Node version:', process.version);
console.error('===================================');
