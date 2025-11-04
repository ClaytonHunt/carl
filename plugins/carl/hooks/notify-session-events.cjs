#!/usr/bin/env node

/**
 * CARL Session Events Notification Hook
 * Handles SessionStart and SessionEnd notifications
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
    const sessionEventsEnabled = process.env.CARL_CARL_NOTIFICATIONS_SESSION_EVENTS_ENABLED === 'true';

    if (!enabled || !sessionEventsEnabled) {
      return null;
    }

    return { enabled: true };
  } catch (error) {
    console.error('[CARL Notify] Error reading settings:', error.message);
    return null;
  }
}

/**
 * Get session start settings for specific matcher
 */
function getSessionStartSettings(matcher) {
  const prefix = `CARL_CARL_NOTIFICATIONS_SESSION_EVENTS_SESSION_START_MATCHERS_${matcher.toUpperCase()}_`;

  const enabled = process.env[`${prefix}ENABLED`] === 'true';
  if (!enabled) {
    return null;
  }

  let deliveryMethods = ['tts'];
  try {
    const methodsEnv = process.env[`${prefix}DELIVERY_METHODS`];
    if (methodsEnv) {
      deliveryMethods = JSON.parse(methodsEnv);
    }
  } catch {}

  return {
    enabled: true,
    delivery_methods: deliveryMethods,
    message: process.env[`${prefix}MESSAGE`] || '',
  };
}

/**
 * Get session end settings for specific reason
 */
function getSessionEndSettings(reason) {
  const prefix = `CARL_CARL_NOTIFICATIONS_SESSION_EVENTS_SESSION_END_REASONS_${reason.toUpperCase()}_`;

  const enabled = process.env[`${prefix}ENABLED`] === 'true';
  if (!enabled) {
    return null;
  }

  let deliveryMethods = ['tts'];
  try {
    const methodsEnv = process.env[`${prefix}DELIVERY_METHODS`];
    if (methodsEnv) {
      deliveryMethods = JSON.parse(methodsEnv);
    }
  } catch {}

  return {
    enabled: true,
    delivery_methods: deliveryMethods,
    message: process.env[`${prefix}MESSAGE`] || '',
  };
}

/**
 * Process the hook
 */
function processHook(hookData) {
  const settings = getSettings();
  if (!settings) {
    process.exit(0);
  }

  const eventName = hookData.hook_event_name;
  const variables = {
    project_name: getProjectName(),
    project_path: CLAUDE_PROJECT_DIR,
    timestamp: new Date().toLocaleTimeString(),
    date: new Date().toLocaleDateString(),
    session_id: hookData.session_id || '',
  };

  let eventSettings = null;
  let message = '';

  if (eventName === 'SessionStart') {
    // SessionStart uses matchers (startup, resume, clear, compact)
    const matcher = hookData.matcher || 'startup';
    variables.session_type = matcher;

    eventSettings = getSessionStartSettings(matcher);
  } else if (eventName === 'SessionEnd') {
    // SessionEnd uses reasons (clear, logout, prompt_input_exit, other)
    const reason = hookData.reason || 'other';
    variables.end_reason = reason;

    eventSettings = getSessionEndSettings(reason);
  }

  if (!eventSettings || !eventSettings.message) {
    process.exit(0);
  }

  // Replace variables in message
  message = replaceVariables(eventSettings.message, variables);

  // Send notification
  const deliveryMethods = eventSettings.delivery_methods.join(',');
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
