#!/usr/bin/env node

/**
 * CARL Tool Events Notification Hook
 * Handles PreToolUse and PostToolUse notifications
 */

const path = require('path');
const fs = require('fs');

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
    // Check if notifications are enabled
    const enabled = process.env.CARL_CARL_NOTIFICATIONS_ENABLED === 'true';
    const toolEventsEnabled = process.env.CARL_CARL_NOTIFICATIONS_TOOL_EVENTS_ENABLED === 'true';

    if (!enabled || !toolEventsEnabled) {
      return null;
    }

    return {
      enabled: true,
      notify_before: process.env.CARL_CARL_NOTIFICATIONS_TOOL_EVENTS_NOTIFY_BEFORE === 'true',
      notify_after: process.env.CARL_CARL_NOTIFICATIONS_TOOL_EVENTS_NOTIFY_AFTER === 'true',
      notify_on_failure: process.env.CARL_CARL_NOTIFICATIONS_TOOL_EVENTS_NOTIFY_ON_FAILURE === 'true',
    };
  } catch (error) {
    console.error('[CARL Notify] Error reading settings:', error.message);
    return null;
  }
}

/**
 * Get tool-specific settings
 */
function getToolSettings(toolName) {
  const prefix = `CARL_CARL_NOTIFICATIONS_TOOL_EVENTS_TOOLS_${toolName.toUpperCase()}_`;

  const enabled = process.env[`${prefix}ENABLED`] === 'true';
  if (!enabled) {
    return null;
  }

  // Get delivery methods (could be a JSON string)
  let deliveryMethods = ['desktop'];
  try {
    const methodsEnv = process.env[`${prefix}DELIVERY_METHODS`];
    if (methodsEnv) {
      deliveryMethods = JSON.parse(methodsEnv);
    }
  } catch {
    // Fallback to desktop if parse fails
  }

  return {
    enabled: true,
    delivery_methods: deliveryMethods,
    messages: {
      before: process.env[`${prefix}MESSAGES_BEFORE`] || '',
      after_success: process.env[`${prefix}MESSAGES_AFTER_SUCCESS`] || '',
      after_failure: process.env[`${prefix}MESSAGES_AFTER_FAILURE`] || '',
    }
  };
}

/**
 * Check if command matches a pattern-based tool (git, build, test)
 */
function checkPatternTools(command) {
  const patterns = {
    git_operations: /git\s+(commit|push|pull|checkout|merge|rebase|clone|fetch)/,
    build_operations: /(npm|yarn|pnpm|bun)\s+(run\s+)?build/,
    test_operations: /(npm|yarn|pnpm|bun)\s+(run\s+)?test|pytest|jest|vitest|mocha/,
    install_operations: /(npm|yarn|pnpm|bun)\s+install|pip\s+install/,
  };

  for (const [toolName, pattern] of Object.entries(patterns)) {
    const match = command.match(pattern);
    if (match) {
      return {
        toolName,
        operation: match[1] || 'operation',
        buildType: match[0],
      };
    }
  }

  return null;
}

/**
 * Extract variables from tool input
 */
function extractVariables(hookData) {
  const toolInput = hookData.tool_input || {};
  const variables = {
    project_name: getProjectName(),
    project_path: CLAUDE_PROJECT_DIR,
    timestamp: new Date().toLocaleTimeString(),
    date: new Date().toLocaleDateString(),
    session_id: hookData.session_id || '',
    tool_name: hookData.tool_name || '',
    file_path: toolInput.file_path || '',
    file_name: toolInput.file_path ? path.basename(toolInput.file_path) : '',
    command: toolInput.command || '',
    pattern: toolInput.pattern || '',
    url: toolInput.url || '',
    error_message: '',
  };

  // For PostToolUse, check for errors
  if (hookData.hook_event_name === 'PostToolUse' && hookData.tool_response) {
    const response = hookData.tool_response;
    if (response.error || response.success === false) {
      variables.error_message = response.error || 'Unknown error';
    }
  }

  // Extract operation info for pattern-based tools
  if (toolInput.command) {
    const patternMatch = checkPatternTools(toolInput.command);
    if (patternMatch) {
      variables.operation = patternMatch.operation;
      variables.build_type = patternMatch.buildType;
    }
  }

  return variables;
}

/**
 * Process the hook
 */
function processHook(hookData) {
  const settings = getSettings();
  if (!settings) {
    // Notifications disabled, exit silently
    process.exit(0);
  }

  const eventName = hookData.hook_event_name;
  const toolName = hookData.tool_name;
  const isPreToolUse = eventName === 'PreToolUse';
  const isPostToolUse = eventName === 'PostToolUse';

  // Check if we should notify for this event timing
  if (isPreToolUse && !settings.notify_before) {
    process.exit(0);
  }
  if (isPostToolUse && !settings.notify_after) {
    process.exit(0);
  }

  // Extract variables
  const variables = extractVariables(hookData);

  // Check if it's a pattern-based tool (for Bash commands)
  let toolSettings = null;
  let effectiveToolName = toolName;

  if (toolName === 'Bash' && variables.command) {
    const patternMatch = checkPatternTools(variables.command);
    if (patternMatch) {
      effectiveToolName = patternMatch.toolName;
      toolSettings = getToolSettings(effectiveToolName);
    }
  }

  // If not a pattern tool, get regular tool settings
  if (!toolSettings) {
    toolSettings = getToolSettings(toolName);
  }

  if (!toolSettings) {
    // Tool notifications disabled
    process.exit(0);
  }

  // Determine message to use
  let message = '';
  const hasError = variables.error_message !== '';

  if (isPreToolUse) {
    message = toolSettings.messages.before;
  } else if (isPostToolUse) {
    if (hasError && !settings.notify_on_failure) {
      // Don't notify on failure if disabled
      process.exit(0);
    }
    message = hasError ? toolSettings.messages.after_failure : toolSettings.messages.after_success;
  }

  if (!message) {
    // No message configured
    process.exit(0);
  }

  // Replace variables in message
  const finalMessage = replaceVariables(message, variables);

  // Send notification
  const deliveryMethods = toolSettings.delivery_methods.join(',');
  const notifyScript = path.join(CLAUDE_PLUGIN_ROOT, 'lib', 'notify.cjs');

  try {
    const { execSync } = require('child_process');
    execSync(`node "${notifyScript}" "${finalMessage.replace(/"/g, '\\"')}" "${deliveryMethods}" "CARL"`, {
      stdio: 'inherit',
    });
    process.exit(0);
  } catch (error) {
    console.error('[CARL Notify] Failed to send notification:', error.message);
    process.exit(0); // Non-blocking error
  }
}
