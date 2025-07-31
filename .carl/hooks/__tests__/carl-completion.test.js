/**
 * Tests for CARL Completion Detection and Workflow Management
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const carlCompletion = require('../lib/carl-completion');
const utils = require('../lib/utils');

// Mock dependencies
jest.mock('fs-extra');
jest.mock('child_process');
jest.mock('../lib/utils');

describe('CARL Completion Detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    utils.getCarlRoot.mockReturnValue('/mock/carl/root');
    utils.safeReadFile.mockResolvedValue('');
  });

  describe('checkIntentCompletion', () => {
    it('should detect completion when percentage is 100', async () => {
      const mockStateContent = `
completion_percentage: 100
phase: "development"
      `;
      
      fs.pathExists.mockResolvedValue(true);
      utils.safeReadFile.mockResolvedValue(mockStateContent);
      
      const result = await carlCompletion.checkIntentCompletion('/path/to/test.intent.carl');
      
      expect(result.completed).toBe(true);
      expect(result.stateData.completion_percentage).toBe(100);
    });

    it('should detect completion when phase is completed', async () => {
      const mockStateContent = `
completion_percentage: 95
phase: "completed"
      `;
      
      fs.pathExists.mockResolvedValue(true);
      utils.safeReadFile.mockResolvedValue(mockStateContent);
      
      const result = await carlCompletion.checkIntentCompletion('/path/to/test.intent.carl');
      
      expect(result.completed).toBe(true);
      expect(result.stateData.phase).toBe('completed');
    });

    it('should not detect completion when percentage is less than 100', async () => {
      const mockStateContent = `
completion_percentage: 85
phase: "development"
      `;
      
      fs.pathExists.mockResolvedValue(true);
      utils.safeReadFile.mockResolvedValue(mockStateContent);
      
      const result = await carlCompletion.checkIntentCompletion('/path/to/test.intent.carl');
      
      expect(result.completed).toBe(false);
    });

    it('should handle missing state file gracefully', async () => {
      fs.pathExists.mockResolvedValue(false);
      
      const result = await carlCompletion.checkIntentCompletion('/path/to/test.intent.carl');
      
      expect(result.completed).toBe(false);
      expect(result.stateData).toBe(null);
    });

    it('should handle invalid YAML gracefully', async () => {
      fs.pathExists.mockResolvedValue(true);
      utils.safeReadFile.mockResolvedValue('invalid: yaml: content: [');
      
      const result = await carlCompletion.checkIntentCompletion('/path/to/test.intent.carl');
      
      expect(result.completed).toBe(false);
    });
  });

  describe('getCompletedDirectory', () => {
    it('should return correct directory for epics', () => {
      const result = carlCompletion.getCompletedDirectory('/path/epics/test.intent.carl');
      expect(result).toBe('/mock/carl/root/.carl/project/epics/completed');
    });

    it('should return correct directory for features', () => {
      const result = carlCompletion.getCompletedDirectory('/path/features/test.intent.carl');
      expect(result).toBe('/mock/carl/root/.carl/project/features/completed');
    });

    it('should return correct directory for stories', () => {
      const result = carlCompletion.getCompletedDirectory('/path/stories/test.intent.carl');
      expect(result).toBe('/mock/carl/root/.carl/project/stories/completed');
    });

    it('should default to technical for unrecognized paths', () => {
      const result = carlCompletion.getCompletedDirectory('/path/unknown/test.intent.carl');
      expect(result).toBe('/mock/carl/root/.carl/project/technical/completed');
    });
  });

  describe('getScopeTypeFromPath', () => {
    it('should detect epic scope type', () => {
      expect(carlCompletion.getScopeTypeFromPath('/path/epics/test.intent.carl')).toBe('epic');
    });

    it('should detect feature scope type', () => {
      expect(carlCompletion.getScopeTypeFromPath('/path/features/test.intent.carl')).toBe('feature');
    });

    it('should detect story scope type', () => {
      expect(carlCompletion.getScopeTypeFromPath('/path/stories/test.intent.carl')).toBe('story');
    });

    it('should detect technical scope type', () => {
      expect(carlCompletion.getScopeTypeFromPath('/path/technical/test.intent.carl')).toBe('technical');
    });

    it('should default to item for unrecognized paths', () => {
      expect(carlCompletion.getScopeTypeFromPath('/path/unknown/test.intent.carl')).toBe('item');
    });
  });

  describe('commitAndMoveFiles', () => {
    it('should execute git operations in correct sequence', async () => {
      const completionInfo = {
        intentPath: '/path/features/test.intent.carl',
        statePath: '/path/features/test.state.carl',
        stateData: { completion_percentage: 100, phase: 'completed' }
      };

      fs.ensureDir.mockResolvedValue();
      execSync.mockReturnValue('');

      const result = await carlCompletion.commitAndMoveFiles(completionInfo);

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('git add'),
        expect.any(Object)
      );
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('git commit'),
        expect.any(Object)
      );
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('git mv'),
        expect.any(Object)
      );
      expect(result).toBe(true);
    });

    it('should rollback on git operation failure', async () => {
      const completionInfo = {
        intentPath: '/path/features/test.intent.carl',
        statePath: '/path/features/test.state.carl',
        stateData: { completion_percentage: 100 }
      };

      fs.ensureDir.mockResolvedValue();
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('git mv')) {
          throw new Error('Git mv failed');
        }
        return '';
      });

      const result = await carlCompletion.commitAndMoveFiles(completionInfo);

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('git reset --hard HEAD~1'),
        expect.any(Object)
      );
      expect(result).toBe(false);
    });
  });

  describe('detectAndProcessCompletions', () => {
    it('should process multiple completions', async () => {
      const intentPaths = [
        '/path/features/completed-test.intent.carl',
        '/path/stories/incomplete-test.intent.carl'
      ];

      // Mock first as completed, second as incomplete
      fs.pathExists.mockResolvedValue(true);
      utils.safeReadFile
        .mockResolvedValueOnce('completion_percentage: 100\nphase: "completed"')
        .mockResolvedValueOnce('completion_percentage: 50\nphase: "development"');

      fs.ensureDir.mockResolvedValue();
      execSync.mockReturnValue('');

      const result = await carlCompletion.detectAndProcessCompletions(intentPaths);

      expect(result).toBe(1); // Only one completion processed
    });

    it('should handle empty intent list', async () => {
      const result = await carlCompletion.detectAndProcessCompletions([]);
      expect(result).toBe(0);
    });
  });
});

describe('CARL Completion Integration', () => {
  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      fs.pathExists.mockRejectedValue(new Error('File system error'));
      
      const result = await carlCompletion.checkIntentCompletion('/path/to/test.intent.carl');
      
      expect(result.completed).toBe(false);
      expect(result.stateData).toBe(null);
    });

    it('should handle git command failures gracefully', async () => {
      const completionInfo = {
        intentPath: '/path/features/test.intent.carl',
        statePath: '/path/features/test.state.carl',
        stateData: { completion_percentage: 100 }
      };

      execSync.mockImplementation(() => {
        throw new Error('Git not available');
      });

      const result = await carlCompletion.commitAndMoveFiles(completionInfo);
      expect(result).toBe(false);
    });
  });
});