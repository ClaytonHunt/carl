/**
 * Unit Tests for Execution Report Generator
 */

const ExecutionReportGenerator = require('../../plugins/carl/lib/orchestration/execution-report-generator');
const { ReportFormat } = require('../../plugins/carl/lib/orchestration/execution-report-generator');
const ProgressTracker = require('../../plugins/carl/lib/orchestration/progress-tracker');
const EventLogger = require('../../plugins/carl/lib/orchestration/event-logger');
const { EventType, EventPriority } = require('../../plugins/carl/lib/orchestration/event-logger');

describe('ExecutionReportGenerator', () => {
  let progressTracker;
  let eventLogger;
  let reportGenerator;

  beforeEach(() => {
    progressTracker = new ProgressTracker({ enablePersistence: false });
    eventLogger = new EventLogger({ enablePersistence: false, enableEmit: false });
    reportGenerator = new ExecutionReportGenerator({ progressTracker, eventLogger });
  });

  describe('Constructor', () => {
    test('should create report generator with required dependencies', () => {
      expect(reportGenerator).toBeDefined();
      expect(reportGenerator.progressTracker).toBe(progressTracker);
      expect(reportGenerator.eventLogger).toBe(eventLogger);
    });

    test('should throw error if ProgressTracker is missing', () => {
      expect(() => new ExecutionReportGenerator({ eventLogger }))
        .toThrow('ProgressTracker is required');
    });

    test('should throw error if EventLogger is missing', () => {
      expect(() => new ExecutionReportGenerator({ progressTracker }))
        .toThrow('EventLogger is required');
    });
  });

  describe('formatProgressSummary', () => {
    test('should format progress with percentages and counts', async () => {
      await progressTracker.initialize({ totalItems: 10 });
      progressTracker.itemStarted('item1');
      progressTracker.itemCompleted('item1');
      progressTracker.itemStarted('item2');
      progressTracker.itemCompleted('item2');

      const summary = reportGenerator.formatProgressSummary();

      expect(summary).toContain('**Progress**');
      expect(summary).toContain('20.0%');
      expect(summary).toContain('**Completed**: 2 / 10');
    });

    test('should display in-progress items', async () => {
      await progressTracker.initialize({ totalItems: 5 });
      progressTracker.itemStarted('item1');

      const summary = reportGenerator.formatProgressSummary();
      expect(summary).toContain('**In Progress**: 1');
    });

    test('should display failed items', async () => {
      await progressTracker.initialize({ totalItems: 5 });
      progressTracker.itemStarted('item1');
      progressTracker.itemFailed('item1', { error: 'Test error' });

      const summary = reportGenerator.formatProgressSummary();
      expect(summary).toContain('**Failed**: 1');
    });
  });

  describe('formatRecentEvents', () => {
    test('should format events list', async () => {
      await eventLogger.logWorkflowStarted({ message: 'Test started' });
      await eventLogger.logWorkflowCompleted({ message: 'Test completed' });

      const timeline = reportGenerator.formatRecentEvents();

      expect(timeline).toContain('Test started');
      expect(timeline).toContain('Test completed');
    });

    test('should show message when no events', () => {
      const timeline = reportGenerator.formatRecentEvents();
      expect(timeline).toBe('No events recorded.');
    });
  });

  describe('formatStateChanges', () => {
    test('should display state transitions', async () => {
      await eventLogger.logStateTransition({
        workItemId: 'T001',
        oldState: 'planned',
        newState: 'completed',
      });

      const stateChanges = reportGenerator.formatStateChanges();

      expect(stateChanges).toContain('T001');
      expect(stateChanges).toContain('planned → completed');
    });

    test('should show message when no state changes', () => {
      const stateChanges = reportGenerator.formatStateChanges();
      expect(stateChanges).toBe('No state changes recorded.');
    });
  });

  describe('formatErrorsAndWarnings', () => {
    test('should format error events', async () => {
      await eventLogger.logWorkerFailed({
        workerId: 'worker1',
        workItemId: 'T001',
        error: new Error('Test error'),
        message: 'Worker failed',
      });

      const errors = reportGenerator.formatErrorsAndWarnings();

      expect(errors).toContain('Worker failed');
      expect(errors).toContain('Test error');
    });

    test('should return null when no errors', () => {
      const errors = reportGenerator.formatErrorsAndWarnings();
      expect(errors).toBeNull();
    });
  });

  describe('generateReport - Different Formats', () => {
    beforeEach(async () => {
      await progressTracker.initialize({ totalItems: 5 });
      await eventLogger.logWorkflowStarted({ message: 'Test workflow' });
      progressTracker.itemStarted('item1');
      progressTracker.itemCompleted('item1');
    });

    test('should generate full report', () => {
      const report = reportGenerator.generateReport({ format: ReportFormat.FULL });

      expect(report).toContain('# Execution Report');
      expect(report).toContain('## Progress Summary');
      expect(report).toContain('## Recent Events');
      expect(report).toContain('## Work Item State Changes');
    });

    test('should generate summary report', () => {
      const report = reportGenerator.generateReport({ format: ReportFormat.SUMMARY });
      expect(report).toContain('# Execution Summary');
    });

    test('should generate timeline report', () => {
      const report = reportGenerator.generateReport({ format: ReportFormat.TIMELINE });
      expect(report).toContain('# Execution Timeline');
    });

    test('should generate progress report', () => {
      const report = reportGenerator.generateReport({ format: ReportFormat.PROGRESS });
      expect(report).toContain('# Progress Report');
    });

    test('should generate error report', async () => {
      await eventLogger.logWorkerFailed({
        error: new Error('Test error'),
        message: 'Test failure',
        workerId: 'w1',
        workItemId: 'T1',
      });

      const report = reportGenerator.generateReport({ format: ReportFormat.ERRORS });

      expect(report).toContain('# Error Report');
      expect(report).toContain('Test failure');
    });
  });

  describe('Helper Methods', () => {
    test('should create progress bar', () => {
      const bar0 = reportGenerator._createProgressBar(0);
      const bar50 = reportGenerator._createProgressBar(50);
      const bar100 = reportGenerator._createProgressBar(100);

      expect(bar0).toContain('░');
      expect(bar50).toContain('█');
      expect(bar50).toContain('░');
      expect(bar100).toContain('█');
    });

    test('should format durations', () => {
      expect(reportGenerator._formatDuration(500)).toBe('500ms');
      expect(reportGenerator._formatDuration(5000)).toBe('5.0s');
      expect(reportGenerator._formatDuration(65000)).toBe('1m 5s');
    });

    test('should calculate success rate', () => {
      expect(reportGenerator._calculateSuccessRate({ completedItems: 8, failedItems: 2 })).toBe('80.0');
      expect(reportGenerator._calculateSuccessRate({ completedItems: 0, failedItems: 0 })).toBe(0);
    });
  });
});
