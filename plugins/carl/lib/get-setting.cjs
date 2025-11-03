#!/usr/bin/env node

/**
 * CARL Settings Getter
 * Retrieves a specific setting value from environment variables
 * Usage: get-setting.js <setting-path>
 * Example: get-setting.js configuration.timeout_ms
 */

const path = require('path');

// Get environment variables
const CLAUDE_PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT;
const CLAUDE_PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR;

if (!CLAUDE_PLUGIN_ROOT || !CLAUDE_PROJECT_DIR) {
  console.error('ERROR: Required environment variables not set');
  console.error('  CLAUDE_PLUGIN_ROOT:', CLAUDE_PLUGIN_ROOT);
  console.error('  CLAUDE_PROJECT_DIR:', CLAUDE_PROJECT_DIR);
  process.exit(1);
}

// Extract plugin name from CLAUDE_PLUGIN_ROOT
const PLUGIN_NAME = path.basename(CLAUDE_PLUGIN_ROOT);

// Check if setting path provided
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('ERROR: No setting path provided');
  console.error('Usage: get-setting.js <setting-path>');
  console.error('Example: get-setting.js configuration.timeout_ms');
  process.exit(1);
}

const SETTING_PATH = args[0];

// Convert setting path to environment variable name
// Example: configuration.timeout_ms -> CARL_CARL_CONFIGURATION_TIMEOUT_MS
const envKey = `CARL_${PLUGIN_NAME.toUpperCase()}_${SETTING_PATH.toUpperCase().replace(/\./g, '_')}`;

// Check if environment variable exists
if (!(envKey in process.env) || process.env[envKey] === undefined) {
  console.error(`ERROR: Setting not found: ${SETTING_PATH} for plugin ${PLUGIN_NAME}`);
  console.error(`Available settings are exported as CARL_${PLUGIN_NAME.toUpperCase()}_* environment variables`);
  console.error(`Check your settings file: ${path.join(CLAUDE_PROJECT_DIR, '.claude', '.carl', `${PLUGIN_NAME}.settings.json`)}`);
  process.exit(1);
}

// Output the value
console.log(process.env[envKey]);
