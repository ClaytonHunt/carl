/**
 * Unit tests for BaseWorkerAgent
 *
 * Tests cover:
 * - Initialization and configuration
 * - Lifecycle management (start, stop, pause, resume)
 * - Session state integration
 * - Event logging and observability
 * - Error handling
 * - Metrics tracking
 */

const BaseWorkerAgent = require('../../plugins/carl/lib/orchestration/base-worker-agent');
const { AgentState, AgentType } = require('../../plugins/carl/lib/orchestration/base-worker-agent');
const SessionState = require('../../plugins/carl/lib/workflow/session-state');
const fs = require('fs').promises;
const path = require('path');

describe('BaseWorkerAgent', () => {
  let agent;
  let sessionDir;

  beforeEach(() => {
    sessionDir = path.join('.claude', '.carl', 'sessions', 'test-session');
  });

  afterEach(async () => {
    if (agent && agent.session) {
      try {
        await agent.session.cleanup();
      } catch (error) {
        // Ignore cleanup errors in tests
      }
    }

    // Clean up test session directory
    try {
      await fs.rm(sessionDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore
    }
  });

  describe('Constructor and Initialization', () => {
    test('should create agent with default configuration', () => {
      agent = new BaseWorkerAgent();

      expect(agent.id).toBeDefined();
      expect(agent.type).toBe(AgentType.GENERIC);
      expect(agent.state).toBe(AgentState.CREATED);
      expect(agent.config.timeout).toBe(600000);
      expect(agent.config.enableLogging).toBe(true);
    });

    test('should create agent with custom configuration', () => {
      agent = new BaseWorkerAgent({
        id: 'custom-agent-1',
        type: AgentType.LOP_WORKER,
        timeout: 300000,
        enableLogging: false,
      });

      expect(agent.id).toBe('custom-agent-1');
      expect(agent.type).toBe(AgentType.LOP_WORKER);
      expect(agent.config.timeout).toBe(300000);
      expect(agent.config.enableLogging).toBe(false);
    });

    test('should initialize agent successfully', async () => {
      agent = new BaseWorkerAgent();
      await agent.initialize();

      expect(agent.state).toBe(AgentState.IDLE);
    });

    test('should emit initialized event', async () => {
      agent = new BaseWorkerAgent();

      const eventPromise = new Promise(resolve => {
        agent.once('initialized', resolve);
      });

      await agent.initialize();
      const event = await eventPromise;

      expect(event.agentId).toBe(agent.id);
      expect(event.timestamp).toBeDefined();
    });

    test('should create session state during initialization', async () => {
      agent = new BaseWorkerAgent({ sessionId: 'test-session-1' });
      await agent.initialize();

      expect(agent.session).toBeInstanceOf(SessionState);
      expect(agent.sessionId).toBe('test-session-1');
    });
  });

  describe('Lifecycle Management', () => {
    beforeEach(async () => {
      agent = new BaseWorkerAgent();
      await agent.initialize();
    });

    test('should start agent from IDLE state', async () => {
      await agent.start();

      expect(agent.state).toBe(AgentState.RUNNING);
      expect(agent.startedAt).toBeInstanceOf(Date);
    });

    test('should emit started event', async () => {
      const eventPromise = new Promise(resolve => {
        agent.once('started', resolve);
      });

      await agent.start();
      const event = await eventPromise;

      expect(event.agentId).toBe(agent.id);
    });

    test('should throw error when starting from invalid state', async () => {
      await agent.start();
      await expect(agent.start()).rejects.toThrow('Cannot start agent in state');
    });

    test('should stop agent successfully', async () => {
      await agent.start();
      await agent.stop();

      expect(agent.state).toBe(AgentState.STOPPED);
      expect(agent.stoppedAt).toBeInstanceOf(Date);
    });

    test('should emit stopped event', async () => {
      await agent.start();

      const eventPromise = new Promise(resolve => {
        agent.once('stopped', resolve);
      });

      const stopPromise = agent.stop();
      const event = await eventPromise;
      await stopPromise;

      expect(event.agentId).toBe(agent.id);
    });

    test('should pause agent from RUNNING state', async () => {
      await agent.start();
      await agent.pause();

      expect(agent.state).toBe(AgentState.PAUSED);
      expect(agent.pausedAt).toBeInstanceOf(Date);
    });

    test('should emit paused event', async () => {
      await agent.start();

      const eventPromise = new Promise(resolve => {
        agent.once('paused', resolve);
      });

      await agent.pause();
      const event = await eventPromise;

      expect(event.agentId).toBe(agent.id);
    });

    test('should throw error when pausing from invalid state', async () => {
      await expect(agent.pause()).rejects.toThrow('Cannot pause agent in state');
    });

    test('should resume agent from PAUSED state', async () => {
      await agent.start();
      await agent.pause();
      await agent.resume();

      expect(agent.state).toBe(AgentState.RUNNING);
      expect(agent.pausedAt).toBeNull();
    });

    test('should emit resumed event', async () => {
      await agent.start();
      await agent.pause();

      const eventPromise = new Promise(resolve => {
        agent.once('resumed', resolve);
      });

      await agent.resume();
      const event = await eventPromise;

      expect(event.agentId).toBe(agent.id);
    });

    test('should throw error when resuming from invalid state', async () => {
      await expect(agent.resume()).rejects.toThrow('Cannot resume agent in state');
    });
  });

  describe('Session State Integration', () => {
    beforeEach(async () => {
      agent = new BaseWorkerAgent({ sessionId: 'test-session-2' });
      await agent.initialize();
    });

    test('should get session state', async () => {
      const state = await agent.getState();

      expect(state).toBeDefined();
      expect(state.sessionId).toBe('test-session-2');
    });

    test('should set session state', async () => {
      await agent.setState({ customData: 'test-value' });
      const state = await agent.getState();

      expect(state.data.customData).toBe('test-value');
    });

    test('should preserve state across pause/resume', async () => {
      agent.context = { important: 'data' };
      agent.metrics.tasksCompleted = 5;

      await agent.start();
      await agent.pause();
      await agent.resume();

      expect(agent.context.important).toBe('data');
      expect(agent.metrics.tasksCompleted).toBe(5);
    });
  });

  describe('Event Logging and Observability', () => {
    beforeEach(async () => {
      agent = new BaseWorkerAgent({
        sessionId: 'test-session-3',
        enableLogging: true,
      });
      await agent.initialize();
    });

    test('should log custom events', async () => {
      const result = await agent.logEvent('custom_event', {
        data: 'test',
      });

      expect(result).toBe(true);

      const events = await agent.session.getEvents();
      const customEvent = events.find(e => e.type === 'custom_event');

      expect(customEvent).toBeDefined();
      expect(customEvent.data).toBe('test');
      expect(customEvent.agentId).toBe(agent.id);
    });

    test('should log lifecycle events', async () => {
      await agent.start();
      await agent.stop();

      const events = await agent.session.getEvents();

      const startedEvent = events.find(e => e.type === 'agent_started');
      const stoppedEvent = events.find(e => e.type === 'agent_stopped');

      expect(startedEvent).toBeDefined();
      expect(stoppedEvent).toBeDefined();
    });

    test('should emit state_changed events', async () => {
      const stateChanges = [];

      agent.on('state_changed', event => {
        stateChanges.push(event);
      });

      await agent.start();
      await agent.pause();
      await agent.resume();

      expect(stateChanges.length).toBeGreaterThanOrEqual(3);
      expect(stateChanges[0].newState).toBe(AgentState.RUNNING);
      expect(stateChanges[1].newState).toBe(AgentState.PAUSED);
      expect(stateChanges[2].newState).toBe(AgentState.RUNNING);
    });
  });

  describe('Status and Metrics', () => {
    beforeEach(async () => {
      agent = new BaseWorkerAgent();
      await agent.initialize();
    });

    test('should return current status', () => {
      const status = agent.getStatus();

      expect(status.id).toBe(agent.id);
      expect(status.type).toBe(agent.type);
      expect(status.state).toBe(AgentState.IDLE);
      expect(status.metrics).toBeDefined();
    });

    test('should track uptime after start', async () => {
      await agent.start();

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = agent.getStatus();
      expect(status.uptime).toBeGreaterThan(0);
    });

    test('should update metrics', () => {
      agent._updateMetrics({
        tasksCompleted: 5,
        totalExecutionTime: 10000,
      });

      expect(agent.metrics.tasksCompleted).toBe(5);
      expect(agent.metrics.totalExecutionTime).toBe(10000);
      expect(agent.metrics.averageExecutionTime).toBe(2000);
    });

    test('should calculate average execution time', () => {
      agent._updateMetrics({
        tasksCompleted: 3,
        totalExecutionTime: 9000,
      });

      expect(agent.metrics.averageExecutionTime).toBe(3000);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      agent = new BaseWorkerAgent();
      await agent.initialize();
    });

    test('should record errors', () => {
      const error = new Error('Test error');
      agent._recordError(error, { context: 'test' });

      expect(agent.lastError).toBeDefined();
      expect(agent.lastError.message).toBe('Test error');
      expect(agent.lastError.context.context).toBe('test');
      expect(agent.errors.length).toBe(1);
    });

    test('should keep only last 10 errors', () => {
      for (let i = 0; i < 15; i++) {
        agent._recordError(new Error(`Error ${i}`));
      }

      expect(agent.errors.length).toBe(10);
      expect(agent.errors[0].message).toBe('Error 5');
      expect(agent.errors[9].message).toBe('Error 14');
    });

    test('should include last error in status', () => {
      agent._recordError(new Error('Status error'));

      const status = agent.getStatus();

      expect(status.lastError).toBeDefined();
      expect(status.lastError.message).toBe('Status error');
    });

    test('should transition to FAILED on initialization error', async () => {
      agent = new BaseWorkerAgent({ timeout: 500 }); // Valid, but let's force error

      // Override validate to throw
      agent._validate = async () => {
        throw new Error('Validation failed');
      };

      await expect(agent.initialize()).rejects.toThrow('Validation failed');
      expect(agent.state).toBe(AgentState.FAILED);
    });
  });

  describe('Configuration Validation', () => {
    test('should throw error for timeout < 1000ms', async () => {
      agent = new BaseWorkerAgent({ timeout: 500 });

      await expect(agent.initialize()).rejects.toThrow(
        'Timeout must be at least 1000ms'
      );
    });

    test('should accept valid timeout', async () => {
      agent = new BaseWorkerAgent({ timeout: 5000 });

      await agent.initialize();
      expect(agent.config.timeout).toBe(5000);
    });
  });
});
