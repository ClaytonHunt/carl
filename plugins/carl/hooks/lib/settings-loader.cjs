#!/usr/bin/env node

/**
 * Settings Loader Utility for CARL Hooks
 * Loads settings from the settings file and injects into process.env
 * This ensures hooks have access to settings even if CLAUDE_ENV_FILE persistence didn't work
 */

const path = require('path');
const fs = require('fs');

/**
 * Load settings from the settings file and inject into process.env
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

module.exports = { loadSettingsIntoEnv };
