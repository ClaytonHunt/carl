#!/usr/bin/env node

/**
 * Unit tests for carl-session.js module
 */

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const yaml = require('yaml');
const carlSession = require('../lib/carl-session');
const utils = require('../lib/utils');

// Mock the Carl root for testing
const mockCarlRoot = path.join(os.tmpdir(), 'carl-session-test-' + Date.now());

describe('CARL Session Module', () => {
  beforeEach(async () => {
    // Set up test environment
    process.env.CARL_ROOT = mockCarlRoot;
    await fs.ensureDir(mockCarlRoot);
    await fs.ensureDir(path.join(mockCarlRoot, '.carl'));
    
    // Mock utils functions that interact with git
    utils.execCommand = jest.fn();
    utils.getUserFirstName = jest.fn().mockResolvedValue('TestUser');
  });

  afterEach(async () => {
    // Clean up test environment
    await fs.remove(mockCarlRoot);
    delete process.env.CARL_ROOT;
    jest.clearAllMocks();
  });

  describe('ensureSessionDirs', () => {
    test('should create session directories', async () => {
      await carlSession.ensureSessionDirs();
      
      const sessionsDir = path.join(mockCarlRoot, '.carl/sessions');
      const archiveDir = path.join(mockCarlRoot, '.carl/sessions/archive');
      const activeDir = path.join(mockCarlRoot, '.carl/sessions/active');
      
      expect(await fs.pathExists(sessionsDir)).toBe(true);
      expect(await fs.pathExists(archiveDir)).toBe(true);
      expect(await fs.pathExists(activeDir)).toBe(true);
    });
  });

  describe('getCurrentSessionFile', () => {
    test('should return session file path when current session exists', async () => {
      const sessionId = 'test_session_123';
      const currentSessionFile = path.join(mockCarlRoot, '.carl/sessions/current.session');
      const sessionFile = path.join(mockCarlRoot, `.carl/sessions/active/${sessionId}.session.carl`);
      
      await fs.ensureDir(path.dirname(currentSessionFile));
      await fs.ensureDir(path.dirname(sessionFile));
      await fs.writeFile(currentSessionFile, sessionId);
      await fs.writeFile(sessionFile, 'session content');
      
      const result = await carlSession.getCurrentSessionFile();
      expect(result).toBe(sessionFile);
    });

    test('should return null when no current session exists', async () => {
      const result = await carlSession.getCurrentSessionFile();
      expect(result).toBeNull();
    });

    test('should return null when current session file is missing', async () => {
      const sessionId = 'test_session_123';
      const currentSessionFile = path.join(mockCarlRoot, '.carl/sessions/current.session');
      
      await fs.ensureDir(path.dirname(currentSessionFile));
      await fs.writeFile(currentSessionFile, sessionId);
      // Don't create the actual session file
      
      const result = await carlSession.getCurrentSessionFile();
      expect(result).toBeNull();
    });
  });

  describe('startSession', () => {
    test('should create new session with metadata', async () => {
      // Mock git commands
      utils.execCommand
        .mockResolvedValueOnce({ stdout: 'main' }) // git branch
        .mockResolvedValueOnce({ stdout: 'abc123def456' }); // git commit
      
      const sessionId = await carlSession.startSession();
      
      expect(sessionId).toMatch(/^session_\d{8}_\d{6}$/);
      
      // Check session file was created
      const sessionFile = path.join(mockCarlRoot, `.carl/sessions/active/${sessionId}.session.carl`);
      expect(await fs.pathExists(sessionFile)).toBe(true);
      
      // Check session content
      const content = await fs.readFile(sessionFile, 'utf8');
      expect(content).toContain(sessionId);
      expect(content).toContain('session_metadata:');
      expect(content).toContain('git_branch: "main"');
      expect(content).toContain('git_commit: "abc123de"');
      expect(content).toContain('user: "TestUser"');
      
      // Check current session pointer
      const currentSessionFile = path.join(mockCarlRoot, '.carl/sessions/current.session');
      const currentSessionId = await fs.readFile(currentSessionFile, 'utf8');
      expect(currentSessionId).toBe(sessionId);
    });

    test('should handle git command failures gracefully', async () => {
      // Mock git commands to fail
      utils.execCommand.mockRejectedValue(new Error('Git not available'));
      
      const sessionId = await carlSession.startSession();
      
      const sessionFile = path.join(mockCarlRoot, `.carl/sessions/active/${sessionId}.session.carl`);
      const content = await fs.readFile(sessionFile, 'utf8');
      expect(content).toContain('git_branch: "unknown"');
      expect(content).toContain('git_commit: "unknown"');
    });
  });

  describe('endSession', () => {
    test('should end session and archive it', async () => {
      // Create a session first
      const sessionId = 'test_session_123';
      const sessionFile = path.join(mockCarlRoot, `.carl/sessions/active/${sessionId}.session.carl`);
      const currentSessionFile = path.join(mockCarlRoot, '.carl/sessions/current.session');
      
      await fs.ensureDir(path.dirname(sessionFile));
      await fs.ensureDir(path.join(mockCarlRoot, '.carl/sessions/archive'));
      
      const sessionContent = `session_metadata:
  session_id: "${sessionId}"
  start_time: "2024-01-01T00:00:00Z"

session_progress:
  files_modified: 0`;
      
      await fs.writeFile(sessionFile, sessionContent);
      await fs.writeFile(currentSessionFile, sessionId);
      
      // Mock git commands for metrics
      utils.execCommand.mockResolvedValue({ stdout: '' });
      
      const result = await carlSession.endSession();
      expect(result).toBe(true);
      
      // Check session was archived
      const archiveFile = path.join(mockCarlRoot, `.carl/sessions/archive/${sessionId}.session.carl`);
      expect(await fs.pathExists(archiveFile)).toBe(true);
      expect(await fs.pathExists(sessionFile)).toBe(false);
      
      // Check current session pointer was cleared
      expect(await fs.pathExists(currentSessionFile)).toBe(false);
      
      // Check end timestamp was added
      const archivedContent = await fs.readFile(archiveFile, 'utf8');
      expect(archivedContent).toContain('session_end:');
      expect(archivedContent).toContain('end_time:');
      expect(archivedContent).toContain('duration:');
    });

    test('should return false when no current session exists', async () => {
      const result = await carlSession.endSession();
      expect(result).toBe(false);
    });
  });

  describe('getSessionContext', () => {
    test('should return session context when session exists', async () => {
      const sessionId = 'test_session_123';
      const sessionFile = path.join(mockCarlRoot, `.carl/sessions/active/${sessionId}.session.carl`);
      const currentSessionFile = path.join(mockCarlRoot, '.carl/sessions/current.session');
      
      await fs.ensureDir(path.dirname(sessionFile));
      
      const sessionContent = yaml.stringify({
        session_metadata: {
          session_id: sessionId,
          start_time: '2024-01-01T00:00:00Z',
          git_branch: 'main'
        },
        session_activities: {},
        session_progress: {
          files_modified: 3,
          activities_count: 10,
          milestones_count: 2
        }
      });
      
      await fs.writeFile(sessionFile, sessionContent);
      await fs.writeFile(currentSessionFile, sessionId);
      
      const result = await carlSession.getSessionContext();
      
      expect(result).toContain('Current Session Context');
      expect(result).toContain(sessionId);
      expect(result).toContain('git_branch: "main"');
      expect(result).toContain('files_modified: 3');
      expect(result).toContain('activities_count: 10');
      expect(result).toContain('milestones_count: 2');
    });

    test('should return empty string when no session exists', async () => {
      const result = await carlSession.getSessionContext();
      expect(result).toBe('');
    });
  });

  describe('calculateSessionDuration', () => {
    test('should return duration string when session exists', async () => {
      const sessionId = 'test_session_123';
      const sessionFile = path.join(mockCarlRoot, `.carl/sessions/active/${sessionId}.session.carl`);
      const currentSessionFile = path.join(mockCarlRoot, '.carl/sessions/current.session');
      
      await fs.ensureDir(path.dirname(sessionFile));
      
      // Create session with start time 1 hour ago
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const sessionContent = yaml.stringify({
        session_metadata: {
          session_id: sessionId,
          start_time: oneHourAgo
        }
      });
      
      await fs.writeFile(sessionFile, sessionContent);
      await fs.writeFile(currentSessionFile, sessionId);
      
      const result = await carlSession.calculateSessionDuration();
      expect(result).toMatch(/^\d+h \d+m$/);
    });

    test('should return unknown when no session exists', async () => {
      const result = await carlSession.calculateSessionDuration();
      expect(result).toBe('unknown');
    });
  });

  describe('countModifiedFiles', () => {
    test('should return number of modified files', async () => {
      utils.execCommand.mockResolvedValue({ stdout: 'file1.js\nfile2.js\nfile3.js' });
      
      const result = await carlSession.countModifiedFiles();
      expect(result).toBe('3');
      expect(utils.execCommand).toHaveBeenCalledWith('git diff --name-only HEAD');
    });

    test('should return 0 when git command fails', async () => {
      utils.execCommand.mockRejectedValue(new Error('Git error'));
      
      const result = await carlSession.countModifiedFiles();
      expect(result).toBe('0');
    });

    test('should return 0 when no files modified', async () => {
      utils.execCommand.mockResolvedValue({ stdout: '' });
      
      const result = await carlSession.countModifiedFiles();
      expect(result).toBe('0');
    });
  });

  describe('countAddedLines', () => {
    test('should return number of added lines', async () => {
      utils.execCommand.mockResolvedValue({ 
        stdout: '10\t5\tfile1.js\n15\t3\tfile2.js\n' 
      });
      
      const result = await carlSession.countAddedLines();
      expect(result).toBe('25'); // 10 + 15
    });

    test('should handle binary files', async () => {
      utils.execCommand.mockResolvedValue({ 
        stdout: '10\t5\tfile1.js\n-\t-\tbinary.jpg\n15\t3\tfile2.js\n' 
      });
      
      const result = await carlSession.countAddedLines();
      expect(result).toBe('25'); // 10 + 15, binary file ignored
    });

    test('should return 0 when git command fails', async () => {
      utils.execCommand.mockRejectedValue(new Error('Git error'));
      
      const result = await carlSession.countAddedLines();
      expect(result).toBe('0');
    });
  });

  describe('countRemovedLines', () => {
    test('should return number of removed lines', async () => {
      utils.execCommand.mockResolvedValue({ 
        stdout: '10\t5\tfile1.js\n15\t8\tfile2.js\n' 
      });
      
      const result = await carlSession.countRemovedLines();
      expect(result).toBe('13'); // 5 + 8
    });

    test('should return 0 when git command fails', async () => {
      utils.execCommand.mockRejectedValue(new Error('Git error'));
      
      const result = await carlSession.countRemovedLines();
      expect(result).toBe('0');
    });
  });

  describe('updateSessionMetrics', () => {
    test('should update session metrics in file', async () => {
      const sessionId = 'test_session_123';
      const sessionFile = path.join(mockCarlRoot, `.carl/sessions/active/${sessionId}.session.carl`);
      const currentSessionFile = path.join(mockCarlRoot, '.carl/sessions/current.session');
      
      await fs.ensureDir(path.dirname(sessionFile));
      
      const sessionContent = `session_metadata:
  session_id: "${sessionId}"

session_progress:
  files_modified: 0
  activities_count: 0
  milestones_count: 0`;
      
      await fs.writeFile(sessionFile, sessionContent);
      await fs.writeFile(currentSessionFile, sessionId);
      
      // Mock git commands
      utils.execCommand
        .mockResolvedValueOnce({ stdout: 'file1.js\nfile2.js' }) // countModifiedFiles
        .mockResolvedValueOnce({ stdout: '10\t5\tfile1.js\n' }) // countAddedLines
        .mockResolvedValueOnce({ stdout: '10\t5\tfile1.js\n' }); // countRemovedLines
      
      await carlSession.updateSessionMetrics();
      
      const updatedContent = await fs.readFile(sessionFile, 'utf8');
      expect(updatedContent).toContain('files_modified: 2');
      expect(updatedContent).toContain('lines_added: 10');
      expect(updatedContent).toContain('lines_removed: 5');
    });

    test('should handle missing session file gracefully', async () => {
      await expect(carlSession.updateSessionMetrics()).resolves.not.toThrow();
    });
  });

  describe('cleanupOldSessions', () => {
    test('should remove sessions older than 7 days', async () => {
      const archiveDir = path.join(mockCarlRoot, '.carl/sessions/archive');
      await fs.ensureDir(archiveDir);
      
      // Create old session file
      const oldSessionFile = path.join(archiveDir, 'old_session.session.carl');
      await fs.writeFile(oldSessionFile, 'old session content');
      
      // Make it old by changing the mtime
      const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
      await fs.utimes(oldSessionFile, oldDate, oldDate);
      
      // Create recent session file
      const recentSessionFile = path.join(archiveDir, 'recent_session.session.carl');
      await fs.writeFile(recentSessionFile, 'recent session content');
      
      await carlSession.cleanupOldSessions();
      
      // Old session should be removed, recent should remain
      expect(await fs.pathExists(oldSessionFile)).toBe(false);
      expect(await fs.pathExists(recentSessionFile)).toBe(true);
    });

    test('should handle missing archive directory gracefully', async () => {
      await expect(carlSession.cleanupOldSessions()).resolves.not.toThrow();
    });
  });
});