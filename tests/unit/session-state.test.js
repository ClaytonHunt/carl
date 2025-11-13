/**
 * Session State Tests
 *
 * Tests for workflow session state management.
 * Uses test artifacts directory to avoid polluting project.
 */

const SessionState = require('../../plugins/carl/lib/workflow/session-state');
const fs = require('fs').promises;
const path = require('path');

const TEST_DIR = path.join(__dirname, '..', '.test-artifacts', 'session-state-test');

describe('SessionState', () => {
  beforeEach(async () => {
    // Clean test directory
    await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
  });

  afterEach(async () => {
    // Clean up
    await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
  });

  describe('Constructor', () => {
    it('should create session with auto-generated UUID', () => {
      const session = new SessionState(null, TEST_DIR);

      expect(session.sessionId).toBeDefined();
      expect(session.sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(session.baseDir).toBe(TEST_DIR);
    });

    it('should create session with provided UUID', () => {
      const customId = '12345678-1234-1234-1234-123456789abc';
      const session = new SessionState(customId, TEST_DIR);

      expect(session.sessionId).toBe(customId);
    });

    it('should set correct paths', () => {
      const session = new SessionState(null, TEST_DIR);

      expect(session.sessionDir).toBe(path.join(TEST_DIR, session.sessionId));
      expect(session.stateFile).toBe(path.join(TEST_DIR, session.sessionId, 'state.json'));
      expect(session.eventsFile).toBe(path.join(TEST_DIR, session.sessionId, 'events.log'));
    });
  });

  describe('initialize()', () => {
    it('should create session directory and state file', async () => {
      const session = new SessionState(null, TEST_DIR);
      await session.initialize();

      // Check directory exists
      const dirStats = await fs.stat(session.sessionDir);
      expect(dirStats.isDirectory()).toBe(true);

      // Check state file exists
      const fileStats = await fs.stat(session.stateFile);
      expect(fileStats.isFile()).toBe(true);
    });

    it('should create initial state structure', async () => {
      const session = new SessionState(null, TEST_DIR);
      await session.initialize();

      const state = await session.getState();

      expect(state.sessionId).toBe(session.sessionId);
      expect(state.created).toBeDefined();
      expect(state.updated).toBeDefined();
      expect(state.workflow).toEqual({});
      expect(state.data).toEqual({});
    });

    it('should not overwrite existing state', async () => {
      const session = new SessionState(null, TEST_DIR);
      await session.initialize();

      // Update state
      await session.setState({ test: 'value' });

      // Initialize again
      await session.initialize();

      // State should still have our update
      const state = await session.getState();
      expect(state.data.test).toBe('value');
    });

    it('should create nested directories', async () => {
      const deepPath = path.join(TEST_DIR, 'nested', 'deep', 'path');
      const session = new SessionState(null, deepPath);
      await session.initialize();

      const dirStats = await fs.stat(session.sessionDir);
      expect(dirStats.isDirectory()).toBe(true);
    });
  });

  describe('getState()', () => {
    it('should read current state', async () => {
      const session = new SessionState(null, TEST_DIR);
      await session.initialize();

      const state = await session.getState();

      expect(state).toHaveProperty('sessionId');
      expect(state).toHaveProperty('created');
      expect(state).toHaveProperty('updated');
      expect(state).toHaveProperty('workflow');
      expect(state).toHaveProperty('data');
    });

    it('should throw error if state file does not exist', async () => {
      const session = new SessionState(null, TEST_DIR);
      // Don't initialize

      await expect(session.getState()).rejects.toThrow('Failed to read state');
    });
  });

  describe('setState()', () => {
    it('should update state with new data', async () => {
      const session = new SessionState(null, TEST_DIR);
      await session.initialize();

      await session.setState({
        input: 'test input',
        inputType: 'description'
      });

      const state = await session.getState();
      expect(state.data.input).toBe('test input');
      expect(state.data.inputType).toBe('description');
    });

    it('should merge with existing data', async () => {
      const session = new SessionState(null, TEST_DIR);
      await session.initialize();

      await session.setState({ key1: 'value1' });
      await session.setState({ key2: 'value2' });

      const state = await session.getState();
      expect(state.data.key1).toBe('value1');
      expect(state.data.key2).toBe('value2');
    });

    it('should update timestamp', async () => {
      const session = new SessionState(null, TEST_DIR);
      await session.initialize();

      const initialState = await session.getState();
      const initialTimestamp = initialState.updated;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      await session.setState({ test: 'value' });

      const updatedState = await session.getState();
      expect(updatedState.updated).not.toBe(initialTimestamp);
      expect(new Date(updatedState.updated).getTime()).toBeGreaterThan(
        new Date(initialTimestamp).getTime()
      );
    });

    it('should handle complex data structures', async () => {
      const session = new SessionState(null, TEST_DIR);
      await session.initialize();

      const complexData = {
        breakdown: [
          { type: 'E', data: { title: 'Epic 1' } },
          { type: 'F', data: { title: 'Feature 1' } }
        ],
        result: {
          created: [{ id: 'E0001' }, { id: 'F0001' }],
          summary: { total: 2 }
        }
      };

      await session.setState(complexData);

      const state = await session.getState();
      expect(state.data.breakdown).toEqual(complexData.breakdown);
      expect(state.data.result).toEqual(complexData.result);
    });
  });

  describe('setWorkflow()', () => {
    it('should update workflow metadata', async () => {
      const session = new SessionState(null, TEST_DIR);
      await session.initialize();

      await session.setWorkflow({
        name: 'planning',
        step: 'breakdown',
        status: 'in-progress'
      });

      const state = await session.getState();
      expect(state.workflow.name).toBe('planning');
      expect(state.workflow.step).toBe('breakdown');
      expect(state.workflow.status).toBe('in-progress');
    });

    it('should merge with existing workflow data', async () => {
      const session = new SessionState(null, TEST_DIR);
      await session.initialize();

      await session.setWorkflow({ name: 'planning' });
      await session.setWorkflow({ step: 'breakdown' });

      const state = await session.getState();
      expect(state.workflow.name).toBe('planning');
      expect(state.workflow.step).toBe('breakdown');
    });

    it('should not affect data property', async () => {
      const session = new SessionState(null, TEST_DIR);
      await session.initialize();

      await session.setState({ test: 'value' });
      await session.setWorkflow({ name: 'planning' });

      const state = await session.getState();
      expect(state.data.test).toBe('value');
      expect(state.workflow.name).toBe('planning');
    });
  });

  describe('logEvent()', () => {
    it('should create event log file', async () => {
      const session = new SessionState(null, TEST_DIR);
      await session.initialize();

      await session.logEvent('test_event', { test: 'data' });

      const fileStats = await fs.stat(session.eventsFile);
      expect(fileStats.isFile()).toBe(true);
    });

    it('should append events in NDJSON format', async () => {
      const session = new SessionState(null, TEST_DIR);
      await session.initialize();

      await session.logEvent('event1', { data: 'one' });
      await session.logEvent('event2', { data: 'two' });

      const content = await fs.readFile(session.eventsFile, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(2);

      const event1 = JSON.parse(lines[0]);
      expect(event1.type).toBe('event1');
      expect(event1.data).toBe('one');
      expect(event1.sessionId).toBe(session.sessionId);
      expect(event1.timestamp).toBeDefined();

      const event2 = JSON.parse(lines[1]);
      expect(event2.type).toBe('event2');
      expect(event2.data).toBe('two');
    });

    it('should include timestamp and sessionId automatically', async () => {
      const session = new SessionState(null, TEST_DIR);
      await session.initialize();

      await session.logEvent('test', {});

      const events = await session.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].timestamp).toBeDefined();
      expect(events[0].sessionId).toBe(session.sessionId);
    });
  });

  describe('getEvents()', () => {
    it('should return empty array if no events', async () => {
      const session = new SessionState(null, TEST_DIR);
      await session.initialize();

      const events = await session.getEvents();
      expect(events).toEqual([]);
    });

    it('should parse all events from log', async () => {
      const session = new SessionState(null, TEST_DIR);
      await session.initialize();

      await session.logEvent('event1', { count: 1 });
      await session.logEvent('event2', { count: 2 });
      await session.logEvent('event3', { count: 3 });

      const events = await session.getEvents();

      expect(events).toHaveLength(3);
      expect(events[0].type).toBe('event1');
      expect(events[1].type).toBe('event2');
      expect(events[2].type).toBe('event3');
    });

    it('should preserve event data', async () => {
      const session = new SessionState(null, TEST_DIR);
      await session.initialize();

      const eventData = {
        agent: 'planning-orchestrator',
        workItem: 'E0001',
        count: 5,
        nested: { key: 'value' }
      };

      await session.logEvent('complex_event', eventData);

      const events = await session.getEvents();
      expect(events[0].agent).toBe('planning-orchestrator');
      expect(events[0].workItem).toBe('E0001');
      expect(events[0].count).toBe(5);
      expect(events[0].nested).toEqual({ key: 'value' });
    });
  });

  describe('cleanup()', () => {
    it('should delete session directory', async () => {
      const session = new SessionState(null, TEST_DIR);
      await session.initialize();

      await session.setState({ test: 'value' });
      await session.logEvent('test', {});

      // Verify exists
      await fs.access(session.sessionDir);

      // Cleanup
      await session.cleanup();

      // Verify deleted
      await expect(fs.access(session.sessionDir)).rejects.toThrow();
    });

    it('should handle cleanup of non-existent session', async () => {
      const session = new SessionState(null, TEST_DIR);
      // Don't initialize

      await expect(session.cleanup()).resolves.toBe(true);
    });
  });

  describe('getArtifactsDir()', () => {
    it('should return artifacts directory path', () => {
      const session = new SessionState(null, TEST_DIR);

      const artifactsDir = session.getArtifactsDir();
      expect(artifactsDir).toBe(path.join(session.sessionDir, 'artifacts'));
    });
  });

  describe('ensureArtifactsDir()', () => {
    it('should create artifacts directory', async () => {
      const session = new SessionState(null, TEST_DIR);
      await session.initialize();

      const artifactsDir = await session.ensureArtifactsDir();

      const stats = await fs.stat(artifactsDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should not fail if directory already exists', async () => {
      const session = new SessionState(null, TEST_DIR);
      await session.initialize();

      await session.ensureArtifactsDir();
      await session.ensureArtifactsDir(); // Call again

      const artifactsDir = session.getArtifactsDir();
      const stats = await fs.stat(artifactsDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should allow writing files to artifacts directory', async () => {
      const session = new SessionState(null, TEST_DIR);
      await session.initialize();

      const artifactsDir = await session.ensureArtifactsDir();
      const testFile = path.join(artifactsDir, 'test.txt');

      await fs.writeFile(testFile, 'test content');

      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe('test content');
    });
  });

  describe('SessionState.resume()', () => {
    it('should resume existing session', async () => {
      // Create session
      const session1 = new SessionState(null, TEST_DIR);
      await session1.initialize();
      await session1.setState({ test: 'value' });

      // Resume in "another context"
      const session2 = await SessionState.resume(session1.sessionId, TEST_DIR);

      expect(session2.sessionId).toBe(session1.sessionId);

      const state = await session2.getState();
      expect(state.data.test).toBe('value');
    });

    it('should throw error if session does not exist', async () => {
      const fakeId = '12345678-1234-1234-1234-123456789abc';

      await expect(SessionState.resume(fakeId, TEST_DIR))
        .rejects
        .toThrow('Session not found');
    });
  });

  describe('SessionState.cleanupOldSessions()', () => {
    it('should clean up old sessions', async () => {
      // Create two sessions
      const session1 = new SessionState(null, TEST_DIR);
      await session1.initialize();

      const session2 = new SessionState(null, TEST_DIR);
      await session2.initialize();

      // Make session1 old by modifying its state file timestamp
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // 10 days ago
      await fs.utimes(session1.stateFile, oldDate, oldDate);

      // Clean sessions older than 7 days
      const cleaned = await SessionState.cleanupOldSessions(7, TEST_DIR);

      expect(cleaned).toBe(1);

      // Session1 should be gone
      await expect(fs.access(session1.sessionDir)).rejects.toThrow();

      // Session2 should still exist
      await fs.access(session2.sessionDir);
    });

    it('should return 0 if no sessions directory', async () => {
      const cleaned = await SessionState.cleanupOldSessions(7, path.join(TEST_DIR, 'nonexistent'));

      expect(cleaned).toBe(0);
    });

    it('should handle empty sessions directory', async () => {
      await fs.mkdir(TEST_DIR, { recursive: true });

      const cleaned = await SessionState.cleanupOldSessions(7, TEST_DIR);

      expect(cleaned).toBe(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('should support full workflow lifecycle', async () => {
      // Command creates session
      const session = new SessionState(null, TEST_DIR);
      await session.initialize();

      // Log workflow start
      await session.logEvent('workflow_started', { workflow: 'planning' });

      // Agent updates state as it progresses
      await session.setState({ input: 'user request', inputType: 'description' });
      await session.logEvent('context_loaded', { hasRegistry: true });

      await session.setState({ breakdown: [{ type: 'E' }, { type: 'F' }] });
      await session.logEvent('breakdown_created', { itemCount: 2 });

      await session.setState({ result: { created: [{ id: 'E0001' }, { id: 'F0001' }] } });
      await session.logEvent('items_persisted', { count: 2 });

      // Verify final state
      const finalState = await session.getState();
      expect(finalState.data.input).toBe('user request');
      expect(finalState.data.breakdown).toHaveLength(2);
      expect(finalState.data.result.created).toHaveLength(2);

      // Verify event log
      const events = await session.getEvents();
      expect(events).toHaveLength(4);
      expect(events[0].type).toBe('workflow_started');
      expect(events[3].type).toBe('items_persisted');

      // Cleanup
      await session.cleanup();
    });

    it('should support parallel agent coordination', async () => {
      // Parent creates session
      const parentSession = new SessionState(null, TEST_DIR);
      await parentSession.initialize();

      await parentSession.setState({ taskA: 'pending', taskB: 'pending' });

      // Agent A resumes and updates
      const agentA = await SessionState.resume(parentSession.sessionId, TEST_DIR);
      await agentA.setState({ taskA: 'completed', resultA: 'data from A' });

      // Agent B resumes and updates
      const agentB = await SessionState.resume(parentSession.sessionId, TEST_DIR);
      await agentB.setState({ taskB: 'completed', resultB: 'data from B' });

      // Parent reads final state
      const finalState = await parentSession.getState();
      expect(finalState.data.taskA).toBe('completed');
      expect(finalState.data.taskB).toBe('completed');
      expect(finalState.data.resultA).toBe('data from A');
      expect(finalState.data.resultB).toBe('data from B');
    });
  });
});
