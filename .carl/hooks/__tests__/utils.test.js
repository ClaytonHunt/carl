#!/usr/bin/env node

/**
 * Unit tests for utils.js module
 */

const fs = require('fs-extra');
const path = require('path');
const os = require('os');

// Mock child_process before importing utils
jest.mock('child_process', () => ({
  spawn: jest.fn(),
  exec: jest.fn()
}));

const utils = require('../lib/utils');

// Mock the Carl root for testing
const mockCarlRoot = path.join(os.tmpdir(), 'carl-test-' + Date.now());

describe('Utils Module', () => {
  beforeEach(async () => {
    // Set up test environment
    process.env.CARL_ROOT = mockCarlRoot;
    await fs.ensureDir(mockCarlRoot);
    await fs.ensureDir(path.join(mockCarlRoot, '.carl'));
  });

  afterEach(async () => {
    // Clean up test environment
    await fs.remove(mockCarlRoot);
    delete process.env.CARL_ROOT;
  });

  describe('getCarlRoot', () => {
    test('should return CARL_ROOT environment variable when set', () => {
      const result = utils.getCarlRoot();
      expect(result).toBe(mockCarlRoot);
    });

    test('should calculate root from .carl/hooks directory', () => {
      delete process.env.CARL_ROOT;
      
      // Mock process.cwd to return a hooks directory
      const originalCwd = process.cwd;
      process.cwd = jest.fn(() => '/some/path/.carl/hooks');
      
      const result = utils.getCarlRoot();
      expect(result).toBe('/some/path');
      
      // Restore original cwd
      process.cwd = originalCwd;
    });

    test('should calculate root from legacy .claude/hooks directory', () => {
      delete process.env.CARL_ROOT;
      
      // Mock process.cwd to return legacy hooks directory
      const originalCwd = process.cwd;
      process.cwd = jest.fn(() => '/some/path/.claude/hooks');
      
      const result = utils.getCarlRoot();
      expect(result).toBe('/some/path');
      
      // Restore original cwd
      process.cwd = originalCwd;
    });
  });

  describe('getCurrentTimestamp', () => {
    test('should return ISO 8601 timestamp', () => {
      const result = utils.getCurrentTimestamp();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    test('should return different timestamps when called multiple times', (done) => {
      const timestamp1 = utils.getCurrentTimestamp();
      setTimeout(() => {
        const timestamp2 = utils.getCurrentTimestamp();
        expect(timestamp2).not.toBe(timestamp1);
        done();
      }, 10);
    });
  });

  describe('generateSessionId', () => {
    test('should return timestamp-based session ID', () => {
      const result = utils.generateSessionId();
      expect(result).toMatch(/^\d{8}_\d{6}$/);
    });

    test('should return different IDs when called multiple times', (done) => {
      const id1 = utils.generateSessionId();
      setTimeout(() => {
        const id2 = utils.generateSessionId();
        expect(id2).not.toBe(id1);
        done();
      }, 1100); // Wait for timestamp to change
    });
  });

  describe('sanitizeOutput', () => {
    test('should remove newlines and carriage returns', () => {
      const input = 'line1\nline2\rline3\r\nline4';
      const result = utils.sanitizeOutput(input);
      expect(result).toBe('line1 line2 line3 line4');
    });

    test('should handle empty string', () => {
      const result = utils.sanitizeOutput('');
      expect(result).toBe('');
    });

    test('should handle null/undefined', () => {
      expect(utils.sanitizeOutput(null)).toBe('');
      expect(utils.sanitizeOutput(undefined)).toBe('');
    });
  });

  describe('getUserFirstName', () => {
    test('should return first name from git config', async () => {
      const { exec } = require('child_process');
      
      // Mock exec to return a name
      exec.mockImplementation((cmd, options, callback) => {
        callback(null, { stdout: 'John Doe', stderr: '' });
      });
      
      const result = await utils.getUserFirstName();
      expect(result).toBe('John');
    });

    test('should return USER environment variable if git fails', async () => {
      const { exec } = require('child_process');
      
      // Mock exec to throw error
      exec.mockImplementation((cmd, options, callback) => {
        callback(new Error('Git not found'));
      });
      
      const originalUser = process.env.USER;
      process.env.USER = 'testuser';
      
      const result = await utils.getUserFirstName();
      expect(result).toBe('testuser');
      
      // Restore original USER
      if (originalUser) {
        process.env.USER = originalUser;
      } else {
        delete process.env.USER;
      }
    });

    test('should return Developer if both git and USER fail', async () => {
      const { exec } = require('child_process');
      
      exec.mockImplementation((cmd, options, callback) => {
        callback(new Error('Git not found'));
      });
      
      const originalUser = process.env.USER;
      delete process.env.USER;
      
      const result = await utils.getUserFirstName();
      expect(result).toBe('Developer');
      
      // Restore original USER
      if (originalUser) {
        process.env.USER = originalUser;
      }
    });
  });

  describe('getPlatformInfo', () => {
    test('should return platform information', () => {
      const result = utils.getPlatformInfo();
      expect(result).toHaveProperty('platform');
      expect(result).toHaveProperty('isWindows');
      expect(result).toHaveProperty('isMacOS');
      expect(result).toHaveProperty('isLinux');
      expect(result).toHaveProperty('pathSeparator');
      expect(result).toHaveProperty('audioCommand');
      expect(['darwin', 'linux', 'win32']).toContain(result.platform);
    });
  });

  describe('pathExists', () => {
    test('should return true for existing path', async () => {
      const testFile = path.join(mockCarlRoot, 'test.txt');
      await fs.writeFile(testFile, 'test');
      
      const result = await utils.pathExists(testFile);
      expect(result).toBe(true);
    });

    test('should return false for non-existing path', async () => {
      const testFile = path.join(mockCarlRoot, 'nonexistent.txt');
      
      const result = await utils.pathExists(testFile);
      expect(result).toBe(false);
    });
  });

  describe('safeReadFile', () => {
    test('should read file contents', async () => {
      const testFile = path.join(mockCarlRoot, 'test.txt');
      const content = 'Hello World';
      await fs.writeFile(testFile, content);
      
      const result = await utils.safeReadFile(testFile);
      expect(result).toBe(content);
    });

    test('should return null for non-existing file', async () => {
      const testFile = path.join(mockCarlRoot, 'nonexistent.txt');
      
      const result = await utils.safeReadFile(testFile);
      expect(result).toBeNull();
    });
  });

  describe('safeWriteFile', () => {
    test('should write file contents', async () => {
      const testFile = path.join(mockCarlRoot, 'test.txt');
      const content = 'Hello World';
      
      await utils.safeWriteFile(testFile, content);
      
      const result = await fs.readFile(testFile, 'utf8');
      expect(result).toBe(content);
    });

    test('should create directories if they do not exist', async () => {
      const testFile = path.join(mockCarlRoot, 'subdir', 'test.txt');
      const content = 'Hello World';
      
      await utils.safeWriteFile(testFile, content);
      
      const result = await fs.readFile(testFile, 'utf8');
      expect(result).toBe(content);
    });
  });

  describe('safeJsonParse', () => {
    test('should parse valid JSON', () => {
      const jsonString = '{"test": "value"}';
      const result = utils.safeJsonParse(jsonString);
      expect(result).toEqual({ test: 'value' });
    });

    test('should return null for invalid JSON', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const invalidJson = '{"test": invalid}';
      const result = utils.safeJsonParse(invalidJson);
      expect(result).toBeNull();
      consoleErrorSpy.mockRestore();
    });

    test('should return default value for invalid JSON when provided', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const invalidJson = '{"test": invalid}';
      const defaultValue = { default: true };
      const result = utils.safeJsonParse(invalidJson, defaultValue);
      expect(result).toEqual(defaultValue);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('readStdin', () => {
    test('should read from stdin when available', async () => {
      // This is difficult to test without mocking stdin
      // For now, just ensure the function exists and doesn't throw
      const result = utils.readStdin;
      expect(typeof result).toBe('function');
    });
  });
});