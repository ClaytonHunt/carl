#!/usr/bin/env node

/**
 * CARL Helper Functions - Node.js Implementation
 * Core utility functions ported from carl-helpers.sh
 */

const fs = require('fs-extra');
const path = require('path');
const yaml = require('yaml');
const utils = require('./utils');

/**
 * Get CARL root directory
 * @returns {string} CARL root path
 */
function getCarlRoot() {
  return utils.getCarlRoot();
}

/**
 * Get JSON value from configuration file
 * @param {string} jsonFile - Path to JSON file
 * @param {string} keyPath - Dot-separated key path
 * @param {string} defaultValue - Default value if not found
 * @returns {Promise<string>} Configuration value
 */
async function getJsonValue(jsonFile, keyPath, defaultValue = '') {
  try {
    const content = await utils.safeReadFile(jsonFile);
    if (!content) return defaultValue;

    const data = JSON.parse(content);
    const keys = keyPath.split('.');
    let value = data;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }
    
    return value !== null && value !== undefined ? String(value) : defaultValue;
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Get CARL setting with proper fallbacks
 * @param {string} setting - Setting name
 * @param {string} defaultValue - Default value
 * @returns {Promise<string>} Setting value
 */
async function getSetting(setting, defaultValue = '') {
  const carlRoot = getCarlRoot();
  const configFile = path.join(carlRoot, '.carl/config/carl-settings.json');
  
  // Map old setting names to new JSON structure (matching bash behavior)
  const settingMap = {
    'quiet_mode': 'audio_settings.quiet_mode',
    'audio_enabled': 'audio_settings.audio_enabled',
    'auto_update': 'analysis_settings.auto_update_on_git_pull',
    'context_injection': 'development_settings.auto_context_injection',
    'carl_persona': 'audio_settings.audio_enabled',
    'volume_level': 'audio_settings.volume_level',
    'quiet_hours_enabled': 'audio_settings.quiet_hours_enabled',
    'quiet_hours_start': 'audio_settings.quiet_hours_start',
    'quiet_hours_end': 'audio_settings.quiet_hours_end',
    'personality_theme': 'personality_settings.theme',
    'personality_response_style': 'personality_settings.response_style'
  };

  let keyPath = settingMap[setting] || setting;
  let settingDefault = defaultValue;

  // Handle special cases (matching bash logic)
  if (setting === 'analysis_depth') {
    const comprehensive = await getJsonValue(configFile, 'analysis_settings.comprehensive_scanning', 'true');
    return comprehensive === 'true' ? 'comprehensive' : 'balanced';
  }

  // Set appropriate defaults
  switch (setting) {
    case 'quiet_mode': settingDefault = defaultValue || 'true'; break;
    case 'audio_enabled': settingDefault = defaultValue || 'false'; break;
    case 'auto_update': settingDefault = defaultValue || 'true'; break;
    case 'context_injection': settingDefault = defaultValue || 'true'; break;
    case 'carl_persona': settingDefault = defaultValue || 'true'; break;
    case 'volume_level': settingDefault = defaultValue || '75'; break;
    case 'personality_theme': settingDefault = defaultValue || 'jimmy_neutron'; break;
    case 'personality_response_style': settingDefault = defaultValue || 'auto'; break;
  }

  return await getJsonValue(configFile, keyPath, settingDefault);
}

/**
 * Get active CARL context
 * @returns {Promise<string>} Formatted context string
 */
async function getActiveContext() {
  const carlRoot = getCarlRoot();
  const activeWorkFile = path.join(carlRoot, '.carl/active-work.carl');
  
  try {
    const content = await utils.safeReadFile(activeWorkFile);
    if (!content) return '';
    
    // Parse YAML content
    const activeWork = yaml.parse(content);
    if (!activeWork) return '';
    
    let context = '';
    
    // Add active intent information
    if (activeWork.active_intent) {
      const intent = activeWork.active_intent;
      context += `## Active Work Context\n\n`;
      context += `active_intent:\n`;
      context += `  id: "${intent.id}"\n`;
      context += `  path: "${intent.path}"\n`;
      if (intent.state_path) context += `  state_path: "${intent.state_path}"\n`;
      if (intent.started) context += `  started: "${intent.started}"\n`;
      if (intent.last_activity) context += `  last_activity: "${intent.last_activity}"\n`;
      if (intent.completion) context += `  completion: ${intent.completion}\n`;
      if (intent.current_phase) context += `  current_phase: "${intent.current_phase}"\n`;
      if (intent.current_substep) context += `  current_substep: "${intent.current_substep}"\n`;
      context += '\n';
    }
    
    // Add work queue information
    if (activeWork.work_queue) {
      const queue = activeWork.work_queue;
      context += `work_queue:\n`;
      
      if (queue.in_progress && queue.in_progress.length > 0) {
        context += `  in_progress:\n`;
        for (const item of queue.in_progress) {
          context += `    - id: "${item.id}"\n`;
          if (item.status) context += `      status: "${item.status}"\n`;
          if (item.next_action) context += `      next_action: "${item.next_action}"\n`;
          if (item.blockers) context += `      blockers: ${JSON.stringify(item.blockers)}\n`;
          if (item.estimated_completion) context += `      estimated_completion: "${item.estimated_completion}"\n`;
          if (item.current_substep) context += `      current_substep: "${item.current_substep}"\n`;
          if (item.progress_notes) context += `      progress_notes: "${item.progress_notes}"\n`;
        }
      }
      
      if (queue.ready_for_work && queue.ready_for_work.length > 0) {
        context += `  ready_for_work:\n`;
        for (const item of queue.ready_for_work) {
          context += `    - id: "${item.id}"\n`;
          if (item.priority) context += `      priority: "${item.priority}"\n`;
          if (item.estimated_effort) context += `      estimated_effort: "${item.estimated_effort}"\n`;
        }
      }
    }
    
    return context;
  } catch (error) {
    console.error(`Error loading active context: ${error.message}`);
    return '';
  }
}

/**
 * Get targeted context based on prompt analysis
 * @param {string} prompt - User prompt to analyze
 * @returns {Promise<string>} Targeted context
 */
async function getTargetedContext(prompt) {
  // For now, return active context (can be enhanced later)
  const activeContext = await getActiveContext();
  
  // Add specific context based on prompt keywords
  if (prompt.match(/feature|requirement|bug|issue|component|service|api|database/i)) {
    const carlRoot = getCarlRoot();
    let targetedContext = activeContext;
    
    // Look for related CARL files
    try {
      const projectDir = path.join(carlRoot, '.carl/project');
      const exists = await utils.pathExists(projectDir);
      if (exists) {
        targetedContext += '\n## Targeted Context\n';
        targetedContext += 'Project structure analyzed based on prompt keywords.\n';
      }
    } catch (error) {
      // Ignore errors
    }
    
    return targetedContext;
  }
  
  return activeContext;
}

/**
 * Get strategic context for planning prompts
 * @param {string} prompt - User prompt to analyze
 * @returns {Promise<string>} Strategic context
 */
async function getStrategicContext(prompt) {
  const carlRoot = getCarlRoot();
  let strategicContext = '';
  
  // Load vision context
  const visionFile = path.join(carlRoot, '.carl/project/vision.carl');
  const visionContent = await utils.safeReadFile(visionFile);
  if (visionContent) {
    strategicContext += '## Vision Context\n';
    // Take first 20 lines or up to strategic_objectives
    const lines = visionContent.split('\n');
    const relevantLines = lines.slice(0, Math.min(20, lines.length));
    strategicContext += relevantLines.join('\n') + '\n\n';
  }
  
  // Load roadmap context for planning prompts
  if (prompt.match(/plan|strategy|roadmap|feature|epic/i)) {
    const roadmapFile = path.join(carlRoot, '.carl/project/roadmap.carl');
    const roadmapContent = await utils.safeReadFile(roadmapFile);
    if (roadmapContent) {
      strategicContext += '## Current Roadmap Phase\n';
      // Extract current phase information
      const lines = roadmapContent.split('\n').slice(0, 30);
      strategicContext += lines.join('\n') + '\n\n';
    }
  }
  
  return strategicContext;
}

/**
 * Get alignment validation context for feature prompts
 * @param {string} prompt - User prompt to analyze
 * @returns {Promise<string>} Alignment validation context
 */
async function getAlignmentValidationContext(prompt) {
  if (!prompt.match(/feature|plan|task|implement|create.*feature/i)) {
    return '';
  }
  
  const carlRoot = getCarlRoot();
  const visionFile = path.join(carlRoot, '.carl/project/vision.carl');
  const visionContent = await utils.safeReadFile(visionFile);
  
  if (!visionContent) return '';
  
  let alignmentContext = '## Strategic Alignment Validation\n';
  alignmentContext += 'Project has a defined strategic vision. During planning:\n\n';
  
  // Extract project purpose
  const purposeMatch = visionContent.match(/description:\s*"([^"]+)"/);
  if (purposeMatch) {
    alignmentContext += '### Project Purpose (from vision):\n';
    alignmentContext += `${purposeMatch[1]}\n\n`;
    alignmentContext += 'IMPORTANT: Validate that planned features align with this project purpose.\n';
    alignmentContext += 'If a feature seems unrelated, ask user to confirm this is intentional.\n\n';
  }
  
  alignmentContext += '### Validation Instructions:\n';
  alignmentContext += '- Check if requested features align with project mission\n';
  alignmentContext += '- Question features that seem unrelated (e.g., \'garden shed design\' for finance app)\n';
  alignmentContext += '- Ask for confirmation if misalignment detected\n';
  alignmentContext += '- Allow user to proceed after explicit confirmation\n';
  
  return alignmentContext;
}

/**
 * Log activity to CARL system
 * @param {string} type - Activity type
 * @param {string} details - Activity details
 * @returns {Promise<void>}
 */
async function logActivity(type, details) {
  const carlRoot = getCarlRoot();
  const timestamp = utils.getCurrentTimestamp();
  const sessionId = utils.generateSessionId();
  
  // Create activity log entry
  const logEntry = {
    timestamp,
    session_id: sessionId,
    type,
    details: utils.sanitizeOutput(details)
  };
  
  // Append to session activity log
  const logFile = path.join(carlRoot, '.carl/sessions/activity.log');
  const logLine = `${JSON.stringify(logEntry)}\n`;
  
  try {
    await fs.appendFile(logFile, logLine);
  } catch (error) {
    console.error(`Error logging activity: ${error.message}`);
  }
}

/**
 * Log milestone to CARL system
 * @param {string} type - Milestone type
 * @param {string} description - Milestone description
 * @returns {Promise<void>}
 */
async function logMilestone(type, description) {
  const carlRoot = getCarlRoot();
  const timestamp = utils.getCurrentTimestamp();
  const sessionId = utils.generateSessionId();
  
  // Create milestone log entry
  const milestoneEntry = {
    timestamp,
    session_id: sessionId,
    type,
    description: utils.sanitizeOutput(description),
    celebration_triggered: true
  };
  
  // Append to milestone log
  const logFile = path.join(carlRoot, '.carl/sessions/milestones.log');
  const logLine = `${JSON.stringify(milestoneEntry)}\n`;
  
  try {
    await fs.appendFile(logFile, logLine);
  } catch (error) {
    console.error(`Error logging milestone: ${error.message}`);
  }
}

/**
 * Update state from code changes
 * @returns {Promise<void>}
 */
async function updateStateFromChanges() {
  // This function would analyze git changes and update CARL state files
  // For now, just log the activity
  await logActivity('state_update', 'State updated from code changes');
}

/**
 * Update session activity
 * @param {string} tool - Tool name
 * @param {string} phase - Phase (before/after)
 * @returns {Promise<void>}
 */
async function updateSessionActivity(tool, phase) {
  await logActivity('tool_usage', `${tool} ${phase}`);
}

/**
 * Update progress metrics
 * @returns {Promise<void>}
 */
async function updateProgressMetrics() {
  await logActivity('progress_update', 'Progress metrics updated');
}

/**
 * Check and celebrate milestones
 * @returns {Promise<void>}
 */
async function checkAndCelebrateMilestones() {
  // This would check for milestone conditions and trigger celebrations
  // For now, just a placeholder
  const carlRoot = getCarlRoot();
  const logFile = path.join(carlRoot, '.carl/sessions/milestones.log');
  
  try {
    const exists = await utils.pathExists(logFile);
    if (exists) {
      // Check recent milestones for celebration opportunities
      await logActivity('milestone_check', 'Milestone check completed');
    }
  } catch (error) {
    console.error(`Error checking milestones: ${error.message}`);
  }
}

module.exports = {
  getCarlRoot,
  getJsonValue,
  getSetting,
  getActiveContext,
  getTargetedContext,
  getStrategicContext,
  getAlignmentValidationContext,
  logActivity,
  logMilestone,
  updateStateFromChanges,
  updateSessionActivity,
  updateProgressMetrics,
  checkAndCelebrateMilestones
};