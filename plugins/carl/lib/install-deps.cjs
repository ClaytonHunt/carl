#!/usr/bin/env node

/**
 * Automatic Dependency Installer for CARL Plugin
 *
 * This script runs on SessionStart to ensure all required npm dependencies
 * are installed. It checks for missing packages and installs them silently.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Determine plugin root directory
const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..');
const PACKAGE_JSON_PATH = path.join(PLUGIN_ROOT, 'package.json');
const NODE_MODULES_PATH = path.join(PLUGIN_ROOT, 'node_modules');
const LOCK_FILE_PATH = path.join(PLUGIN_ROOT, '.deps-installed');

/**
 * Check if npm is available
 */
function isNpmAvailable() {
  try {
    execSync('npm --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Read package.json and get dependencies
 */
function getDependencies() {
  try {
    if (!fs.existsSync(PACKAGE_JSON_PATH)) {
      return { dependencies: {}, devDependencies: {} };
    }

    const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
    return {
      dependencies: packageJson.dependencies || {},
      devDependencies: packageJson.devDependencies || {},
    };
  } catch (error) {
    console.error('[CARL] Error reading package.json:', error.message);
    return { dependencies: {}, devDependencies: {} };
  }
}

/**
 * Check if a specific package is installed
 */
function isPackageInstalled(packageName) {
  const packagePath = path.join(NODE_MODULES_PATH, packageName);
  return fs.existsSync(packagePath);
}

/**
 * Check if all dependencies are installed
 */
function areAllDependenciesInstalled(deps) {
  const allPackages = Object.keys(deps.dependencies).concat(Object.keys(deps.devDependencies));

  if (allPackages.length === 0) {
    return true;
  }

  for (const pkg of allPackages) {
    if (!isPackageInstalled(pkg)) {
      return false;
    }
  }

  return true;
}

/**
 * Get list of missing packages
 */
function getMissingPackages(deps) {
  const allPackages = Object.keys(deps.dependencies).concat(Object.keys(deps.devDependencies));
  const missing = [];

  for (const pkg of allPackages) {
    if (!isPackageInstalled(pkg)) {
      missing.push(pkg);
    }
  }

  return missing;
}

/**
 * Check if dependencies were recently installed (cache mechanism)
 */
function wasRecentlyChecked() {
  if (!fs.existsSync(LOCK_FILE_PATH)) {
    return false;
  }

  try {
    const stats = fs.statSync(LOCK_FILE_PATH);
    const lockData = JSON.parse(fs.readFileSync(LOCK_FILE_PATH, 'utf8'));
    const lastCheck = new Date(lockData.timestamp);
    const now = new Date();
    const hoursSinceCheck = (now - lastCheck) / (1000 * 60 * 60);

    // Re-check every 24 hours
    return hoursSinceCheck < 24 && lockData.packageJsonHash === getPackageJsonHash();
  } catch (error) {
    return false;
  }
}

/**
 * Get hash of package.json to detect changes
 */
function getPackageJsonHash() {
  try {
    const content = fs.readFileSync(PACKAGE_JSON_PATH, 'utf8');
    // Simple hash - could use crypto for better hashing
    return Buffer.from(content).toString('base64').substring(0, 32);
  } catch (error) {
    return '';
  }
}

/**
 * Create lock file to prevent repeated checks
 */
function createLockFile() {
  const lockData = {
    timestamp: new Date().toISOString(),
    packageJsonHash: getPackageJsonHash(),
  };

  try {
    fs.writeFileSync(LOCK_FILE_PATH, JSON.stringify(lockData, null, 2));
  } catch (error) {
    // Silently fail - not critical
  }
}

/**
 * Install npm dependencies
 */
function installDependencies() {
  try {
    console.error('[CARL] Installing dependencies...');

    const options = {
      cwd: PLUGIN_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
    };

    // Use npm install with --production flag if no devDependencies needed
    const output = execSync('npm install --prefer-offline --no-audit --no-fund', options);

    console.error('[CARL] Dependencies installed successfully');
    return true;
  } catch (error) {
    console.error('[CARL] Error installing dependencies:', error.message);
    if (error.stderr) {
      console.error('[CARL] npm stderr:', error.stderr.toString());
    }
    return false;
  }
}

/**
 * Update TTS dependencies based on settings
 */
function updateTTSDependencies() {
  try {
    const manageTTSPath = path.join(__dirname, 'manage-tts-deps.cjs');
    if (fs.existsSync(manageTTSPath)) {
      require(manageTTSPath);
    }
  } catch (error) {
    console.error('[CARL] Error updating TTS dependencies:', error.message);
  }
}

/**
 * Main execution
 */
function main() {
  // Update TTS dependencies based on settings (must run before checking dependencies)
  updateTTSDependencies();

  // Skip if already checked recently
  if (wasRecentlyChecked()) {
    // Silent success - dependencies already verified
    return;
  }

  // Check if npm is available
  if (!isNpmAvailable()) {
    console.error('[CARL] Warning: npm is not available. Cannot install dependencies.');
    console.error('[CARL] Please install Node.js and npm to use CARL plugin features.');
    return;
  }

  // Check if package.json exists
  if (!fs.existsSync(PACKAGE_JSON_PATH)) {
    console.error('[CARL] No package.json found. Skipping dependency installation.');
    createLockFile();
    return;
  }

  // Get dependencies from package.json
  const deps = getDependencies();
  const allPackages = Object.keys(deps.dependencies).concat(Object.keys(deps.devDependencies));

  // If no dependencies, create lock file and exit
  if (allPackages.length === 0) {
    createLockFile();
    return;
  }

  // Check if all dependencies are installed
  if (areAllDependenciesInstalled(deps)) {
    // All dependencies present
    createLockFile();
    return;
  }

  // Get missing packages
  const missing = getMissingPackages(deps);

  console.error(`[CARL] Found ${missing.length} missing package(s): ${missing.join(', ')}`);

  // Install dependencies
  if (installDependencies()) {
    createLockFile();
  } else {
    console.error('[CARL] Failed to install dependencies. Some features may not work.');
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for testing
module.exports = {
  isNpmAvailable,
  getDependencies,
  isPackageInstalled,
  areAllDependenciesInstalled,
  getMissingPackages,
  installDependencies,
};
