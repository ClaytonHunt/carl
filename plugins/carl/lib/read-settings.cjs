#!/usr/bin/env node

/**
 * CARL Settings Reader
 * Directly reads settings from carl.settings.json file
 * This is the preferred approach over environment variables
 */

const fs = require('fs');
const path = require('path');

/**
 * Read settings from the settings file
 * @param {string} projectDir - The project directory
 * @param {string} pluginRoot - The plugin root directory
 * @returns {object|null} The settings object or null if not found
 */
function readSettings(projectDir, pluginRoot) {
  try {
    const pluginName = path.basename(pluginRoot);
    const carlDir = path.join(projectDir, '.claude', '.carl');
    const settingsFile = path.join(carlDir, `${pluginName}.settings.json`);

    if (!fs.existsSync(settingsFile)) {
      return null;
    }

    const content = fs.readFileSync(settingsFile, 'utf8');
    const settings = JSON.parse(content);

    return settings.settings || null;
  } catch (error) {
    console.error('[CARL] Error reading settings:', error.message);
    return null;
  }
}

/**
 * Get a specific setting value using dot notation
 * @param {object} settings - The settings object
 * @param {string} path - Dot notation path (e.g., "configuration.tts_provider")
 * @param {any} defaultValue - Default value if not found
 * @returns {any} The setting value or default
 */
function getSetting(settings, path, defaultValue = null) {
  if (!settings) return defaultValue;

  const keys = path.split('.');
  let value = settings;

  for (const key of keys) {
    if (value === null || value === undefined || typeof value !== 'object') {
      return defaultValue;
    }
    value = value[key];
  }

  return value !== undefined ? value : defaultValue;
}

/**
 * Get TTS configuration from settings
 * @param {object} settings - The settings object
 * @returns {object} TTS configuration
 */
function getTTSConfig(settings) {
  return {
    provider: getSetting(settings, 'configuration.tts_provider', 'none'),
    voice: getSetting(settings, 'configuration.tts_voice', null),
    speed: getSetting(settings, 'configuration.tts_speed', 1.0),
  };
}

/**
 * Get notification settings
 * @param {object} settings - The settings object
 * @returns {object} Notification settings
 */
function getNotificationSettings(settings) {
  return {
    enabled: getSetting(settings, 'notifications.enabled', false),
    globalDeliveryMethods: getSetting(settings, 'notifications.global_delivery_methods', ['desktop']),
    agentEvents: {
      enabled: getSetting(settings, 'notifications.agent_events.enabled', false),
      deliveryMethods: getSetting(settings, 'notifications.agent_events.delivery_methods', ['desktop']),
      agentStop: {
        enabled: getSetting(settings, 'notifications.agent_events.agent_stop.enabled', false),
        deliveryMethods: getSetting(settings, 'notifications.agent_events.agent_stop.delivery_methods', null),
        message: getSetting(settings, 'notifications.agent_events.agent_stop.message', ''),
      },
      subagentStop: {
        enabled: getSetting(settings, 'notifications.agent_events.subagent_stop.enabled', false),
        deliveryMethods: getSetting(settings, 'notifications.agent_events.subagent_stop.delivery_methods', null),
        message: getSetting(settings, 'notifications.agent_events.subagent_stop.message', ''),
      },
    },
  };
}

module.exports = {
  readSettings,
  getSetting,
  getTTSConfig,
  getNotificationSettings,
};
