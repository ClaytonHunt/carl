/**
 * Progress Tracker
 *
 * Comprehensive progress tracking system for async orchestration.
 * Tracks execution progress at multiple levels (item, wave, overall)
 * and provides real-time updates, streaming, and history.
 *
 * Features:
 * - Real-time progress event emission
 * - Hierarchical progress tracking (item -> wave -> execution)
 * - Progress aggregation and rollup
 * - Timeline visualization data
 * - Progress persistence and history
 * - Configurable update intervals
 * - Multiple output formats
 *
 * Based on IndyDevDan's principles:
 * - Observable by default
 * - Event-driven coordination
 * - Minimal performance overhead
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

// Progress event types
const ProgressEventType = {
  EXECUTION_STARTED: 'execution:started',
  EXECUTION_PROGRESS: 'execution:progress',
  EXECUTION_COMPLETED: 'execution:completed',
  EXECUTION_FAILED: 'execution:failed',
  WAVE_STARTED: 'wave:started',
  WAVE_PROGRESS: 'wave:progress',
  WAVE_COMPLETED: 'wave:completed',
  ITEM_STARTED: 'item:started',
  ITEM_PROGRESS: 'item:progress',
  ITEM_COMPLETED: 'item:completed',
  ITEM_FAILED: 'item:failed',
  ITEM_BLOCKED: 'item:blocked',
  ITEM_RETRY: 'item:retry',
};

// Progress snapshot structure
class ProgressSnapshot {
  constructor(data = {}) {
    this.timestamp = data.timestamp || Date.now();
    this.executionId = data.executionId || null;

    // Overall metrics
    this.totalItems = data.totalItems || 0;
    this.completedItems = data.completedItems || 0;
    this.failedItems = data.failedItems || 0;
    this.blockedItems = data.blockedItems || 0;
    this.skippedItems = data.skippedItems || 0;
    this.inProgressItems = data.inProgressItems || 0;
    this.pendingItems = data.pendingItems || 0;

    // Wave metrics
    this.totalWaves = data.totalWaves || 0;
    this.completedWaves = data.completedWaves || 0;
    this.currentWave = data.currentWave ?? -1;

    // Timing metrics
    this.startTime = data.startTime || null;
    this.endTime = data.endTime || null;
    this.duration = data.duration || 0;
    this.estimatedCompletion = data.estimatedCompletion || null;

    // Progress percentage (0-100)
    this.progressPercent = data.progressPercent || 0;

    // Rate metrics
    this.itemsPerSecond = data.itemsPerSecond || 0;
    this.averageItemDuration = data.averageItemDuration || 0;

    // Status
    this.status = data.status || 'pending'; // pending, executing, completed, failed, cancelled
  }

  toJSON() {
    return { ...this };
  }
}

// Timeline entry structure
class TimelineEntry {
  constructor(data = {}) {
    this.timestamp = data.timestamp || Date.now();
    this.eventType = data.eventType || '';
    this.itemId = data.itemId || null;
    this.itemName = data.itemName || null;
    this.waveIndex = data.waveIndex ?? -1;
    this.message = data.message || '';
    this.metadata = data.metadata || {};
  }

  toJSON() {
    return { ...this };
  }
}

class ProgressTracker extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      updateInterval: 100, // ms - throttle progress updates
      enablePersistence: config.enablePersistence !== undefined ? config.enablePersistence : false,
      persistenceDirectory: config.persistenceDirectory || '.cascade/.progress-history',
      maxHistoryEntries: config.maxHistoryEntries || 1000,
      enableTimeline: config.enableTimeline !== undefined ? config.enableTimeline : true,
      ...config,
    };

    // Current progress state
    this.executionId = null;
    this.startTime = null;
    this.endTime = null;
    this.currentWave = -1;

    // Metrics tracking
    this.metrics = {
      totalItems: 0,
      completedItems: 0,
      failedItems: 0,
      blockedItems: 0,
      skippedItems: 0,
      inProgressItems: 0,
      pendingItems: 0,
      totalWaves: 0,
      completedWaves: 0,
    };

    // Item-level tracking
    this.itemStates = new Map(); // itemId -> state
    this.itemStartTimes = new Map(); // itemId -> start timestamp
    this.itemEndTimes = new Map(); // itemId -> end timestamp
    this.itemDurations = new Map(); // itemId -> duration (ms)

    // Hierarchical tracking
    this.itemHierarchy = new Map(); // itemId -> { parent, children: [], metadata }
    this.itemProgress = new Map(); // itemId -> { total, completed, inProgress, failed, blocked, pending, percent }

    // Timeline of events
    this.timeline = [];

    // Progress snapshots history
    this.snapshots = [];

    // Subscribers for streaming updates
    this.subscribers = new Set();

    // Throttle timer for progress updates
    this.updateTimer = null;
    this.pendingUpdate = false;
  }

  /**
   * Initialize progress tracking for an execution
   * @param {Object} options - Initialization options
   * @returns {string} Execution ID
   */
  async initialize(options = {}) {
    this.executionId = options.executionId || `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.startTime = Date.now();
    this.endTime = null;
    this.currentWave = -1;

    this.metrics = {
      totalItems: options.totalItems || 0,
      completedItems: 0,
      failedItems: 0,
      blockedItems: 0,
      skippedItems: 0,
      inProgressItems: 0,
      pendingItems: options.totalItems || 0,
      totalWaves: options.totalWaves || 0,
      completedWaves: 0,
    };

    this.itemStates.clear();
    this.itemStartTimes.clear();
    this.itemEndTimes.clear();
    this.itemDurations.clear();
    this.timeline = [];
    this.snapshots = [];

    // Record initial snapshot
    this.recordSnapshot('pending');

    // Add timeline entry
    this.addTimelineEntry({
      eventType: ProgressEventType.EXECUTION_STARTED,
      message: 'Execution started',
      metadata: {
        totalItems: this.metrics.totalItems,
        totalWaves: this.metrics.totalWaves,
      },
    });

    return this.executionId;
  }

  /**
   * Record item started
   * @param {string} itemId - Item ID
   * @param {Object} metadata - Additional metadata
   */
  itemStarted(itemId, metadata = {}) {
    this.itemStates.set(itemId, 'executing');
    this.itemStartTimes.set(itemId, Date.now());

    this.metrics.inProgressItems++;
    this.metrics.pendingItems = Math.max(0, this.metrics.pendingItems - 1);

    // Update hierarchical progress
    this._updateItemProgress(itemId, {
      total: 1,
      pending: -1,
      inProgress: 1,
    });

    this.addTimelineEntry({
      eventType: ProgressEventType.ITEM_STARTED,
      itemId,
      itemName: metadata.name || itemId,
      waveIndex: metadata.wave ?? -1,
      message: `Item started: ${metadata.name || itemId}`,
      metadata,
    });

    this.emitProgress();
  }

  /**
   * Record item completed
   * @param {string} itemId - Item ID
   * @param {Object} metadata - Additional metadata
   */
  itemCompleted(itemId, metadata = {}) {
    const startTime = this.itemStartTimes.get(itemId);
    const endTime = Date.now();
    const duration = startTime ? endTime - startTime : 0;

    this.itemStates.set(itemId, 'completed');
    this.itemEndTimes.set(itemId, endTime);
    this.itemDurations.set(itemId, duration);

    this.metrics.completedItems++;
    this.metrics.inProgressItems = Math.max(0, this.metrics.inProgressItems - 1);

    // Update hierarchical progress
    this._updateItemProgress(itemId, {
      inProgress: -1,
      completed: 1,
    });

    this.addTimelineEntry({
      eventType: ProgressEventType.ITEM_COMPLETED,
      itemId,
      itemName: metadata.name || itemId,
      waveIndex: metadata.wave ?? -1,
      message: `Item completed: ${metadata.name || itemId} (${duration}ms)`,
      metadata: { ...metadata, duration },
    });

    this.emitProgress();
  }

  /**
   * Record item failed
   * @param {string} itemId - Item ID
   * @param {Object} metadata - Additional metadata
   */
  itemFailed(itemId, metadata = {}) {
    const startTime = this.itemStartTimes.get(itemId);
    const endTime = Date.now();
    const duration = startTime ? endTime - startTime : 0;

    this.itemStates.set(itemId, 'failed');
    this.itemEndTimes.set(itemId, endTime);
    this.itemDurations.set(itemId, duration);

    this.metrics.failedItems++;
    this.metrics.inProgressItems = Math.max(0, this.metrics.inProgressItems - 1);

    // Update hierarchical progress
    this._updateItemProgress(itemId, {
      inProgress: -1,
      failed: 1,
    });

    this.addTimelineEntry({
      eventType: ProgressEventType.ITEM_FAILED,
      itemId,
      itemName: metadata.name || itemId,
      waveIndex: metadata.wave ?? -1,
      message: `Item failed: ${metadata.name || itemId} - ${metadata.error || 'Unknown error'}`,
      metadata: { ...metadata, duration },
    });

    this.emitProgress();
  }

  /**
   * Record item blocked
   * @param {string} itemId - Item ID
   * @param {Object} metadata - Additional metadata
   */
  itemBlocked(itemId, metadata = {}) {
    this.itemStates.set(itemId, 'blocked');

    this.metrics.blockedItems++;
    this.metrics.pendingItems = Math.max(0, this.metrics.pendingItems - 1);

    // Update hierarchical progress
    this._updateItemProgress(itemId, {
      total: 1,
      pending: -1,
      blocked: 1,
    });

    this.addTimelineEntry({
      eventType: ProgressEventType.ITEM_BLOCKED,
      itemId,
      itemName: metadata.name || itemId,
      message: `Item blocked: ${metadata.name || itemId} - ${metadata.reason || 'Unknown reason'}`,
      metadata,
    });

    this.emitProgress();
  }

  /**
   * Record item retry
   * @param {string} itemId - Item ID
   * @param {Object} metadata - Additional metadata
   */
  itemRetry(itemId, metadata = {}) {
    this.addTimelineEntry({
      eventType: ProgressEventType.ITEM_RETRY,
      itemId,
      itemName: metadata.name || itemId,
      message: `Item retry: ${metadata.name || itemId} (attempt ${metadata.attempt || 0}/${metadata.maxRetries || 0})`,
      metadata,
    });

    // Don't emit progress update for retries (too noisy)
  }

  /**
   * Record wave started
   * @param {number} waveIndex - Wave index
   * @param {Object} metadata - Additional metadata
   */
  waveStarted(waveIndex, metadata = {}) {
    this.currentWave = waveIndex;

    this.addTimelineEntry({
      eventType: ProgressEventType.WAVE_STARTED,
      waveIndex,
      message: `Wave ${waveIndex + 1}/${this.metrics.totalWaves} started (${metadata.itemsInWave || 0} items)`,
      metadata,
    });

    this.emitProgress();
  }

  /**
   * Record wave completed
   * @param {number} waveIndex - Wave index
   * @param {Object} metadata - Additional metadata
   */
  waveCompleted(waveIndex, metadata = {}) {
    this.metrics.completedWaves++;

    this.addTimelineEntry({
      eventType: ProgressEventType.WAVE_COMPLETED,
      waveIndex,
      message: `Wave ${waveIndex + 1}/${this.metrics.totalWaves} completed`,
      metadata,
    });

    this.emitProgress();
  }

  /**
   * Register work item hierarchy for hierarchical progress tracking
   * @param {string} itemId - Item ID
   * @param {Object} options - Hierarchy options
   * @param {string} [options.parent] - Parent item ID
   * @param {Array<string>} [options.children] - Child item IDs
   * @param {Object} [options.metadata] - Additional metadata
   */
  registerHierarchy(itemId, options = {}) {
    this.itemHierarchy.set(itemId, {
      parent: options.parent || null,
      children: options.children || [],
      metadata: options.metadata || {},
    });

    // Initialize progress tracking for this item
    this._initializeItemProgress(itemId);

    // If this is a child, add it to parent's children list
    if (options.parent) {
      const parentHierarchy = this.itemHierarchy.get(options.parent);
      if (parentHierarchy && !parentHierarchy.children.includes(itemId)) {
        parentHierarchy.children.push(itemId);
      }
    }
  }

  /**
   * Initialize progress tracking for an item
   * @param {string} itemId - Item ID
   * @private
   */
  _initializeItemProgress(itemId) {
    if (!this.itemProgress.has(itemId)) {
      this.itemProgress.set(itemId, {
        total: 0,
        completed: 0,
        inProgress: 0,
        failed: 0,
        blocked: 0,
        pending: 0,
        percent: 0,
      });
    }
  }

  /**
   * Update item progress and propagate to parent
   * @param {string} itemId - Item ID
   * @param {Object} delta - Progress delta
   * @private
   */
  _updateItemProgress(itemId, delta) {
    this._initializeItemProgress(itemId);
    const progress = this.itemProgress.get(itemId);

    // Apply delta
    for (const [key, value] of Object.entries(delta)) {
      if (key !== 'percent') {
        progress[key] = Math.max(0, (progress[key] || 0) + value);
      }
    }

    // Recalculate percentage
    if (progress.total > 0) {
      progress.percent = (progress.completed / progress.total) * 100;
    } else {
      progress.percent = 0;
    }

    // Propagate to parent
    const hierarchy = this.itemHierarchy.get(itemId);
    if (hierarchy && hierarchy.parent) {
      this._rollupProgress(hierarchy.parent);
    }
  }

  /**
   * Rollup progress from children to parent
   * @param {string} parentId - Parent item ID
   * @private
   */
  _rollupProgress(parentId) {
    const hierarchy = this.itemHierarchy.get(parentId);
    if (!hierarchy || hierarchy.children.length === 0) {
      return;
    }

    this._initializeItemProgress(parentId);
    const parentProgress = this.itemProgress.get(parentId);

    // Aggregate from all children
    let total = 0;
    let completed = 0;
    let inProgress = 0;
    let failed = 0;
    let blocked = 0;
    let pending = 0;

    for (const childId of hierarchy.children) {
      const childProgress = this.itemProgress.get(childId);
      if (childProgress) {
        total += childProgress.total;
        completed += childProgress.completed;
        inProgress += childProgress.inProgress;
        failed += childProgress.failed;
        blocked += childProgress.blocked;
        pending += childProgress.pending;
      }
    }

    // Update parent progress
    parentProgress.total = total;
    parentProgress.completed = completed;
    parentProgress.inProgress = inProgress;
    parentProgress.failed = failed;
    parentProgress.blocked = blocked;
    parentProgress.pending = pending;
    parentProgress.percent = total > 0 ? (completed / total) * 100 : 0;

    // Continue propagation up the hierarchy
    const parentHierarchy = this.itemHierarchy.get(parentId);
    if (parentHierarchy && parentHierarchy.parent) {
      this._rollupProgress(parentHierarchy.parent);
    }
  }

  /**
   * Get progress for a specific work item
   * @param {string} itemId - Item ID
   * @returns {Object|null} Progress data or null if not found
   */
  getProgress(itemId) {
    const progress = this.itemProgress.get(itemId);
    if (!progress) {
      return null;
    }

    const hierarchy = this.itemHierarchy.get(itemId);
    const state = this.itemStates.get(itemId);
    const startTime = this.itemStartTimes.get(itemId);
    const endTime = this.itemEndTimes.get(itemId);
    const duration = this.itemDurations.get(itemId);

    return {
      itemId,
      state: state || 'unknown',
      parent: hierarchy?.parent || null,
      children: hierarchy?.children || [],
      progress: { ...progress },
      timing: {
        startTime,
        endTime,
        duration,
      },
      metadata: hierarchy?.metadata || {},
    };
  }

  /**
   * Mark execution as completed
   * @param {Object} metadata - Additional metadata
   */
  async complete(metadata = {}) {
    this.endTime = Date.now();

    this.addTimelineEntry({
      eventType: ProgressEventType.EXECUTION_COMPLETED,
      message: 'Execution completed',
      metadata: {
        duration: this.endTime - this.startTime,
        completedItems: this.metrics.completedItems,
        failedItems: this.metrics.failedItems,
        ...metadata,
      },
    });

    this.recordSnapshot('completed');

    // Persist final state
    if (this.config.enablePersistence) {
      await this.persist();
    }

    this.emitProgressSync();
  }

  /**
   * Mark execution as failed
   * @param {Object} metadata - Additional metadata
   */
  async fail(metadata = {}) {
    this.endTime = Date.now();

    this.addTimelineEntry({
      eventType: ProgressEventType.EXECUTION_FAILED,
      message: `Execution failed: ${metadata.error || 'Unknown error'}`,
      metadata: {
        duration: this.endTime - this.startTime,
        completedItems: this.metrics.completedItems,
        failedItems: this.metrics.failedItems,
        ...metadata,
      },
    });

    this.recordSnapshot('failed');

    // Persist final state
    if (this.config.enablePersistence) {
      await this.persist();
    }

    this.emitProgressSync();
  }

  /**
   * Add timeline entry
   * @param {Object} data - Timeline entry data
   * @private
   */
  addTimelineEntry(data) {
    if (!this.config.enableTimeline) return;

    const entry = new TimelineEntry(data);
    this.timeline.push(entry);

    // Emit timeline event
    this.emit('timeline', entry);
  }

  /**
   * Record progress snapshot
   * @param {string} status - Current status
   * @private
   */
  recordSnapshot(status) {
    const now = Date.now();
    const duration = this.startTime ? now - this.startTime : 0;

    // Calculate progress percentage
    const progressPercent = this.metrics.totalItems > 0
      ? (this.metrics.completedItems / this.metrics.totalItems) * 100
      : 0;

    // Calculate rate metrics
    const durationSeconds = duration / 1000;
    const itemsPerSecond = durationSeconds > 0
      ? this.metrics.completedItems / durationSeconds
      : 0;

    // Calculate average item duration
    const durations = Array.from(this.itemDurations.values());
    const averageItemDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

    // Estimate completion time
    let estimatedCompletion = null;
    if (status === 'executing' && averageItemDuration > 0) {
      const remainingItems = this.metrics.totalItems - this.metrics.completedItems;
      const estimatedRemainingMs = remainingItems * averageItemDuration;
      estimatedCompletion = now + estimatedRemainingMs;
    }

    const snapshot = new ProgressSnapshot({
      timestamp: now,
      executionId: this.executionId,
      ...this.metrics,
      startTime: this.startTime,
      endTime: this.endTime,
      duration,
      progressPercent,
      itemsPerSecond,
      averageItemDuration,
      estimatedCompletion,
      status,
      currentWave: this.currentWave,
    });

    this.snapshots.push(snapshot);

    // Limit snapshot history
    if (this.snapshots.length > this.config.maxHistoryEntries) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  /**
   * Emit progress update (throttled)
   * @private
   */
  emitProgress() {
    // Mark that we have a pending update
    this.pendingUpdate = true;

    // If timer is already running, just wait
    if (this.updateTimer) return;

    // Set timer for throttled update
    this.updateTimer = setTimeout(() => {
      this.updateTimer = null;

      if (this.pendingUpdate) {
        this.emitProgressSync();
        this.pendingUpdate = false;
      }
    }, this.config.updateInterval);
  }

  /**
   * Emit progress update immediately (not throttled)
   * @private
   */
  emitProgressSync() {
    const snapshot = this.recordSnapshot('executing');

    // Emit progress event
    this.emit('progress', snapshot);

    // Notify all subscribers
    for (const subscriber of this.subscribers) {
      try {
        subscriber(snapshot);
      } catch (error) {
        // Ignore subscriber errors
      }
    }
  }

  /**
   * Subscribe to progress updates
   * @param {Function} callback - Callback function (snapshot) => void
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.subscribers.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get current progress snapshot
   * @returns {ProgressSnapshot} Current progress snapshot
   */
  getSnapshot() {
    return this.recordSnapshot(this.endTime ? 'completed' : 'executing');
  }

  /**
   * Get timeline
   * @param {Object} options - Filter options
   * @returns {Array<TimelineEntry>} Timeline entries
   */
  getTimeline(options = {}) {
    let entries = this.timeline;

    // Filter by event type
    if (options.eventType) {
      entries = entries.filter(e => e.eventType === options.eventType);
    }

    // Filter by item ID
    if (options.itemId) {
      entries = entries.filter(e => e.itemId === options.itemId);
    }

    // Filter by time range
    if (options.startTime) {
      entries = entries.filter(e => e.timestamp >= options.startTime);
    }
    if (options.endTime) {
      entries = entries.filter(e => e.timestamp <= options.endTime);
    }

    // Limit results
    if (options.limit) {
      entries = entries.slice(-options.limit);
    }

    return entries;
  }

  /**
   * Get snapshot history
   * @param {Object} options - Filter options
   * @returns {Array<ProgressSnapshot>} Snapshot history
   */
  getHistory(options = {}) {
    let snapshots = this.snapshots;

    // Filter by time range
    if (options.startTime) {
      snapshots = snapshots.filter(s => s.timestamp >= options.startTime);
    }
    if (options.endTime) {
      snapshots = snapshots.filter(s => s.timestamp <= options.endTime);
    }

    // Limit results
    if (options.limit) {
      snapshots = snapshots.slice(-options.limit);
    }

    return snapshots;
  }

  /**
   * Format progress as text
   * @param {Object} options - Formatting options
   * @returns {string} Formatted progress text
   */
  formatText(options = {}) {
    const snapshot = this.getSnapshot();
    const lines = [];

    if (options.includeHeader !== false) {
      lines.push('=== Execution Progress ===');
      lines.push('');
    }

    // Overall progress
    lines.push(`Status: ${snapshot.status}`);
    lines.push(`Progress: ${snapshot.progressPercent.toFixed(1)}%`);
    lines.push('');

    // Item metrics
    lines.push('Items:');
    lines.push(`  Total: ${snapshot.totalItems}`);
    lines.push(`  Completed: ${snapshot.completedItems}`);
    lines.push(`  In Progress: ${snapshot.inProgressItems}`);
    lines.push(`  Failed: ${snapshot.failedItems}`);
    lines.push(`  Blocked: ${snapshot.blockedItems}`);
    lines.push(`  Pending: ${snapshot.pendingItems}`);
    lines.push('');

    // Wave metrics
    if (snapshot.totalWaves > 0) {
      lines.push('Waves:');
      lines.push(`  Total: ${snapshot.totalWaves}`);
      lines.push(`  Completed: ${snapshot.completedWaves}`);
      lines.push(`  Current: ${snapshot.currentWave >= 0 ? snapshot.currentWave + 1 : 'N/A'}`);
      lines.push('');
    }

    // Timing
    lines.push('Timing:');
    lines.push(`  Duration: ${(snapshot.duration / 1000).toFixed(2)}s`);
    lines.push(`  Items/sec: ${snapshot.itemsPerSecond.toFixed(2)}`);
    lines.push(`  Avg item duration: ${snapshot.averageItemDuration.toFixed(0)}ms`);

    if (snapshot.estimatedCompletion && snapshot.status === 'executing') {
      const remaining = snapshot.estimatedCompletion - Date.now();
      lines.push(`  Est. completion: ${(remaining / 1000).toFixed(0)}s`);
    }

    return lines.join('\n');
  }

  /**
   * Format progress as JSON
   * @param {Object} options - Formatting options
   * @returns {string} Formatted progress JSON
   */
  formatJSON(options = {}) {
    const snapshot = this.getSnapshot();

    const data = {
      snapshot: snapshot.toJSON(),
    };

    if (options.includeTimeline) {
      data.timeline = this.timeline.map(e => e.toJSON());
    }

    if (options.includeHistory) {
      data.history = this.snapshots.map(s => s.toJSON());
    }

    return JSON.stringify(data, null, options.pretty ? 2 : 0);
  }

  /**
   * Persist progress to disk
   * @returns {Promise<string>} Path to persisted file
   */
  async persist() {
    if (!this.config.enablePersistence || !this.executionId) {
      return null;
    }

    try {
      const dir = this.config.persistenceDirectory;
      await fs.mkdir(dir, { recursive: true });

      const filename = `${this.executionId}.json`;
      const filepath = path.join(dir, filename);

      const data = {
        executionId: this.executionId,
        snapshot: this.getSnapshot().toJSON(),
        timeline: this.timeline.map(e => e.toJSON()),
        history: this.snapshots.map(s => s.toJSON()),
        persistedAt: Date.now(),
      };

      await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf8');

      return filepath;
    } catch (error) {
      // Fail silently - don't break execution for persistence errors
      console.warn(`Failed to persist progress: ${error.message}`);
      return null;
    }
  }

  /**
   * Load persisted progress
   * @param {string} executionId - Execution ID
   * @returns {Promise<Object>} Loaded progress data
   */
  async load(executionId) {
    try {
      const dir = this.config.persistenceDirectory;
      const filename = `${executionId}.json`;
      const filepath = path.join(dir, filename);

      const data = await fs.readFile(filepath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`Failed to load progress: ${error.message}`);
    }
  }

  /**
   * List all persisted progress files
   * @returns {Promise<Array<string>>} List of execution IDs
   */
  async list() {
    try {
      const dir = this.config.persistenceDirectory;
      const files = await fs.readdir(dir);

      return files
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''));
    } catch (error) {
      return [];
    }
  }

  /**
   * Clear persisted progress files
   * @param {Object} options - Cleanup options
   * @returns {Promise<number>} Number of files deleted
   */
  async cleanup(options = {}) {
    try {
      const dir = this.config.persistenceDirectory;
      const files = await fs.readdir(dir);

      let deletedCount = 0;
      const now = Date.now();
      const maxAge = options.maxAge || (7 * 24 * 60 * 60 * 1000); // 7 days default

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filepath = path.join(dir, file);
        const stats = await fs.stat(filepath);

        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filepath);
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error) {
      console.warn(`Failed to cleanup progress files: ${error.message}`);
      return 0;
    }
  }
}

// Export
module.exports = ProgressTracker;
module.exports.ProgressEventType = ProgressEventType;
module.exports.ProgressSnapshot = ProgressSnapshot;
module.exports.TimelineEntry = TimelineEntry;
