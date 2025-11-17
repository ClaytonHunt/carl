/**
 * Event Logger Tests
 *
 * Comprehensive tests for the event logging framework
 */

const EventLogger = require('../../plugins/carl/lib/orchestration/event-logger');
const { EventType, EventPriority, Event } = EventLogger;
const SessionState = require('../../plugins/carl/lib/workflow/session-state');
const fs = require('fs').promises;
const path = require('path');

describe('EventLogger', () => {
  let logger;
  let sessionState;
  const testSessionDir = path.join(__dirname, '.test-sessions', 'event-logger-test');

  beforeEach(async () => {
    // Create session state for testing
    sessionState = new SessionState('test-event-session', testSessionDir);
    await sessionState.initialize();

    // Create logger with session state
    logger = new EventLogger({
      maxEvents: 100,
      enablePersistence: true,
      sessionState,
      defaultExecutionId: 'exec-123',
      defaultSessionId: 'test-event-session',
      defaultCorrelationId: 'corr-123',
    });
  });

  afterEach(async () => {
    // Cleanup
    if (sessionState) {
      await sessionState.cleanup();
    }
  });

  describe('Event Schema and Types', () => {
    test('should create event with all required fields', () => {
      const event = new Event({
        type: EventType.WORKFLOW_STARTED,
        message: 'Test workflow started',
        metadata: { test: true },
      });

      expect(event.eventId).toBeDefined();
      expect(event.timestamp).toBeDefined();
      expect(event.type).toBe(EventType.WORKFLOW_STARTED);
      expect(event.message).toBe('Test workflow started');
      expect(event.metadata).toEqual({ test: true });
      expect(event.priority).toBe(EventPriority.MEDIUM); // default
      expect(event.category).toBe('workflow');
    });

    test('should auto-generate eventId and timestamp', () => {
      const event = new Event({ type: EventType.CUSTOM });
      expect(event.eventId).toMatch(/^[0-9a-f-]{36}$/); // UUID format
      expect(new Date(event.timestamp).getTime()).toBeGreaterThan(0);
    });

    test('should infer category from event type', () => {
      expect(new Event({ type: EventType.WORKFLOW_STARTED }).category).toBe('workflow');
      expect(new Event({ type: EventType.STATE_TRANSITION }).category).toBe('state');
      expect(new Event({ type: EventType.WORKER_ASSIGNED }).category).toBe('worker');
      expect(new Event({ type: EventType.WAVE_STARTED }).category).toBe('wave');
      expect(new Event({ type: EventType.TASK_QUEUED }).category).toBe('task');
      expect(new Event({ type: EventType.PROGRESS_UPDATE }).category).toBe('progress');
      expect(new Event({ type: EventType.ERROR_OCCURRED }).category).toBe('error');
      expect(new Event({ type: EventType.CUSTOM }).category).toBe('custom');
    });

    test('should serialize to JSON without null fields', () => {
      const event = new Event({
        type: EventType.TASK_STARTED,
        message: 'Task started',
        workItemId: 'T0001',
      });

      const json = event.toJSON();
      expect(json).not.toHaveProperty('oldState'); // null fields removed
      expect(json).not.toHaveProperty('error');
      expect(json).toHaveProperty('workItemId', 'T0001');
    });

    test('should create event from JSON', () => {
      const json = {
        eventId: 'evt-123',
        timestamp: '2025-01-01T00:00:00.000Z',
        type: EventType.WORKER_COMPLETED,
        message: 'Worker completed',
        workerId: 'worker-1',
      };

      const event = Event.fromJSON(json);
      expect(event.eventId).toBe('evt-123');
      expect(event.type).toBe(EventType.WORKER_COMPLETED);
      expect(event.workerId).toBe('worker-1');
    });
  });

  describe('Workflow Lifecycle Event Logging (T0117)', () => {
    test('should log workflow started event', async () => {
      const event = await logger.logWorkflowStarted({
        metadata: { totalItems: 10 },
      });

      expect(event.type).toBe(EventType.WORKFLOW_STARTED);
      expect(event.priority).toBe(EventPriority.HIGH);
      expect(event.message).toContain('started');
      expect(event.executionId).toBe('exec-123');
      expect(event.metadata.totalItems).toBe(10);
    });

    test('should log workflow completed event', async () => {
      const event = await logger.logWorkflowCompleted({
        metadata: { completedItems: 8, failedItems: 2 },
        duration: 5000,
      });

      expect(event.type).toBe(EventType.WORKFLOW_COMPLETED);
      expect(event.priority).toBe(EventPriority.HIGH);
      expect(event.message).toContain('completed');
      expect(event.duration).toBe(5000);
      expect(event.metadata.completedItems).toBe(8);
    });

    test('should log workflow failed event with error details', async () => {
      const error = new Error('Test failure');
      const event = await logger.logWorkflowFailed({
        error,
        metadata: { reason: 'Test error' },
      });

      expect(event.type).toBe(EventType.WORKFLOW_FAILED);
      expect(event.priority).toBe(EventPriority.CRITICAL);
      expect(event.error).toBe('Test failure');
      expect(event.errorStack).toBeDefined();
      expect(event.metadata.reason).toBe('Test error');
    });

    test('should persist workflow events to session state', async () => {
      await logger.logWorkflowStarted();
      await logger.logWorkflowCompleted();

      const sessionEvents = await sessionState.getEvents();
      const workflowEvents = sessionEvents.filter(e =>
        e.type === EventType.WORKFLOW_STARTED || e.type === EventType.WORKFLOW_COMPLETED
      );

      expect(workflowEvents.length).toBe(2);
    });
  });

  describe('Work Item State Transition Logging (T0118)', () => {
    test('should log state transition with old and new state', async () => {
      const event = await logger.logStateTransition({
        workItemId: 'T0001',
        oldState: 'planned',
        newState: 'in_progress',
        metadata: { assignee: 'worker-1' },
      });

      expect(event.type).toBe(EventType.STATE_TRANSITION);
      expect(event.workItemId).toBe('T0001');
      expect(event.oldState).toBe('planned');
      expect(event.newState).toBe('in_progress');
      expect(event.message).toContain('planned -> in_progress');
    });

    test('should include work item ID in event', async () => {
      const event = await logger.logStateTransition({
        workItemId: 'F0001',
        oldState: 'pending',
        newState: 'completed',
      });

      expect(event.workItemId).toBe('F0001');
    });

    test('should include transition timestamp', async () => {
      const beforeTime = new Date();
      const event = await logger.logStateTransition({
        workItemId: 'T0002',
        oldState: 'pending',
        newState: 'executing',
      });
      const afterTime = new Date();

      const eventTime = new Date(event.timestamp);
      expect(eventTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(eventTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    test('should support custom metadata in transitions', async () => {
      const event = await logger.logStateTransition({
        workItemId: 'T0003',
        oldState: 'executing',
        newState: 'failed',
        metadata: {
          error: 'Timeout',
          retryAttempt: 3,
          duration: 30000,
        },
      });

      expect(event.metadata.error).toBe('Timeout');
      expect(event.metadata.retryAttempt).toBe(3);
      expect(event.metadata.duration).toBe(30000);
    });
  });

  describe('Worker Agent Activity Logging (T0119)', () => {
    test('should log worker assigned event', async () => {
      const event = await logger.logWorkerAssigned({
        workerId: 'worker-1',
        workItemId: 'T0001',
        metadata: { poolId: 'pool-1' },
      });

      expect(event.type).toBe(EventType.WORKER_ASSIGNED);
      expect(event.workerId).toBe('worker-1');
      expect(event.workItemId).toBe('T0001');
      expect(event.message).toContain('worker-1');
      expect(event.message).toContain('T0001');
    });

    test('should log worker started event', async () => {
      const event = await logger.logWorkerStarted({
        workerId: 'worker-2',
        workItemId: 'T0002',
      });

      expect(event.type).toBe(EventType.WORKER_STARTED);
      expect(event.workerId).toBe('worker-2');
      expect(event.workItemId).toBe('T0002');
    });

    test('should log worker completed event', async () => {
      const event = await logger.logWorkerCompleted({
        workerId: 'worker-3',
        workItemId: 'T0003',
        duration: 1000,
        metadata: { result: 'success' },
      });

      expect(event.type).toBe(EventType.WORKER_COMPLETED);
      expect(event.workerId).toBe('worker-3');
      expect(event.duration).toBe(1000);
      expect(event.metadata.result).toBe('success');
    });

    test('should log worker failed event with errors', async () => {
      const error = new Error('Worker timeout');
      const event = await logger.logWorkerFailed({
        workerId: 'worker-4',
        workItemId: 'T0004',
        error,
        metadata: { attempt: 2 },
      });

      expect(event.type).toBe(EventType.WORKER_FAILED);
      expect(event.priority).toBe(EventPriority.HIGH);
      expect(event.error).toBe('Worker timeout');
      expect(event.errorStack).toBeDefined();
    });
  });

  describe('Event Storage and Query (T0120)', () => {
    beforeEach(async () => {
      // Populate with test events
      await logger.logWorkflowStarted({ metadata: { test: 1 } });
      await logger.logStateTransition({
        workItemId: 'T0001',
        oldState: 'pending',
        newState: 'executing',
      });
      await logger.logWorkerAssigned({
        workerId: 'worker-1',
        workItemId: 'T0001',
      });
      await logger.logWorkerStarted({
        workerId: 'worker-1',
        workItemId: 'T0001',
      });
      await logger.logWorkerCompleted({
        workerId: 'worker-1',
        workItemId: 'T0001',
      });
      await logger.logStateTransition({
        workItemId: 'T0001',
        oldState: 'executing',
        newState: 'completed',
      });
      await logger.logWorkflowCompleted({ metadata: { test: 1 } });
    });

    test('should store events in session state', async () => {
      const sessionEvents = await sessionState.getEvents();
      expect(sessionEvents.length).toBeGreaterThanOrEqual(7);
    });

    test('should provide getEvents() query method', () => {
      const events = logger.getEvents();
      expect(events.length).toBe(7);
      expect(Array.isArray(events)).toBe(true);
    });

    test('should filter events by type', () => {
      const workflowEvents = logger.getEvents({ type: EventType.WORKFLOW_STARTED });
      expect(workflowEvents.length).toBe(1);
      expect(workflowEvents[0].type).toBe(EventType.WORKFLOW_STARTED);

      const stateEvents = logger.getEvents({ type: EventType.STATE_TRANSITION });
      expect(stateEvents.length).toBe(2);
    });

    test('should filter events by work item ID', () => {
      const itemEvents = logger.getEvents({ workItemId: 'T0001' });
      expect(itemEvents.length).toBe(5); // 2 transitions + 3 worker events
      expect(itemEvents.every(e => e.workItemId === 'T0001')).toBe(true);
    });

    test('should filter events by worker ID', () => {
      const workerEvents = logger.getEvents({ workerId: 'worker-1' });
      expect(workerEvents.length).toBe(3); // assigned, started, completed
      expect(workerEvents.every(e => e.workerId === 'worker-1')).toBe(true);
    });

    test('should filter events by category', () => {
      const workerEvents = logger.getEvents({ category: 'worker' });
      expect(workerEvents.length).toBe(3);
      expect(workerEvents.every(e => e.category === 'worker')).toBe(true);
    });

    test('should filter events by priority', async () => {
      const highPriorityEvents = logger.getEvents({ priority: EventPriority.HIGH });
      expect(highPriorityEvents.length).toBeGreaterThanOrEqual(2); // workflow start and complete
      expect(highPriorityEvents.every(e => e.priority === EventPriority.HIGH)).toBe(true);
    });

    test('should filter events by correlation ID', async () => {
      const correlatedEvents = logger.getEvents({ correlationId: 'corr-123' });
      expect(correlatedEvents.length).toBe(7); // All events have default correlation ID
    });

    test('should sort events by timestamp', () => {
      const events = logger.getEvents({ sortBy: 'timestamp', sortOrder: 'asc' });

      for (let i = 1; i < events.length; i++) {
        const prevTime = new Date(events[i - 1].timestamp).getTime();
        const currTime = new Date(events[i].timestamp).getTime();
        expect(currTime).toBeGreaterThanOrEqual(prevTime);
      }
    });

    test('should limit query results', () => {
      const limitedEvents = logger.getEvents({ limit: 3 });
      expect(limitedEvents.length).toBe(3);
    });

    test('should filter events by time range', async () => {
      // Clear existing events first
      logger.clear();

      const startTime = new Date().toISOString();

      // Add new event after start time
      await new Promise(resolve => setTimeout(resolve, 10));
      await logger.logEvent(EventType.CUSTOM, { message: 'New event' });

      const recentEvents = logger.getEvents({ startTime });
      expect(recentEvents.length).toBe(1);
      expect(recentEvents[0].message).toBe('New event');
    });

    test('should get event count', () => {
      const totalCount = logger.getEventCount();
      expect(totalCount).toBe(7);

      const workerCount = logger.getEventCount({ category: 'worker' });
      expect(workerCount).toBe(3);
    });

    test('should provide event statistics', () => {
      const stats = logger.getStatistics();

      expect(stats.totalEvents).toBe(7);
      expect(stats.eventsByType[EventType.WORKFLOW_STARTED]).toBe(1);
      expect(stats.eventsByType[EventType.STATE_TRANSITION]).toBe(2);
      expect(stats.eventsByCategory.workflow).toBe(2);
      expect(stats.eventsByCategory.worker).toBe(3);
      expect(stats.eventsByCategory.state).toBe(2);
    });

    test('should clear all events', () => {
      logger.clear();
      expect(logger.getEvents().length).toBe(0);
      expect(logger.getEventCount()).toBe(0);
    });
  });

  describe('Event Correlation and Tracing', () => {
    test('should include correlation ID for tracing', async () => {
      const correlationId = 'trace-xyz';

      await logger.logEvent(EventType.WORKFLOW_STARTED, { correlationId });
      await logger.logEvent(EventType.TASK_STARTED, { correlationId });
      await logger.logEvent(EventType.TASK_COMPLETED, { correlationId });

      const tracedEvents = logger.getEvents({ correlationId });
      expect(tracedEvents.length).toBe(3);
      expect(tracedEvents.every(e => e.correlationId === correlationId)).toBe(true);
    });

    test('should use default correlation ID from config', async () => {
      const event = await logger.logEvent(EventType.CUSTOM);
      expect(event.correlationId).toBe('corr-123');
    });

    test('should support execution ID for context', async () => {
      const event = await logger.logEvent(EventType.WAVE_STARTED, {
        executionId: 'exec-456',
      });

      expect(event.executionId).toBe('exec-456');
    });
  });

  describe('Event Indexing Performance', () => {
    test('should efficiently query by type using index', async () => {
      // Add 100 events
      for (let i = 0; i < 50; i++) {
        await logger.logEvent(EventType.TASK_STARTED, { workItemId: `T${i}` });
        await logger.logEvent(EventType.TASK_COMPLETED, { workItemId: `T${i}` });
      }

      const startedEvents = logger.getEvents({ type: EventType.TASK_STARTED });
      expect(startedEvents.length).toBe(50);
    });

    test('should efficiently query by work item using index', async () => {
      // Add multiple events for same work item
      for (let i = 0; i < 10; i++) {
        await logger.logEvent(EventType.CUSTOM, {
          workItemId: 'T9999',
          message: `Event ${i}`,
        });
      }

      const itemEvents = logger.getEvents({ workItemId: 'T9999' });
      expect(itemEvents.length).toBe(10);
    });

    test('should enforce max events limit', async () => {
      // Logger configured with maxEvents: 100
      for (let i = 0; i < 150; i++) {
        await logger.logEvent(EventType.CUSTOM, { message: `Event ${i}` });
      }

      expect(logger.getEvents().length).toBe(100);
    });
  });

  describe('Event Emission', () => {
    test('should emit events via EventEmitter', async () => {
      const events = [];
      logger.on('event', (event) => {
        events.push(event);
      });

      await logger.logWorkflowStarted();
      await logger.logWorkflowCompleted();

      expect(events.length).toBe(2);
    });

    test('should emit type-specific events', async () => {
      const startedEvents = [];
      logger.on(EventType.WORKFLOW_STARTED, (event) => {
        startedEvents.push(event);
      });

      await logger.logWorkflowStarted();
      await logger.logWorkflowCompleted();

      expect(startedEvents.length).toBe(1);
      expect(startedEvents[0].type).toBe(EventType.WORKFLOW_STARTED);
    });

    test('should disable event emission when configured', async () => {
      const noEmitLogger = new EventLogger({
        enableEmit: false,
      });

      const events = [];
      noEmitLogger.on('event', (event) => {
        events.push(event);
      });

      await noEmitLogger.logWorkflowStarted();
      expect(events.length).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle persistence errors gracefully', async () => {
      const brokenSessionState = {
        logEvent: async () => {
          throw new Error('Persistence failed');
        },
      };

      const errorLogger = new EventLogger({
        enablePersistence: true,
        sessionState: brokenSessionState,
      });

      const persistenceErrors = [];
      errorLogger.on('persistence:error', (data) => {
        persistenceErrors.push(data);
      });

      // Should not throw even if persistence fails
      await expect(errorLogger.logWorkflowStarted()).resolves.toBeDefined();
      expect(persistenceErrors.length).toBe(1);
      expect(persistenceErrors[0].error).toContain('Persistence failed');
    });

    test('should store error details in failed events', async () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';

      const event = await logger.logWorkerFailed({
        workerId: 'worker-1',
        workItemId: 'T0001',
        error,
      });

      expect(event.error).toBe('Test error');
      expect(event.errorStack).toBe('Error stack trace');
    });
  });

  describe('Integration with SessionState', () => {
    test('should persist events to SessionState events.log', async () => {
      await logger.logWorkflowStarted({ metadata: { integration: true } });
      await logger.logStateTransition({
        workItemId: 'T0001',
        oldState: 'pending',
        newState: 'completed',
      });

      const sessionEvents = await sessionState.getEvents();

      // Find our logged events
      const loggedEvents = sessionEvents.filter(e =>
        e.type === EventType.WORKFLOW_STARTED || e.type === EventType.STATE_TRANSITION
      );

      expect(loggedEvents.length).toBeGreaterThanOrEqual(2);

      const workflowEvent = loggedEvents.find(e => e.type === EventType.WORKFLOW_STARTED);
      expect(workflowEvent.metadata.integration).toBe(true);
    });

    test('should retrieve events from SessionState', async () => {
      // Log several events
      await logger.logWorkflowStarted();
      await logger.logWorkerAssigned({ workerId: 'w1', workItemId: 'T1' });
      await logger.logWorkerCompleted({ workerId: 'w1', workItemId: 'T1' });

      // Retrieve from session state
      const sessionEvents = await sessionState.getEvents();
      expect(sessionEvents.length).toBeGreaterThanOrEqual(3);
    });
  });
});
