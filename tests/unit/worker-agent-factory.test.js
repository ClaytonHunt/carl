/**
 * Unit tests for WorkerAgentFactory
 *
 * Tests cover:
 * - Worker creation with different types
 * - Configuration merging
 * - Custom worker registration
 * - Worker pool creation
 * - Worker type inference
 * - Configuration validation
 */

const WorkerAgentFactory = require('../../plugins/carl/lib/orchestration/worker-agent-factory');
const { WorkerType } = require('../../plugins/carl/lib/orchestration/worker-agent-factory');
const BaseWorkerAgent = require('../../plugins/carl/lib/orchestration/base-worker-agent');
const WorkerOrchestrator = require('../../plugins/carl/lib/orchestration/worker-orchestrator');

describe('WorkerAgentFactory', () => {
  let factory;

  beforeEach(() => {
    factory = new WorkerAgentFactory();
  });

  describe('Worker Creation', () => {
    test('should create generic worker', () => {
      const worker = factory.createWorker(WorkerType.GENERIC);

      expect(worker).toBeInstanceOf(BaseWorkerAgent);
      expect(worker.workerType).toBe(WorkerType.GENERIC);
    });

    test('should create code generation worker', () => {
      const worker = factory.createWorker(WorkerType.CODE_GENERATION);

      expect(worker).toBeInstanceOf(BaseWorkerAgent);
      expect(worker.workerType).toBe(WorkerType.CODE_GENERATION);
      expect(worker.config.timeout).toBe(900000); // 15 minutes
    });

    test('should create testing worker', () => {
      const worker = factory.createWorker(WorkerType.TESTING);

      expect(worker).toBeInstanceOf(BaseWorkerAgent);
      expect(worker.workerType).toBe(WorkerType.TESTING);
      expect(worker.config.timeout).toBe(1200000); // 20 minutes
    });

    test('should create documentation worker', () => {
      const worker = factory.createWorker(WorkerType.DOCUMENTATION);

      expect(worker).toBeInstanceOf(BaseWorkerAgent);
      expect(worker.workerType).toBe(WorkerType.DOCUMENTATION);
    });

    test('should create orchestrator', () => {
      const orchestrator = factory.createOrchestrator();

      expect(orchestrator).toBeInstanceOf(WorkerOrchestrator);
      expect(orchestrator.config.maxConcurrency).toBe(4);
    });

    test('should throw error for invalid worker type', () => {
      expect(() => {
        factory.createWorker('invalid-type');
      }).toThrow('Invalid worker type');
    });
  });

  describe('Configuration Merging', () => {
    test('should merge custom config with defaults', () => {
      const worker = factory.createWorker(WorkerType.CODE_GENERATION, {
        timeout: 500000,
        customField: 'test',
      });

      expect(worker.config.timeout).toBe(500000);
      expect(worker.config.customField).toBe('test');
      expect(worker.config.enableLogging).toBe(true); // Default preserved
    });

    test('should override default configuration', () => {
      const worker = factory.createWorker(WorkerType.TESTING, {
        enableLogging: false,
      });

      expect(worker.config.enableLogging).toBe(false);
    });

    test('should get default config for worker type', () => {
      const config = factory.getDefaultConfig(WorkerType.DEPLOYMENT);

      expect(config.timeout).toBe(1800000); // 30 minutes
      expect(config.enableLogging).toBe(true);
    });
  });

  describe('Worker Pool Creation', () => {
    test('should create multiple workers', () => {
      const workers = factory.createWorkerPool(WorkerType.CODE_GENERATION, 3);

      expect(workers.length).toBe(3);
      workers.forEach(worker => {
        expect(worker).toBeInstanceOf(BaseWorkerAgent);
        expect(worker.workerType).toBe(WorkerType.CODE_GENERATION);
      });
    });

    test('should create workers with unique IDs', () => {
      const workers = factory.createWorkerPool(WorkerType.TESTING, 5);

      const ids = new Set(workers.map(w => w.id));
      expect(ids.size).toBe(5); // All unique
    });

    test('should apply base config to all workers', () => {
      const workers = factory.createWorkerPool(WorkerType.DOCUMENTATION, 2, {
        enableLogging: false,
      });

      workers.forEach(worker => {
        expect(worker.config.enableLogging).toBe(false);
      });
    });

    test('should throw error for invalid pool count', () => {
      expect(() => {
        factory.createWorkerPool(WorkerType.GENERIC, 0);
      }).toThrow('Worker pool count must be at least 1');
    });
  });

  describe('Custom Worker Registration', () => {
    class CustomWorker extends BaseWorkerAgent {
      constructor(config) {
        super(config);
        this.customProperty = 'custom';
      }
    }

    test('should register custom worker type', () => {
      factory.registerWorkerType('custom-type', CustomWorker, {
        timeout: 700000,
      });

      expect(factory.isRegistered('custom-type')).toBe(true);
    });

    test('should create custom worker', () => {
      factory.registerWorkerType('custom-type-2', CustomWorker, {
        timeout: 800000,
      });

      const worker = factory.createWorker('custom-type-2');

      expect(worker).toBeInstanceOf(CustomWorker);
      expect(worker.customProperty).toBe('custom');
      expect(worker.config.timeout).toBe(800000);
    });

    test('should throw error when registering non-worker class', () => {
      class NotAWorker {}

      expect(() => {
        factory.registerWorkerType('invalid', NotAWorker);
      }).toThrow('Worker class must extend BaseWorkerAgent');
    });

    test('should unregister custom worker type', () => {
      factory.registerWorkerType('temp-type', CustomWorker);

      const unregistered = factory.unregisterWorkerType('temp-type');

      expect(unregistered).toBe(true);
      expect(factory.isRegistered('temp-type')).toBe(false);
    });

    test('should not unregister built-in types', () => {
      expect(() => {
        factory.unregisterWorkerType(WorkerType.CODE_GENERATION);
      }).toThrow('Cannot unregister built-in worker type');
    });

    test('should return false when unregistering non-existent type', () => {
      const unregistered = factory.unregisterWorkerType('non-existent');
      expect(unregistered).toBe(false);
    });
  });

  describe('Worker Type Registry', () => {
    test('should get all registered types', () => {
      const types = factory.getRegisteredTypes();

      expect(types).toContain(WorkerType.CODE_GENERATION);
      expect(types).toContain(WorkerType.TESTING);
      expect(types).toContain(WorkerType.ORCHESTRATOR);
    });

    test('should check if type is registered', () => {
      expect(factory.isRegistered(WorkerType.ANALYSIS)).toBe(true);
      expect(factory.isRegistered('unknown-type')).toBe(false);
    });
  });

  describe('Worker Type Inference', () => {
    test('should infer testing worker from description', () => {
      const workItem = {
        id: 'T001',
        description: 'Write unit tests for authentication service',
        title: 'Add tests',
      };

      const worker = factory.createWorkerForWorkItem(workItem);

      expect(worker.workerType).toBe(WorkerType.TESTING);
    });

    test('should infer documentation worker from title', () => {
      const workItem = {
        id: 'T002',
        description: 'Create API reference',
        title: 'Document REST endpoints',
      };

      const worker = factory.createWorkerForWorkItem(workItem);

      expect(worker.workerType).toBe(WorkerType.DOCUMENTATION);
    });

    test('should infer code review worker', () => {
      const workItem = {
        id: 'T003',
        description: 'Review authentication implementation for security',
        title: 'Code review',
      };

      const worker = factory.createWorkerForWorkItem(workItem);

      expect(worker.workerType).toBe(WorkerType.CODE_REVIEW);
    });

    test('should infer analysis worker', () => {
      const workItem = {
        id: 'T004',
        description: 'Analyze codebase dependencies',
        title: 'Dependency analysis',
      };

      const worker = factory.createWorkerForWorkItem(workItem);

      expect(worker.workerType).toBe(WorkerType.ANALYSIS);
    });

    test('should infer deployment worker', () => {
      const workItem = {
        id: 'T005',
        description: 'Deploy service to production',
        title: 'Deployment task',
      };

      const worker = factory.createWorkerForWorkItem(workItem);

      expect(worker.workerType).toBe(WorkerType.DEPLOYMENT);
    });

    test('should infer refactoring worker', () => {
      const workItem = {
        id: 'T006',
        description: 'Refactor authentication logic for better maintainability',
        title: 'Code refactoring',
      };

      const worker = factory.createWorkerForWorkItem(workItem);

      expect(worker.workerType).toBe(WorkerType.REFACTORING);
    });

    test('should infer integration worker', () => {
      const workItem = {
        id: 'T007',
        description: 'Integrate OAuth provider',
        title: 'Third-party integration',
      };

      const worker = factory.createWorkerForWorkItem(workItem);

      expect(worker.workerType).toBe(WorkerType.INTEGRATION);
    });

    test('should infer code generation for implementation tasks', () => {
      const workItem = {
        id: 'T008',
        description: 'Implement user registration endpoint',
        title: 'Create registration feature',
      };

      const worker = factory.createWorkerForWorkItem(workItem);

      expect(worker.workerType).toBe(WorkerType.CODE_GENERATION);
    });

    test('should use explicit worker type if provided', () => {
      const workItem = {
        id: 'T009',
        workerType: WorkerType.TESTING,
        description: 'Implement feature', // Would normally infer CODE_GENERATION
        title: 'Add feature',
      };

      const worker = factory.createWorkerForWorkItem(workItem);

      expect(worker.workerType).toBe(WorkerType.TESTING);
    });

    test('should default to generic worker when unclear', () => {
      const workItem = {
        id: 'T010',
        description: 'Some unclear task',
        title: 'Unknown',
      };

      const worker = factory.createWorkerForWorkItem(workItem);

      expect(worker.workerType).toBe(WorkerType.GENERIC);
    });

    test('should include work item context in worker config', () => {
      const workItem = {
        id: 'T011',
        type: 'task',
        description: 'Test task',
        sessionId: 'session-123',
        context: { extra: 'data' },
      };

      const worker = factory.createWorkerForWorkItem(workItem);

      expect(worker.sessionId).toBe('session-123');
      expect(worker.context.workItemId).toBe('T011');
      expect(worker.context.workItemType).toBe('task');
      expect(worker.context.extra).toBe('data');
    });
  });

  describe('Configuration Validation', () => {
    test('should throw error for invalid timeout', () => {
      expect(() => {
        factory.createWorker(WorkerType.GENERIC, { timeout: 500 });
      }).toThrow('Worker timeout must be at least 1000ms');
    });

    test('should throw error for invalid orchestrator concurrency', () => {
      expect(() => {
        factory.createOrchestrator({ maxConcurrency: 0 });
      }).toThrow('Orchestrator maxConcurrency must be at least 1');
    });

    test('should accept valid orchestrator configuration', () => {
      const orchestrator = factory.createOrchestrator({
        maxConcurrency: 8,
        strategy: 'parallel',
      });

      expect(orchestrator.executionConfig.maxConcurrency).toBe(8);
      expect(orchestrator.executionConfig.strategy).toBe('parallel');
    });
  });
});
