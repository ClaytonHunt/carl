#!/usr/bin/env node

/**
 * Unit tests for carl-audio.js module
 */

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const carlAudio = require('../lib/carl-audio');
const utils = require('../lib/utils');

// Mock child_process spawn
jest.mock('child_process');

// Mock the Carl root for testing
const mockCarlRoot = path.join(os.tmpdir(), 'carl-audio-test-' + Date.now());

describe('CARL Audio Module', () => {
  beforeEach(async () => {
    // Set up test environment
    process.env.CARL_ROOT = mockCarlRoot;
    await fs.ensureDir(mockCarlRoot);
    await fs.ensureDir(path.join(mockCarlRoot, '.carl'));
    await fs.ensureDir(path.join(mockCarlRoot, '.carl/config'));
    await fs.ensureDir(path.join(mockCarlRoot, '.carl/audio'));
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up test environment
    await fs.remove(mockCarlRoot);
    delete process.env.CARL_ROOT;
  });

  describe('shouldPlayAudio', () => {
    test('should return true when audio is enabled and not in quiet mode', async () => {
      const configFile = path.join(mockCarlRoot, '.carl/config/carl-settings.json');
      const config = {
        audio_settings: {
          audio_enabled: 'true',
          quiet_mode: 'false',
          quiet_hours_enabled: 'false'
        }
      };
      await fs.writeFile(configFile, JSON.stringify(config));

      const result = await carlAudio.shouldPlayAudio();
      expect(result).toBe(true);
    });

    test('should return false when audio is disabled', async () => {
      const configFile = path.join(mockCarlRoot, '.carl/config/carl-settings.json');
      const config = {
        audio_settings: {
          audio_enabled: 'false',
          quiet_mode: 'false'
        }
      };
      await fs.writeFile(configFile, JSON.stringify(config));

      const result = await carlAudio.shouldPlayAudio();
      expect(result).toBe(false);
    });

    test('should return false when in quiet mode', async () => {
      const configFile = path.join(mockCarlRoot, '.carl/config/carl-settings.json');
      const config = {
        audio_settings: {
          audio_enabled: 'true',
          quiet_mode: 'true'
        }
      };
      await fs.writeFile(configFile, JSON.stringify(config));

      const result = await carlAudio.shouldPlayAudio();
      expect(result).toBe(false);
    });

    test('should respect quiet hours', async () => {
      const configFile = path.join(mockCarlRoot, '.carl/config/carl-settings.json');
      
      // Set quiet hours from 22:00 to 08:00
      const config = {
        audio_settings: {
          audio_enabled: 'true',
          quiet_mode: 'false',
          quiet_hours_enabled: 'true',
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00'
        }
      };
      await fs.writeFile(configFile, JSON.stringify(config));

      // Mock current time to be within quiet hours (e.g., 23:00)
      const mockDate = new Date();
      mockDate.setHours(23, 0, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const result = await carlAudio.shouldPlayAudio();
      expect(result).toBe(false);

      // Restore Date
      global.Date.mockRestore();
    });

    test('should return false on configuration errors', async () => {
      // Don't create config file to trigger error
      const result = await carlAudio.shouldPlayAudio();
      expect(result).toBe(false);
    });
  });

  describe('playAudioFile', () => {
    test('should play audio file when found', async () => {
      // Create test audio directory and file 
      const audioDir = path.join(mockCarlRoot, '.carl/audio/start/general');
      await fs.ensureDir(audioDir);
      await fs.writeFile(path.join(audioDir, 'sound.wav'), 'fake audio data');

      // Mock platform info
      utils.getPlatformInfo = jest.fn().mockReturnValue({ platform: 'darwin' });

      // Mock spawn to simulate successful audio playback
      const mockProcess = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10); // Success exit code
          }
        }),
        unref: jest.fn()
      };
      spawn.mockReturnValue(mockProcess);

      const result = await carlAudio.playAudioFile('start', 'general');
      expect(result).toBe(true);
      expect(spawn).toHaveBeenCalledWith('afplay', [path.join(audioDir, 'sound.wav')], {
        stdio: 'ignore',
        detached: true
      });
    });

    test('should return false when no audio file found', async () => {
      utils.getPlatformInfo = jest.fn().mockReturnValue({ platform: 'darwin' });
      
      const result = await carlAudio.playAudioFile('nonexistent', 'general');
      expect(result).toBe(false);
    });

    test('should return false when no audio command available', async () => {
      // Create test audio file
      const audioDir = path.join(mockCarlRoot, '.carl/audio/start/general');
      await fs.ensureDir(audioDir);
      await fs.writeFile(path.join(audioDir, 'sound.wav'), 'fake audio data');

      // Mock unsupported platform
      utils.getPlatformInfo = jest.fn().mockReturnValue({ platform: 'unsupported' });

      const result = await carlAudio.playAudioFile('start', 'general');
      expect(result).toBe(false);
    });

    test('should handle different platforms correctly', async () => {
      const audioDir = path.join(mockCarlRoot, '.carl/audio/start/general');
      await fs.ensureDir(audioDir);
      await fs.writeFile(path.join(audioDir, 'sound.wav'), 'fake audio data');

      const mockProcess = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10);
          }
        }),
        unref: jest.fn()
      };
      spawn.mockReturnValue(mockProcess);

      // Test Linux
      utils.getPlatformInfo = jest.fn().mockReturnValue({ platform: 'linux' });
      await carlAudio.playAudioFile('start', 'general');
      expect(spawn).toHaveBeenCalledWith('aplay', expect.any(Array), expect.any(Object));

      // Test Windows
      spawn.mockClear();
      utils.getPlatformInfo = jest.fn().mockReturnValue({ platform: 'win32' });
      await carlAudio.playAudioFile('start', 'general');
      expect(spawn).toHaveBeenCalledWith('start', ['', expect.any(String)], expect.any(Object));
    });
  });

  describe('speakMessage', () => {
    test('should use say command on macOS', async () => {
      utils.getPlatformInfo = jest.fn().mockReturnValue({ platform: 'darwin' });

      const mockProcess = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10);
          }
        }),
        unref: jest.fn()
      };
      spawn.mockReturnValue(mockProcess);

      const result = await carlAudio.speakMessage('Hello World');
      expect(result).toBe(true);
      expect(spawn).toHaveBeenCalledWith('say', ['Hello World'], {
        stdio: 'ignore',
        detached: true
      });
    });

    test('should use PowerShell on Windows', async () => {
      utils.getPlatformInfo = jest.fn().mockReturnValue({ platform: 'win32' });

      const mockProcess = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10);
          }
        }),
        unref: jest.fn()
      };
      spawn.mockReturnValue(mockProcess);

      const result = await carlAudio.speakMessage('Hello World');
      expect(result).toBe(true);
      expect(spawn).toHaveBeenCalledWith('powershell', [
        '-Command',
        expect.stringContaining('Hello World')
      ], {
        stdio: 'ignore',
        detached: true
      });
    });

    test('should use espeak on Linux', async () => {
      utils.getPlatformInfo = jest.fn().mockReturnValue({ platform: 'linux' });

      const mockProcess = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10);
          }
        }),
        unref: jest.fn()
      };
      spawn.mockReturnValue(mockProcess);

      const result = await carlAudio.speakMessage('Hello World');
      expect(result).toBe(true);
      expect(spawn).toHaveBeenCalledWith('espeak', ['Hello World'], {
        stdio: 'ignore',
        detached: true
      });
    });

    test('should return false for unsupported platform', async () => {
      utils.getPlatformInfo = jest.fn().mockReturnValue({ platform: 'unsupported' });

      const result = await carlAudio.speakMessage('Hello World');
      expect(result).toBe(false);
    });

    test('should handle command errors', async () => {
      utils.getPlatformInfo = jest.fn().mockReturnValue({ platform: 'darwin' });

      const mockProcess = {
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('Command failed')), 10);
          }
        }),
        unref: jest.fn()
      };
      spawn.mockReturnValue(mockProcess);

      const result = await carlAudio.speakMessage('Hello World');
      expect(result).toBe(false);
    });
  });

  describe('playAudio', () => {
    test('should not play when audio is disabled', async () => {
      const configFile = path.join(mockCarlRoot, '.carl/config/carl-settings.json');
      const config = {
        audio_settings: {
          audio_enabled: 'false'
        }
      };
      await fs.writeFile(configFile, JSON.stringify(config));

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      await carlAudio.playAudio('start', 'Test message');
      
      // Should not attempt to play but should still log
      expect(consoleSpy).toHaveBeenCalledWith('🎵 Audio: start - Test message');
      expect(spawn).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    test('should play audio file and speak message when audio is enabled', async () => {
      // Set up audio enabled config
      const configFile = path.join(mockCarlRoot, '.carl/config/carl-settings.json');
      const config = {
        audio_settings: {
          audio_enabled: 'true',
          quiet_mode: 'false',
          quiet_hours_enabled: 'false'
        }
      };
      await fs.writeFile(configFile, JSON.stringify(config));

      // Create test audio file
      const audioDir = path.join(mockCarlRoot, '.carl/audio/start/general');
      await fs.ensureDir(audioDir);
      await fs.writeFile(path.join(audioDir, 'sound.wav'), 'fake audio data');

      // Mock platform and processes
      utils.getPlatformInfo = jest.fn().mockReturnValue({ platform: 'darwin' });
      
      const mockProcess = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10);
          }
        }),
        unref: jest.fn()
      };
      spawn.mockReturnValue(mockProcess);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await carlAudio.playAudio('start', 'Test message');
      
      // Should attempt to play audio file and speak message
      expect(spawn).toHaveBeenCalledWith('afplay', expect.any(Array), expect.any(Object));
      expect(consoleSpy).toHaveBeenCalledWith('🎵 Audio: start - Test message');
      
      consoleSpy.mockRestore();
    });

    test('should only speak message when no audio file found', async () => {
      // Set up audio enabled config
      const configFile = path.join(mockCarlRoot, '.carl/config/carl-settings.json');
      const config = {
        audio_settings: {
          audio_enabled: 'true',
          quiet_mode: 'false',
          quiet_hours_enabled: 'false'
        }
      };
      await fs.writeFile(configFile, JSON.stringify(config));

      // Mock platform but don't create audio file
      utils.getPlatformInfo = jest.fn().mockReturnValue({ platform: 'darwin' });
      
      const mockProcess = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10);
          }
        }),
        unref: jest.fn()
      };
      spawn.mockReturnValue(mockProcess);

      await carlAudio.playAudio('nonexistent', 'Test message');
      
      // Should attempt to speak message even if audio file not found
      expect(spawn).toHaveBeenCalledWith('say', ['Test message'], expect.any(Object));
    });

    test('should handle errors gracefully', async () => {
      const configFile = path.join(mockCarlRoot, '.carl/config/carl-settings.json');
      const config = {
        audio_settings: {
          audio_enabled: 'true',
          quiet_mode: 'false'
        }
      };
      await fs.writeFile(configFile, JSON.stringify(config));

      // Mock function to throw error
      const originalGetPlatformInfo = utils.getPlatformInfo;
      utils.getPlatformInfo = jest.fn().mockImplementation(() => {
        throw new Error('Platform error');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await expect(carlAudio.playAudio('start', 'Test message')).resolves.not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Audio system error'));
      
      // Restore original function
      utils.getPlatformInfo = originalGetPlatformInfo;
      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });
});