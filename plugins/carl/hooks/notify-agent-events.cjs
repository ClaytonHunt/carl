#!/usr/bin/env node

/**
 * CARL Agent Events Notification Hook
 * Handles Stop and SubagentStop notifications
 */

const path = require('path');
const { execSync } = require('child_process');

// Get environment variables
const CLAUDE_PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT;
const CLAUDE_PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR;

// Read stdin for hook input
let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const hookData = JSON.parse(input);
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
    const agentEventsEnabled = process.env.CARL_CARL_NOTIFICATIONS_AGENT_EVENTS_ENABLED === 'true';

    if (!enabled || !agentEventsEnabled) {
      return null;
    }

    return { enabled: true };
  } catch (error) {
    console.error('[CARL Notify] Error reading settings:', error.message);
    return null;
  }
}

/**
 * Get agent stop settings
 */
function getAgentStopSettings() {
  const prefix = 'CARL_CARL_NOTIFICATIONS_AGENT_EVENTS_AGENT_STOP_';

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
 * Get subagent stop settings
 */
function getSubagentStopSettings() {
  const prefix = 'CARL_CARL_NOTIFICATIONS_AGENT_EVENTS_SUBAGENT_STOP_';

  const enabled = process.env[`${prefix}ENABLED`] === 'true';
  if (!enabled) {
    return null;
  }

  let deliveryMethods = ['desktop'];
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
  const isMainAgent = eventName === 'Stop';
  const isSubagent = eventName === 'SubagentStop';

  const variables = {
    project_name: getProjectName(),
    project_path: CLAUDE_PROJECT_DIR,
    timestamp: new Date().toLocaleTimeString(),
    date: new Date().toLocaleDateString(),
    session_id: hookData.session_id || '',
    agent_type: isMainAgent ? 'main' : 'subagent',
    subagent_name: hookData.subagent_name || '',
  };

  let eventSettings = null;

  if (isMainAgent) {
    eventSettings = getAgentStopSettings();
  } else if (isSubagent) {
    eventSettings = getSubagentStopSettings();
  }

  if (!eventSettings || !eventSettings.message) {
    process.exit(0);
  }

  // Replace variables in message
  const message = replaceVariables(eventSettings.message, variables);

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
