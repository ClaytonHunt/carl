#!/usr/bin/env node

/**
 * Core utilities for CARL Node.js hooks
 * Provides common functions used across all hook modules
 */

const fs = require('fs-extra');
const path = require('path');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Get CARL root directory
 * @returns {string} Absolute path to CARL root
 */
function getCarlRoot() {
  // Use CARL_ROOT environment variable if set, otherwise derive from current directory
  if (process.env.CARL_ROOT) {
    return process.env.CARL_ROOT;
  }
  
  // Navigate up from .carl/hooks to project root
  const currentDir = process.cwd();
  if (currentDir.endsWith('.carl/hooks')) {
    return path.resolve(currentDir, '../..');
  }
  
  // Also handle legacy .claude/hooks location
  if (currentDir.endsWith('.claude/hooks')) {
    return path.resolve(currentDir, '../..');
  }
  
  // Default fallback - we're in .carl/hooks, so go up two levels
  return path.resolve(__dirname, '../..');
}

/**
 * Read JSON input from stdin (for Claude Code integration)
 * @returns {Promise<string>} Raw input from stdin
 */
function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    
    process.stdin.on('end', () => {
      resolve(data.trim());
    });
  });
}

/**
 * Safely parse JSON with error handling
 * @param {string} jsonString - JSON string to parse
 * @param {*} fallback - Fallback value if parsing fails
 * @returns {*} Parsed JSON or fallback
 */
function safeJsonParse(jsonString, fallback = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error(`JSON parsing error: ${error.message}`);
    return fallback;
  }
}

/**
 * Read file safely with error handling
 * @param {string} filePath - Path to file
 * @param {string} encoding - File encoding (default: utf8)
 * @returns {Promise<string|null>} File contents or null if error
 */
async function safeReadFile(filePath, encoding = 'utf8') {
  try {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(getCarlRoot(), filePath);
    return await fs.readFile(absolutePath, encoding);
  } catch (error) {
    // Don't log ENOENT errors (file not found) as they're expected
    if (error.code !== 'ENOENT') {
      console.error(`Error reading file ${filePath}: ${error.message}`);
    }
    return null;
  }
}

/**
 * Write file safely with atomic operations
 * @param {string} filePath - Path to file
 * @param {string} content - Content to write
 * @param {Object} options - Write options
 * @returns {Promise<boolean>} Success status
 */
async function safeWriteFile(filePath, content, options = {}) {
  try {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(getCarlRoot(), filePath);
    
    // Ensure directory exists
    await fs.ensureDir(path.dirname(absolutePath));
    
    // Write atomically (write to temp file, then rename)
    const tempPath = `${absolutePath}.tmp`;
    await fs.writeFile(tempPath, content, { encoding: 'utf8', ...options });
    await fs.rename(tempPath, absolutePath);
    
    return true;
  } catch (error) {
    console.error(`Error writing file ${filePath}: ${error.message}`);
    return false;
  }
}

/**
 * Check if file or directory exists
 * @param {string} filePath - Path to check
 * @returns {Promise<boolean>} True if exists
 */
async function pathExists(filePath) {
  try {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(getCarlRoot(), filePath);
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Execute shell command with error handling
 * @param {string} command - Command to execute
 * @param {Object} options - Execution options
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number}>}
 */
async function execCommand(command, options = {}) {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: getCarlRoot(),
      ...options
    });
    return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0 };
  } catch (error) {
    return {
      stdout: error.stdout ? error.stdout.trim() : '',
      stderr: error.stderr ? error.stderr.trim() : error.message,
      exitCode: error.code || 1
    };
  }
}

/**
 * Get current timestamp in ISO format
 * @returns {string} ISO 8601 timestamp
 */
function getCurrentTimestamp() {
  return new Date().toISOString();
}

/**
 * Format timestamp for display (matching bash format)
 * @param {Date|string} timestamp - Timestamp to format
 * @returns {string} Formatted timestamp
 */
function formatTimestamp(timestamp) {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toISOString();
}

/**
 * Generate session ID (matching bash format)
 * @returns {string} Session ID in YYYYMMDD_HHMMSS format
 */
function generateSessionId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

/**
 * Get user's first name from git config
 * @returns {Promise<string>} User's first name or 'Developer'
 */
async function getUserFirstName() {
  try {
    const { stdout } = await execCommand('git config user.name');
    if (stdout) {
      return stdout.split(' ')[0]; // Get first name
    }
  } catch {
    // Ignore git errors
  }
  
  return process.env.USER || 'Developer';
}

/**
 * Create symlink safely
 * @param {string} target - Target file
 * @param {string} linkPath - Link path
 * @returns {Promise<boolean>} Success status
 */
async function createSymlink(target, linkPath) {
  try {
    const absoluteLinkPath = path.isAbsolute(linkPath) ? linkPath : path.join(getCarlRoot(), linkPath);
    
    // Remove existing symlink/file
    try {
      await fs.unlink(absoluteLinkPath);
    } catch {
      // Ignore if doesn't exist
    }
    
    await fs.symlink(target, absoluteLinkPath);
    return true;
  } catch (error) {
    console.error(`Error creating symlink ${linkPath}: ${error.message}`);
    return false;
  }
}

/**
 * Count lines in a string
 * @param {string} text - Text to count lines in
 * @returns {number} Number of lines
 */
function countLines(text) {
  if (!text) return 0;
  return text.split('\n').length;
}

/**
 * Sanitize output for shell safety (matching bash behavior)
 * @param {string} input - Input string
 * @returns {string} Sanitized string
 */
function sanitizeOutput(input) {
  if (!input || typeof input !== 'string') return '';
  
  // Replace newlines/carriage returns with spaces and limit to first line
  return input
    .replace(/\r\n/g, ' ') // Handle Windows line endings first
    .replace(/[\r\n]/g, ' ') // Handle remaining line endings
    .replace(/\s+/g, ' ') // Collapse multiple spaces to single space
    .replace(/[^\x20-\x7E ]/g, '') // Keep only printable ASCII and spaces
    .substring(0, 1000) // Limit length
    .trim(); // Remove leading/trailing spaces
}

/**
 * Get platform-specific details
 * @returns {Object} Platform information
 */
function getPlatformInfo() {
  const platform = process.platform;
  
  return {
    platform,
    isWindows: platform === 'win32',
    isMacOS: platform === 'darwin',
    isLinux: platform === 'linux',
    pathSeparator: path.sep,
    audioCommand: getAudioCommand(platform)
  };
}

/**
 * Get platform-specific audio command
 * @param {string} platform - Platform identifier
 * @returns {string} Audio command
 */
function getAudioCommand(platform) {
  switch (platform) {
    case 'darwin': return 'afplay';
    case 'linux': return 'aplay'; // or paplay
    case 'win32': return 'start';
    default: return 'aplay';
  }
}

module.exports = {
  getCarlRoot,
  readStdin,
  safeJsonParse,
  safeReadFile,
  safeWriteFile,
  pathExists,
  execCommand,
  getCurrentTimestamp,
  formatTimestamp,
  generateSessionId,
  getUserFirstName,
  createSymlink,
  countLines,
  sanitizeOutput,
  getPlatformInfo,
  getAudioCommand
};