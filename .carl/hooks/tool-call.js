#!/usr/bin/env node

/**
 * CARL Tool Call Hook - Node.js Implementation
 * Tracks development progress and provides audio feedback during tool execution
 */

const fs = require('fs-extra');
const path = require('path');
const utils = require('./lib/utils');
const carlHelpers = require('./lib/carl-helpers');
const carlSession = require('./lib/carl-session');
const carlAudio = require('./lib/carl-audio');

/**
 * Read JSON input from stdin
 * @returns {Promise<Object>} Parsed JSON input
 */
async function readJsonInput() {
  return new Promise((resolve, reject) => {
    let input = '';
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', chunk => {
      input += chunk;
    });
    
    process.stdin.on('end', () => {
      try {
        const data = JSON.parse(input);
        resolve(data);
      } catch (error) {
        reject(new Error(`Failed to parse JSON input: ${error.message}`));
      }
    });
    
    process.stdin.on('error', reject);
  });
}

/**
 * Log activity to session
 * @param {string} activity - Activity description
 * @param {string} tool - Tool name
 */
async function logActivity(activity, tool) {
  try {
    await carlSession.logActivity(activity, { tool, timestamp: new Date().toISOString() });
  } catch (error) {
    // Don't fail hook on logging errors
  }
}

/**
 * Log milestone to session
 * @param {string} milestone - Milestone description
 * @param {string} details - Additional details
 */
async function logMilestone(milestone, details) {
  try {
    await carlSession.logMilestone(milestone, { details, timestamp: new Date().toISOString() });
  } catch (error) {
    // Don't fail hook on logging errors
  }
}

/**
 * Update CARL state based on code changes
 */
async function updateStateFromChanges() {
  try {
    // This would analyze git changes and update relevant state files
    // For now, just log the activity
    await logActivity('code_change_detected', 'state_update');
  } catch (error) {
    // Don't fail hook on state update errors
  }
}

/**
 * Update progress metrics
 */
async function updateProgressMetrics() {
  try {
    await carlSession.updateProgressMetrics();
  } catch (error) {
    // Don't fail hook on metrics update errors
  }
}

/**
 * Check and celebrate milestones
 */
async function checkAndCelebrateMilestones() {
  try {
    // This would check for milestone patterns and celebrate
    // For now, just a placeholder
  } catch (error) {
    // Don't fail hook on milestone check errors
  }
}

/**
 * Update session activity
 * @param {string} tool - Tool name
 * @param {string} phase - Phase (before/after)
 */
async function updateSessionActivity(tool, phase) {
  try {
    await carlSession.updateSessionActivity(tool, phase);
  } catch (error) {
    // Don't fail hook on session update errors
  }
}

async function main() {
  try {
    // Get phase from command line argument (pre/post)
    const phase = process.argv[2] || 'pre';
    
    // Read JSON input from stdin
    const jsonInput = await readJsonInput();
    const tool = jsonInput.tool || 'unknown';
    const toolOutput = jsonInput.result || '';
    
    // Map phase names
    const normalizedPhase = phase === 'pre' ? 'before' : 'after';
    
    // Tool execution tracking
    if (normalizedPhase === 'before') {
      // Pre-tool execution - provide encouragement and context
      switch (tool) {
        case 'Edit':
        case 'Write':
        case 'MultiEdit':
          await carlAudio.playAudio('work', 'Time to get coding! Let\'s build something awesome!');
          await logActivity('code_editing_started', tool);
          break;
          
        case 'Bash':
          await carlAudio.playAudio('work', 'Running some commands! Let\'s see what happens!');
          await logActivity('command_execution_started', tool);
          break;
          
        case 'Read':
        case 'Glob':
        case 'Grep':
          // Quieter for analysis tools - no audio spam
          await logActivity('code_analysis_started', tool);
          break;
          
        case 'TodoWrite':
          await carlAudio.playAudio('progress', 'Updating our progress tracking!');
          await logActivity('progress_tracking_updated', tool);
          break;
      }
    } else {
      // Post-tool execution - update CARL state and celebrate progress
      switch (tool) {
        case 'Edit':
        case 'Write':
        case 'MultiEdit':
          // Update CARL state based on code changes
          await updateStateFromChanges();
          await carlAudio.playAudio('progress', 'Nice work! CARL\'s updating the records!');
          await logActivity('code_editing_completed', tool);
          
          // Check if this was a significant code change
          const changedLines = (toolOutput.match(/^[+\-]/gm) || []).length;
          if (changedLines > 20) {
            await logMilestone('significant_code_change', `Modified ${changedLines} lines`);
          }
          break;
          
        case 'Bash':
          await logActivity('command_execution_completed', tool);
          
          // Analyze command output for success/failure patterns
          if (/test.*pass|all tests pass|✓|success|complete/i.test(toolOutput)) {
            await carlAudio.playAudio('success', 'Tests are passing! Great job!');
            await logMilestone('tests_passing', 'Test execution successful');
          } else if (/build.*success|compilation successful|deploy.*success/i.test(toolOutput)) {
            await carlAudio.playAudio('success', 'Build successful! Looking good!');
            await logMilestone('build_success', 'Build completed successfully');
          } else if (/error|fail|exception|✗/i.test(toolOutput)) {
            // Don't play error sounds by default (can be annoying)
            await logActivity('command_error_encountered', tool);
          }
          break;
          
        case 'TodoWrite':
          // Parse TodoWrite output to track task progress
          if (/completed/i.test(toolOutput)) {
            await carlAudio.playAudio('success', 'Task completed! Way to go!');
            await logMilestone('task_completed', 'Task marked as completed');
            await updateProgressMetrics();
          } else if (/in_progress/i.test(toolOutput)) {
            await logActivity('task_started', tool);
          }
          break;
          
        case 'Read':
        case 'Glob':
        case 'Grep':
          // Track analysis activities but don't spam audio
          await logActivity('code_analysis_completed', tool);
          break;
      }
      
      // Update session context with recent activity
      await updateSessionActivity(tool, normalizedPhase);
    }
    
    // Check for milestone achievements
    await checkAndCelebrateMilestones();
    
  } catch (error) {
    // Don't fail hard on hook errors - just log and continue
    console.error(`Error in tool-call hook: ${error.message}`, { toFile: true });
  }
}

// Run main function if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error in tool-call:', error);
    process.exit(0); // Don't fail hard on hook errors
  });
}

module.exports = { main };