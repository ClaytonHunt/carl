#!/usr/bin/env node

/**
 * CARL System Events Notification Hook
 * Handles Notification events from Claude Code
 */

const path = require('path');
const { execSync } = require('child_process');
const { loadSettingsIntoEnv } = require('./lib/settings-loader.cjs');

// Get environment variables
const CLAUDE_PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT;
let CLAUDE_PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();

// Read stdin for hook input
let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const hookData = JSON.parse(input);
    // Get project directory from hook data if not in environment
    if (hookData.cwd) {
      CLAUDE_PROJECT_DIR = hookData.cwd;
    }
    // Load settings now that we have the correct paths
    loadSettingsIntoEnv(CLAUDE_PROJECT_DIR, CLAUDE_PLUGIN_ROOT);
    processHook(hookData);
  } catch (error) {
    console.error('[CARL Notify] Failed to parse hook input:', error.message);
    process.exit(1);
  }
});

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

/**
 * Extract project name from path
 */
function getProjectName() {
  return path.basename(CLAUDE_PROJECT_DIR);
}

/**
 * Get notification settings from environment
 */
function getSettings() {
  try {
    const enabled = process.env.CARL_CARL_NOTIFICATIONS_ENABLED === 'true';
    const systemEventsEnabled = process.env.CARL_CARL_NOTIFICATIONS_SYSTEM_EVENTS_ENABLED === 'true';
    const notificationEnabled = process.env.CARL_CARL_NOTIFICATIONS_SYSTEM_EVENTS_NOTIFICATION_ENABLED === 'true';

    if (!enabled || !systemEventsEnabled || !notificationEnabled) {
      return null;
    }

    let deliveryMethods = ['desktop'];
    try {
      const methodsEnv = process.env.CARL_CARL_NOTIFICATIONS_SYSTEM_EVENTS_NOTIFICATION_DELIVERY_METHODS;
      if (methodsEnv) {
        deliveryMethods = JSON.parse(methodsEnv);
      }
    } catch {}

    return {
      enabled: true,
      delivery_methods: deliveryMethods,
      message: process.env.CARL_CARL_NOTIFICATIONS_SYSTEM_EVENTS_NOTIFICATION_MESSAGE || '',
    };
  } catch (error) {
    console.error('[CARL Notify] Error reading settings:', error.message);
    return null;
  }
}

/**
 * Process the hook
 */
function processHook(hookData) {
  const settings = getSettings();
  if (!settings || !settings.message) {
    process.exit(0);
  }

  const variables = {
    project_name: getProjectName(),
    project_path: CLAUDE_PROJECT_DIR,
    timestamp: new Date().toLocaleTimeString(),
    date: new Date().toLocaleDateString(),
    session_id: hookData.session_id || '',
    notification_type: hookData.notification_type || 'unknown',
  };

  // Replace variables in message
  const message = replaceVariables(settings.message, variables);

  // Send notification
  const deliveryMethods = settings.delivery_methods.join(',');
  const notifyScript = path.join(CLAUDE_PLUGIN_ROOT, 'lib', 'notify.cjs');

  try {
    execSync(`node "${notifyScript}" "${message.replace(/"/g, '\\"')}" "${deliveryMethods}" "CARL"`, {
      stdio: 'inherit',
    });
    process.exit(0);
  } catch (error) {
    console.error('[CARL Notify] Failed to send notification:', error.message);
    process.exit(0);
  }
}
