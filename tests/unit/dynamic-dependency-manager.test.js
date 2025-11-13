/**
 * Unit tests for DynamicDependencyManager
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { DependencyGraph } = require('../../plugins/carl/lib/cascade/dependency-graph');
const { DynamicDependencyManager, WorkItemStatus } = require('../../plugins/carl/lib/cascade/dynamic-dependency-manager');

describe('DynamicDependencyManager', () => {
  let graph;
  let manager;

  beforeEach(() => {
    graph = new DependencyGraph();
    manager = new DynamicDependencyManager(graph);
  });

  describe('Adding work items', () => {
    it('should add new work item', () => {
      const added = manager.addWorkItem('F0001', {
        type: 'F',
        title: 'Feature 1',
        status: WorkItemStatus.PLANNED
      });

      assert.strictEqual(added, true);
      assert.strictEqual(graph.hasNode('F0001'), true);
    });

    it('should not add duplicate work item', () => {
      manager.addWorkItem('F0001', { type: 'F', title: 'Feature 1' });
      const added = manager.addWorkItem('F0001', { type: 'F', title: 'Feature 1' });

      assert.strictEqual(added, false);
    });

    it('should emit workitem:added event', (t, done) => {
      manager.on('workitem:added', (data) => {
        assert.strictEqual(data.nodeId, 'F0001');
        done();
      });

      manager.addWorkItem('F0001', { type: 'F', title: 'Feature 1' });
    });
  });

  describe('Removing work items', () => {
    beforeEach(() => {
      manager.addWorkItem('E0001', { type: 'E', title: 'Epic 1' });
      manager.addWorkItem('F0001', { type: 'F', title: 'Feature 1' });
      manager.addDependency('F0001', 'E0001');
    });

    it('should remove work item', () => {
      const removed = manager.removeWorkItem('F0001');

      assert.strictEqual(removed, true);
      assert.strictEqual(graph.hasNode('F0001'), false);
    });

    it('should remove all connected edges', () => {
      manager.removeWorkItem('F0001');

      // Edge should be removed
      assert.strictEqual(graph.hasEdge('F0001', 'E0001'), false);
    });

    it('should not remove non-existent item', () => {
      const removed = manager.removeWorkItem('F9999');

      assert.strictEqual(removed, false);
    });

    it('should emit workitem:removed event', (t, done) => {
      manager.on('workitem:removed', (data) => {
        assert.strictEqual(data.nodeId, 'F0001');
        done();
      });

      manager.removeWorkItem('F0001');
    });
  });

  describe('Adding dependencies', () => {
    beforeEach(() => {
      manager.addWorkItem('E0001', { type: 'E', title: 'Epic 1' });
      manager.addWorkItem('F0001', { type: 'F', title: 'Feature 1' });
    });

    it('should add dependency', () => {
      const result = manager.addDependency('F0001', 'E0001');

      assert.strictEqual(result.success, true);
      assert.strictEqual(graph.hasEdge('F0001', 'E0001'), true);
    });

    it('should reject dependency that creates cycle', () => {
      manager.addDependency('F0001', 'E0001');
      const result = manager.addDependency('E0001', 'F0001');

      assert.strictEqual(result.success, false);
      assert.ok(result.error.includes('cycle'));
    });

    it('should reject dependency to non-existent node', () => {
      const result = manager.addDependency('F0001', 'E9999');

      assert.strictEqual(result.success, false);
      assert.ok(result.error.includes('does not exist'));
    });

    it('should emit dependency:added event', (t, done) => {
      manager.on('dependency:added', (data) => {
        assert.strictEqual(data.from, 'F0001');
        assert.strictEqual(data.to, 'E0001');
        done();
      });

      manager.addDependency('F0001', 'E0001');
    });
  });

  describe('Removing dependencies', () => {
    beforeEach(() => {
      manager.addWorkItem('E0001', { type: 'E', title: 'Epic 1' });
      manager.addWorkItem('F0001', { type: 'F', title: 'Feature 1' });
      manager.addDependency('F0001', 'E0001');
    });

    it('should remove dependency', () => {
      const removed = manager.removeDependency('F0001', 'E0001');

      assert.strictEqual(removed, true);
      assert.strictEqual(graph.hasEdge('F0001', 'E0001'), false);
    });

    it('should not remove non-existent dependency', () => {
      const removed = manager.removeDependency('F0001', 'E9999');

      assert.strictEqual(removed, false);
    });

    it('should emit dependency:removed event', (t, done) => {
      manager.on('dependency:removed', (data) => {
        assert.strictEqual(data.from, 'F0001');
        assert.strictEqual(data.to, 'E0001');
        done();
      });

      manager.removeDependency('F0001', 'E0001');
    });
  });

  describe('Status updates', () => {
    beforeEach(() => {
      manager.addWorkItem('E0001', { type: 'E', title: 'Epic 1' });
      manager.addWorkItem('F0001', { type: 'F', title: 'Feature 1' });
      manager.addWorkItem('S0001', { type: 'S', title: 'Story 1' });

      manager.addDependency('F0001', 'E0001');
      manager.addDependency('S0001', 'F0001');
    });

    it('should update status', () => {
      const updated = manager.updateStatus('F0001', WorkItemStatus.IN_PROGRESS);

      assert.strictEqual(updated, true);
    });

    it('should track completed items', () => {
      manager.updateStatus('E0001', WorkItemStatus.COMPLETED);

      assert.ok(manager.completedItems.has('E0001'));
      assert.strictEqual(manager.completedItems.size, 1);
    });

    it('should track in-progress items', () => {
      manager.updateStatus('F0001', WorkItemStatus.IN_PROGRESS);

      assert.ok(manager.inProgressItems.has('F0001'));
      assert.strictEqual(manager.inProgressItems.size, 1);
    });

    it('should identify unlocked items on completion', (t, done) => {
      manager.on('status:changed', (data) => {
        if (data.newStatus === WorkItemStatus.COMPLETED) {
          // F0001 should be unlocked when E0001 completes
          assert.ok(data.unlockedItems.includes('F0001'));
          done();
        }
      });

      manager.updateStatus('E0001', WorkItemStatus.COMPLETED);
    });

    it('should not unlock items with incomplete dependencies', () => {
      manager.updateStatus('E0001', WorkItemStatus.COMPLETED);

      const available = manager.getAvailableWork();

      // S0001 should not be available (F0001 not completed)
      assert.ok(!available.includes('S0001'));
    });
  });

  describe('Available work', () => {
    beforeEach(() => {
      manager.addWorkItem('E0001', { type: 'E', title: 'Epic 1' });
      manager.addWorkItem('F0001', { type: 'F', title: 'Feature 1' });
      manager.addWorkItem('F0002', { type: 'F', title: 'Feature 2' });
      manager.addWorkItem('S0001', { type: 'S', title: 'Story 1' });

      manager.addDependency('F0001', 'E0001');
      manager.addDependency('F0002', 'E0001');
      manager.addDependency('S0001', 'F0001');
    });

    it('should get items with no dependencies', () => {
      const available = manager.getAvailableWork();

      assert.strictEqual(available.length, 1);
      assert.ok(available.includes('E0001'));
    });

    it('should get next available after completion', () => {
      manager.updateStatus('E0001', WorkItemStatus.COMPLETED);

      const available = manager.getAvailableWork();

      assert.strictEqual(available.length, 2);
      assert.ok(available.includes('F0001'));
      assert.ok(available.includes('F0002'));
    });

    it('should exclude in-progress items', () => {
      manager.updateStatus('E0001', WorkItemStatus.COMPLETED);
      manager.updateStatus('F0001', WorkItemStatus.IN_PROGRESS);

      const available = manager.getAvailableWork();

      assert.strictEqual(available.length, 1);
      assert.ok(available.includes('F0002'));
    });
  });

  describe('Execution planning', () => {
    beforeEach(() => {
      manager.addWorkItem('E0001', { type: 'E', title: 'Epic 1' });
      manager.addWorkItem('F0001', { type: 'F', title: 'Feature 1' });
      manager.addWorkItem('F0002', { type: 'F', title: 'Feature 2' });

      manager.addDependency('F0001', 'E0001');
      manager.addDependency('F0002', 'E0001');
    });

    it('should get execution plan', () => {
      const plan = manager.getExecutionPlan();

      assert.ok(plan.waves);
      assert.ok(plan.metrics);
      assert.strictEqual(plan.waves.length, 2);
    });

    it('should get execution order', () => {
      const order = manager.getExecutionOrder();

      assert.strictEqual(order.success, true);
      assert.strictEqual(order.order.length, 3);
    });
  });

  describe('Validation', () => {
    it('should validate acyclic graph', () => {
      manager.addWorkItem('E0001', { type: 'E', title: 'Epic 1' });
      manager.addWorkItem('F0001', { type: 'F', title: 'Feature 1' });
      manager.addDependency('F0001', 'E0001');

      const validation = manager.validate();

      assert.strictEqual(validation.valid, true);
      assert.strictEqual(validation.errors.length, 0);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      manager.addWorkItem('E0001', { type: 'E', title: 'Epic 1' });
      manager.addWorkItem('F0001', { type: 'F', title: 'Feature 1' });
      manager.addWorkItem('F0002', { type: 'F', title: 'Feature 2' });

      manager.addDependency('F0001', 'E0001');
      manager.addDependency('F0002', 'E0001');

      manager.updateStatus('E0001', WorkItemStatus.COMPLETED);
      manager.updateStatus('F0001', WorkItemStatus.IN_PROGRESS);
    });

    it('should get stats', () => {
      const stats = manager.getStats();

      assert.strictEqual(stats.totalItems, 3);
      assert.strictEqual(stats.totalDependencies, 2);
      assert.strictEqual(stats.completed, 1);
      assert.strictEqual(stats.inProgress, 1);
      assert.strictEqual(stats.pending, 1);
    });
  });

  describe('Status reset', () => {
    beforeEach(() => {
      manager.addWorkItem('E0001', { type: 'E', title: 'Epic 1' });
      manager.addWorkItem('F0001', { type: 'F', title: 'Feature 1' });

      manager.updateStatus('E0001', WorkItemStatus.COMPLETED);
      manager.updateStatus('F0001', WorkItemStatus.IN_PROGRESS);
    });

    it('should reset all statuses', () => {
      manager.resetStatus();

      assert.strictEqual(manager.completedItems.size, 0);
      assert.strictEqual(manager.inProgressItems.size, 0);
    });

    it('should emit status:reset event', (t, done) => {
      manager.on('status:reset', () => {
        done();
      });

      manager.resetStatus();
    });
  });

  describe('Event handling', () => {
    it('should register and unregister handlers', () => {
      const handler = () => {};

      manager.on('test', handler);
      assert.ok(manager.eventHandlers.has('test'));

      manager.off('test', handler);
      assert.strictEqual(manager.eventHandlers.get('test').size, 0);
    });

    it('should handle multiple handlers for same event', (t, done) => {
      let count = 0;

      const handler1 = () => { count++; };
      const handler2 = () => {
        count++;
        assert.strictEqual(count, 2);
        done();
      };

      manager.on('workitem:added', handler1);
      manager.on('workitem:added', handler2);

      manager.addWorkItem('F0001', { type: 'F', title: 'Feature 1' });
    });
  });
});
