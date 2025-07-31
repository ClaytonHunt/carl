#!/usr/bin/env node

/**
 * CARL Session End Hook - Node.js Implementation
 * Saves CARL session state and provides development session summary
 */

const fs = require('fs-extra');
const path = require('path');
const utils = require('./lib/utils');
const carlHelpers = require('./lib/carl-helpers');
const carlSession = require('./lib/carl-session');
const carlAudio = require('./lib/carl-audio');

/**
 * Calculate session duration from session file
 * @param {string} sessionFile - Path to session file
 * @returns {Promise<string>} Duration string
 */
async function calculateSessionDuration(sessionFile) {
  try {
    const content = await utils.safeReadFile(sessionFile);
    const startTimeMatch = content.match(/start_time:\s*"?([^"\n]+)"?/);
    
    if (startTimeMatch) {
      const startTime = new Date(startTimeMatch[1]);
      const endTime = new Date();
      const durationMs = endTime - startTime;
      
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${minutes}m`;
      }
    }
  } catch {
    // Fallback
  }
  
  return 'unknown';
}

/**
 * Get session context summary
 * @returns {Promise<string>} Session summary
 */
async function getSessionContext() {
  try {
    const sessionFile = await carlSession.getCurrentSessionFile();
    if (!sessionFile) {
      return '';
    }
    
    const duration = await calculateSessionDuration(sessionFile);
    const metrics = await carlSession.getProgressMetrics();
    
    let summary = `⏱️  Session Duration: ${duration}\n`;
    
    if (metrics.files_modified > 0) {
      summary += '📝 Code Changes:\n';
      summary += `   Files Modified: ${metrics.files_modified}\n`;
      summary += `   Lines Added: +${metrics.lines_added}\n`;
      summary += `   Lines Removed: -${metrics.lines_removed}\n`;
    }
    
    if (metrics.activities_count > 0) {
      summary += `🔧 Activities Completed: ${metrics.activities_count}\n`;
    }
    
    if (metrics.milestones_count > 0) {
      summary += `🎯 Milestones Reached: ${metrics.milestones_count}\n`;
    }
    
    return summary;
  } catch {
    return '';
  }
}

/**
 * Count CARL files
 * @returns {Promise<number>} Number of CARL files
 */
async function countCarlFiles() {
  try {
    const carlRoot = utils.getCarlRoot();
    const intentCount = await utils.countFiles(path.join(carlRoot, '.carl/project'), '*.intent.carl');
    const stateCount = await utils.countFiles(path.join(carlRoot, '.carl/project'), '*.state.carl');
    const contextCount = await utils.countFiles(path.join(carlRoot, '.carl/project'), '*.context.carl');
    
    return intentCount + stateCount + contextCount;
  } catch {
    return 0;
  }
}

/**
 * Update CARL index with session data
 */
async function updateIndexWithSessionData() {
  try {
    // This would update the CARL index with session information
    // For now, just log the activity
    await carlSession.logActivity('session_data_indexed', { timestamp: new Date().toISOString() });
  } catch (error) {
    // Don't fail on index update errors
  }
}

/**
 * Cleanup old session files
 */
async function cleanupOldSessions() {
  try {
    const carlRoot = utils.getCarlRoot();
    const sessionsDir = path.join(carlRoot, '.carl/sessions/active');
    
    // Find sessions older than 7 days
    const files = await fs.readdir(sessionsDir);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    
    for (const file of files) {
      if (file.endsWith('.session.carl')) {
        const filePath = path.join(sessionsDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          // Move to archive instead of deleting
          const archiveDir = path.join(carlRoot, '.carl/sessions/archive');
          await fs.ensureDir(archiveDir);
          await fs.move(filePath, path.join(archiveDir, file));
        }
      }
    }
  } catch (error) {
    // Don't fail on cleanup errors
  }
}

async function main() {
  try {
    const carlRoot = utils.getCarlRoot();
    
    console.log('💾 Saving CARL session state...');
    
    // Check if there's an active session
    const currentSessionFile = path.join(carlRoot, '.carl/sessions/current.session');
    const sessionExists = await utils.pathExists(currentSessionFile);
    
    if (sessionExists) {
      // End session using session manager
      await carlSession.endSession();
      console.log('✅ Session ended and archived successfully');
    } else {
      console.log('⚠️  No active session found to save');
    }
    
    // Generate and display session summary
    console.log('');
    console.log('📊 CARL Development Session Summary');
    console.log('==========================================');
    
    // Get session context
    const sessionContext = await getSessionContext();
    if (sessionContext) {
      console.log(sessionContext);
    } else {
      // Fallback to basic summary
      console.log('⏱️  Session Duration: unknown');
      
      // CARL file count
      const carlFilesCount = await countCarlFiles();
      if (carlFilesCount > 0) {
        console.log(`📋 CARL Files Available: ${carlFilesCount}`);
      }
    }
    
    console.log('==========================================');
    
    // Update CARL index with session information
    await updateIndexWithSessionData();
    
    // Play farewell audio with session context
    const projectName = path.basename(carlRoot);
    
    // Get file modification count for audio message
    let filesModified = 0;
    try {
      const metrics = await carlSession.getProgressMetrics();
      filesModified = metrics.files_modified || 0;
    } catch {
      // Use fallback
    }
    
    // Simple audio message
    if (filesModified > 0) {
      await carlAudio.playAudio('end', `Good work today on ${projectName}! CARL is tracking your progress perfectly!`);
    } else {
      await carlAudio.playAudio('end', 'Thanks for the session! CARL has saved all your context for next time. See you later!');
    }
    
    // Clean up old session files
    await cleanupOldSessions();
    
    console.log('👋 CARL session ended. Context saved for seamless continuation!');
    console.log('');
    
  } catch (error) {
    console.error('Error ending CARL session:', error.message);
    process.exit(0); // Don't fail hard on session end errors
  }
}

// Run main function if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error in session-end:', error);
    process.exit(0); // Don't fail hard on hook errors
  });
}

module.exports = { main };