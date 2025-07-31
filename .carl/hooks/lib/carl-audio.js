#!/usr/bin/env node

/**
 * CARL Audio System - Node.js Implementation
 * Cross-platform audio feedback system ported from carl-audio.sh
 */

const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const utils = require('./utils');

/**
 * Check if audio is enabled and not in quiet hours
 * @returns {Promise<boolean>} True if audio should play
 */
async function shouldPlayAudio() {
  try {
    // Check basic audio settings
    const audioEnabled = await getSetting('audio_enabled', 'false');
    const quietMode = await getSetting('quiet_mode', 'false');
    
    if (audioEnabled !== 'true' || quietMode === 'true') {
      return false;
    }
    
    // Check quiet hours
    const quietHoursEnabled = await getSetting('quiet_hours_enabled', 'false');
    if (quietHoursEnabled === 'true') {
      const quietStart = await getSetting('quiet_hours_start', '22:00');
      const quietEnd = await getSetting('quiet_hours_end', '08:00');
      
      if (isInQuietHours(quietStart, quietEnd)) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    // Default to false if we can't determine settings
    return false;
  }
}

/**
 * Get audio setting (simplified version of carl_get_setting)
 * @param {string} setting - Setting name
 * @param {string} defaultValue - Default value
 * @returns {Promise<string>} Setting value
 */
async function getSetting(setting, defaultValue) {
  try {
    const carlRoot = utils.getCarlRoot();
    const configFile = path.join(carlRoot, '.carl/config/carl-settings.json');
    
    const content = await utils.safeReadFile(configFile);
    if (!content) return defaultValue;
    
    const config = JSON.parse(content);
    
    // Map settings to JSON paths
    const settingPaths = {
      'audio_enabled': 'audio_settings.audio_enabled',
      'quiet_mode': 'audio_settings.quiet_mode',
      'quiet_hours_enabled': 'audio_settings.quiet_hours_enabled',
      'quiet_hours_start': 'audio_settings.quiet_hours_start',
      'quiet_hours_end': 'audio_settings.quiet_hours_end',
      'volume_level': 'audio_settings.volume_level'
    };
    
    const settingPath = settingPaths[setting] || setting;
    const keys = settingPath.split('.');
    let value = config;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }
    
    return String(value);
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Check if current time is in quiet hours
 * @param {string} startTime - Start time (HH:MM format)
 * @param {string} endTime - End time (HH:MM format)
 * @returns {boolean} True if in quiet hours
 */
function isInQuietHours(startTime, endTime) {
  try {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const start = startHour * 60 + startMin;
    const end = endHour * 60 + endMin;
    
    if (start <= end) {
      // Same day range
      return currentTime >= start && currentTime <= end;
    } else {
      // Overnight range
      return currentTime >= start || currentTime <= end;
    }
  } catch (error) {
    return false;
  }
}

/**
 * Play audio file for given category
 * @param {string} category - Audio category (start, work, progress, success, end)
 * @param {string} character - Character name (optional)
 * @returns {Promise<boolean>} Success status
 */
async function playAudioFile(category, character = 'general') {
  const carlRoot = utils.getCarlRoot();
  const platformInfo = utils.getPlatformInfo();
  
  // Try to find audio file
  const audioFile = await findAudioFile(carlRoot, category, character);
  if (!audioFile) {
    return false;
  }
  
  try {
    // Play audio file based on platform
    const audioCommand = getAudioCommand(platformInfo.platform);
    if (!audioCommand) {
      return false;
    }
    
    return await playFile(audioCommand, audioFile);
  } catch (error) {
    console.error(`Error playing audio: ${error.message}`);
    return false;
  }
}

/**
 * Find audio file for category and character
 * @param {string} carlRoot - CARL root directory
 * @param {string} category - Audio category
 * @param {string} character - Character name
 * @returns {Promise<string|null>} Audio file path or null
 */
async function findAudioFile(carlRoot, category, character) {
  // Possible audio directories in order of preference
  const audioDirs = [
    path.join(carlRoot, '.carl/audio', category, character),
    path.join(carlRoot, '.carl/audio', category, 'general'),
    path.join(carlRoot, '.carl/audio', category)
  ];
  
  const audioExtensions = ['.wav', '.mp3', '.aiff', '.m4a'];
  
  for (const dir of audioDirs) {
    try {
      const exists = await utils.pathExists(dir);
      if (!exists) continue;
      
      const files = await fs.readdir(dir);
      
      // Look for audio files
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (audioExtensions.includes(ext)) {
          return path.join(dir, file);
        }
      }
    } catch (error) {
      // Continue to next directory
    }
  }
  
  return null;
}

/**
 * Get platform-specific audio command
 * @param {string} platform - Platform identifier
 * @returns {string|null} Audio command or null
 */
function getAudioCommand(platform) {
  switch (platform) {
    case 'darwin': return 'afplay';      // macOS
    case 'linux': return 'aplay';       // Linux (also try paplay)
    case 'win32': return 'start';       // Windows
    default: return null;
  }
}

/**
 * Play audio file using system command
 * @param {string} command - Audio command
 * @param {string} audioFile - Path to audio file
 * @returns {Promise<boolean>} Success status
 */
function playFile(command, audioFile) {
  return new Promise((resolve) => {
    let args = [];
    
    if (command === 'start') {
      // Windows
      args = ['', audioFile];
    } else {
      // macOS/Linux
      args = [audioFile];
    }
    
    const process = spawn(command, args, {
      stdio: 'ignore',
      detached: true
    });
    
    process.on('error', (error) => {
      console.error(`Audio command failed: ${error.message}`);
      resolve(false);
    });
    
    process.on('close', (code) => {
      resolve(code === 0);
    });
    
    // Don't wait for the process on Unix systems
    if (process.unref) {
      process.unref();
    }
    
    // Resolve immediately for detached processes
    setTimeout(() => resolve(true), 100);
  });
}

/**
 * Speak message using text-to-speech (simplified version)
 * @param {string} message - Message to speak
 * @returns {Promise<boolean>} Success status
 */
async function speakMessage(message) {
  const platformInfo = utils.getPlatformInfo();
  
  try {
    let command;
    let args;
    
    switch (platformInfo.platform) {
      case 'darwin':
        command = 'say';
        args = [message];
        break;
      case 'win32':
        // Windows PowerShell TTS
        command = 'powershell';
        args = ['-Command', `Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('${message.replace(/'/g, "''")}')`];
        break;
      case 'linux':
        // Try espeak if available
        command = 'espeak';
        args = [message];
        break;
      default:
        return false;
    }
    
    return new Promise((resolve) => {
      const process = spawn(command, args, {
        stdio: 'ignore',
        detached: true
      });
      
      process.on('error', () => resolve(false));
      process.on('close', (code) => resolve(code === 0));
      
      if (process.unref) {
        process.unref();
      }
      
      setTimeout(() => resolve(true), 100);
    });
  } catch (error) {
    return false;
  }
}

/**
 * Main audio playback function (matches carl_play_audio bash function)
 * @param {string} category - Audio category (start, work, progress, success, end)
 * @param {string} message - Message to speak or display
 * @returns {Promise<void>}
 */
async function playAudio(category, message = '') {
  try {
    // Always log what we attempted to play
    console.log(`🎵 Audio: ${category} - ${message}`);
    
    // Check if audio should play
    const audioAllowed = await shouldPlayAudio();
    if (!audioAllowed) {
      return;
    }
    
    // Try to play audio file first
    const audioPlayed = await playAudioFile(category, 'general');
    
    // If audio file played successfully, also try TTS for message
    if (audioPlayed && message) {
      // Add small delay before TTS
      setTimeout(() => {
        speakMessage(message);
      }, 500);
    } else if (message) {
      // If no audio file, just try TTS
      await speakMessage(message);
    }
  } catch (error) {
    console.error(`Audio system error: ${error.message}`);
  }
}

module.exports = {
  playAudio,
  playAudioFile,
  speakMessage,
  shouldPlayAudio
};