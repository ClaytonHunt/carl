#!/usr/bin/env node

/**
 * CARL Session Start Hook - Node.js Implementation
 * Automatically loads CARL context and initializes audio system when Claude Code starts
 */

const fs = require('fs-extra');
const path = require('path');
const utils = require('./lib/utils');
const carlHelpers = require('./lib/carl-helpers');
const carlSession = require('./lib/carl-session');
const carlAudio = require('./lib/carl-audio');

async function main() {
  try {
    const carlRoot = utils.getCarlRoot();
    
    // Initialize CARL session
    console.log('🤖 Starting CARL (Context-Aware Requirements Language) system...');
    
    // Check if CARL is initialized in this project
    const projectDir = path.join(carlRoot, '.carl/project');
    const projectExists = await utils.pathExists(projectDir);
    
    if (!projectExists) {
      console.log('ℹ️  CARL not initialized in this project.');
      console.log('📋 Use /analyze to scan existing project or /plan to create new requirements.');
      await carlAudio.playAudio('start', 'Hi there! Looks like CARL hasn\'t been set up yet. Ready to analyze your project?');
      return;
    }
    
    // Load CARL context for AI
    console.log('📊 Loading CARL project context...');
    
    // Load CARL project context from modern structure
    const visionFile = path.join(carlRoot, '.carl/project/vision.carl');
    const roadmapFile = path.join(carlRoot, '.carl/project/roadmap.carl');
    
    if (await utils.pathExists(visionFile)) {
      console.log('🔍 CARL Project Vision Available:');
      console.log('----------------------------------------');
      const visionContent = await utils.safeReadFile(visionFile);
      const firstLines = visionContent.split('\n').slice(0, 10).join('\n');
      console.log(firstLines);
      console.log('----------------------------------------');
      console.log('');
    } else if (await utils.pathExists(roadmapFile)) {
      console.log('🔍 CARL Project Context Available:');
      console.log('----------------------------------------');
      const roadmapContent = await utils.safeReadFile(roadmapFile);
      const firstLines = roadmapContent.split('\n').slice(0, 10).join('\n');
      console.log(firstLines);
      console.log('----------------------------------------');
      console.log('');
    }
    
    // Load active session context if exists
    const currentSessionFile = path.join(carlRoot, '.carl/sessions/current.session');
    if (await utils.pathExists(currentSessionFile)) {
      console.log('🔄 Resuming previous CARL session...');
      console.log('Session Context:');
      console.log('----------------------------------------');
      const sessionContent = await utils.safeReadFile(currentSessionFile);
      const firstLines = sessionContent.split('\n').slice(0, 10).join('\n');
      console.log(firstLines);
      console.log('----------------------------------------');
      console.log('');
    }
    
    // Display project health summary
    console.log('📈 CARL Project Health Summary:');
    console.log('----------------------------------------');
    
    // Count CARL files for health assessment using modern structure
    const intentCount = await utils.countFiles(path.join(carlRoot, '.carl/project'), '*.intent.carl');
    const stateCount = await utils.countFiles(path.join(carlRoot, '.carl/project'), '*.state.carl');
    const contextCount = await utils.countFiles(path.join(carlRoot, '.carl/project'), '*.context.carl');
    
    console.log(`📋 Intent Files: ${intentCount} (Requirements and features)`);
    console.log(`📊 State Files: ${stateCount} (Implementation progress)`);
    console.log(`🔗 Context Files: ${contextCount} (System relationships)`);
    
    // Check for recent activity
    const recentUpdates = await utils.countRecentFiles(path.join(carlRoot, '.carl/project'), ['*.intent.carl', '*.state.carl', '*.context.carl']);
    if (recentUpdates > 0) {
      console.log(`⚠️  ${recentUpdates} CARL files have been recently updated`);
      console.log('💡 Project context is actively maintained');
    }
    
    console.log('----------------------------------------');
    
    // Play welcome audio
    const projectName = path.basename(carlRoot);
    if (intentCount > 0) {
      await carlAudio.playAudio('start', `Hey there! CARL is ready to help with ${projectName}. I can see you have ${intentCount} features to work with!`);
    } else {
      await carlAudio.playAudio('start', `Hello! CARL is starting up for ${projectName}. Ready to make some progress!`);
    }
    
    // Provide helpful command suggestions
    console.log('🚀 Quick CARL Commands:');
    console.log('  /status     - View project progress and health');
    console.log('  /plan       - Create or update feature plans');
    console.log('  /task       - Work on implementation with CARL context');
    console.log('  /analyze    - Refresh CARL context from codebase');
    console.log('  /settings   - Configure CARL behavior and audio');
    console.log('');
    
    // Create new session record
    const sessionId = `session_${new Date().toISOString().replace(/[:.]/g, '').slice(0, 15)}`;
    const sessionFile = path.join(carlRoot, `.carl/sessions/active/${sessionId}.session.carl`);
    
    // Ensure session directories exist
    await carlSession.ensureSessionDirs();
    
    const sessionData = {
      session_metadata: {
        session_id: sessionId,
        start_time: new Date().toISOString(),
        working_directory: carlRoot,
        git_branch: await utils.getCurrentGitBranch(),
        git_commit: await utils.getCurrentGitCommit(),
        user: await utils.getGitUserName()
      },
      session_activities: [],
      session_milestones: [],
      progress_metrics: {
        files_modified: 0,
        lines_added: 0,
        lines_removed: 0,
        activities_count: 0,
        milestones_count: 0
      }
    };
    
    // Write session file in CARL format
    const sessionContent = `# CARL Session Tracking
# Session ID: ${sessionId}
# Created: ${new Date().toISOString()}

session_metadata:
  session_id: "${sessionId}"
  start_time: "${new Date().toISOString()}"
  working_directory: "${carlRoot}"
  git_branch: "${await utils.getCurrentGitBranch()}"
  git_commit: "${await utils.getCurrentGitCommit()}"
  user: "${await utils.getGitUserName()}"

session_activities:
  # Activities will be appended here during the session

session_milestones:
  # Milestones will be tracked here

progress_metrics:
  files_modified: 0
  lines_added: 0
  lines_removed: 0
  activities_count: 0
  milestones_count: 0
`;
    
    await utils.safeWriteFile(sessionFile, sessionContent);
    
    // Update current session reference
    await utils.safeWriteFile(currentSessionFile, sessionId);
    
    console.log(`✨ CARL is ready! Context loaded and session ${sessionId} initialized.`);
    
  } catch (error) {
    console.error('Error starting CARL session:', error.message);
    process.exit(1);
  }
}

// Run main function if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { main };