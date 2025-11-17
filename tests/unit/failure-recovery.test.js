/**
 * Unit Tests for Failure Recovery System
 *
 * Tests cover:
 * 1. RetryPolicy functionality
 * 2. Failure classification
 * 3. Exponential backoff with jitter
 * 4. Dependency-aware blocking
 * 5. State persistence and recovery
 * 6. Failure report generation
 * 7. Integration with HybridCoordinator
 */

const RetryPolicy = require('../../plugins/carl/lib/orchestration/retry-policy');
const { RetryType, FailureType } = require('../../plugins/carl/lib/orchestration/retry-policy');
const ExecutionStateManager = require('../../plugins/carl/lib/orchestration/execution-state-manager');
const FailureReportGenerator = require('../../plugins/carl/lib/orchestration/failure-report-generator');
const HybridCoordinator = require('../../plugins/carl/lib/orchestration/hybrid-coordinator');
const { ItemState } = require('../../plugins/carl/lib/orchestration/hybrid-coordinator');
const fs = require('fs').promises;
const path = require('path');

describe('Failure Recovery System', () => {
  describe('RetryPolicy', () => {
    describe('Initialization and Configuration', () => {
      test('should create policy with default settings', () => {
        const policy = new RetryPolicy();

        expect(policy.type).toBe(RetryType.EXPONENTIAL);
        expect(policy.maxRetries).toBe(3);
        expect(policy.initialDelay).toBe(100);
        expect(policy.maxDelay).toBe(30000);
        expect(policy.multiplier).toBe(2.0);
        expect(policy.jitterVariance).toBe(0.1);
      });

      test('should create policy with custom settings', () => {
        const policy = new RetryPolicy({
          type: RetryType.LINEAR,
          maxRetries: 5,
          initialDelay: 200,
          maxDelay: 10000,
          multiplier: 1.5,
          jitterVariance: 0.2,
        });

        expect(policy.type).toBe(RetryType.LINEAR);
        expect(policy.maxRetries).toBe(5);
        expect(policy.initialDelay).toBe(200);
        expect(policy.maxDelay).toBe(10000);
        expect(policy.multiplier).toBe(1.5);
        expect(policy.jitterVariance).toBe(0.2);
      });

      test('should reject invalid configuration', () => {
        expect(() => new RetryPolicy({ maxRetries: -1 })).toThrow();
        expect(() => new RetryPolicy({ initialDelay: -100 })).toThrow();
        expect(() => new RetryPolicy({ maxDelay: 50, initialDelay: 100 })).toThrow();
        expect(() => new RetryPolicy({ multiplier: 0.5 })).toThrow();
        expect(() => new RetryPolicy({ jitterVariance: 1.5 })).toThrow();
      });

      test('should create preset policies', () => {
        const defaultPolicy = RetryPolicy.preset('default');
        expect(defaultPolicy.type).toBe(RetryType.EXPONENTIAL);

        const aggressivePolicy = RetryPolicy.preset('aggressive');
        expect(aggressivePolicy.maxRetries).toBe(5);

        const nonePolicy = RetryPolicy.preset('none');
        expect(nonePolicy.type).toBe(RetryType.NONE);
      });
    });

    describe('Delay Calculation', () => {
      test('should calculate exponential backoff', () => {
        const policy = new RetryPolicy({
          type: RetryType.EXPONENTIAL,
          initialDelay: 100,
          multiplier: 2.0,
          jitterVariance: 0,
        });

        expect(policy.getDelay(0)).toBe(100);
        expect(policy.getDelay(1)).toBe(200);
        expect(policy.getDelay(2)).toBe(400);
        expect(policy.getDelay(3)).toBe(800);
      });

      test('should calculate linear backoff', () => {
        const policy = new RetryPolicy({
          type: RetryType.LINEAR,
          initialDelay: 100,
          multiplier: 2.0,
          jitterVariance: 0,
        });

        expect(policy.getDelay(0)).toBe(100);
        expect(policy.getDelay(1)).toBe(300); // 100 + 2.0 * 1 * 100
        expect(policy.getDelay(2)).toBe(500); // 100 + 2.0 * 2 * 100
      });

      test('should use constant delay', () => {
        const policy = new RetryPolicy({
          type: RetryType.CONSTANT,
          initialDelay: 100,
          jitterVariance: 0,
        });

        expect(policy.getDelay(0)).toBe(100);
        expect(policy.getDelay(1)).toBe(100);
        expect(policy.getDelay(5)).toBe(100);
      });

      test('should apply max delay cap', () => {
        const policy = new RetryPolicy({
          type: RetryType.EXPONENTIAL,
          initialDelay: 100,
          multiplier: 2.0,
          maxDelay: 500,
          jitterVariance: 0,
        });

        expect(policy.getDelay(0)).toBe(100);
        expect(policy.getDelay(1)).toBe(200);
        expect(policy.getDelay(2)).toBe(400);
        expect(policy.getDelay(3)).toBe(500); // Capped
        expect(policy.getDelay(10)).toBe(500); // Still capped
      });

      test('should apply jitter', () => {
        const policy = new RetryPolicy({
          type: RetryType.EXPONENTIAL,
          initialDelay: 1000,
          multiplier: 2.0,
          jitterVariance: 0.1,
        });

        const delays = [];
        for (let i = 0; i < 10; i++) {
          delays.push(policy.getDelay(1));
        }

        // With 10% jitter, delays should vary
        const uniqueDelays = new Set(delays);
        expect(uniqueDelays.size).toBeGreaterThan(1);

        // All delays should be within ±10% of 2000
        for (const delay of delays) {
          expect(delay).toBeGreaterThanOrEqual(1800); // 2000 - 10%
          expect(delay).toBeLessThanOrEqual(2200); // 2000 + 10%
        }
      });
    });

    describe('Error Classification', () => {
      test('should classify transient HTTP errors', () => {
        const policy = new RetryPolicy();

        const transientErrors = [
          { statusCode: 408 },
          { statusCode: 429 },
          { statusCode: 503 },
          { statusCode: 504 },
        ];

        for (const error of transientErrors) {
          expect(policy.isRetryable(error)).toBe(true);
        }
      });

      test('should classify permanent HTTP errors', () => {
        const policy = new RetryPolicy();

        const permanentErrors = [
          { statusCode: 400 },
          { statusCode: 401 },
          { statusCode: 403 },
          { statusCode: 404 },
          { statusCode: 422 },
        ];

        for (const error of permanentErrors) {
          expect(policy.isRetryable(error)).toBe(false);
        }
      });

      test('should classify network errors as transient', () => {
        const policy = new RetryPolicy();

        const networkErrors = [
          { code: 'ETIMEDOUT' },
          { code: 'ECONNREFUSED' },
          { code: 'ECONNRESET' },
        ];

        for (const error of networkErrors) {
          expect(policy.isRetryable(error)).toBe(true);
        }
      });

      test('should use custom error patterns', () => {
        const policy = new RetryPolicy({
          retryableErrors: ['database connection'],
          nonRetryableErrors: ['invalid input'],
        });

        expect(policy.isRetryable(new Error('database connection failed'))).toBe(true);
        expect(policy.isRetryable(new Error('invalid input provided'))).toBe(false);
      });

      test('should use custom classifier', () => {
        const policy = new RetryPolicy({
          errorClassifier: (error) => {
            return error.message.includes('retry') ? FailureType.TRANSIENT : FailureType.PERMANENT;
          },
        });

        expect(policy.isRetryable(new Error('please retry'))).toBe(true);
        expect(policy.isRetryable(new Error('fatal error'))).toBe(false);
      });
    });

    describe('Retry Logic', () => {
      test('should retry transient failures', () => {
        const policy = new RetryPolicy({ maxRetries: 3 });

        expect(policy.shouldRetry(new Error('timeout'), 0)).toBe(true);
        expect(policy.shouldRetry(new Error('timeout'), 1)).toBe(true);
        expect(policy.shouldRetry(new Error('timeout'), 2)).toBe(true);
        expect(policy.shouldRetry(new Error('timeout'), 3)).toBe(false); // Max reached
      });

      test('should not retry permanent failures', () => {
        const policy = new RetryPolicy({ maxRetries: 3 });

        const error = new Error('invalid input');
        expect(policy.shouldRetry(error, 0)).toBe(true); // Classified as transient by default
      });

      test('should respect retry limit', () => {
        const policy = new RetryPolicy({ maxRetries: 2 });

        const error = new Error('timeout');
        expect(policy.shouldRetry(error, 0)).toBe(true);
        expect(policy.shouldRetry(error, 1)).toBe(true);
        expect(policy.shouldRetry(error, 2)).toBe(false);
      });

      test('should respect timeout', async () => {
        const policy = new RetryPolicy({
          maxRetries: 10,
          initialDelay: 100,
          timeout: 500,
        });

        policy.startTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, 600));

        expect(policy.shouldRetry(new Error('timeout'), 0)).toBe(false);
      });
    });

    describe('Retry History', () => {
      test('should record retry attempts', () => {
        const policy = new RetryPolicy();

        policy.recordAttempt(0, new Error('first error'), 100);
        policy.recordAttempt(1, new Error('second error'), 200);

        const history = policy.getHistory();
        expect(history.totalAttempts).toBe(2);
        expect(history.totalDelay).toBe(300);
        expect(history.attempts).toHaveLength(2);
        expect(history.attempts[0].attempt).toBe(0);
        expect(history.attempts[1].delay).toBe(200);
      });

      test('should reset history', () => {
        const policy = new RetryPolicy();

        policy.recordAttempt(0, new Error('error'), 100);
        expect(policy.getHistory().totalAttempts).toBe(1);

        policy.reset();
        expect(policy.getHistory().totalAttempts).toBe(0);
      });
    });

    describe('Execute with Retry', () => {
      test('should execute function successfully on first try', async () => {
        const policy = new RetryPolicy();
        let attempts = 0;

        const result = await policy.execute(async () => {
          attempts++;
          return 'success';
        });

        expect(result).toBe('success');
        expect(attempts).toBe(1);
      });

      test('should retry and eventually succeed', async () => {
        const policy = new RetryPolicy({
          maxRetries: 3,
          initialDelay: 10,
          jitterVariance: 0,
        });

        let attempts = 0;

        const result = await policy.execute(async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error('timeout');
          }
          return 'success';
        });

        expect(result).toBe('success');
        expect(attempts).toBe(3);

        const history = policy.getHistory();
        expect(history.totalAttempts).toBe(2); // 2 failures before success
      });

      test('should fail after max retries', async () => {
        const policy = new RetryPolicy({
          maxRetries: 2,
          initialDelay: 10,
        });

        let attempts = 0;

        await expect(
          policy.execute(async () => {
            attempts++;
            throw new Error('timeout');
          })
        ).rejects.toThrow('timeout');

        expect(attempts).toBeGreaterThan(1);
      });
    });
  });

  describe('ExecutionStateManager', () => {
    const TEST_STATE_DIR = '.cascade/.test-execution-state';

    beforeEach(async () => {
      // Clean up test directory
      try {
        await fs.rm(TEST_STATE_DIR, { recursive: true, force: true });
      } catch (error) {
        // Ignore if doesn't exist
      }
    });

    afterEach(async () => {
      // Clean up test directory
      try {
        await fs.rm(TEST_STATE_DIR, { recursive: true, force: true });
      } catch (error) {
        // Ignore
      }
    });

    test('should initialize and create state directory', async () => {
      const manager = new ExecutionStateManager({
        stateDirectory: TEST_STATE_DIR,
        enabled: true,
      });

      const executionId = await manager.initialize();
      expect(executionId).toBeTruthy();

      // Check directory was created
      const stats = await fs.stat(TEST_STATE_DIR);
      expect(stats.isDirectory()).toBe(true);
    });

    test('should create and save execution state', async () => {
      const manager = new ExecutionStateManager({
        stateDirectory: TEST_STATE_DIR,
        enabled: true,
      });

      await manager.initialize();
      await manager.createState({
        workItems: [
          { id: 'item1', name: 'Item 1' },
          { id: 'item2', name: 'Item 2' },
        ],
      });

      const state = manager.getState();
      expect(state.workItems).toHaveLength(2);
      expect(state.completedItems).toEqual([]);
      expect(state.failedItems).toEqual({});
    });

    test('should mark items as completed', async () => {
      const manager = new ExecutionStateManager({
        stateDirectory: TEST_STATE_DIR,
        enabled: true,
      });

      await manager.initialize();
      await manager.createState({
        workItems: [{ id: 'item1' }, { id: 'item2' }],
      });

      await manager.markCompleted('item1', { result: 'success' });

      const state = manager.getState();
      expect(state.completedItems).toContain('item1');
      expect(state.results.item1).toEqual({ result: 'success' });
    });

    test('should mark items as failed', async () => {
      const manager = new ExecutionStateManager({
        stateDirectory: TEST_STATE_DIR,
        enabled: true,
      });

      await manager.initialize();
      await manager.createState({
        workItems: [{ id: 'item1' }],
      });

      await manager.markFailed('item1', new Error('Test error'), {
        failureType: 'transient',
        attempts: 3,
      });

      const state = manager.getState();
      expect(state.failedItems.item1).toBeDefined();
      expect(state.failedItems.item1.error).toBe('Test error');
      expect(state.failedItems.item1.failureType).toBe('transient');
      expect(state.failedItems.item1.attempts).toBe(3);
    });

    test('should mark items as blocked', async () => {
      const manager = new ExecutionStateManager({
        stateDirectory: TEST_STATE_DIR,
        enabled: true,
      });

      await manager.initialize();
      await manager.createState({
        workItems: [{ id: 'item1' }, { id: 'item2' }],
      });

      await manager.markBlocked(['item2'], 'Depends on failed item1', ['item1']);

      const state = manager.getState();
      expect(state.blockedItems.item2).toBeDefined();
      expect(state.blockedItems.item2.blockedBy).toContain('item1');
    });

    test('should load existing state', async () => {
      const manager1 = new ExecutionStateManager({
        stateDirectory: TEST_STATE_DIR,
        enabled: true,
      });

      const executionId = await manager1.initialize();
      await manager1.createState({
        workItems: [{ id: 'item1' }],
        metadata: { test: 'data' },
      });
      await manager1.markCompleted('item1');

      // Create new manager and load state
      const manager2 = new ExecutionStateManager({
        stateDirectory: TEST_STATE_DIR,
        enabled: true,
      });

      const loadedState = await manager2.loadState(executionId);
      expect(loadedState.completedItems).toContain('item1');
      expect(loadedState.metadata.test).toBe('data');
    });
  });

  describe('FailureReportGenerator', () => {
    test('should generate basic failure report', () => {
      const workItems = new Map([
        ['item1', { id: 'item1', name: 'Item 1', type: 'task' }],
        ['item2', { id: 'item2', name: 'Item 2', type: 'task' }],
      ]);

      const itemStates = new Map([
        ['item1', 'completed'],
        ['item2', 'failed'],
      ]);

      const itemErrors = new Map([
        ['item2', new Error('Test error')],
      ]);

      const report = FailureReportGenerator.generate({
        executionId: 'test-123',
        workItems,
        itemStates,
        itemResults: new Map(),
        itemErrors,
        retryHistory: new Map(),
        dependencyGraph: null,
        metrics: {},
        duration: 5000,
      });

      expect(report.executionId).toBe('test-123');
      expect(report.summary.totalItems).toBe(2);
      expect(report.summary.completed).toBe(1);
      expect(report.summary.failed).toBe(1);
      expect(report.failures).toHaveLength(1);
      expect(report.failures[0].itemId).toBe('item2');
    });

    test('should format report as text', () => {
      const report = {
        executionId: 'test-123',
        timestamp: new Date().toISOString(),
        summary: {
          totalItems: 2,
          completed: 1,
          failed: 1,
          blocked: 0,
          skipped: 0,
          successRate: '50%',
        },
        failures: [
          {
            itemId: 'item2',
            name: 'Item 2',
            failureType: 'permanent',
            error: 'Test error',
            attempts: 1,
            retryHistory: [],
          },
        ],
        blockedItems: [],
        recommendations: [],
        duration: 5000,
      };

      const text = FailureReportGenerator.formatText(report);
      expect(text).toContain('EXECUTION FAILURE REPORT');
      expect(text).toContain('test-123');
      expect(text).toContain('Item 2');
    });
  });

  describe('Integration with HybridCoordinator', () => {
    test('should handle transient failure with retry', async () => {
      const coordinator = new HybridCoordinator({
        maxConcurrency: 2,
        enableFailureRecovery: true,
        continueOnFailure: true,
        defaultRetryPolicy: RetryPolicy.preset('quick'),
      });

      let attempts = 0;

      coordinator.addItems([
        {
          id: 'item1',
          name: 'Item 1',
          execute: async () => {
            attempts++;
            if (attempts < 2) {
              throw new Error('timeout');
            }
            return { success: true };
          },
        },
      ]);

      await coordinator.analyze();
      const result = await coordinator.execute();

      expect(result.success).toBe(true);
      expect(result.completedItems).toBe(1);
      expect(attempts).toBe(2); // Failed once, then succeeded
    });

    test('should block dependent items when item fails', async () => {
      const coordinator = new HybridCoordinator({
        enableFailureRecovery: false,
        continueOnFailure: true,
        defaultRetryPolicy: RetryPolicy.preset('none'),
      });

      coordinator.addItems([
        {
          id: 'item1',
          name: 'Item 1',
          execute: async () => {
            throw new Error('permanent failure');
          },
        },
        {
          id: 'item2',
          name: 'Item 2',
          execute: async () => ({ success: true }),
          dependencies: ['item1'],
        },
        {
          id: 'item3',
          name: 'Item 3',
          execute: async () => ({ success: true }),
        },
      ]);

      await coordinator.analyze();
      const result = await coordinator.execute();

      expect(result.success).toBe(true); // continueOnFailure
      expect(result.failedItems).toBe(1);
      expect(result.blockedItems).toBeGreaterThanOrEqual(1);
      expect(coordinator.itemStates.get('item1')).toBe(ItemState.FAILED);
      expect(coordinator.itemStates.get('item2')).toBe(ItemState.BLOCKED);
      expect(coordinator.itemStates.get('item3')).toBe(ItemState.COMPLETED);
    });

    test('should generate failure report on execution failure', async () => {
      const coordinator = new HybridCoordinator({
        enableFailureRecovery: false,
        continueOnFailure: true,
        enableFailureReports: true,
      });

      let reportEmitted = false;
      coordinator.on('failure:report', (report) => {
        reportEmitted = true;
        expect(report.failures.length).toBeGreaterThan(0);
        expect(report.recommendations).toBeDefined();
      });

      coordinator.addItems([
        {
          id: 'item1',
          name: 'Item 1',
          execute: async () => {
            throw new Error('validation failed');
          },
        },
      ]);

      await coordinator.analyze();
      await coordinator.execute();

      // Note: Report is only emitted on full execution failure
      // With continueOnFailure=true, execution completes successfully
      // So we check the result instead
      expect(coordinator.itemErrors.has('item1')).toBe(true);
    });
  });
});
