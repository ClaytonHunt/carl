/**
 * Communication Layer Unit Tests
 *
 * Comprehensive test suite covering:
 * - Message schema validation
 * - Message serialization/deserialization
 * - Message queue operations
 * - Request routing logic
 * - Response aggregation
 * - Timeout and cancellation
 *
 * Target: 15+ tests with 90%+ coverage
 */

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

// Import communication layer components
const { MessageType, SCHEMA_VERSION, MessageSchemaValidator } = require('../../plugins/carl/lib/orchestration/message-schema');
const { MessageSerializer, MessageFactory } = require('../../plugins/carl/lib/orchestration/message-serializer');
const { MessageQueue, Priority, MessageState } = require('../../plugins/carl/lib/orchestration/message-queue');
const { MessageRouter, WorkerCapability, RoutingStrategy } = require('../../plugins/carl/lib/orchestration/message-router');
const { ResponseAggregator, AggregationStrategy } = require('../../plugins/carl/lib/orchestration/response-aggregator');
const { TimeoutManager, TimeoutStrategy, TaskState } = require('../../plugins/carl/lib/orchestration/timeout-manager');

describe('Communication Layer Tests', () => {
  // Test 1: Message Schema - Task Assignment
  it('should validate task assignment message', () => {
    const message = MessageFactory.createTaskAssignment({
      orchestratorId: 'orch-001',
      workerId: 'worker-001',
      task: {
        workItemId: 'T0136',
        workItemType: 'Task',
        title: 'Define Message Schema',
      },
      execution: {
        timeout: 60000,
        priority: 8,
      },
    });

    const validation = MessageSchemaValidator.validate(message);
    assert.strictEqual(validation.valid, true);
    assert.strictEqual(validation.errors.length, 0);
    assert.strictEqual(message.messageType, MessageType.TASK_ASSIGNMENT);
  });

  // Test 2: Message Schema - Progress Update
  it('should validate progress update message', () => {
    const message = MessageFactory.createProgressUpdate({
      workerId: 'worker-001',
      orchestratorId: 'orch-001',
      correlationId: 'corr-123',
      progress: {
        workItemId: 'T0136',
        percentage: 50,
        status: 'in_progress',
        currentStep: 'Creating schema definitions',
      },
    });

    const validation = MessageSchemaValidator.validate(message);
    assert.strictEqual(validation.valid, true);
    assert.strictEqual(message.progress.percentage, 50);
  });

  // Test 3: Message Schema - Completion Result
  it('should validate completion result message', () => {
    const message = MessageFactory.createCompletionResult({
      workerId: 'worker-001',
      orchestratorId: 'orch-001',
      correlationId: 'corr-123',
      result: {
        workItemId: 'T0136',
        success: true,
        status: 'completed',
        output: { summary: 'Schema defined successfully' },
      },
    });

    const validation = MessageSchemaValidator.validate(message);
    assert.strictEqual(validation.valid, true);
    assert.strictEqual(message.result.success, true);
  });

  // Test 4: Message Schema - Error Message
  it('should validate error message', () => {
    const message = MessageFactory.createErrorMessage({
      workerId: 'worker-001',
      orchestratorId: 'orch-001',
      correlationId: 'corr-123',
      error: {
        workItemId: 'T0136',
        errorType: 'validation',
        message: 'Schema validation failed',
        recovery: {
          isRetryable: true,
          hints: ['Check schema syntax'],
        },
      },
    });

    const validation = MessageSchemaValidator.validate(message);
    assert.strictEqual(validation.valid, true);
    assert.strictEqual(message.error.errorType, 'validation');
  });

  // Test 5: Message Serialization - JSON Serialization
  it('should serialize and deserialize messages', async () => {
    const serializer = new MessageSerializer();

    const original = MessageFactory.createTaskAssignment({
      orchestratorId: 'orch-001',
      workerId: 'worker-001',
      task: {
        workItemId: 'T0136',
        workItemType: 'Task',
        title: 'Test Task',
      },
    });

    const serialized = await serializer.serialize(original);
    const deserialized = await serializer.deserialize(serialized);

    assert.strictEqual(deserialized.messageId, original.messageId);
    assert.strictEqual(deserialized.task.workItemId, 'T0136');
  });

  // Test 6: Message Serialization - Compression
  it('should compress large messages', async () => {
    const serializer = new MessageSerializer({
      compress: true,
      compressionThreshold: 100, // Low threshold for testing
    });

    const largeMessage = MessageFactory.createTaskAssignment({
      orchestratorId: 'orch-001',
      workerId: 'worker-001',
      task: {
        workItemId: 'T0136',
        workItemType: 'Task',
        title: 'Test Task',
        description: 'A'.repeat(1000), // Large description
      },
    });

    const serialized = await serializer.serialize(largeMessage);
    assert.ok(Buffer.isBuffer(serialized)); // Should be compressed to Buffer
  });

  // Test 7: Message Queue - Enqueue and Dequeue
  it('should enqueue and dequeue messages', () => {
    const queue = new MessageQueue();

    const message = MessageFactory.createTaskAssignment({
      orchestratorId: 'orch-001',
      workerId: 'worker-001',
      task: {
        workItemId: 'T0136',
        workItemType: 'Task',
        title: 'Test Task',
      },
    });

    const entryId = queue.enqueue(message);
    assert.ok(entryId);
    assert.strictEqual(queue.size(), 1);

    const entry = queue.dequeue();
    assert.ok(entry);
    assert.strictEqual(entry.message.task.workItemId, 'T0136');
    assert.strictEqual(queue.size(), 0);
  });

  // Test 8: Message Queue - Priority Ordering
  it('should dequeue messages by priority', () => {
    const queue = new MessageQueue();

    // Enqueue with different priorities
    queue.enqueue({ messageId: 'msg-low' }, { priority: Priority.LOW });
    queue.enqueue({ messageId: 'msg-critical' }, { priority: Priority.CRITICAL });
    queue.enqueue({ messageId: 'msg-normal' }, { priority: Priority.NORMAL });

    // Should dequeue critical first
    const first = queue.dequeue();
    assert.strictEqual(first.message.messageId, 'msg-critical');

    // Then normal
    const second = queue.dequeue();
    assert.strictEqual(second.message.messageId, 'msg-normal');

    // Then low
    const third = queue.dequeue();
    assert.strictEqual(third.message.messageId, 'msg-low');
  });

  // Test 9: Message Queue - Acknowledgment
  it('should acknowledge messages', () => {
    const queue = new MessageQueue();

    const message = { messageId: 'msg-001' };
    const entryId = queue.enqueue(message);
    const entry = queue.dequeue();

    const success = queue.acknowledge(entry.id);
    assert.strictEqual(success, true);

    const stats = queue.getStats();
    assert.strictEqual(stats.acknowledged, 1);
  });

  // Test 10: Message Queue - Retry on Failure
  it('should retry failed messages', () => {
    const queue = new MessageQueue();

    const message = { messageId: 'msg-001' };
    const entryId = queue.enqueue(message, { maxRetries: 2 });
    const entry = queue.dequeue();

    // Fail the message
    const willRetry = queue.fail(entry.id, new Error('Test error'));
    assert.strictEqual(willRetry, true);
    assert.strictEqual(queue.size(), 1); // Should be back in queue

    // Can dequeue again
    const retryEntry = queue.dequeue();
    assert.strictEqual(retryEntry.message.messageId, 'msg-001');
    assert.strictEqual(retryEntry.retryCount, 1);
  });

  // Test 11: Message Router - Worker Registration
  it('should register and unregister workers', () => {
    const router = new MessageRouter();

    router.registerWorker('worker-001', [WorkerCapability.CODE_GENERATION]);
    const worker = router.getWorker('worker-001');

    assert.ok(worker);
    assert.strictEqual(worker.workerId, 'worker-001');

    const success = router.unregisterWorker('worker-001');
    assert.strictEqual(success, true);
    assert.strictEqual(router.getWorker('worker-001'), null);
  });

  // Test 12: Message Router - Round Robin Routing
  it('should route tasks using round-robin', () => {
    const router = new MessageRouter();

    router.registerWorker('worker-001', [WorkerCapability.GENERAL]);
    router.registerWorker('worker-002', [WorkerCapability.GENERAL]);
    router.registerWorker('worker-003', [WorkerCapability.GENERAL]);

    const task1 = { workItemId: 'T001' };
    const task2 = { workItemId: 'T002' };
    const task3 = { workItemId: 'T003' };
    const task4 = { workItemId: 'T004' };

    const worker1 = router.route(task1, { strategy: RoutingStrategy.ROUND_ROBIN });
    const worker2 = router.route(task2, { strategy: RoutingStrategy.ROUND_ROBIN });
    const worker3 = router.route(task3, { strategy: RoutingStrategy.ROUND_ROBIN });
    const worker4 = router.route(task4, { strategy: RoutingStrategy.ROUND_ROBIN });

    // Should distribute evenly
    assert.ok(worker1);
    assert.ok(worker2);
    assert.ok(worker3);
    assert.ok(worker4);

    // Fourth task should go to first worker (cycling)
    assert.strictEqual(worker1, worker4);
  });

  // Test 13: Message Router - Capability Matching
  it('should route tasks by capability', () => {
    const router = new MessageRouter();

    router.registerWorker('worker-code', [WorkerCapability.CODE_GENERATION]);
    router.registerWorker('worker-test', [WorkerCapability.TESTING]);

    const codeTask = {
      workItemId: 'T001',
      requiredCapability: WorkerCapability.CODE_GENERATION,
    };

    const testTask = {
      workItemId: 'T002',
      requiredCapability: WorkerCapability.TESTING,
    };

    const codeWorker = router.route(codeTask, { strategy: RoutingStrategy.CAPABILITY_MATCH });
    const testWorker = router.route(testTask, { strategy: RoutingStrategy.CAPABILITY_MATCH });

    assert.strictEqual(codeWorker, 'worker-code');
    assert.strictEqual(testWorker, 'worker-test');
  });

  // Test 14: Response Aggregator - Collect All Strategy
  it('should aggregate all responses', async () => {
    const aggregator = new ResponseAggregator();

    const requests = [
      { correlationId: 'corr-001', workerId: 'worker-001' },
      { correlationId: 'corr-002', workerId: 'worker-002' },
    ];

    const contextId = aggregator.createContext('ctx-001', requests, {
      strategy: AggregationStrategy.COLLECT_ALL,
    });

    // Add responses
    aggregator.addResponse('corr-001', { result: 'success-1' });
    aggregator.addResponse('corr-002', { result: 'success-2' });

    const results = await aggregator.waitForCompletion(contextId, 1000);

    assert.strictEqual(results.receivedCount, 2);
    assert.strictEqual(results.results.length, 2);
    assert.strictEqual(results.isPartial, false);
  });

  // Test 15: Response Aggregator - Partial Results on Timeout
  it('should handle partial results on timeout', async () => {
    const aggregator = new ResponseAggregator({ defaultTimeout: 200 });

    const requests = [
      { correlationId: 'corr-001', workerId: 'worker-001' },
      { correlationId: 'corr-002', workerId: 'worker-002' },
    ];

    const contextId = aggregator.createContext('ctx-001', requests, {
      strategy: AggregationStrategy.COLLECT_ALL, // Use COLLECT_ALL to wait for timeout
      allowPartialResults: true,
      timeout: 200,
    });

    // Only respond to one
    aggregator.addResponse('corr-001', { result: 'success-1' });

    // Wait for timeout (context timeout is 200ms)
    const results = await aggregator.waitForCompletion(contextId, 400);

    assert.strictEqual(results.receivedCount, 1);
    assert.ok(results.timeoutCount >= 1); // At least one timeout
    assert.strictEqual(results.isPartial, true);

    aggregator.stop();
  });

  // Test 16: Timeout Manager - Task Tracking
  it('should track tasks with timeout', () => {
    const manager = new TimeoutManager({ checkInterval: 100 });

    manager.trackTask('T001', 'worker-001', {
      timeout: 5000,
      taskType: 'Task',
    });

    const task = manager.getTask('T001');
    assert.ok(task);
    assert.strictEqual(task.taskId, 'T001');
    assert.strictEqual(task.state, TaskState.ACTIVE);

    manager.stop();
  });

  // Test 17: Timeout Manager - Timeout Detection
  it('should detect task timeout', async () => {
    const manager = new TimeoutManager({
      checkInterval: 50,
      defaultTimeout: 200,
    });

    let timeoutDetected = false;
    manager.on('task:timeout', () => {
      timeoutDetected = true;
    });

    manager.trackTask('T001', 'worker-001', {
      timeout: 200,
      strategy: TimeoutStrategy.SOFT,
    });

    // Wait for timeout to trigger
    await new Promise(resolve => setTimeout(resolve, 300));

    assert.strictEqual(timeoutDetected, true);

    manager.stop();
  });

  // Test 18: Timeout Manager - Graceful Cancellation
  it('should send cancellation message', async () => {
    const manager = new TimeoutManager();

    let cancellationSent = false;
    manager.on('task:cancellation:sent', () => {
      cancellationSent = true;
    });

    manager.trackTask('T001', 'worker-001', {
      correlationId: 'corr-001',
    });

    await manager.cancelTask('T001', {
      reason: 'Test cancellation',
      graceful: true,
    });

    assert.strictEqual(cancellationSent, true);

    const task = manager.getTask('T001');
    assert.strictEqual(task.state, TaskState.CANCELLED);

    manager.stop();
  });

  // Test 19: Integration - End-to-End Message Flow
  it('should handle complete message flow', async () => {
    const queue = new MessageQueue();
    const router = new MessageRouter();
    const serializer = new MessageSerializer();

    // Register workers
    router.registerWorker('worker-001', [WorkerCapability.CODE_GENERATION]);

    // Create and enqueue task
    const message = MessageFactory.createTaskAssignment({
      orchestratorId: 'orch-001',
      workerId: 'worker-001',
      task: {
        workItemId: 'T0136',
        workItemType: 'Task',
        title: 'Integration Test',
      },
    });

    // Serialize
    const serialized = await serializer.serialize(message);
    assert.ok(serialized);

    // Deserialize
    const deserialized = await serializer.deserialize(serialized);

    // Enqueue
    const entryId = queue.enqueue(deserialized);

    // Route
    const workerId = router.route(deserialized.task);
    assert.strictEqual(workerId, 'worker-001');

    // Dequeue
    const entry = queue.dequeue();
    assert.ok(entry);

    // Acknowledge
    const success = queue.acknowledge(entry.id);
    assert.strictEqual(success, true);

    router.stop();
  });

  // Test 20: Integration - Error Handling Flow
  it('should handle error flow with retries', async () => {
    const queue = new MessageQueue();
    const aggregator = new ResponseAggregator();

    const message = { messageId: 'msg-001', workItemId: 'T001' };
    const entryId = queue.enqueue(message, { maxRetries: 2 });

    // Create aggregation context
    const requests = [{ correlationId: 'corr-001', workerId: 'worker-001' }];
    const contextId = aggregator.createContext('ctx-001', requests);

    // Dequeue and fail
    const entry = queue.dequeue();
    const willRetry = queue.fail(entry.id, new Error('Processing failed'));

    assert.strictEqual(willRetry, true);

    // Add error to aggregator
    aggregator.addError('corr-001', new Error('Processing failed'));

    // Check queue has retry
    assert.strictEqual(queue.size(), 1);

    aggregator.stop();
  });
});
