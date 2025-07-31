#!/usr/bin/env node

/**
 * CARL Session Management - Node.js Implementation
 * Session tracking functions ported from carl-session-manager.sh
 */

const fs = require('fs-extra');
const path = require('path');
const yaml = require('yaml');
const utils = require('./utils');

/**
 * Ensure session directories exist
 * @returns {Promise<void>}
 */
async function ensureSessionDirs() {
  const carlRoot = utils.getCarlRoot();
  
  await fs.ensureDir(path.join(carlRoot, '.carl/sessions'));
  await fs.ensureDir(path.join(carlRoot, '.carl/sessions/archive'));
  await fs.ensureDir(path.join(carlRoot, '.carl/sessions/active'));
}

/**
 * Get current session file path
 * @returns {Promise<string|null>} Session file path or null
 */
async function getCurrentSessionFile() {
  const carlRoot = utils.getCarlRoot();
  const currentSessionFile = path.join(carlRoot, '.carl/sessions/current.session');
  
  try {
    const sessionId = await utils.safeReadFile(currentSessionFile);
    if (sessionId) {
      const sessionFile = path.join(carlRoot, `.carl/sessions/active/${sessionId.trim()}.session.carl`);
      const exists = await utils.pathExists(sessionFile);
      if (exists) {
        return sessionFile;
      }
    }
  } catch {
    // File doesn't exist or can't be read
  }
  
  return null;
}

/**
 * Start a new session
 * @returns {Promise<string>} Session ID
 */
async function startSession() {
  const carlRoot = utils.getCarlRoot();
  const sessionId = `session_${utils.generateSessionId()}`;
  
  await ensureSessionDirs();
  
  // Create session tracking file
  const sessionFile = path.join(carlRoot, `.carl/sessions/active/${sessionId}.session.carl`);
  
  // Get git information
  const gitBranch = await getGitBranch();
  const gitCommit = await getGitCommit();
  const userName = await utils.getUserFirstName();
  
  const sessionContent = `# CARL Session Tracking
# Session ID: ${sessionId}
# Created: ${utils.getCurrentTimestamp()}

session_metadata:
  session_id: "${sessionId}"
  start_time: "${utils.getCurrentTimestamp()}"
  working_directory: "${process.cwd()}"
  git_branch: "${gitBranch}"
  git_commit: "${gitCommit}"
  user: "${userName}"

session_activities:
  # Activities will be appended here during the session

session_milestones:
  # Milestones will be tracked here

session_progress:
  files_modified: 0
  activities_count: 0
  milestones_count: 0
`;

  await utils.safeWriteFile(sessionFile, sessionContent);
  
  // Update current session pointer
  await utils.safeWriteFile(path.join(carlRoot, '.carl/sessions/current.session'), sessionId);
  
  return sessionId;
}

/**
 * End current session and archive it
 * @returns {Promise<boolean>} Success status
 */
async function endSession() {
  const carlRoot = utils.getCarlRoot();
  const currentSessionFile = path.join(carlRoot, '.carl/sessions/current.session');
  
  try {
    const sessionId = await utils.safeReadFile(currentSessionFile);
    if (!sessionId) return false;
    
    const sessionFile = path.join(carlRoot, `.carl/sessions/active/${sessionId.trim()}.session.carl`);
    const exists = await utils.pathExists(sessionFile);
    
    if (exists) {
      // Update final metrics
      await updateSessionMetrics();
      
      // Add end timestamp
      const duration = await calculateSessionDurationFromFile(sessionFile);
      const endContent = `
session_end:
  end_time: "${utils.getCurrentTimestamp()}"
  duration: "${duration}"
`;
      
      const currentContent = await utils.safeReadFile(sessionFile) || '';
      await utils.safeWriteFile(sessionFile, currentContent + endContent);
      
      // Archive the session
      const archiveFile = path.join(carlRoot, `.carl/sessions/archive/${sessionId.trim()}.session.carl`);
      await fs.move(sessionFile, archiveFile);
      
      // Clear current session pointer
      try {
        await fs.unlink(currentSessionFile);
      } catch {
        // Ignore if file doesn't exist
      }
      
      console.log(`Session ${sessionId.trim()} archived successfully`);
      return true;
    }
  } catch (error) {
    console.error(`Error ending session: ${error.message}`);
  }
  
  return false;
}

/**
 * Get session summary for context injection
 * @returns {Promise<string>} Session context
 */
async function getSessionContext() {
  const sessionFile = await getCurrentSessionFile();
  
  if (!sessionFile || !(await utils.pathExists(sessionFile))) {
    return '';
  }
  
  try {
    const content = await utils.safeReadFile(sessionFile);
    if (!content) return '';
    
    const sessionData = yaml.parse(content);
    if (!sessionData) return '';
    
    let context = '## Current Session Context\n\n';
    
    // Session metadata
    if (sessionData.session_metadata) {
      const meta = sessionData.session_metadata;
      context += `session_id: "${meta.session_id}"\n`;
      context += `start_time: "${meta.start_time}"\n`;
      context += `git_branch: "${meta.git_branch}"\n\n`;
    }
    
    // Recent activities
    context += '### Recent Activities\n';
    if (sessionData.session_activities) {
      // Show last few activities
      context += 'Recent development activities tracked\n';
    }
    
    // Session progress
    context += '\n### Session Progress\n';
    if (sessionData.session_progress) {
      const progress = sessionData.session_progress;
      context += `files_modified: ${progress.files_modified || 0}\n`;
      context += `activities_count: ${progress.activities_count || 0}\n`;
      context += `milestones_count: ${progress.milestones_count || 0}\n`;
    }
    
    return context;
  } catch (error) {
    console.error(`Error getting session context: ${error.message}`);
    return '';
  }
}

/**
 * Calculate session duration from file
 * @param {string} sessionFile - Path to session file
 * @returns {Promise<string>} Duration string
 */
async function calculateSessionDurationFromFile(sessionFile) {
  try {
    const content = await utils.safeReadFile(sessionFile);
    if (!content) return 'unknown';
    
    const sessionData = yaml.parse(content);
    if (!sessionData || !sessionData.session_metadata) return 'unknown';
    
    const startTime = new Date(sessionData.session_metadata.start_time);
    const endTime = new Date();
    const durationMs = endTime - startTime;
    
    return formatDuration(durationMs);
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Calculate session duration
 * @returns {Promise<string>} Duration string
 */
async function calculateSessionDuration() {
  const sessionFile = await getCurrentSessionFile();
  if (!sessionFile) return 'unknown';
  
  return await calculateSessionDurationFromFile(sessionFile);
}

/**
 * Count modified files using git
 * @returns {Promise<string>} Number of modified files
 */
async function countModifiedFiles() {
  try {
    const { stdout } = await utils.execCommand('git diff --name-only HEAD');
    if (stdout) {
      return String(stdout.split('\n').filter(line => line.trim()).length);
    }
  } catch {
    // Ignore git errors
  }
  return '0';
}

/**
 * Count added lines using git
 * @returns {Promise<string>} Number of added lines
 */
async function countAddedLines() {
  try {
    const { stdout } = await utils.execCommand('git diff --numstat HEAD');
    if (stdout) {
      const lines = stdout.split('\n').filter(line => line.trim());
      let totalAdded = 0;
      for (const line of lines) {
        const parts = line.split('\t');
        if (parts[0] && parts[0] !== '-') {
          totalAdded += parseInt(parts[0]) || 0;
        }
      }
      return String(totalAdded);
    }
  } catch {
    // Ignore git errors
  }
  return '0';
}

/**
 * Count removed lines using git
 * @returns {Promise<string>} Number of removed lines
 */
async function countRemovedLines() {
  try {
    const { stdout } = await utils.execCommand('git diff --numstat HEAD');
    if (stdout) {
      const lines = stdout.split('\n').filter(line => line.trim());
      let totalRemoved = 0;
      for (const line of lines) {
        const parts = line.split('\t');
        if (parts[1] && parts[1] !== '-') {
          totalRemoved += parseInt(parts[1]) || 0;
        }
      }
      return String(totalRemoved);
    }
  } catch {
    // Ignore git errors
  }
  return '0';
}

/**
 * Update session metrics
 * @returns {Promise<void>}
 */
async function updateSessionMetrics() {
  const sessionFile = await getCurrentSessionFile();
  if (!sessionFile) return;
  
  try {
    const filesModified = await countModifiedFiles();
    const linesAdded = await countAddedLines();
    const linesRemoved = await countRemovedLines();
    
    // Update session file with current metrics
    const content = await utils.safeReadFile(sessionFile);
    if (content) {
      const updated = content.replace(
        /session_progress:\s*\n(\s*files_modified:.*\n)?(\s*activities_count:.*\n)?(\s*milestones_count:.*\n)?/,
        `session_progress:\n  files_modified: ${filesModified}\n  lines_added: ${linesAdded}\n  lines_removed: ${linesRemoved}\n`
      );
      await utils.safeWriteFile(sessionFile, updated);
    }
  } catch (error) {
    console.error(`Error updating session metrics: ${error.message}`);
  }
}

/**
 * Update CARL index with session data
 * @returns {Promise<void>}
 */
async function updateIndexWithSessionData() {
  // This would update the CARL index with session information
  // For now, just log the activity
  try {
    const sessionFile = await getCurrentSessionFile();
    if (sessionFile) {
      const metrics = {
        files_modified: await countModifiedFiles(),
        lines_added: await countAddedLines(),
        lines_removed: await countRemovedLines()
      };
      
      console.log('CARL index updated with session data:', metrics);
    }
  } catch (error) {
    console.error(`Error updating index: ${error.message}`);
  }
}

/**
 * Clean up old sessions (>7 days)
 * @returns {Promise<void>}
 */
async function cleanupOldSessions() {
  const carlRoot = utils.getCarlRoot();
  const archiveDir = path.join(carlRoot, '.carl/sessions/archive');
  
  try {
    const exists = await utils.pathExists(archiveDir);
    if (!exists) return;
    
    const files = await fs.readdir(archiveDir);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    
    for (const file of files) {
      if (file.endsWith('.session.carl')) {
        const filePath = path.join(archiveDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          console.log(`Cleaned up old session: ${file}`);
        }
      }
    }
  } catch (error) {
    console.error(`Error cleaning up sessions: ${error.message}`);
  }
}

/**
 * Get git branch
 * @returns {Promise<string>} Current git branch
 */
async function getGitBranch() {
  try {
    const { stdout } = await utils.execCommand('git branch --show-current');
    return stdout || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Get git commit hash
 * @returns {Promise<string>} Current git commit
 */
async function getGitCommit() {
  try {
    const { stdout } = await utils.execCommand('git rev-parse HEAD');
    return stdout ? stdout.substring(0, 8) : 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Format duration in human-readable format
 * @param {number} durationMs - Duration in milliseconds
 * @returns {string} Formatted duration
 */
function formatDuration(durationMs) {
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

module.exports = {
  ensureSessionDirs,
  getCurrentSessionFile,
  startSession,
  endSession,
  getSessionContext,
  calculateSessionDuration,
  calculateSessionDurationFromFile,
  countModifiedFiles,
  countAddedLines,
  countRemovedLines,
  updateSessionMetrics,
  updateIndexWithSessionData,
  cleanupOldSessions
};