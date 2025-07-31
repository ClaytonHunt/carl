#!/usr/bin/env node

/**
 * Unit tests for carl-helpers.js module
 */

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const yaml = require('yaml');
const carlHelpers = require('../lib/carl-helpers');
const utils = require('../lib/utils');

// Mock the Carl root for testing
const mockCarlRoot = path.join(os.tmpdir(), 'carl-helpers-test-' + Date.now());

describe('CARL Helpers Module', () => {
  beforeEach(async () => {
    // Set up test environment
    process.env.CARL_ROOT = mockCarlRoot;
    await fs.ensureDir(mockCarlRoot);
    await fs.ensureDir(path.join(mockCarlRoot, '.carl'));
    await fs.ensureDir(path.join(mockCarlRoot, '.carl/config'));
    await fs.ensureDir(path.join(mockCarlRoot, '.carl/project'));
    await fs.ensureDir(path.join(mockCarlRoot, '.carl/sessions'));
  });

  afterEach(async () => {
    // Clean up test environment
    await fs.remove(mockCarlRoot);
    delete process.env.CARL_ROOT;
    jest.clearAllMocks();
  });

  describe('getCarlRoot', () => {
    test('should return CARL root directory', () => {
      const result = carlHelpers.getCarlRoot();
      expect(result).toBe(mockCarlRoot);
    });
  });

  describe('getJsonValue', () => {
    test('should extract value from JSON file', async () => {
      const configFile = path.join(mockCarlRoot, '.carl/config/test.json');
      const config = {
        level1: {
          level2: {
            value: 'test-value'
          }
        }
      };
      await fs.writeFile(configFile, JSON.stringify(config));

      const result = await carlHelpers.getJsonValue(configFile, 'level1.level2.value', 'default');
      expect(result).toBe('test-value');
    });

    test('should return default for non-existent key', async () => {
      const configFile = path.join(mockCarlRoot, '.carl/config/test.json');
      const config = { existing: 'value' };
      await fs.writeFile(configFile, JSON.stringify(config));

      const result = await carlHelpers.getJsonValue(configFile, 'non.existent.key', 'default-value');
      expect(result).toBe('default-value');
    });

    test('should return default for non-existent file', async () => {
      const configFile = path.join(mockCarlRoot, '.carl/config/nonexistent.json');
      
      const result = await carlHelpers.getJsonValue(configFile, 'any.key', 'default-value');
      expect(result).toBe('default-value');
    });

    test('should handle invalid JSON', async () => {
      const configFile = path.join(mockCarlRoot, '.carl/config/invalid.json');
      await fs.writeFile(configFile, 'invalid json content');

      const result = await carlHelpers.getJsonValue(configFile, 'any.key', 'default-value');
      expect(result).toBe('default-value');
    });
  });

  describe('getSetting', () => {
    test('should get audio setting from config', async () => {
      const configFile = path.join(mockCarlRoot, '.carl/config/carl-settings.json');
      const config = {
        audio_settings: {
          audio_enabled: 'true',
          quiet_mode: 'false'
        }
      };
      await fs.writeFile(configFile, JSON.stringify(config));

      const result = await carlHelpers.getSetting('audio_enabled');
      expect(result).toBe('true');
    });

    test('should return mapped setting values', async () => {
      const configFile = path.join(mockCarlRoot, '.carl/config/carl-settings.json');
      const config = {
        audio_settings: {
          quiet_mode: 'true'
        }
      };
      await fs.writeFile(configFile, JSON.stringify(config));

      const result = await carlHelpers.getSetting('quiet_mode');
      expect(result).toBe('true');
    });

    test('should handle analysis_depth special case', async () => {
      const configFile = path.join(mockCarlRoot, '.carl/config/carl-settings.json');
      const config = {
        analysis_settings: {
          comprehensive_scanning: 'true'
        }
      };
      await fs.writeFile(configFile, JSON.stringify(config));

      const result = await carlHelpers.getSetting('analysis_depth');
      expect(result).toBe('comprehensive');
    });

    test('should return appropriate defaults', async () => {
      // Create empty config
      const configFile = path.join(mockCarlRoot, '.carl/config/carl-settings.json');
      await fs.writeFile(configFile, '{}');

      const quietMode = await carlHelpers.getSetting('quiet_mode');
      const audioEnabled = await carlHelpers.getSetting('audio_enabled');
      const autoUpdate = await carlHelpers.getSetting('auto_update');

      expect(quietMode).toBe('true');
      expect(audioEnabled).toBe('false');
      expect(autoUpdate).toBe('true');
    });
  });

  describe('getActiveContext', () => {
    test('should return formatted active context', async () => {
      const activeWorkFile = path.join(mockCarlRoot, '.carl/active-work.carl');
      const activeWork = {
        active_intent: {
          id: 'test-feature',
          path: '.carl/project/features/test-feature.intent.carl',
          state_path: '.carl/project/features/test-feature.state.carl',
          started: '2024-01-01T00:00:00Z',
          completion: 25,
          current_phase: 'implementation'
        },
        work_queue: {
          in_progress: [
            {
              id: 'task-1',
              status: 'active',
              next_action: 'write tests',
              estimated_completion: '2024-01-02'
            }
          ],
          ready_for_work: [
            {
              id: 'task-2',
              priority: 'high',
              estimated_effort: '2 hours'
            }
          ]
        }
      };
      await fs.writeFile(activeWorkFile, yaml.stringify(activeWork));

      const result = await carlHelpers.getActiveContext();
      
      expect(result).toContain('Active Work Context');
      expect(result).toContain('test-feature');
      expect(result).toContain('implementation');
      expect(result).toContain('in_progress');
      expect(result).toContain('ready_for_work');
    });

    test('should return empty string for non-existent file', async () => {
      const result = await carlHelpers.getActiveContext();
      expect(result).toBe('');
    });

    test('should handle invalid YAML', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const activeWorkFile = path.join(mockCarlRoot, '.carl/active-work.carl');
      await fs.writeFile(activeWorkFile, 'invalid: yaml: content:');

      const result = await carlHelpers.getActiveContext();
      expect(result).toBe('');
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getTargetedContext', () => {
    test('should return active context for general prompts', async () => {
      const result = await carlHelpers.getTargetedContext('general prompt');
      expect(typeof result).toBe('string');
    });

    test('should enhance context for feature-related prompts', async () => {
      await fs.ensureDir(path.join(mockCarlRoot, '.carl/project'));
      
      const result = await carlHelpers.getTargetedContext('implement new feature');
      expect(result).toContain('Targeted Context');
    });
  });

  describe('getStrategicContext', () => {
    test('should include vision context when available', async () => {
      const visionFile = path.join(mockCarlRoot, '.carl/project/vision.carl');
      const visionContent = `# Project Vision
description: "Test project for development"
mission: "Build awesome software"`;
      await fs.writeFile(visionFile, visionContent);

      const result = await carlHelpers.getStrategicContext('plan new feature');
      expect(result).toContain('Vision Context');
      expect(result).toContain('Test project for development');
    });

    test('should include roadmap context for planning prompts', async () => {
      const roadmapFile = path.join(mockCarlRoot, '.carl/project/roadmap.carl');
      const roadmapContent = `# Current Roadmap
current_phase: "Phase 1: Foundation"
objectives:
  - Build core features`;
      await fs.writeFile(roadmapFile, roadmapContent);

      const result = await carlHelpers.getStrategicContext('plan new epic');
      expect(result).toContain('Current Roadmap Phase');
      expect(result).toContain('Phase 1: Foundation');
    });

    test('should return empty string when no strategic files exist', async () => {
      const result = await carlHelpers.getStrategicContext('general prompt');
      expect(result).toBe('');
    });
  });

  describe('getAlignmentValidationContext', () => {
    test('should return validation context for feature prompts', async () => {
      const visionFile = path.join(mockCarlRoot, '.carl/project/vision.carl');
      const visionContent = `description: "Financial management application"`;
      await fs.writeFile(visionFile, visionContent);

      const result = await carlHelpers.getAlignmentValidationContext('create new feature');
      expect(result).toContain('Strategic Alignment Validation');
      expect(result).toContain('Financial management application');
      expect(result).toContain('Validation Instructions');
    });

    test('should return empty string for non-feature prompts', async () => {
      const result = await carlHelpers.getAlignmentValidationContext('fix bug in existing code');
      expect(result).toBe('');
    });

    test('should return empty string when no vision file exists', async () => {
      const result = await carlHelpers.getAlignmentValidationContext('create new feature');
      expect(result).toBe('');
    });
  });

  describe('logActivity', () => {
    test('should log activity to session log', async () => {
      await carlHelpers.logActivity('test_activity', 'test details');
      
      const logFile = path.join(mockCarlRoot, '.carl/sessions/activity.log');
      const logExists = await fs.pathExists(logFile);
      expect(logExists).toBe(true);
      
      const logContent = await fs.readFile(logFile, 'utf8');
      expect(logContent).toContain('test_activity');
      expect(logContent).toContain('test details');
    });

    test('should handle logging errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      // Mock fs.appendFile to throw error
      const originalAppendFile = fs.appendFile;
      fs.appendFile = jest.fn().mockRejectedValue(new Error('Write error'));
      
      await expect(carlHelpers.logActivity('test', 'details')).resolves.not.toThrow();
      
      // Restore original function
      fs.appendFile = originalAppendFile;
      consoleErrorSpy.mockRestore();
    });
  });

  describe('logMilestone', () => {
    test('should log milestone to milestone log', async () => {
      await carlHelpers.logMilestone('completion', 'Feature completed');
      
      const logFile = path.join(mockCarlRoot, '.carl/sessions/milestones.log');
      const logExists = await fs.pathExists(logFile);
      expect(logExists).toBe(true);
      
      const logContent = await fs.readFile(logFile, 'utf8');
      expect(logContent).toContain('completion');
      expect(logContent).toContain('Feature completed');
      expect(logContent).toContain('celebration_triggered');
    });
  });

  describe('updateStateFromChanges', () => {
    test('should log state update activity', async () => {
      await carlHelpers.updateStateFromChanges();
      
      const logFile = path.join(mockCarlRoot, '.carl/sessions/activity.log');
      const logContent = await fs.readFile(logFile, 'utf8');
      expect(logContent).toContain('state_update');
    });
  });

  describe('updateSessionActivity', () => {
    test('should log tool usage activity', async () => {
      await carlHelpers.updateSessionActivity('Read', 'before');
      
      const logFile = path.join(mockCarlRoot, '.carl/sessions/activity.log');
      const logContent = await fs.readFile(logFile, 'utf8');
      expect(logContent).toContain('tool_usage');
      expect(logContent).toContain('Read before');
    });
  });

  describe('checkAndCelebrateMilestones', () => {
    test('should complete milestone check without errors', async () => {
      await expect(carlHelpers.checkAndCelebrateMilestones()).resolves.not.toThrow();
    });

    test('should log milestone check when milestone log exists', async () => {
      const milestoneLogFile = path.join(mockCarlRoot, '.carl/sessions/milestones.log');
      await fs.writeFile(milestoneLogFile, '');
      
      await carlHelpers.checkAndCelebrateMilestones();
      
      const activityLogFile = path.join(mockCarlRoot, '.carl/sessions/activity.log');
      const logContent = await fs.readFile(activityLogFile, 'utf8');
      expect(logContent).toContain('milestone_check');
    });
  });
});