/**
 * Helper for running quick tests with proper test artifact isolation
 *
 * This ensures all tests use tests/.test-artifacts/ directory instead of
 * polluting the project root.
 *
 * Usage:
 *   node tests/utils/run-quick-test.js [test-name]
 */

const path = require('path');
const fs = require('fs').promises;

// Get test artifacts directory
function getTestDir(name = 'quick-test') {
  return path.join(__dirname, '..', '.test-artifacts', name);
}

// Clean up test directory
async function cleanup(testDir) {
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (error) {
    // Ignore if doesn't exist
  }
}

// Export for use in scripts
module.exports = {
  getTestDir,
  cleanup
};

// If run directly, show usage
if (require.main === module) {
  console.log('Quick Test Helper');
  console.log('=================\n');
  console.log('This helper ensures tests use tests/.test-artifacts/ directory.\n');
  console.log('Usage in your test scripts:');
  console.log('  const { getTestDir, cleanup } = require("./tests/utils/run-quick-test.js");\n');
  console.log('  const testDir = getTestDir("my-test");');
  console.log('  await cleanup(testDir);');
  console.log('  const manager = new CascadeManager(testDir);\n');
  console.log('Example test directory:', getTestDir('example'));
}
