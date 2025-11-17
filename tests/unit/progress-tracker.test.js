/**
 * Unit Tests for Progress Tracker
 *
 * Tests cover:
 * 1. Initialization and basic tracking
 * 2. Item progress tracking (started, completed, failed, blocked, retry)
 * 3. Wave progress tracking
 * 4. Progress snapshots and metrics
 * 5. Timeline tracking
 * 6. Progress events and subscriptions
 * 7. Progress formatting (text, JSON)
 * 8. Progress persistence and history
 * 9. Progress aggregation and rollup
 * 10. Performance and throttling
 */

const ProgressTracker = require('../../plugins/carl/lib/orchestration/progress-tracker');
const {
  ProgressEventType,
  ProgressSnapshot,
  TimelineEntry,
} = require('../../plugins/carl/lib/orchestration/progress-tracker');
const fs = require('fs').promises;
const path = require('path');

describe('ProgressTracker', () => {
  let progressTracker;
  const testDir = path.join(__dirname, '.test-progress');

  beforeEach(() => {
    progressTracker = new ProgressTracker({
      enablePersistence: false,
      updateInterval: 10, // Fast updates for testing
    });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Initialization', () => {
    test('should initialize with default config', () => {
      const tracker = new ProgressTracker();

      expect(tracker.config.updateInterval).toBe(100);
      expect(tracker.config.enablePersistence).toBe(false);
      expect(tracker.config.maxHistoryEntries).toBe(1000);
      expect(tracker.executionId).toBeNull();
    });

    test('should initialize with custom config', () => {
      const tracker = new ProgressTracker({
        updateInterval: 500,
        enablePersistence: true,
        persistenceDirectory: testDir,
        maxHistoryEntries: 500,
      });

      expect(tracker.config.updateInterval).toBe(500);
      expect(tracker.config.enablePersistence).toBe(true);
      expect(tracker.config.persistenceDirectory).toBe(testDir);
      expect(tracker.config.maxHistoryEntries).toBe(500);
    });

    test('should initialize execution', async () => {
      const executionId = await progressTracker.initialize({
        totalItems: 10,
        totalWaves: 3,
      });

      expect(executionId).toBeTruthy();
      expect(executionId).toMatch(/^exec_/);
      expect(progressTracker.executionId).toBe(executionId);
      expect(progressTracker.metrics.totalItems).toBe(10);
      expect(progressTracker.metrics.totalWaves).toBe(3);
      expect(progressTracker.metrics.pendingItems).toBe(10);
      expect(progressTracker.startTime).toBeTruthy();
    });

    test('should record initial snapshot', async () => {
      await progressTracker.initialize({
        totalItems: 5,
        totalWaves: 2,
      });

      expect(progressTracker.snapshots.length).toBe(1);
      expect(progressTracker.snapshots[0].status).toBe('pending');
    });
  });

  describe('Item Progress Tracking', () => {
    beforeEach(async () => {
      await progressTracker.initialize({
        totalItems: 5,
        totalWaves: 2,
      });
    });

    test('should track item started', () => {
      progressTracker.itemStarted('item1', {
        name: 'Test Item 1',
        wave: 0,
      });

      expect(progressTracker.itemStates.get('item1')).toBe('executing');
      expect(progressTracker.itemStartTimes.has('item1')).toBe(true);
      expect(progressTracker.metrics.inProgressItems).toBe(1);
      expect(progressTracker.metrics.pendingItems).toBe(4);
    });

    test('should track item completed', () => {
      progressTracker.itemStarted('item1', { name: 'Test Item 1' });
      progressTracker.itemCompleted('item1', { name: 'Test Item 1' });

      expect(progressTracker.itemStates.get('item1')).toBe('completed');
      expect(progressTracker.itemEndTimes.has('item1')).toBe(true);
      expect(progressTracker.itemDurations.has('item1')).toBe(true);
      expect(progressTracker.metrics.completedItems).toBe(1);
      expect(progressTracker.metrics.inProgressItems).toBe(0);
    });

    test('should track item failed', () => {
      progressTracker.itemStarted('item1', { name: 'Test Item 1' });
      progressTracker.itemFailed('item1', {
        name: 'Test Item 1',
        error: 'Test error',
      });

      expect(progressTracker.itemStates.get('item1')).toBe('failed');
      expect(progressTracker.itemEndTimes.has('item1')).toBe(true);
      expect(progressTracker.itemDurations.has('item1')).toBe(true);
      expect(progressTracker.metrics.failedItems).toBe(1);
      expect(progressTracker.metrics.inProgressItems).toBe(0);
    });

    test('should track item blocked', () => {
      progressTracker.itemBlocked('item2', {
        name: 'Test Item 2',
        reason: 'Depends on failed item1',
      });

      expect(progressTracker.itemStates.get('item2')).toBe('blocked');
      expect(progressTracker.metrics.blockedItems).toBe(1);
      expect(progressTracker.metrics.pendingItems).toBe(4);
    });

    test('should track item retry', () => {
      progressTracker.itemRetry('item1', {
        name: 'Test Item 1',
        attempt: 1,
        maxRetries: 3,
      });

      // Retry doesn't change state, just adds timeline entry
      const timeline = progressTracker.getTimeline({
        eventType: ProgressEventType.ITEM_RETRY,
      });
      expect(timeline.length).toBe(1);
      expect(timeline[0].itemId).toBe('item1');
    });

    test('should calculate item duration', async () => {
      progressTracker.itemStarted('item1', { name: 'Test Item 1' });

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 50));

      progressTracker.itemCompleted('item1', { name: 'Test Item 1' });

      const duration = progressTracker.itemDurations.get('item1');
      expect(duration).toBeGreaterThan(40);
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Wave Progress Tracking', () => {
    beforeEach(async () => {
      await progressTracker.initialize({
        totalItems: 6,
        totalWaves: 3,
      });
    });

    test('should track wave started', () => {
      progressTracker.waveStarted(0, {
        itemsInWave: 2,
      });

      expect(progressTracker.currentWave).toBe(0);
      const timeline = progressTracker.getTimeline({
        eventType: ProgressEventType.WAVE_STARTED,
      });
      expect(timeline.length).toBe(1);
      expect(timeline[0].waveIndex).toBe(0);
    });

    test('should track wave completed', () => {
      progressTracker.waveStarted(0, { itemsInWave: 2 });
      progressTracker.waveCompleted(0, {
        completedItems: 2,
        failedItems: 0,
      });

      expect(progressTracker.metrics.completedWaves).toBe(1);
      const timeline = progressTracker.getTimeline({
        eventType: ProgressEventType.WAVE_COMPLETED,
      });
      expect(timeline.length).toBe(1);
    });

    test('should track multiple waves', () => {
      progressTracker.waveStarted(0, { itemsInWave: 2 });
      progressTracker.waveCompleted(0, {});
      progressTracker.waveStarted(1, { itemsInWave: 2 });
      progressTracker.waveCompleted(1, {});
      progressTracker.waveStarted(2, { itemsInWave: 2 });
      progressTracker.waveCompleted(2, {});

      expect(progressTracker.metrics.completedWaves).toBe(3);
      expect(progressTracker.currentWave).toBe(2);
    });
  });

  describe('Progress Snapshots', () => {
    beforeEach(async () => {
      await progressTracker.initialize({
        totalItems: 10,
        totalWaves: 2,
      });
    });

    test('should record progress snapshots', () => {
      progressTracker.itemStarted('item1', { name: 'Item 1' });
      progressTracker.itemCompleted('item1', { name: 'Item 1' });

      // Should have initial + at least one progress snapshot
      expect(progressTracker.snapshots.length).toBeGreaterThanOrEqual(1);
    });

    test('should calculate progress percentage', () => {
      progressTracker.itemStarted('item1', { name: 'Item 1' });
      progressTracker.itemCompleted('item1', { name: 'Item 1' });
      progressTracker.itemStarted('item2', { name: 'Item 2' });
      progressTracker.itemCompleted('item2', { name: 'Item 2' });

      const snapshot = progressTracker.getSnapshot();
      expect(snapshot.progressPercent).toBe(20); // 2/10 = 20%
    });

    test('should calculate rate metrics', async () => {
      progressTracker.itemStarted('item1', { name: 'Item 1' });
      await new Promise(resolve => setTimeout(resolve, 100));
      progressTracker.itemCompleted('item1', { name: 'Item 1' });

      const snapshot = progressTracker.getSnapshot();
      expect(snapshot.itemsPerSecond).toBeGreaterThan(0);
      expect(snapshot.averageItemDuration).toBeGreaterThan(0);
    });

    test('should estimate completion time', async () => {
      // Complete some items to establish baseline
      for (let i = 0; i < 3; i++) {
        progressTracker.itemStarted(`item${i}`, { name: `Item ${i}` });
        await new Promise(resolve => setTimeout(resolve, 10));
        progressTracker.itemCompleted(`item${i}`, { name: `Item ${i}` });
      }

      const snapshot = progressTracker.getSnapshot();
      expect(snapshot.estimatedCompletion).toBeTruthy();
      expect(snapshot.estimatedCompletion).toBeGreaterThan(Date.now());
    });

    test('should limit snapshot history', async () => {
      const tracker = new ProgressTracker({
        maxHistoryEntries: 3,
        updateInterval: 1,
      });

      await tracker.initialize({ totalItems: 10 });

      // Generate many snapshots
      for (let i = 0; i < 10; i++) {
        tracker.itemStarted(`item${i}`, { name: `Item ${i}` });
        tracker.itemCompleted(`item${i}`, { name: `Item ${i}` });
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      // Should be limited to maxHistoryEntries
      expect(tracker.snapshots.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Timeline Tracking', () => {
    beforeEach(async () => {
      await progressTracker.initialize({
        totalItems: 5,
        totalWaves: 2,
      });
    });

    test('should record timeline entries', () => {
      progressTracker.itemStarted('item1', { name: 'Item 1' });
      progressTracker.itemCompleted('item1', { name: 'Item 1' });

      expect(progressTracker.timeline.length).toBeGreaterThanOrEqual(3); // Started + item events
    });

    test('should filter timeline by event type', () => {
      progressTracker.itemStarted('item1', { name: 'Item 1' });
      progressTracker.itemCompleted('item1', { name: 'Item 1' });
      progressTracker.itemStarted('item2', { name: 'Item 2' });
      progressTracker.itemFailed('item2', { name: 'Item 2', error: 'Test error' });

      const completedEntries = progressTracker.getTimeline({
        eventType: ProgressEventType.ITEM_COMPLETED,
      });
      expect(completedEntries.length).toBe(1);

      const failedEntries = progressTracker.getTimeline({
        eventType: ProgressEventType.ITEM_FAILED,
      });
      expect(failedEntries.length).toBe(1);
    });

    test('should filter timeline by item ID', () => {
      progressTracker.itemStarted('item1', { name: 'Item 1' });
      progressTracker.itemCompleted('item1', { name: 'Item 1' });
      progressTracker.itemStarted('item2', { name: 'Item 2' });
      progressTracker.itemCompleted('item2', { name: 'Item 2' });

      const item1Entries = progressTracker.getTimeline({
        itemId: 'item1',
      });
      expect(item1Entries.length).toBe(2); // started + completed
    });

    test('should limit timeline results', () => {
      for (let i = 0; i < 10; i++) {
        progressTracker.itemStarted(`item${i}`, { name: `Item ${i}` });
      }

      const limitedEntries = progressTracker.getTimeline({
        limit: 5,
      });
      expect(limitedEntries.length).toBe(5);
    });

    test('should emit timeline events', (done) => {
      progressTracker.on('timeline', (entry) => {
        expect(entry).toBeInstanceOf(TimelineEntry);
        expect(entry.eventType).toBe(ProgressEventType.ITEM_STARTED);
        expect(entry.itemId).toBe('item1');
        done();
      });

      progressTracker.itemStarted('item1', { name: 'Item 1' });
    });
  });

  describe('Progress Events and Subscriptions', () => {
    beforeEach(async () => {
      await progressTracker.initialize({
        totalItems: 5,
        totalWaves: 2,
      });
    });

    test('should emit progress events', (done) => {
      progressTracker.on('progress', (snapshot) => {
        expect(snapshot).toBeInstanceOf(ProgressSnapshot);
        expect(snapshot.completedItems).toBe(1);
        done();
      });

      progressTracker.itemStarted('item1', { name: 'Item 1' });
      progressTracker.itemCompleted('item1', { name: 'Item 1' });
    });

    test('should support subscriptions', (done) => {
      const unsubscribe = progressTracker.subscribe((snapshot) => {
        expect(snapshot.completedItems).toBe(1);
        unsubscribe();
        done();
      });

      progressTracker.itemStarted('item1', { name: 'Item 1' });
      progressTracker.itemCompleted('item1', { name: 'Item 1' });
    });

    test('should throttle progress updates', async () => {
      const tracker = new ProgressTracker({
        updateInterval: 50,
      });

      await tracker.initialize({ totalItems: 10 });

      let updateCount = 0;
      tracker.on('progress', () => {
        updateCount++;
      });

      // Complete many items quickly
      for (let i = 0; i < 10; i++) {
        tracker.itemStarted(`item${i}`, { name: `Item ${i}` });
        tracker.itemCompleted(`item${i}`, { name: `Item ${i}` });
      }

      // Wait for throttle
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have fewer updates than items due to throttling
      expect(updateCount).toBeLessThan(10);
      expect(updateCount).toBeGreaterThan(0);
    });

    test('should handle subscriber errors gracefully', () => {
      progressTracker.subscribe(() => {
        throw new Error('Subscriber error');
      });

      // Should not throw
      expect(() => {
        progressTracker.itemStarted('item1', { name: 'Item 1' });
        progressTracker.itemCompleted('item1', { name: 'Item 1' });
      }).not.toThrow();
    });
  });

  describe('Progress Completion', () => {
    beforeEach(async () => {
      await progressTracker.initialize({
        totalItems: 3,
        totalWaves: 1,
      });
    });

    test('should mark execution as completed', async () => {
      progressTracker.itemStarted('item1', { name: 'Item 1' });
      progressTracker.itemCompleted('item1', { name: 'Item 1' });

      await progressTracker.complete({
        totalItems: 3,
        completedItems: 1,
      });

      expect(progressTracker.endTime).toBeTruthy();
      const completedEntry = progressTracker.timeline.find(
        e => e.eventType === ProgressEventType.EXECUTION_COMPLETED
      );
      expect(completedEntry).toBeTruthy();
    });

    test('should mark execution as failed', async () => {
      progressTracker.itemStarted('item1', { name: 'Item 1' });
      progressTracker.itemFailed('item1', { name: 'Item 1', error: 'Test error' });

      await progressTracker.fail({
        error: 'Execution failed',
        completedItems: 0,
        failedItems: 1,
      });

      expect(progressTracker.endTime).toBeTruthy();
      const failedEntry = progressTracker.timeline.find(
        e => e.eventType === ProgressEventType.EXECUTION_FAILED
      );
      expect(failedEntry).toBeTruthy();
    });
  });

  describe('Progress Formatting', () => {
    beforeEach(async () => {
      await progressTracker.initialize({
        totalItems: 5,
        totalWaves: 2,
      });
    });

    test('should format progress as text', () => {
      progressTracker.itemStarted('item1', { name: 'Item 1' });
      progressTracker.itemCompleted('item1', { name: 'Item 1' });

      const text = progressTracker.formatText();
      expect(text).toContain('Execution Progress');
      expect(text).toContain('Total: 5');
      expect(text).toContain('Completed: 1');
    });

    test('should format progress as JSON', () => {
      progressTracker.itemStarted('item1', { name: 'Item 1' });
      progressTracker.itemCompleted('item1', { name: 'Item 1' });

      const json = progressTracker.formatJSON();
      const data = JSON.parse(json);

      expect(data.snapshot).toBeDefined();
      expect(data.snapshot.completedItems).toBe(1);
    });

    test('should include timeline in JSON', () => {
      progressTracker.itemStarted('item1', { name: 'Item 1' });
      progressTracker.itemCompleted('item1', { name: 'Item 1' });

      const json = progressTracker.formatJSON({ includeTimeline: true });
      const data = JSON.parse(json);

      expect(data.timeline).toBeDefined();
      expect(Array.isArray(data.timeline)).toBe(true);
      expect(data.timeline.length).toBeGreaterThan(0);
    });

    test('should include history in JSON', () => {
      progressTracker.itemStarted('item1', { name: 'Item 1' });
      progressTracker.itemCompleted('item1', { name: 'Item 1' });

      const json = progressTracker.formatJSON({ includeHistory: true });
      const data = JSON.parse(json);

      expect(data.history).toBeDefined();
      expect(Array.isArray(data.history)).toBe(true);
    });
  });

  describe('Progress Persistence', () => {
    let persistentTracker;

    beforeEach(() => {
      persistentTracker = new ProgressTracker({
        enablePersistence: true,
        persistenceDirectory: testDir,
      });
    });

    test('should persist progress to disk', async () => {
      await persistentTracker.initialize({
        totalItems: 3,
        totalWaves: 1,
      });

      persistentTracker.itemStarted('item1', { name: 'Item 1' });
      persistentTracker.itemCompleted('item1', { name: 'Item 1' });

      const filepath = await persistentTracker.persist();
      expect(filepath).toBeTruthy();

      const exists = await fs.access(filepath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    test('should load persisted progress', async () => {
      await persistentTracker.initialize({
        executionId: 'test-exec-123',
        totalItems: 3,
      });

      persistentTracker.itemStarted('item1', { name: 'Item 1' });
      persistentTracker.itemCompleted('item1', { name: 'Item 1' });

      await persistentTracker.persist();

      const loaded = await persistentTracker.load('test-exec-123');
      expect(loaded.executionId).toBe('test-exec-123');
      expect(loaded.snapshot.completedItems).toBe(1);
    });

    test('should list persisted progress files', async () => {
      await persistentTracker.initialize({
        executionId: 'test-exec-1',
        totalItems: 3,
      });
      await persistentTracker.persist();

      const tracker2 = new ProgressTracker({
        enablePersistence: true,
        persistenceDirectory: testDir,
      });
      await tracker2.initialize({
        executionId: 'test-exec-2',
        totalItems: 3,
      });
      await tracker2.persist();

      const list = await persistentTracker.list();
      expect(list).toContain('test-exec-1');
      expect(list).toContain('test-exec-2');
    });

    test('should cleanup old progress files', async () => {
      await persistentTracker.initialize({
        executionId: 'test-exec-old',
        totalItems: 3,
      });
      const filepath = await persistentTracker.persist();

      // Touch the file to make it old
      const oldTime = Date.now() - (8 * 24 * 60 * 60 * 1000); // 8 days ago
      await fs.utimes(filepath, new Date(oldTime), new Date(oldTime));

      const deletedCount = await persistentTracker.cleanup({
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      expect(deletedCount).toBe(1);
    });

    test('should handle persistence errors gracefully', async () => {
      const badTracker = new ProgressTracker({
        enablePersistence: true,
        persistenceDirectory: testDir,
      });

      await badTracker.initialize({ totalItems: 3 });

      // Mock fs.writeFile to fail
      const originalWriteFile = fs.writeFile;
      fs.writeFile = jest.fn().mockRejectedValue(new Error('Mock write error'));

      // Should not throw
      const filepath = await badTracker.persist();
      expect(filepath).toBeNull();

      // Restore original
      fs.writeFile = originalWriteFile;
    });
  });

  describe('Data Model Classes', () => {
    test('ProgressSnapshot should serialize to JSON', () => {
      const snapshot = new ProgressSnapshot({
        executionId: 'test-123',
        totalItems: 10,
        completedItems: 5,
        progressPercent: 50,
      });

      const json = snapshot.toJSON();
      expect(json.executionId).toBe('test-123');
      expect(json.totalItems).toBe(10);
      expect(json.completedItems).toBe(5);
      expect(json.progressPercent).toBe(50);
    });

    test('TimelineEntry should serialize to JSON', () => {
      const entry = new TimelineEntry({
        eventType: ProgressEventType.ITEM_COMPLETED,
        itemId: 'item1',
        itemName: 'Test Item 1',
        message: 'Item completed',
      });

      const json = entry.toJSON();
      expect(json.eventType).toBe(ProgressEventType.ITEM_COMPLETED);
      expect(json.itemId).toBe('item1');
      expect(json.itemName).toBe('Test Item 1');
    });
  });

  describe('Hierarchical Progress Tracking', () => {
    beforeEach(async () => {
      await progressTracker.initialize({
        totalItems: 10,
        totalWaves: 2,
      });
    });

    test('should register work item hierarchy', () => {
      progressTracker.registerHierarchy('parent1', {
        metadata: { name: 'Parent 1' },
      });

      progressTracker.registerHierarchy('child1', {
        parent: 'parent1',
        metadata: { name: 'Child 1' },
      });

      const parentHierarchy = progressTracker.itemHierarchy.get('parent1');
      expect(parentHierarchy).toBeDefined();
      expect(parentHierarchy.children).toContain('child1');

      const childHierarchy = progressTracker.itemHierarchy.get('child1');
      expect(childHierarchy).toBeDefined();
      expect(childHierarchy.parent).toBe('parent1');
    });

    test('should initialize item progress', () => {
      progressTracker.registerHierarchy('item1');

      const progress = progressTracker.itemProgress.get('item1');
      expect(progress).toBeDefined();
      expect(progress.total).toBe(0);
      expect(progress.completed).toBe(0);
      expect(progress.inProgress).toBe(0);
      expect(progress.failed).toBe(0);
      expect(progress.blocked).toBe(0);
      expect(progress.pending).toBe(0);
      expect(progress.percent).toBe(0);
    });

    test('should update item progress on state transitions', () => {
      progressTracker.registerHierarchy('task1');

      progressTracker.itemStarted('task1', { name: 'Task 1' });
      let progress = progressTracker.itemProgress.get('task1');
      expect(progress.total).toBe(1);
      expect(progress.inProgress).toBe(1);

      progressTracker.itemCompleted('task1', { name: 'Task 1' });
      progress = progressTracker.itemProgress.get('task1');
      expect(progress.completed).toBe(1);
      expect(progress.inProgress).toBe(0);
      expect(progress.percent).toBe(100);
    });

    test('should rollup progress from children to parent', () => {
      progressTracker.registerHierarchy('story1', {
        metadata: { name: 'Story 1' },
      });

      progressTracker.registerHierarchy('task1', {
        parent: 'story1',
        metadata: { name: 'Task 1' },
      });

      progressTracker.registerHierarchy('task2', {
        parent: 'story1',
        metadata: { name: 'Task 2' },
      });

      progressTracker.registerHierarchy('task3', {
        parent: 'story1',
        metadata: { name: 'Task 3' },
      });

      // Complete task1
      progressTracker.itemStarted('task1', { name: 'Task 1' });
      progressTracker.itemCompleted('task1', { name: 'Task 1' });

      // Check parent progress (1 out of 3 tasks completed)
      let parentProgress = progressTracker.itemProgress.get('story1');
      expect(parentProgress.total).toBe(1);
      expect(parentProgress.completed).toBe(1);
      expect(parentProgress.percent).toBe(100);

      // Start task2
      progressTracker.itemStarted('task2', { name: 'Task 2' });

      parentProgress = progressTracker.itemProgress.get('story1');
      expect(parentProgress.total).toBe(2);
      expect(parentProgress.inProgress).toBe(1);
      expect(parentProgress.completed).toBe(1);
      expect(parentProgress.percent).toBe(50);

      // Complete task2 and task3
      progressTracker.itemCompleted('task2', { name: 'Task 2' });
      progressTracker.itemStarted('task3', { name: 'Task 3' });
      progressTracker.itemCompleted('task3', { name: 'Task 3' });

      parentProgress = progressTracker.itemProgress.get('story1');
      expect(parentProgress.total).toBe(3);
      expect(parentProgress.completed).toBe(3);
      expect(parentProgress.inProgress).toBe(0);
      expect(parentProgress.percent).toBe(100);
    });

    test('should support multi-level hierarchy rollup', () => {
      // Feature -> Story -> Tasks
      progressTracker.registerHierarchy('feature1');
      progressTracker.registerHierarchy('story1', { parent: 'feature1' });
      progressTracker.registerHierarchy('story2', { parent: 'feature1' });
      progressTracker.registerHierarchy('task1', { parent: 'story1' });
      progressTracker.registerHierarchy('task2', { parent: 'story1' });
      progressTracker.registerHierarchy('task3', { parent: 'story2' });
      progressTracker.registerHierarchy('task4', { parent: 'story2' });

      // Complete tasks in story1
      progressTracker.itemStarted('task1', { name: 'Task 1' });
      progressTracker.itemCompleted('task1', { name: 'Task 1' });
      progressTracker.itemStarted('task2', { name: 'Task 2' });
      progressTracker.itemCompleted('task2', { name: 'Task 2' });

      // Check story1 progress
      let story1Progress = progressTracker.itemProgress.get('story1');
      expect(story1Progress.completed).toBe(2);
      expect(story1Progress.percent).toBe(100);

      // Check feature1 progress (only story1 tasks completed)
      let feature1Progress = progressTracker.itemProgress.get('feature1');
      expect(feature1Progress.total).toBe(2);
      expect(feature1Progress.completed).toBe(2);
      expect(feature1Progress.percent).toBe(100);

      // Start task3 in story2
      progressTracker.itemStarted('task3', { name: 'Task 3' });

      // Check feature1 progress (2 completed, 1 in progress)
      feature1Progress = progressTracker.itemProgress.get('feature1');
      expect(feature1Progress.total).toBe(3);
      expect(feature1Progress.completed).toBe(2);
      expect(feature1Progress.inProgress).toBe(1);
      expect(feature1Progress.percent).toBeCloseTo(66.67, 1);

      // Complete remaining tasks
      progressTracker.itemCompleted('task3', { name: 'Task 3' });
      progressTracker.itemStarted('task4', { name: 'Task 4' });
      progressTracker.itemCompleted('task4', { name: 'Task 4' });

      // Check final feature1 progress
      feature1Progress = progressTracker.itemProgress.get('feature1');
      expect(feature1Progress.total).toBe(4);
      expect(feature1Progress.completed).toBe(4);
      expect(feature1Progress.percent).toBe(100);
    });

    test('should handle failed items in hierarchy', () => {
      progressTracker.registerHierarchy('story1');
      progressTracker.registerHierarchy('task1', { parent: 'story1' });
      progressTracker.registerHierarchy('task2', { parent: 'story1' });

      progressTracker.itemStarted('task1', { name: 'Task 1' });
      progressTracker.itemFailed('task1', { name: 'Task 1', error: 'Test error' });

      progressTracker.itemStarted('task2', { name: 'Task 2' });
      progressTracker.itemCompleted('task2', { name: 'Task 2' });

      const parentProgress = progressTracker.itemProgress.get('story1');
      expect(parentProgress.total).toBe(2);
      expect(parentProgress.completed).toBe(1);
      expect(parentProgress.failed).toBe(1);
      expect(parentProgress.percent).toBe(50);
    });

    test('should handle blocked items in hierarchy', () => {
      progressTracker.registerHierarchy('story1');
      progressTracker.registerHierarchy('task1', { parent: 'story1' });
      progressTracker.registerHierarchy('task2', { parent: 'story1' });
      progressTracker.registerHierarchy('task3', { parent: 'story1' });

      progressTracker.itemStarted('task1', { name: 'Task 1' });
      progressTracker.itemCompleted('task1', { name: 'Task 1' });

      progressTracker.itemBlocked('task2', {
        name: 'Task 2',
        reason: 'Depends on failed item',
      });

      progressTracker.itemBlocked('task3', {
        name: 'Task 3',
        reason: 'Depends on failed item',
      });

      const parentProgress = progressTracker.itemProgress.get('story1');
      expect(parentProgress.total).toBe(3);
      expect(parentProgress.completed).toBe(1);
      expect(parentProgress.blocked).toBe(2);
      expect(parentProgress.percent).toBeCloseTo(33.33, 1);
    });

    test('should get progress for specific work item', () => {
      progressTracker.registerHierarchy('feature1');
      progressTracker.registerHierarchy('story1', {
        parent: 'feature1',
        metadata: { type: 'Story', title: 'User Authentication' },
      });
      progressTracker.registerHierarchy('task1', { parent: 'story1' });

      progressTracker.itemStarted('task1', { name: 'Task 1' });
      progressTracker.itemCompleted('task1', { name: 'Task 1' });

      const story1Progress = progressTracker.getProgress('story1');

      expect(story1Progress).toBeDefined();
      expect(story1Progress.itemId).toBe('story1');
      expect(story1Progress.state).toBe('unknown');
      expect(story1Progress.parent).toBe('feature1');
      expect(story1Progress.children).toContain('task1');
      expect(story1Progress.progress.total).toBe(1);
      expect(story1Progress.progress.completed).toBe(1);
      expect(story1Progress.progress.percent).toBe(100);
      expect(story1Progress.metadata.type).toBe('Story');
      expect(story1Progress.metadata.title).toBe('User Authentication');
    });

    test('should return null for non-existent work item', () => {
      const progress = progressTracker.getProgress('non-existent-item');
      expect(progress).toBeNull();
    });

    test('should handle complex hierarchy with mixed states', () => {
      // Epic -> Features -> Stories -> Tasks
      progressTracker.registerHierarchy('epic1');
      progressTracker.registerHierarchy('feature1', { parent: 'epic1' });
      progressTracker.registerHierarchy('feature2', { parent: 'epic1' });

      progressTracker.registerHierarchy('story1', { parent: 'feature1' });
      progressTracker.registerHierarchy('story2', { parent: 'feature1' });
      progressTracker.registerHierarchy('story3', { parent: 'feature2' });

      progressTracker.registerHierarchy('task1', { parent: 'story1' });
      progressTracker.registerHierarchy('task2', { parent: 'story1' });
      progressTracker.registerHierarchy('task3', { parent: 'story2' });
      progressTracker.registerHierarchy('task4', { parent: 'story2' });
      progressTracker.registerHierarchy('task5', { parent: 'story3' });
      progressTracker.registerHierarchy('task6', { parent: 'story3' });

      // Complete story1 tasks
      progressTracker.itemStarted('task1', { name: 'Task 1' });
      progressTracker.itemCompleted('task1', { name: 'Task 1' });
      progressTracker.itemStarted('task2', { name: 'Task 2' });
      progressTracker.itemCompleted('task2', { name: 'Task 2' });

      // Fail task3, block task4
      progressTracker.itemStarted('task3', { name: 'Task 3' });
      progressTracker.itemFailed('task3', { name: 'Task 3', error: 'Test error' });
      progressTracker.itemBlocked('task4', { name: 'Task 4', reason: 'Depends on task3' });

      // In progress task5
      progressTracker.itemStarted('task5', { name: 'Task 5' });

      // Epic progress should reflect all descendant states
      const epicProgress = progressTracker.getProgress('epic1');
      expect(epicProgress.progress.total).toBe(5);
      expect(epicProgress.progress.completed).toBe(2); // task1, task2
      expect(epicProgress.progress.failed).toBe(1); // task3
      expect(epicProgress.progress.blocked).toBe(1); // task4
      expect(epicProgress.progress.inProgress).toBe(1); // task5
    });

    test('should calculate accurate percentages at all levels', () => {
      progressTracker.registerHierarchy('parent1');

      for (let i = 1; i <= 10; i++) {
        progressTracker.registerHierarchy(`task${i}`, { parent: 'parent1' });
      }

      // Complete 5 tasks
      for (let i = 1; i <= 5; i++) {
        progressTracker.itemStarted(`task${i}`, { name: `Task ${i}` });
        progressTracker.itemCompleted(`task${i}`, { name: `Task ${i}` });
      }

      const parentProgress = progressTracker.getProgress('parent1');
      expect(parentProgress.progress.total).toBe(5);
      expect(parentProgress.progress.completed).toBe(5);
      expect(parentProgress.progress.percent).toBe(100);

      // Start 3 more tasks
      for (let i = 6; i <= 8; i++) {
        progressTracker.itemStarted(`task${i}`, { name: `Task ${i}` });
      }

      const updatedProgress = progressTracker.getProgress('parent1');
      expect(updatedProgress.progress.total).toBe(8);
      expect(updatedProgress.progress.completed).toBe(5);
      expect(updatedProgress.progress.inProgress).toBe(3);
      expect(updatedProgress.progress.percent).toBe(62.5);
    });

    test('should support querying progress at any level of hierarchy', () => {
      progressTracker.registerHierarchy('level1');
      progressTracker.registerHierarchy('level2', { parent: 'level1' });
      progressTracker.registerHierarchy('level3', { parent: 'level2' });
      progressTracker.registerHierarchy('level4', { parent: 'level3' });
      progressTracker.registerHierarchy('task1', { parent: 'level4' });

      progressTracker.itemStarted('task1', { name: 'Task 1' });
      progressTracker.itemCompleted('task1', { name: 'Task 1' });

      // Should be able to query progress at any level
      const level1Progress = progressTracker.getProgress('level1');
      const level2Progress = progressTracker.getProgress('level2');
      const level3Progress = progressTracker.getProgress('level3');
      const level4Progress = progressTracker.getProgress('level4');
      const taskProgress = progressTracker.getProgress('task1');

      expect(level1Progress.progress.completed).toBe(1);
      expect(level2Progress.progress.completed).toBe(1);
      expect(level3Progress.progress.completed).toBe(1);
      expect(level4Progress.progress.completed).toBe(1);
      expect(taskProgress.progress.completed).toBe(1);

      // All should show 100% completion
      expect(level1Progress.progress.percent).toBe(100);
      expect(level2Progress.progress.percent).toBe(100);
      expect(level3Progress.progress.percent).toBe(100);
      expect(level4Progress.progress.percent).toBe(100);
      expect(taskProgress.progress.percent).toBe(100);
    });

    test('should track timing information for hierarchical items', async () => {
      progressTracker.registerHierarchy('story1');
      progressTracker.registerHierarchy('task1', { parent: 'story1' });

      progressTracker.itemStarted('task1', { name: 'Task 1' });
      await new Promise(resolve => setTimeout(resolve, 10));
      progressTracker.itemCompleted('task1', { name: 'Task 1' });

      const taskProgress = progressTracker.getProgress('task1');
      expect(taskProgress.timing.startTime).toBeDefined();
      expect(taskProgress.timing.endTime).toBeDefined();
      expect(taskProgress.timing.duration).toBeGreaterThan(0);
    });

    test('should handle empty hierarchy gracefully', () => {
      progressTracker.registerHierarchy('empty-parent');

      const progress = progressTracker.getProgress('empty-parent');
      expect(progress).toBeDefined();
      expect(progress.progress.total).toBe(0);
      expect(progress.progress.completed).toBe(0);
      expect(progress.progress.percent).toBe(0);
      expect(progress.children).toEqual([]);
    });
  });
});
