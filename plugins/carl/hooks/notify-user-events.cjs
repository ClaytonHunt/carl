#!/usr/bin/env node

/**
 * CARL User Events Notification Hook
 * Handles UserPromptSubmit notifications
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
    const userEventsEnabled = process.env.CARL_CARL_NOTIFICATIONS_USER_EVENTS_ENABLED === 'true';
    const promptSubmitEnabled = process.env.CARL_CARL_NOTIFICATIONS_USER_EVENTS_USER_PROMPT_SUBMIT_ENABLED === 'true';

    if (!enabled || !userEventsEnabled || !promptSubmitEnabled) {
      return null;
    }

    const includePreview = process.env.CARL_CARL_NOTIFICATIONS_USER_EVENTS_USER_PROMPT_SUBMIT_INCLUDE_PROMPT_PREVIEW === 'true';
    const maxLength = parseInt(process.env.CARL_CARL_NOTIFICATIONS_USER_EVENTS_USER_PROMPT_SUBMIT_MAX_PREVIEW_LENGTH || '50');

    let deliveryMethods = ['desktop'];
    try {
      const methodsEnv = process.env.CARL_CARL_NOTIFICATIONS_USER_EVENTS_USER_PROMPT_SUBMIT_DELIVERY_METHODS;
      if (methodsEnv) {
        deliveryMethods = JSON.parse(methodsEnv);
      }
    } catch {}

    return {
      enabled: true,
      include_prompt_preview: includePreview,
      max_preview_length: maxLength,
      delivery_methods: deliveryMethods,
      message: process.env.CARL_CARL_NOTIFICATIONS_USER_EVENTS_USER_PROMPT_SUBMIT_MESSAGE || '',
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

  const prompt = hookData.prompt || '';
  let promptPreview = prompt;

  if (settings.include_prompt_preview && prompt.length > settings.max_preview_length) {
    promptPreview = prompt.substring(0, settings.max_preview_length) + '...';
  }

  const variables = {
    project_name: getProjectName(),
    project_path: CLAUDE_PROJECT_DIR,
    timestamp: new Date().toLocaleTimeString(),
    date: new Date().toLocaleDateString(),
    session_id: hookData.session_id || '',
    prompt_preview: promptPreview,
    prompt_length: prompt.length.toString(),
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
