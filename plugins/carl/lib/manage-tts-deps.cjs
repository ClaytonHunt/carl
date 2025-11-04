#!/usr/bin/env node

/**
 * TTS Dependency Manager for CARL Plugin
 *
 * Conditionally manages TTS library dependencies based on settings.
 * Updates package.json to include only the selected TTS provider.
 */

const fs = require('fs');
const path = require('path');

// Determine plugin root directory
const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..');
const PACKAGE_JSON_PATH = path.join(PLUGIN_ROOT, 'package.json');

// TTS provider package mapping
const TTS_PACKAGES = {
  none: [],
  say: [{ name: 'say', version: '^0.16.0' }],
  'node-gtts': [{ name: 'node-gtts', version: '^2.0.2' }],
  'coqui-tts': [
    { name: '@coqui-ai/tts', version: '^0.1.0' },
    // Note: Coqui TTS also requires Python and additional setup
  ],
  elevenlabs: [{ name: 'elevenlabs-node', version: '^1.2.2' }],
};

/**
 * Get TTS provider from environment (set by load-settings.cjs)
 */
function getTTSProvider() {
  const provider = process.env.CARL_TTS_PROVIDER || 'none';

  // Validate provider
  if (!TTS_PACKAGES[provider]) {
    console.error(`[CARL] Warning: Unknown TTS provider "${provider}". Using "none".`);
    return 'none';
  }

  return provider;
}

/**
 * Read package.json
 */
function readPackageJson() {
  try {
    if (!fs.existsSync(PACKAGE_JSON_PATH)) {
      console.error('[CARL] Error: package.json not found');
      return null;
    }

    const content = fs.readFileSync(PACKAGE_JSON_PATH, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('[CARL] Error reading package.json:', error.message);
    return null;
  }
}

/**
 * Write package.json
 */
function writePackageJson(packageData) {
  try {
    const content = JSON.stringify(packageData, null, 2) + '\n';
    fs.writeFileSync(PACKAGE_JSON_PATH, content, 'utf8');
    return true;
  } catch (error) {
    console.error('[CARL] Error writing package.json:', error.message);
    return false;
  }
}

/**
 * Get all TTS package names
 */
function getAllTTSPackageNames() {
  const allPackages = new Set();

  for (const provider in TTS_PACKAGES) {
    TTS_PACKAGES[provider].forEach(pkg => {
      allPackages.add(pkg.name);
    });
  }

  return Array.from(allPackages);
}

/**
 * Remove all TTS packages from dependencies
 */
function removeTTSPackages(packageData) {
  const ttsPackages = getAllTTSPackageNames();
  let removed = [];

  if (packageData.dependencies) {
    for (const pkg of ttsPackages) {
      if (packageData.dependencies[pkg]) {
        delete packageData.dependencies[pkg];
        removed.push(pkg);
      }
    }
  }

  if (packageData.devDependencies) {
    for (const pkg of ttsPackages) {
      if (packageData.devDependencies[pkg]) {
        delete packageData.devDependencies[pkg];
        removed.push(pkg);
      }
    }
  }

  return removed;
}

/**
 * Add TTS packages for the selected provider
 */
function addTTSPackages(packageData, provider) {
  const packages = TTS_PACKAGES[provider] || [];
  const added = [];

  if (packages.length === 0) {
    return added;
  }

  // Ensure dependencies object exists
  if (!packageData.dependencies) {
    packageData.dependencies = {};
  }

  // Add each package
  for (const pkg of packages) {
    packageData.dependencies[pkg.name] = pkg.version;
    added.push(pkg.name);
  }

  return added;
}

/**
 * Check if TTS dependencies need updating
 */
function needsUpdate(packageData, provider) {
  const requiredPackages = TTS_PACKAGES[provider] || [];
  const allTTSPackages = getAllTTSPackageNames();

  // Check if we have any TTS packages that shouldn't be there
  const currentDeps = packageData.dependencies || {};
  for (const pkg of allTTSPackages) {
    const shouldHave = requiredPackages.some(p => p.name === pkg);
    const currentlyHas = currentDeps[pkg] !== undefined;

    if (shouldHave !== currentlyHas) {
      return true;
    }

    // Check version mismatch
    if (shouldHave && currentlyHas) {
      const requiredPkg = requiredPackages.find(p => p.name === pkg);
      if (currentDeps[pkg] !== requiredPkg.version) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Main execution
 */
function main() {
  const provider = getTTSProvider();

  // Read package.json
  const packageData = readPackageJson();
  if (!packageData) {
    return;
  }

  // Check if update is needed
  if (!needsUpdate(packageData, provider)) {
    // Already configured correctly
    return;
  }

  // Remove all TTS packages first
  const removed = removeTTSPackages(packageData);

  // Add packages for selected provider
  const added = addTTSPackages(packageData, provider);

  // Write updated package.json
  if (!writePackageJson(packageData)) {
    console.error('[CARL] Failed to update package.json');
    return;
  }

  // Report changes
  if (removed.length > 0) {
    console.error(`[CARL] Removed TTS packages: ${removed.join(', ')}`);
  }

  if (added.length > 0) {
    console.error(`[CARL] Added TTS packages for "${provider}": ${added.join(', ')}`);
  }

  if (provider === 'none' && removed.length > 0) {
    console.error('[CARL] TTS disabled - removed all TTS packages');
  }

  if (provider === 'coqui-tts' && added.length > 0) {
    console.error('[CARL] Note: Coqui TTS requires Python and additional setup. See documentation.');
  }

  if (provider === 'elevenlabs' && added.length > 0) {
    console.error('[CARL] Note: ElevenLabs requires an API key. Set ELEVENLABS_API_KEY environment variable.');
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for testing
module.exports = {
  getTTSProvider,
  readPackageJson,
  writePackageJson,
  getAllTTSPackageNames,
  removeTTSPackages,
  addTTSPackages,
  needsUpdate,
  TTS_PACKAGES,
};
