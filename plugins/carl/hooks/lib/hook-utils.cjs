#!/usr/bin/env node

/**
 * Common utility functions for CARL notification hooks
 */

const path = require('path');
const fs = require('fs');

/**
 * Initialize hook context from hook data
 * Returns { projectDir, pluginRoot, debugLog }
 */
function initHookContext(hookData) {
  // Get plugin root from environment (should always be available)
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT;

  // Get project directory from hook data (cwd field) or fall back to env/cwd
  const projectDir = hookData.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();

  // Initialize debug logging
  const debugLogPath = path.join(projectDir, '.claude', '.carl', 'notify-debug.log');

  const debugLog = (message) => {
    try {
      const timestamp = new Date().toISOString();
      fs.appendFileSync(debugLogPath, `[${timestamp}] ${message}\n`);
    } catch (e) {
      // Ignore errors
    }
  };

  return { projectDir, pluginRoot, debugLog };
}

/**
 * Load settings from the settings file and inject into process.env
 * This ensures hooks have access to settings even if CLAUDE_ENV_FILE persistence didn't work
 */
function loadSettingsIntoEnv(projectDir, pluginRoot) {
  try {
    const PLUGIN_NAME = path.basename(pluginRoot);
    const CARL_DIR = path.join(projectDir, '.claude', '.carl');
    const SETTINGS_FILE = path.join(CARL_DIR, `${PLUGIN_NAME}.settings.json`);

    if (!fs.existsSync(SETTINGS_FILE)) {
      return;
    }

    const settingsContent = fs.readFileSync(SETTINGS_FILE, 'utf8');
    const settings = JSON.parse(settingsContent);

    // Flatten settings and inject into environment
    function flattenObject(obj, prefix = '') {
      for (const key in obj) {
        const value = obj[key];
        const envKey = prefix ? `${prefix}_${key.toUpperCase()}` : key.toUpperCase();

        if (value === null || value === undefined) {
          process.env[envKey] = '';
        } else if (Array.isArray(value)) {
          process.env[envKey] = JSON.stringify(value);
        } else if (typeof value === 'object') {
          flattenObject(value, envKey);
        } else {
          process.env[envKey] = String(value);
        }
      }
    }

    if (settings.settings && typeof settings.settings === 'object') {
      flattenObject(settings.settings, `CARL_${PLUGIN_NAME.toUpperCase()}`);
    }
  } catch (error) {
    // Silently fail - settings may not be available
  }
}

/**
 * Extract project name from path
 */
function getProjectName(projectDir) {
  return path.basename(projectDir);
}

/**
 * Replace template variables in message
 */
function replaceVariables(template, variables) {
  let message = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
    message = message.replace(regex, value || '');
  }
  return message;
}

module.exports = {
  initHookContext,
  loadSettingsIntoEnv,
  getProjectName,
  replaceVariables
};
