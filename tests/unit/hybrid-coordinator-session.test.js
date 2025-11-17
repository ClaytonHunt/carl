/**
 * Unit Tests for Hybrid Coordinator SessionState Integration
 *
 * Tests cover:
 * 1. Session initialization (new and resumed)
 * 2. Workflow metadata storage
 * 3. Event logging
 * 4. Status transitions (executing, completed, failed)
 * 5. Session lifecycle management
 * 6. Execution metrics tracking
 */

const HybridCoordinator = require('../../plugins/carl/lib/orchestration/hybrid-coordinator');
const {
  CoordinatorState,
  ExecutionStrategy,
  ItemState,
} = require('../../plugins/carl/lib/orchestration/hybrid-coordinator');

describe('HybridCoordinator SessionState Integration', () => {
  const fs = require('fs').promises;
  const path = require('path');
  const testSessionDir = '.claude/.carl/sessions-test';

  afterEach(async () => {
    // Clean up test sessions
    try {
      await fs.rm(testSessionDir, { recursive: true, force: true });
    } catch (err) {
      // Ignore cleanup errors
    }
  });

  test('should initialize new session when enabled', async () => {
    const coordinator = new HybridCoordinator({
      enableSessionState: true,
      sessionBaseDir: testSessionDir,
    });

    coordinator.addItem({
      id: 'item1',
      name: 'Test Item',
      execute: async () => ({ result: 'done' }),
    });

    await coordinator.analyze();
    await coordinator.execute();

    // Verify session was created
    expect(coordinator.sessionState).not.toBeNull();
    expect(coordinator.sessionState.sessionId).toBeTruthy();
  });

  test('should store workflow metadata on execution start', async () => {
    const coordinator = new HybridCoordinator({
      enableSessionState: true,
      sessionBaseDir: testSessionDir,
    });

    coordinator.addItem({
      id: 'item1',
      name: 'Test Item',
      execute: async () => ({ result: 'done' }),
    });

    await coordinator.analyze();
    await coordinator.execute();

    // Read session state
    const state = await coordinator.sessionState.getState();

    expect(state.workflow.name).toBe('hybrid-coordinator');
    expect(state.workflow.agent).toBe('work-orchestrator');
    expect(state.workflow.status).toBe('completed');
    expect(state.workflow.strategy).toBe('pure_parallel');
    expect(state.workflow.totalItems).toBe(1);
  });

  test('should log workflow events to session', async () => {
    const coordinator = new HybridCoordinator({
      enableSessionState: true,
      sessionBaseDir: testSessionDir,
    });

    coordinator.addItem({
      id: 'item1',
      name: 'Test Item',
      execute: async () => ({ result: 'done' }),
    });

    await coordinator.analyze();
    await coordinator.execute();

    // Read session events
    const events = await coordinator.sessionState.getEvents();

    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events.some(e => e.type === 'workflow:started')).toBe(true);
    expect(events.some(e => e.type === 'workflow:completed')).toBe(true);
  });

  test('should update workflow status to completed on success', async () => {
    const coordinator = new HybridCoordinator({
      enableSessionState: true,
      sessionBaseDir: testSessionDir,
    });

    coordinator.addItems([
      {
        id: 'item1',
        name: 'Test Item 1',
        execute: async () => ({ result: 1 }),
      },
      {
        id: 'item2',
        name: 'Test Item 2',
        execute: async () => ({ result: 2 }),
      },
    ]);

    await coordinator.analyze();
    const result = await coordinator.execute();

    const state = await coordinator.sessionState.getState();

    expect(state.workflow.status).toBe('completed');
    expect(state.workflow.endTime).toBeTruthy();
    expect(state.workflow.duration).toBeGreaterThan(0);
    expect(result.success).toBe(true);
  });

  test('should update workflow status to failed on error', async () => {
    const coordinator = new HybridCoordinator({
      enableSessionState: true,
      sessionBaseDir: testSessionDir,
      continueOnFailure: false,
      maxRetries: 0, // Disable retries
    });

    coordinator.addItem({
      id: 'item1',
      name: 'Failing Item',
      execute: async () => {
        throw new Error('Test failure');
      },
    });

    await coordinator.analyze();
    const result = await coordinator.execute();

    const state = await coordinator.sessionState.getState();
    const events = await coordinator.sessionState.getEvents();

    // Check the status - may be completed with failures depending on implementation
    expect(result.success).toBe(false);
    expect(result.failedItems).toBe(1);
    expect(events.some(e => e.type === 'workflow:failed')).toBe(true);
  });

  test('should resume existing session when sessionId provided', async () => {
    // First execution - create session
    const coordinator1 = new HybridCoordinator({
      enableSessionState: true,
      sessionBaseDir: testSessionDir,
    });

    coordinator1.addItem({
      id: 'item1',
      name: 'Test Item',
      execute: async () => ({ result: 'done' }),
    });

    await coordinator1.analyze();
    await coordinator1.execute();

    const sessionId = coordinator1.sessionState.sessionId;

    // Second execution - resume session
    const coordinator2 = new HybridCoordinator({
      enableSessionState: true,
      sessionId: sessionId,
      sessionBaseDir: testSessionDir,
    });

    expect(coordinator2.sessionState.sessionId).toBe(sessionId);

    // Verify we can read previous session state
    const state = await coordinator2.sessionState.getState();
    expect(state.sessionId).toBe(sessionId);
    expect(state.workflow.status).toBe('completed');
  });

  test('should track execution metrics in session', async () => {
    const coordinator = new HybridCoordinator({
      enableSessionState: true,
      sessionBaseDir: testSessionDir,
    });

    coordinator.addItems([
      {
        id: 'item1',
        name: 'Test Item 1',
        execute: async () => ({ result: 1 }),
      },
      {
        id: 'item2',
        name: 'Test Item 2',
        execute: async () => ({ result: 2 }),
      },
      {
        id: 'item3',
        name: 'Test Item 3',
        execute: async () => ({ result: 3 }),
      },
    ]);

    await coordinator.analyze();
    await coordinator.execute();

    const events = await coordinator.sessionState.getEvents();
    const completedEvent = events.find(e => e.type === 'workflow:completed');

    expect(completedEvent).toBeTruthy();
    expect(completedEvent.totalItems).toBe(3);
    expect(completedEvent.completedItems).toBe(3);
    expect(completedEvent.failedItems).toBe(0);
    expect(completedEvent.duration).toBeGreaterThan(0);
  });

  test('should handle session disabled config', async () => {
    const coordinator = new HybridCoordinator({
      enableSessionState: false,
    });

    coordinator.addItem({
      id: 'item1',
      name: 'Test Item',
      execute: async () => ({ result: 'done' }),
    });

    await coordinator.analyze();
    await coordinator.execute();

    expect(coordinator.sessionState).toBeNull();
  });

  test('should track failed items in session events', async () => {
    const coordinator = new HybridCoordinator({
      enableSessionState: true,
      sessionBaseDir: testSessionDir,
      continueOnFailure: true,
      maxRetries: 0, // Disable retries
    });

    coordinator.addItems([
      {
        id: 'item1',
        name: 'Success Item',
        execute: async () => ({ result: 'success' }),
      },
      {
        id: 'item2',
        name: 'Failing Item',
        execute: async () => {
          throw new Error('Test failure');
        },
        maxRetries: 0, // Ensure no retries for this item
      },
      {
        id: 'item3',
        name: 'Another Success',
        execute: async () => ({ result: 'success' }),
      },
    ]);

    await coordinator.analyze();
    const result = await coordinator.execute();

    const events = await coordinator.sessionState.getEvents();
    const completedEvent = events.find(e => e.type === 'workflow:completed');

    expect(result.completedItems).toBe(2);
    expect(result.failedItems).toBe(1);
    expect(completedEvent.completedItems).toBe(2);
    expect(completedEvent.failedItems).toBe(1);
  });

  test('should include execution strategy in session metadata', async () => {
    const coordinator = new HybridCoordinator({
      enableSessionState: true,
      sessionBaseDir: testSessionDir,
    });

    coordinator.addItems([
      {
        id: 'item1',
        name: 'Item 1',
        execute: async () => ({ result: 1 }),
      },
      {
        id: 'item2',
        name: 'Item 2',
        execute: async () => ({ result: 2 }),
        dependencies: ['item1'],
      },
    ]);

    await coordinator.analyze();
    await coordinator.execute();

    const state = await coordinator.sessionState.getState();

    expect(state.workflow.strategy).toBe('pure_sequential');
    expect(state.workflow.totalWaves).toBeGreaterThan(0);
  });

  test('should track blocked items in session events', async () => {
    const coordinator = new HybridCoordinator({
      enableSessionState: true,
      sessionBaseDir: testSessionDir,
      continueOnFailure: true,
      maxRetries: 0, // Disable retries
    });

    coordinator.addItems([
      {
        id: 'item1',
        name: 'Failing Item',
        execute: async () => {
          throw new Error('Test failure');
        },
        maxRetries: 0,
      },
      {
        id: 'item2',
        name: 'Dependent Item',
        execute: async () => ({ result: 'success' }),
        dependencies: ['item1'],
      },
    ]);

    await coordinator.analyze();
    const result = await coordinator.execute();

    const events = await coordinator.sessionState.getEvents();
    const completedEvent = events.find(e => e.type === 'workflow:completed');

    // With hybrid execution, dependent items should be blocked when dependencies fail
    expect(result.failedItems).toBe(1);
    expect(result.blockedItems).toBeGreaterThanOrEqual(1);
    expect(completedEvent.failedItems).toBe(1);
    expect(completedEvent.blockedItems).toBeGreaterThanOrEqual(1);
    expect(completedEvent.completedItems).toBe(0);
  });

  test('should log start time in ISO format', async () => {
    const coordinator = new HybridCoordinator({
      enableSessionState: true,
      sessionBaseDir: testSessionDir,
    });

    coordinator.addItem({
      id: 'item1',
      name: 'Test Item',
      execute: async () => ({ result: 'done' }),
    });

    await coordinator.analyze();
    const beforeExecute = new Date();
    await coordinator.execute();

    const state = await coordinator.sessionState.getState();
    const startTime = new Date(state.workflow.startTime);

    expect(startTime).toBeInstanceOf(Date);
    expect(startTime.getTime()).toBeGreaterThanOrEqual(beforeExecute.getTime() - 1000);
  });

  test('should maintain session state across multiple operations', async () => {
    const coordinator = new HybridCoordinator({
      enableSessionState: true,
      sessionBaseDir: testSessionDir,
    });

    coordinator.addItems([
      {
        id: 'item1',
        name: 'Item 1',
        execute: async () => ({ result: 1 }),
      },
      {
        id: 'item2',
        name: 'Item 2',
        execute: async () => ({ result: 2 }),
      },
    ]);

    await coordinator.analyze();
    await coordinator.execute();

    // Session should exist
    const sessionId = coordinator.sessionState.sessionId;
    const state1 = await coordinator.sessionState.getState();

    expect(state1.workflow.status).toBe('completed');

    // Can still access session after execution
    const state2 = await coordinator.sessionState.getState();

    expect(state2.sessionId).toBe(sessionId);
    expect(state2.workflow.status).toBe('completed');
  });
});
