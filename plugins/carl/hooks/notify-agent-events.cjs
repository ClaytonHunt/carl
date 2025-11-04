#!/usr/bin/env node

/**
 * CARL Agent Events Notification Hook
 * Handles Stop and SubagentStop notifications
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Get environment variables (may be undefined for Stop hooks)
const CLAUDE_PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT;
let CLAUDE_PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();

// Debug log storage
let DEBUG_LOG = null;
function debugLog(message) {
  if (!DEBUG_LOG) return;
  try {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(DEBUG_LOG, `[${timestamp}] ${message}\n`);
  } catch (e) {
    // Ignore errors
  }
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

// Read stdin for hook input
let input = '';
process.stdin.on('data', chunk => {
  input += chunk;
});
process.stdin.on('end', () => {
  try {
    const hookData = JSON.parse(input);

    // Get project directory from hook data (cwd field)
    if (hookData.cwd) {
      CLAUDE_PROJECT_DIR = hookData.cwd;
    }

    // Initialize debug logging now that we have project dir
    DEBUG_LOG = path.join(CLAUDE_PROJECT_DIR, '.claude', '.carl', 'notify-debug.log');
    debugLog('notify-agent-events.cjs: Hook script started');
    debugLog(`Hook event: ${hookData.hook_event_name}`);
    debugLog(`Project dir: ${CLAUDE_PROJECT_DIR}`);
    debugLog(`Plugin root: ${CLAUDE_PLUGIN_ROOT}`);

    // Load settings now that we have the correct paths
    loadSettingsIntoEnv(CLAUDE_PROJECT_DIR, CLAUDE_PLUGIN_ROOT);

    processHook(hookData);
  } catch (error) {
    debugLog(`Error: ${error.message}`);
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
function getProjectName(projectDir) {
  return path.basename(projectDir);
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
 * Check if this is a duplicate notification within the last second
 */
function isDuplicateNotification(hookData) {
  const lockFile = path.join(CLAUDE_PROJECT_DIR, '.claude', '.carl', '.notify-agent-lock');
  const now = Date.now();
  const eventKey = `${hookData.hook_event_name}-${hookData.session_id || 'unknown'}`;

  try {
    // Try to read existing lock file
    if (fs.existsSync(lockFile)) {
      const lockData = JSON.parse(fs.readFileSync(lockFile, 'utf8'));

      // Check if same event within last 500ms (likely duplicate)
      if (lockData.eventKey === eventKey && (now - lockData.timestamp) < 500) {
        debugLog(`Skipping duplicate notification (${now - lockData.timestamp}ms ago)`);
        return true;
      }
    }

    // Write new lock
    fs.writeFileSync(lockFile, JSON.stringify({ eventKey, timestamp: now }));
    return false;
  } catch (error) {
    debugLog(`Error checking duplicate: ${error.message}`);
    return false; // If error, allow notification
  }
}

/**
 * Process the hook
 */
function processHook(hookData) {
  debugLog(`processHook called`);

  // Check for duplicate notification
  if (isDuplicateNotification(hookData)) {
    debugLog('Exiting: duplicate notification detected');
    process.exit(0);
  }

  const settings = getSettings();
  debugLog(`Settings check: ${settings ? 'enabled' : 'disabled'}`);
  if (!settings) {
    debugLog('Exiting: notifications disabled');
    process.exit(0);
  }

  const eventName = hookData.hook_event_name;
  const isMainAgent = eventName === 'Stop';
  const isSubagent = eventName === 'SubagentStop';
  debugLog(`Event type: ${eventName}, isMainAgent: ${isMainAgent}, isSubagent: ${isSubagent}`);

  const variables = {
    project_name: getProjectName(CLAUDE_PROJECT_DIR),
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
    debugLog(`Agent stop settings: ${eventSettings ? JSON.stringify(eventSettings) : 'null'}`);
  } else if (isSubagent) {
    eventSettings = getSubagentStopSettings();
    debugLog(`Subagent stop settings: ${eventSettings ? JSON.stringify(eventSettings) : 'null'}`);
  }

  if (!eventSettings || !eventSettings.message) {
    debugLog('Exiting: no event settings or message');
    process.exit(0);
  }

  // Replace variables in message
  const message = replaceVariables(eventSettings.message, variables);
  debugLog(`Final message: ${message}`);

  // Send notification
  const deliveryMethods = eventSettings.delivery_methods.join(',');
  const notifyScript = path.join(CLAUDE_PLUGIN_ROOT, 'lib', 'notify.cjs');
  debugLog(`Calling notify script with methods: ${deliveryMethods}`);

  try {
    execSync(`node "${notifyScript}" "${message.replace(/"/g, '\\"')}" "${deliveryMethods}" "CARL"`, {
      stdio: 'inherit',
    });
    debugLog('Notification sent successfully');
    process.exit(0);
  } catch (error) {
    debugLog(`Notification error: ${error.message}`);
    console.error('[CARL Notify] Failed to send notification:', error.message);
    process.exit(0);
  }
}
