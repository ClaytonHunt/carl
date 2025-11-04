#!/usr/bin/env node

/**
 * CARL Settings Loader
 * Loads, validates, and exports plugin settings as environment variables
 * Called by SessionStart hook
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get environment variables
const CLAUDE_PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT;

if (!CLAUDE_PLUGIN_ROOT) {
  console.error('ERROR: CLAUDE_PLUGIN_ROOT environment variable not set');
  process.exit(1);
}

// Use current working directory as the project directory
// When Claude Code runs hooks, cwd should be the project directory
const CLAUDE_PROJECT_DIR = process.cwd();

// Extract plugin name from CLAUDE_PLUGIN_ROOT
const PLUGIN_NAME = path.basename(CLAUDE_PLUGIN_ROOT);
const CARL_DIR = path.join(CLAUDE_PROJECT_DIR, '.claude', '.carl');
const SETTINGS_FILE = path.join(CARL_DIR, `${PLUGIN_NAME}.settings.json`);
const SCHEMA_FILE_SRC = path.join(CLAUDE_PLUGIN_ROOT, 'schema', 'settings-schema.json');
const SCHEMA_FILE_DEST = path.join(CARL_DIR, `${PLUGIN_NAME}.settings-schema.json`);
const DEFAULTS_FILE = path.join(CLAUDE_PLUGIN_ROOT, 'defaults', 'settings.json');
const README_FILE_SRC = path.join(CLAUDE_PLUGIN_ROOT, 'README.md');
const README_FILE_DEST = path.join(CARL_DIR, 'README.md');

// Ensure .carl directory exists
if (!fs.existsSync(CARL_DIR)) {
  fs.mkdirSync(CARL_DIR, { recursive: true });
}

// Helper function for retrying file operations on Windows EBUSY errors
function retryFileOperation(operation, maxRetries = 3) {
  let retries = maxRetries;
  while (retries > 0) {
    try {
      return operation();
    } catch (e) {
      if (e.code === 'EBUSY' && retries > 1) {
        retries--;
        const delay = 50 * (maxRetries - retries + 1); // 50ms, 100ms, 150ms
        const start = Date.now();
        while (Date.now() - start < delay) { /* busy wait */ }
        continue;
      }
      throw e; // Re-throw if not EBUSY or out of retries
    }
  }
}

// Copy schema file to .carl directory if it exists and hasn't been copied yet
if (fs.existsSync(SCHEMA_FILE_SRC) && !fs.existsSync(SCHEMA_FILE_DEST)) {
  retryFileOperation(() => fs.copyFileSync(SCHEMA_FILE_SRC, SCHEMA_FILE_DEST));
  console.error(`✓ Copied schema to: ${SCHEMA_FILE_DEST}`);
}

// Copy README to .carl directory for user access (always update to get latest version)
if (fs.existsSync(README_FILE_SRC)) {
  retryFileOperation(() => fs.copyFileSync(README_FILE_SRC, README_FILE_DEST));
  console.error(`✓ Copied README to: ${README_FILE_DEST}`);
}

// Check if settings file exists, if not copy defaults
if (!fs.existsSync(SETTINGS_FILE)) {
  console.error('⚠ Settings file not found, creating from defaults...');
  fs.copyFileSync(DEFAULTS_FILE, SETTINGS_FILE);

  // Update the $schema path in the settings file to point to the local copy
  try {
    const settingsContent = fs.readFileSync(SETTINGS_FILE, 'utf8');
    const settingsObj = JSON.parse(settingsContent);
    settingsObj.$schema = `./${PLUGIN_NAME}.settings-schema.json`;
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settingsObj, null, 2) + '\n');
    console.error(`✓ Created default settings at: ${SETTINGS_FILE}`);
  } catch (e) {
    console.error(`⚠ Warning: Could not update $schema path: ${e.message}`);
  }
}

// Validate JSON syntax with retry logic for Windows file locking
let settings;
try {
  const settingsContent = retryFileOperation(() => fs.readFileSync(SETTINGS_FILE, 'utf8'));
  settings = JSON.parse(settingsContent);
} catch (e) {
  console.error(`ERROR: Invalid JSON in settings file: ${SETTINGS_FILE}`);
  console.error('CARL cannot continue with malformed settings.');
  console.error('Please fix the JSON syntax errors and restart.');
  console.error(`Error details: ${e.message}`);
  process.exit(1);
}

// Validate against schema (use the destination schema file in .carl directory)
if (fs.existsSync(SCHEMA_FILE_DEST)) {
  try {
    const validateSchemaScript = path.join(CLAUDE_PLUGIN_ROOT, 'lib', 'validate-schema.cjs');
    execSync(`node "${validateSchemaScript}" "${SETTINGS_FILE}" "${SCHEMA_FILE_DEST}"`, {
      stdio: 'inherit'
    });
  } catch (e) {
    console.error(`ERROR: Settings validation failed for ${PLUGIN_NAME}`);
    console.error('CARL cannot continue with invalid settings.');
    console.error(`Please fix validation errors in: ${SETTINGS_FILE}`);
    process.exit(1);
  }
}

// Expand environment variables in string values (${ENV:VAR_NAME} syntax)
function expandEnvVars(obj) {
  if (typeof obj === 'string') {
    return obj.replace(/\${ENV:([^}]+)}/g, (_, varName) => process.env[varName] || '');
  }
  if (typeof obj === 'object' && obj !== null) {
    if (Array.isArray(obj)) {
      return obj.map(expandEnvVars);
    }
    const result = {};
    for (const key in obj) {
      result[key] = expandEnvVars(obj[key]);
    }
    return result;
  }
  return obj;
}

const expandedSettings = expandEnvVars(settings);

// Export settings as environment variables with CARL_ prefix
// Format: CARL_[PLUGIN]_[SECTION]_[KEY]
// Example: settings.configuration.timeout_ms -> CARL_CARL_CONFIGURATION_TIMEOUT_MS
const envExports = [];

// Recursively flatten nested objects into environment variables
function flattenObject(obj, prefix = '') {
  const exports = [];

  for (const key in obj) {
    const value = obj[key];
    const envKey = prefix ? `${prefix}_${key.toUpperCase()}` : key.toUpperCase();

    if (value === null || value === undefined) {
      exports.push({ key: envKey, value: '' });
    } else if (Array.isArray(value)) {
      // Convert arrays to JSON strings for parsing by hooks
      const jsonValue = JSON.stringify(value);
      exports.push({ key: envKey, value: jsonValue });
    } else if (typeof value === 'object') {
      // Recursively flatten nested objects
      exports.push(...flattenObject(value, envKey));
    } else {
      // Primitive values (string, number, boolean)
      exports.push({ key: envKey, value: String(value) });
    }
  }

  return exports;
}

if (expandedSettings.settings && typeof expandedSettings.settings === 'object') {
  const flattened = flattenObject(expandedSettings.settings, `CARL_${PLUGIN_NAME.toUpperCase()}`);

  for (const { key, value } of flattened) {
    // Properly escape the value for shell export
    const escapedValue = value.replace(/'/g, "'\\''");
    envExports.push(`export ${key}='${escapedValue}'`);
  }
}

// Output exports to CLAUDE_ENV_FILE for persistence across the session
// During SessionStart, Claude Code provides CLAUDE_ENV_FILE for environment variable persistence
const CLAUDE_ENV_FILE = process.env.CLAUDE_ENV_FILE;

if (envExports.length > 0) {
  if (CLAUDE_ENV_FILE) {
    // Write to CLAUDE_ENV_FILE for persistence (SessionStart hook)
    try {
      retryFileOperation(() =>
        fs.appendFileSync(CLAUDE_ENV_FILE, envExports.join('\n') + '\n')
      );
      console.error(`✓ Settings loaded and persisted for plugin: ${PLUGIN_NAME}`);
    } catch (error) {
      console.error(`⚠ Warning: Could not write to CLAUDE_ENV_FILE: ${error.message}`);
      console.error(`✓ Settings loaded for plugin: ${PLUGIN_NAME} (not persisted)`);
    }
  } else {
    // Fallback: output to stdout (for backwards compatibility or non-SessionStart contexts)
    console.log(envExports.join('\n'));
    console.error(`✓ Settings loaded for plugin: ${PLUGIN_NAME}`);
  }
} else {
  console.error(`✓ Settings loaded for plugin: ${PLUGIN_NAME} (no exports)`);
}
