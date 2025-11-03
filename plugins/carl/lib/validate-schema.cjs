#!/usr/bin/env node

/**
 * CARL Settings Schema Validator
 * Validates settings JSON against JSON schema
 * Usage: validate-schema.js <settings-file> <schema-file>
 */

const fs = require('fs');
const { execSync } = require('child_process');

// Get command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('ERROR: Invalid arguments');
  console.error('Usage: validate-schema.js <settings-file> <schema-file>');
  process.exit(1);
}

const SETTINGS_FILE = args[0];
const SCHEMA_FILE = args[1];

// Check if files exist
if (!fs.existsSync(SETTINGS_FILE)) {
  console.error(`ERROR: Settings file not found: ${SETTINGS_FILE}`);
  process.exit(1);
}

if (!fs.existsSync(SCHEMA_FILE)) {
  console.error(`ERROR: Schema file not found: ${SCHEMA_FILE}`);
  process.exit(1);
}

// Try to use ajv-cli if available
try {
  // Check if ajv is available first
  execSync('ajv --version', { stdio: 'ignore' });
  // If we get here, ajv is available, use it
  execSync(`ajv validate -s "${SCHEMA_FILE}" -d "${SETTINGS_FILE}"`, {
    stdio: 'inherit'
  });
  process.exit(0);
} catch (e) {
  // ajv-cli not available, fall through to basic validation
}

// Fallback: basic validation with Node.js
try {
  const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  const schema = JSON.parse(fs.readFileSync(SCHEMA_FILE, 'utf8'));

  // Check required fields
  if (schema.required && Array.isArray(schema.required)) {
    for (const field of schema.required) {
      if (!(field in settings)) {
        console.error(`ERROR: Required field missing: ${field}`);
        process.exit(1);
      }
    }
  }

  // Basic type checking for known fields
  if ('plugin' in settings && settings.plugin === null) {
    console.error("ERROR: 'plugin' field cannot be null");
    process.exit(1);
  }

  if ('version' in settings && settings.version === null) {
    console.error("ERROR: 'version' field cannot be null");
    process.exit(1);
  }

  // Check that settings object exists and is an object
  if ('settings' in settings && typeof settings.settings !== 'object') {
    console.error("ERROR: 'settings' field must be an object");
    process.exit(1);
  }

  // Validation passed
  process.exit(0);
} catch (e) {
  console.error(`ERROR: Validation failed - ${e.message}`);
  process.exit(1);
}
