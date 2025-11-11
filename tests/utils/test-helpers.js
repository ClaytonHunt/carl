/**
 * Test Utilities and Helpers for CARL Tests
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Get the test artifacts directory
 * All test files/directories should be created within this directory
 * to avoid polluting the project root
 */
function getTestArtifactsDir() {
  return path.join(__dirname, '..', '.test-artifacts');
}

/**
 * Get a test directory path within the test artifacts directory
 * @param {string} name - Directory name
 * @returns {string} - Full path
 */
function getTestDir(name) {
  return path.join(getTestArtifactsDir(), name);
}

/**
 * Clean up test directory
 * @param {string} dir - Directory path to clean
 */
async function cleanupTestDir(dir) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (error) {
    // Ignore if doesn't exist
  }
}

/**
 * Create test directory structure
 * @param {string} dir - Base directory
 * @param {Array<string>} subdirs - Subdirectories to create
 */
async function createTestDirs(dir, subdirs = []) {
  await fs.mkdir(dir, { recursive: true });

  for (const subdir of subdirs) {
    await fs.mkdir(path.join(dir, subdir), { recursive: true });
  }
}

/**
 * Read JSON file
 * @param {string} filePath - Path to JSON file
 * @returns {Promise<Object>} - Parsed JSON object
 */
async function readJsonFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Write JSON file
 * @param {string} filePath - Path to JSON file
 * @param {Object} data - Data to write
 */
async function writeJsonFile(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Create mock work item
 * @param {string} id - Work item ID
 * @param {Object} overrides - Override default fields
 * @returns {Object} - Mock work item
 */
function createMockWorkItem(id, overrides = {}) {
  const defaults = {
    id,
    type: id.match(/^([A-Z]+)/)[1],
    title: `Test ${id}`,
    status: 'planned',
    priority: 'medium',
    complexity: 'medium',
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  };

  return { ...defaults, ...overrides };
}

/**
 * Create mock registry
 * @param {Object} overrides - Override default fields
 * @returns {Object} - Mock registry
 */
function createMockRegistry(overrides = {}) {
  const defaults = {
    version: '1.0.0',
    last_updated: new Date().toISOString(),
    work_items: {},
    global_id_counter: 0
  };

  return { ...defaults, ...overrides };
}

/**
 * Create mock state.json
 * @param {string} id - Work item ID
 * @param {Object} overrides - Override default fields
 * @returns {Object} - Mock state
 */
function createMockState(id, overrides = {}) {
  const defaults = {
    id,
    status: 'planned',
    progress: {
      total_items: 0,
      completed: 0,
      in_progress: 0,
      planned: 0,
      blocked: 0
    },
    children: {},
    updated: new Date().toISOString()
  };

  return { ...defaults, ...overrides };
}

/**
 * Wait for a specified time
 * @param {number} ms - Milliseconds to wait
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if file exists
 * @param {string} filePath - Path to check
 * @returns {Promise<boolean>} - True if exists
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if directory exists
 * @param {string} dirPath - Path to check
 * @returns {Promise<boolean>} - True if exists
 */
async function dirExists(dirPath) {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Create work item markdown frontmatter
 * @param {Object} data - Frontmatter data
 * @returns {string} - Markdown with frontmatter
 */
function createMarkdownWithFrontmatter(data) {
  const frontmatter = Object.entries(data)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  return `---
${frontmatter}
---

# ${data.title || 'Work Item'}

## Description
[Description goes here]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Notes
Additional notes.
`;
}

module.exports = {
  getTestArtifactsDir,
  getTestDir,
  cleanupTestDir,
  createTestDirs,
  readJsonFile,
  writeJsonFile,
  createMockWorkItem,
  createMockRegistry,
  createMockState,
  wait,
  fileExists,
  dirExists,
  createMarkdownWithFrontmatter
};
