#!/usr/bin/env node

/**
 * CARL Completion Detection and Workflow Management
 * Automatic completion detection and file organization for task command
 */

const fs = require('fs-extra');
const path = require('path');
const yaml = require('yaml');
const { execSync } = require('child_process');
const utils = require('./utils');

/**
 * Check if an intent is completed based on its state file
 * @param {string} intentPath - Path to intent file
 * @returns {Promise<{completed: boolean, stateData: object|null}>}
 */
async function checkIntentCompletion(intentPath) {
  try {
    // Convert intent path to state path
    const statePath = intentPath.replace('.intent.carl', '.state.carl');
    
    if (!await fs.pathExists(statePath)) {
      console.log(`State file not found: ${statePath}`);
      return { completed: false, stateData: null };
    }
    
    const stateContent = await utils.safeReadFile(statePath);
    if (!stateContent) {
      console.log(`Could not read state file: ${statePath}`);
      return { completed: false, stateData: null };
    }
    
    const stateData = yaml.parse(stateContent);
    
    // Check completion percentage
    const completionPercentage = stateData.completion_percentage;
    const phase = stateData.phase;
    
    // Consider completed if percentage is 100 or phase is "completed"
    const isCompleted = completionPercentage === 100 || phase === 'completed';
    
    if (isCompleted) {
      console.log(`✅ Completion detected: ${path.basename(intentPath)} (${completionPercentage}%)`);
    }
    
    return { 
      completed: isCompleted, 
      stateData: stateData,
      intentPath: intentPath,
      statePath: statePath
    };
    
  } catch (error) {
    console.error(`Error checking completion for ${intentPath}:`, error.message);
    return { completed: false, stateData: null };
  }
}

/**
 * Get appropriate completed directory for a given intent file
 * @param {string} intentPath - Path to intent file
 * @returns {string} Path to completed directory
 */
function getCompletedDirectory(intentPath) {
  const carlRoot = utils.getCarlRoot();
  
  // Determine scope type from path
  let scopeType = 'technical'; // default
  if (intentPath.includes('/epics/')) {
    scopeType = 'epics';
  } else if (intentPath.includes('/features/')) {
    scopeType = 'features';
  } else if (intentPath.includes('/stories/')) {
    scopeType = 'stories';
  } else if (intentPath.includes('/technical/')) {
    scopeType = 'technical';
  }
  
  return path.join(carlRoot, '.carl/project', scopeType, 'completed');
}

/**
 * Commit completion state and move files atomically
 * @param {object} completionInfo - Completion information
 * @returns {Promise<boolean>} Success status
 */
async function commitAndMoveFiles(completionInfo) {
  const { intentPath, statePath, stateData } = completionInfo;
  
  try {
    console.log(`🔄 Processing completion for ${path.basename(intentPath)}`);
    
    // Stage the completed state files
    execSync(`git add "${intentPath}" "${statePath}"`, { cwd: utils.getCarlRoot() });
    
    // Create completion commit
    const intentName = path.basename(intentPath, '.intent.carl');
    const scopeType = getScopeTypeFromPath(intentPath);
    const commitMessage = `feat: Complete ${scopeType} ${intentName} - move to completed folder

Automatic completion workflow triggered by CARL task command.
Completion: ${stateData.completion_percentage || 100}%
Phase: ${stateData.phase || 'completed'}

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>`;

    execSync(`git commit -m "${commitMessage}"`, { cwd: utils.getCarlRoot() });
    console.log(`✅ Committed completion state`);
    
    // Get completed directory and ensure it exists
    const completedDir = getCompletedDirectory(intentPath);
    await fs.ensureDir(completedDir);
    
    // Move files using git mv to preserve history
    const intentFileName = path.basename(intentPath);
    const stateFileName = path.basename(statePath);
    const targetIntentPath = path.join(completedDir, intentFileName);
    const targetStatePath = path.join(completedDir, stateFileName);
    
    execSync(`git mv "${intentPath}" "${targetIntentPath}"`, { cwd: utils.getCarlRoot() });
    execSync(`git mv "${statePath}" "${targetStatePath}"`, { cwd: utils.getCarlRoot() });
    
    // Commit the file moves
    const moveCommitMessage = `feat: Move completed ${scopeType} ${intentName} to completed folder

Files moved:
- ${intentFileName} → completed/
- ${stateFileName} → completed/

Preserves git history and maintains project organization.

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>`;

    execSync(`git commit -m "${moveCommitMessage}"`, { cwd: utils.getCarlRoot() });
    console.log(`✅ Moved files to completed folder with preserved git history`);
    
    return true;
    
  } catch (error) {
    console.error(`❌ Error in commit and move operation:`, error.message);
    
    // Attempt rollback
    try {
      execSync('git reset --hard HEAD~1', { cwd: utils.getCarlRoot() });
      console.log(`🔄 Rolled back partial completion operation`);
    } catch (rollbackError) {
      console.error(`❌ Rollback failed:`, rollbackError.message);
    }
    
    return false;
  }
}

/**
 * Get scope type from file path
 * @param {string} filePath - File path
 * @returns {string} Scope type
 */
function getScopeTypeFromPath(filePath) {
  if (filePath.includes('/epics/')) return 'epic';
  if (filePath.includes('/features/')) return 'feature';
  if (filePath.includes('/stories/')) return 'story';
  if (filePath.includes('/technical/')) return 'technical';
  return 'item';
}

/**
 * Update active work tracking files
 * @param {string} intentPath - Path to completed intent
 * @returns {Promise<boolean>} Success status
 */
async function updateActiveWorkTracking(intentPath) {
  try {
    const carlRoot = utils.getCarlRoot();
    const activeWorkPath = path.join(carlRoot, '.carl/project/active.work.carl');
    
    if (!await fs.pathExists(activeWorkPath)) {
      console.log('Active work file not found, skipping tracking update');
      return true;
    }
    
    const activeWorkContent = await utils.safeReadFile(activeWorkPath);
    const activeWork = yaml.parse(activeWorkContent);
    
    const intentId = path.basename(intentPath, '.intent.carl').replace(/\./g, '_');
    
    // Remove from work queues
    if (activeWork.work_queue) {
      ['in_progress', 'ready_for_work', 'blocked'].forEach(section => {
        if (activeWork.work_queue[section]) {
          activeWork.work_queue[section] = activeWork.work_queue[section].filter(
            item => item.id !== intentId
          );
        }
      });
    }
    
    // Update intelligent suggestions
    if (activeWork.intelligent_suggestions && activeWork.intelligent_suggestions.next_logical_tasks) {
      activeWork.intelligent_suggestions.next_logical_tasks = 
        activeWork.intelligent_suggestions.next_logical_tasks.filter(
          task => !task.task.includes(intentId)
        );
    }
    
    // Write updated active work file
    const updatedContent = yaml.stringify(activeWork);
    await fs.writeFile(activeWorkPath, updatedContent, 'utf8');
    
    console.log(`✅ Updated active work tracking`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error updating active work tracking:`, error.message);
    return false;
  }
}

/**
 * Detect and process completions for current task session
 * @param {string[]} activeIntentPaths - Paths to intents worked on in current session
 * @returns {Promise<number>} Number of completions processed
 */
async function detectAndProcessCompletions(activeIntentPaths = []) {
  console.log(`🔍 Checking for completions in ${activeIntentPaths.length} active intents`);
  
  let completionsProcessed = 0;
  
  for (const intentPath of activeIntentPaths) {
    const completionCheck = await checkIntentCompletion(intentPath);
    
    if (completionCheck.completed) {
      console.log(`🎯 Processing completion: ${path.basename(intentPath)}`);
      
      // Commit and move files
      const moveSuccess = await commitAndMoveFiles(completionCheck);
      
      if (moveSuccess) {
        // Update active work tracking
        await updateActiveWorkTracking(intentPath);
        completionsProcessed++;
      }
    }
  }
  
  if (completionsProcessed > 0) {
    console.log(`✅ Processed ${completionsProcessed} completion(s)`);
  } else {
    console.log(`📋 No completions detected`);
  }
  
  return completionsProcessed;
}

/**
 * Full project review mode - check all intents for completion
 * @returns {Promise<number>} Number of completions processed
 */
async function fullProjectReview() {
  console.log(`🔍 Full project review mode - scanning all intents`);
  
  const carlRoot = utils.getCarlRoot();
  const projectRoot = path.join(carlRoot, '.carl/project');
  
  // Find all intent files
  const intentFiles = [];
  const scopeDirs = ['epics', 'features', 'stories', 'technical'];
  
  for (const scopeDir of scopeDirs) {
    const scopePath = path.join(projectRoot, scopeDir);
    if (await fs.pathExists(scopePath)) {
      const files = await fs.readdir(scopePath);
      for (const file of files) {
        if (file.endsWith('.intent.carl')) {
          const filePath = path.join(scopePath, file);
          const stat = await fs.stat(filePath);
          if (stat.isFile()) {
            intentFiles.push(filePath);
          }
        }
      }
    }
  }
  
  return await detectAndProcessCompletions(intentFiles);
}

// =====================================================
// HIERARCHICAL RELATIONSHIP DISCOVERY SYSTEM
// =====================================================

/**
 * Cache for hierarchical relationships to improve performance
 * Structure: { intentPath: { parent: string|null, children: string[] } }
 */
let relationshipCache = new Map();
let cacheTimestamp = null;
const CACHE_DURATION = 300000; // 5 minutes

/**
 * Parse parent_id and child_relationships from an intent file
 * @param {string} intentPath - Path to intent file
 * @returns {Promise<{parent: string|null, children: string[]}>}
 */
async function parseIntentRelationships(intentPath) {
  try {
    if (!await fs.pathExists(intentPath)) {
      return { parent: null, children: [] };
    }
    
    const content = await utils.safeReadFile(intentPath);
    if (!content) {
      return { parent: null, children: [] };
    }
    
    const intentData = yaml.parse(content);
    if (!intentData) {
      return { parent: null, children: [] };
    }
    
    // Extract parent relationship
    const parentId = intentData.parent_id || null;
    
    // Extract child relationships
    let children = [];
    if (intentData.relationships && intentData.relationships.child_relationships) {
      children = Array.isArray(intentData.relationships.child_relationships) 
        ? intentData.relationships.child_relationships 
        : [];
    }
    
    return { parent: parentId, children };
    
  } catch (error) {
    console.error(`❌ Error parsing relationships for ${intentPath}:`, error.message);
    return { parent: null, children: [] };
  }
}

/**
 * Find intent file path by ID across all scope directories
 * @param {string} intentId - ID to search for
 * @returns {Promise<string|null>} Path to intent file or null if not found
 */
async function findIntentFileById(intentId) {
  const projectDir = path.join(process.cwd(), '.carl', 'project');
  const scopeDirs = ['epics', 'features', 'stories', 'technical'];
  
  for (const scopeDir of scopeDirs) {
    const fullScopeDir = path.join(projectDir, scopeDir);
    
    if (!await fs.pathExists(fullScopeDir)) {
      continue;
    }
    
    // Check active directory
    const files = await fs.readdir(fullScopeDir);
    for (const file of files) {
      if (file.endsWith('.intent.carl')) {
        const filePath = path.join(fullScopeDir, file);
        
        // Check if this file has the matching ID
        try {
          const content = await utils.safeReadFile(filePath);
          if (content) {
            const intentData = yaml.parse(content);
            if (intentData && intentData.id === intentId) {
              return filePath;
            }
          }
        } catch (error) {
          // Skip files that can't be parsed
          continue;
        }
      }
    }
    
    // Check completed directory
    const completedDir = path.join(fullScopeDir, 'completed');
    if (await fs.pathExists(completedDir)) {
      const completedFiles = await fs.readdir(completedDir);
      for (const file of completedFiles) {
        if (file.endsWith('.intent.carl')) {
          const filePath = path.join(completedDir, file);
          
          try {
            const content = await utils.safeReadFile(filePath);
            if (content) {
              const intentData = yaml.parse(content);
              if (intentData && intentData.id === intentId) {
                return filePath;
              }
            }
          } catch (error) {
            continue;
          }
        }
      }
    }
  }
  
  return null;
}

/**
 * Build comprehensive hierarchical relationship map
 * @returns {Promise<Map<string, {parent: string|null, children: string[], parentPath: string|null, childPaths: string[]}>>}
 */
async function buildHierarchicalMap() {
  // Check cache validity
  const now = Date.now();
  if (relationshipCache.size > 0 && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log(`📋 Using cached hierarchical relationships (${relationshipCache.size} items)`);
    return relationshipCache;
  }
  
  console.log(`🔍 Building hierarchical relationship map...`);
  const relationshipMap = new Map();
  
  const projectDir = path.join(process.cwd(), '.carl', 'project');
  const scopeDirs = ['epics', 'features', 'stories', 'technical'];
  
  // First pass: collect all intent files and their declared relationships
  const allIntentFiles = new Map(); // intentId -> { path, parent, children }
  
  for (const scopeDir of scopeDirs) {
    const fullScopeDir = path.join(projectDir, scopeDir);
    
    if (!await fs.pathExists(fullScopeDir)) {
      continue;
    }
    
    // Process active directory
    await processDirectoryForRelationships(fullScopeDir, allIntentFiles);
    
    // Process completed directory
    const completedDir = path.join(fullScopeDir, 'completed');
    if (await fs.pathExists(completedDir)) {
      await processDirectoryForRelationships(completedDir, allIntentFiles);
    }
  }
  
  // Second pass: build resolved relationship map
  for (const [intentId, data] of allIntentFiles) {
    // Find parent path
    let parentPath = null;
    if (data.parent && allIntentFiles.has(data.parent)) {
      parentPath = allIntentFiles.get(data.parent).path;
    }
    
    // Find child paths
    const childPaths = [];
    for (const childId of data.children) {
      if (allIntentFiles.has(childId)) {
        childPaths.push(allIntentFiles.get(childId).path);
      }
    }
    
    relationshipMap.set(data.path, {
      parent: data.parent,
      children: data.children,
      parentPath,
      childPaths
    });
  }
  
  // Update cache
  relationshipCache = relationshipMap;
  cacheTimestamp = now;
  
  console.log(`✅ Built hierarchical map with ${relationshipMap.size} items`);
  return relationshipMap;
}

/**
 * Helper function to process a directory for relationships
 * @param {string} dirPath - Directory to process
 * @param {Map} allIntentFiles - Map to populate with intent file data
 */
async function processDirectoryForRelationships(dirPath, allIntentFiles) {
  const files = await fs.readdir(dirPath);
  
  for (const file of files) {
    if (file.endsWith('.intent.carl')) {
      const filePath = path.join(dirPath, file);
      const relationships = await parseIntentRelationships(filePath);
      
      // Extract intent ID from file content
      try {
        const content = await utils.safeReadFile(filePath);
        if (content) {
          const intentData = yaml.parse(content);
          if (intentData && intentData.id) {
            allIntentFiles.set(intentData.id, {
              path: filePath,
              parent: relationships.parent,
              children: relationships.children
            });
          }
        }
      } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
      }
    }
  }
}

/**
 * Get parent intent path from child intent path
 * @param {string} childIntentPath - Path to child intent file
 * @returns {Promise<string|null>} Path to parent intent file or null
 */
async function getParentIntentPath(childIntentPath) {
  const relationshipMap = await buildHierarchicalMap();
  const relationship = relationshipMap.get(childIntentPath);
  
  return relationship ? relationship.parentPath : null;
}

/**
 * Get child intent paths from parent intent path
 * @param {string} parentIntentPath - Path to parent intent file
 * @returns {Promise<string[]>} Array of child intent file paths
 */
async function getChildIntentPaths(parentIntentPath) {
  const relationshipMap = await buildHierarchicalMap();
  const relationship = relationshipMap.get(parentIntentPath);
  
  return relationship ? relationship.childPaths : [];
}

/**
 * Clear the relationship cache (useful for testing or when files change)
 */
function clearRelationshipCache() {
  relationshipCache.clear();
  cacheTimestamp = null;
  console.log(`🔄 Cleared hierarchical relationship cache`);
}

// =====================================================
// COMPLETION PERCENTAGE RECALCULATION SYSTEM
// =====================================================

/**
 * Read completion percentage from a state file
 * @param {string} stateFilePath - Path to state file
 * @returns {Promise<number|null>} Completion percentage or null if not found
 */
async function getCompletionPercentage(stateFilePath) {
  try {
    if (!await fs.pathExists(stateFilePath)) {
      return null;
    }
    
    const content = await utils.safeReadFile(stateFilePath);
    if (!content) {
      return null;
    }
    
    const stateData = yaml.parse(content);
    if (!stateData) {
      return null;
    }
    
    // Check for completion_percentage field
    if (typeof stateData.completion_percentage === 'number') {
      return Math.max(0, Math.min(100, stateData.completion_percentage));
    }
    
    // Check metadata section
    if (stateData.metadata && typeof stateData.metadata.completion_percentage === 'number') {
      return Math.max(0, Math.min(100, stateData.metadata.completion_percentage));
    }
    
    // Check for completed status indicators
    if (stateData.status === 'completed' || stateData.phase === 'completed') {
      return 100;
    }
    
    if (stateData.metadata) {
      if (stateData.metadata.status === 'completed' || stateData.metadata.phase === 'completed') {
        return 100;
      }
    }
    
    return 0; // Default to 0% if no completion data found
    
  } catch (error) {
    console.error(`❌ Error reading completion percentage from ${stateFilePath}:`, error.message);
    return null;
  }
}

/**
 * Calculate average completion percentage from child completion percentages
 * @param {number[]} childCompletionPercentages - Array of child completion percentages
 * @returns {number} Average completion percentage (0-100)
 */
function calculateAverageCompletion(childCompletionPercentages) {
  if (!childCompletionPercentages || childCompletionPercentages.length === 0) {
    return 0;
  }
  
  // Filter out null values
  const validPercentages = childCompletionPercentages.filter(p => p !== null && typeof p === 'number');
  
  if (validPercentages.length === 0) {
    return 0;
  }
  
  const sum = validPercentages.reduce((acc, percentage) => acc + percentage, 0);
  const average = sum / validPercentages.length;
  
  return Math.round(average * 100) / 100; // Round to 2 decimal places
}

/**
 * Update parent state file completion percentage
 * @param {string} parentIntentPath - Path to parent intent file
 * @param {number} newCompletionPercentage - New completion percentage to set
 * @returns {Promise<boolean>} Success status
 */
async function updateParentCompletionPercentage(parentIntentPath, newCompletionPercentage) {
  try {
    // Convert intent path to state path
    const parentStatePath = parentIntentPath.replace('.intent.carl', '.state.carl');
    
    if (!await fs.pathExists(parentStatePath)) {
      console.log(`⚠️  Parent state file not found: ${parentStatePath}`);
      return false;
    }
    
    const content = await utils.safeReadFile(parentStatePath);
    if (!content) {
      console.error(`❌ Could not read parent state file: ${parentStatePath}`);
      return false;
    }
    
    const stateData = yaml.parse(content);
    if (!stateData) {
      console.error(`❌ Could not parse parent state file: ${parentStatePath}`);
      return false;
    }
    
    // Update completion percentage in the most appropriate location
    const roundedPercentage = Math.round(newCompletionPercentage * 100) / 100;
    
    if (stateData.metadata) {
      stateData.metadata.completion_percentage = roundedPercentage;
      stateData.metadata.last_updated = new Date().toISOString();
      
      // Mark as completed if 100%
      if (roundedPercentage >= 100) {
        stateData.metadata.status = 'completed';
        stateData.metadata.completion_date = new Date().toISOString();
      }
    } else {
      // Fallback to root level
      stateData.completion_percentage = roundedPercentage;
      stateData.last_updated = new Date().toISOString();
      
      if (roundedPercentage >= 100) {
        stateData.status = 'completed';
        stateData.completion_date = new Date().toISOString();
      }
    }
    
    // Write updated state file atomically
    const updatedContent = yaml.stringify(stateData);
    await fs.writeFile(parentStatePath, updatedContent, 'utf8');
    
    console.log(`✅ Updated ${path.basename(parentIntentPath)} completion: ${roundedPercentage}%`);
    
    // If parent reached 100%, trigger completion workflow
    if (roundedPercentage >= 100) {
      console.log(`🎯 Parent reached 100% completion, triggering completion workflow...`);
      const completionCheck = await checkIntentCompletion(parentIntentPath);
      if (completionCheck.completed) {
        await commitAndMoveFiles(completionCheck);
        await updateActiveWorkTracking(parentIntentPath);
      }
    }
    
    return true;
    
  } catch (error) {
    console.error(`❌ Error updating parent completion percentage:`, error.message);
    return false;
  }
}

/**
 * Recalculate and update parent completion percentage based on children
 * @param {string} parentIntentPath - Path to parent intent file
 * @returns {Promise<{success: boolean, oldPercentage: number|null, newPercentage: number|null}>}
 */
async function recalculateParentCompletion(parentIntentPath) {
  try {
    console.log(`🔄 Recalculating completion for: ${path.basename(parentIntentPath)}`);
    
    // Get current parent completion percentage
    const parentStatePath = parentIntentPath.replace('.intent.carl', '.state.carl');
    const currentPercentage = await getCompletionPercentage(parentStatePath);
    
    // Get child intent paths
    const childIntentPaths = await getChildIntentPaths(parentIntentPath);
    
    if (childIntentPaths.length === 0) {
      console.log(`ℹ️  No children found for ${path.basename(parentIntentPath)}`);
      return { success: true, oldPercentage: currentPercentage, newPercentage: currentPercentage };
    }
    
    // Get completion percentages for all children
    const childCompletionPromises = childIntentPaths.map(async (childPath) => {
      const childStatePath = childPath.replace('.intent.carl', '.state.carl');
      return await getCompletionPercentage(childStatePath);
    });
    
    const childCompletionPercentages = await Promise.all(childCompletionPromises);
    
    // Calculate new average completion percentage
    const newCompletionPercentage = calculateAverageCompletion(childCompletionPercentages);
    
    console.log(`📊 Children completion: [${childCompletionPercentages.join(', ')}] → Average: ${newCompletionPercentage}%`);
    
    // Update parent state file if percentage changed significantly
    const percentageDifference = Math.abs((currentPercentage || 0) - newCompletionPercentage);
    
    if (percentageDifference >= 0.01) { // Update if difference >= 0.01%
      const updateSuccess = await updateParentCompletionPercentage(parentIntentPath, newCompletionPercentage);
      
      if (updateSuccess) {
        return { 
          success: true, 
          oldPercentage: currentPercentage, 
          newPercentage: newCompletionPercentage,
          childrenData: {
            count: childIntentPaths.length,
            completions: childCompletionPercentages
          }
        };
      }
    } else {
      console.log(`ℹ️  No significant change in completion percentage (${currentPercentage}% → ${newCompletionPercentage}%)`);
      return { success: true, oldPercentage: currentPercentage, newPercentage: currentPercentage };
    }
    
    return { success: false, oldPercentage: currentPercentage, newPercentage: null };
    
  } catch (error) {
    console.error(`❌ Error recalculating parent completion:`, error.message);
    return { success: false, oldPercentage: null, newPercentage: null };
  }
}

module.exports = {
  checkIntentCompletion,
  commitAndMoveFiles,
  updateActiveWorkTracking,
  detectAndProcessCompletions,
  fullProjectReview,
  getCompletedDirectory,
  getScopeTypeFromPath,
  // Hierarchical relationship discovery functions
  parseIntentRelationships,
  findIntentFileById,
  buildHierarchicalMap,
  getParentIntentPath,
  getChildIntentPaths,
  clearRelationshipCache,
  // Completion percentage recalculation functions
  getCompletionPercentage,
  calculateAverageCompletion,
  updateParentCompletionPercentage,
  recalculateParentCompletion
};