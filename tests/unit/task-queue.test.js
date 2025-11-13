/**
 * Task Queue Tests
 *
 * Tests for the TaskQueue class including FIFO, priority, and LIFO strategies
 */

const TaskQueue = require('../../plugins/carl/lib/orchestration/task-queue');

describe('TaskQueue', () => {
  describe('FIFO Strategy', () => {
    let queue;

    beforeEach(() => {
      queue = new TaskQueue('fifo');
    });

    test('should enqueue and dequeue in FIFO order', () => {
      queue.enqueue({ id: 'T1', priority: 'medium' });
      queue.enqueue({ id: 'T2', priority: 'medium' });
      queue.enqueue({ id: 'T3', priority: 'medium' });

      expect(queue.dequeue().id).toBe('T1');
      expect(queue.dequeue().id).toBe('T2');
      expect(queue.dequeue().id).toBe('T3');
    });

    test('should return null when dequeueing empty queue', () => {
      expect(queue.dequeue()).toBeNull();
    });

    test('should track queue size correctly', () => {
      expect(queue.size()).toBe(0);
      queue.enqueue({ id: 'T1', priority: 'medium' });
      expect(queue.size()).toBe(1);
      queue.enqueue({ id: 'T2', priority: 'medium' });
      expect(queue.size()).toBe(2);
      queue.dequeue();
      expect(queue.size()).toBe(1);
    });

    test('should check if queue is empty', () => {
      expect(queue.isEmpty()).toBe(true);
      queue.enqueue({ id: 'T1', priority: 'medium' });
      expect(queue.isEmpty()).toBe(false);
    });

    test('should peek without removing', () => {
      queue.enqueue({ id: 'T1', priority: 'medium' });
      queue.enqueue({ id: 'T2', priority: 'medium' });

      const peeked = queue.peek();
      expect(peeked.id).toBe('T1');
      expect(queue.size()).toBe(2);
    });

    test('should throw error for duplicate task IDs', () => {
      queue.enqueue({ id: 'T1', priority: 'medium' });
      expect(() => queue.enqueue({ id: 'T1', priority: 'high' })).toThrow();
    });

    test('should throw error for task without ID', () => {
      expect(() => queue.enqueue({ priority: 'medium' })).toThrow();
    });

    test('should remove specific task', () => {
      queue.enqueue({ id: 'T1', priority: 'medium' });
      queue.enqueue({ id: 'T2', priority: 'medium' });
      queue.enqueue({ id: 'T3', priority: 'medium' });

      expect(queue.remove('T2')).toBe(true);
      expect(queue.size()).toBe(2);
      expect(queue.contains('T2')).toBe(false);
    });

    test('should return false when removing non-existent task', () => {
      expect(queue.remove('T999')).toBe(false);
    });

    test('should clear all tasks', () => {
      queue.enqueue({ id: 'T1', priority: 'medium' });
      queue.enqueue({ id: 'T2', priority: 'medium' });

      queue.clear();
      expect(queue.size()).toBe(0);
      expect(queue.isEmpty()).toBe(true);
    });

    test('should check if task is in queue', () => {
      queue.enqueue({ id: 'T1', priority: 'medium' });

      expect(queue.contains('T1')).toBe(true);
      expect(queue.contains('T999')).toBe(false);
    });

    test('should get task by ID', () => {
      queue.enqueue({ id: 'T1', priority: 'medium', name: 'Task 1' });

      const task = queue.getTask('T1');
      expect(task.id).toBe('T1');
      expect(task.name).toBe('Task 1');
    });

    test('should set default values for enqueued tasks', () => {
      queue.enqueue({ id: 'T1' });

      const task = queue.getTask('T1');
      expect(task.priority).toBe('medium');
      expect(task.retryCount).toBe(0);
      expect(task.maxRetries).toBe(3);
      expect(task.timeout).toBe(600000);
      expect(task.enqueuedAt).toBeInstanceOf(Date);
    });

    test('should return array of all tasks', () => {
      queue.enqueue({ id: 'T1', priority: 'medium' });
      queue.enqueue({ id: 'T2', priority: 'medium' });

      const tasks = queue.toArray();
      expect(tasks).toHaveLength(2);
      expect(tasks[0].id).toBe('T1');
      expect(tasks[1].id).toBe('T2');
    });
  });

  describe('Priority Strategy', () => {
    let queue;

    beforeEach(() => {
      queue = new TaskQueue('priority');
    });

    test('should dequeue high priority tasks first', () => {
      queue.enqueue({ id: 'T1', priority: 'low' });
      queue.enqueue({ id: 'T2', priority: 'high' });
      queue.enqueue({ id: 'T3', priority: 'medium' });

      expect(queue.dequeue().id).toBe('T2'); // high
      expect(queue.dequeue().id).toBe('T3'); // medium
      expect(queue.dequeue().id).toBe('T1'); // low
    });

    test('should maintain FIFO order within same priority', () => {
      queue.enqueue({ id: 'T1', priority: 'high' });
      queue.enqueue({ id: 'T2', priority: 'high' });
      queue.enqueue({ id: 'T3', priority: 'high' });

      expect(queue.dequeue().id).toBe('T1');
      expect(queue.dequeue().id).toBe('T2');
      expect(queue.dequeue().id).toBe('T3');
    });

    test('should reorder after changing priority', () => {
      queue.enqueue({ id: 'T1', priority: 'low' });
      queue.enqueue({ id: 'T2', priority: 'low' });

      queue.setPriority('T2', 'high');

      expect(queue.dequeue().id).toBe('T2');
      expect(queue.dequeue().id).toBe('T1');
    });

    test('should throw error when setting priority for non-existent task', () => {
      expect(() => queue.setPriority('T999', 'high')).toThrow();
    });

    test('should handle mixed priority insertion correctly', () => {
      queue.enqueue({ id: 'T1', priority: 'medium' });
      queue.enqueue({ id: 'T2', priority: 'low' });
      queue.enqueue({ id: 'T3', priority: 'high' });
      queue.enqueue({ id: 'T4', priority: 'medium' });
      queue.enqueue({ id: 'T5', priority: 'high' });

      expect(queue.dequeue().id).toBe('T3'); // high
      expect(queue.dequeue().id).toBe('T5'); // high
      expect(queue.dequeue().id).toBe('T1'); // medium
      expect(queue.dequeue().id).toBe('T4'); // medium
      expect(queue.dequeue().id).toBe('T2'); // low
    });
  });

  describe('LIFO Strategy', () => {
    let queue;

    beforeEach(() => {
      queue = new TaskQueue('lifo');
    });

    test('should dequeue in LIFO order', () => {
      queue.enqueue({ id: 'T1', priority: 'medium' });
      queue.enqueue({ id: 'T2', priority: 'medium' });
      queue.enqueue({ id: 'T3', priority: 'medium' });

      expect(queue.dequeue().id).toBe('T3');
      expect(queue.dequeue().id).toBe('T2');
      expect(queue.dequeue().id).toBe('T1');
    });
  });

  describe('Statistics', () => {
    let queue;

    beforeEach(() => {
      queue = new TaskQueue('priority');
    });

    test('should return queue statistics', () => {
      queue.enqueue({ id: 'T1', priority: 'high' });
      queue.enqueue({ id: 'T2', priority: 'medium' });
      queue.enqueue({ id: 'T3', priority: 'low' });
      queue.enqueue({ id: 'T4', priority: 'high' });

      const stats = queue.getStats();

      expect(stats.total).toBe(4);
      expect(stats.byPriority.high).toBe(2);
      expect(stats.byPriority.medium).toBe(1);
      expect(stats.byPriority.low).toBe(1);
      expect(stats.oldestTask).toBeDefined();
      expect(stats.newestTask).toBeDefined();
    });

    test('should handle empty queue statistics', () => {
      const stats = queue.getStats();

      expect(stats.total).toBe(0);
      expect(stats.byPriority.high).toBe(0);
      expect(stats.oldestTask).toBeNull();
      expect(stats.newestTask).toBeNull();
    });

    test('should calculate wait times', () => {
      queue.enqueue({ id: 'T1', priority: 'medium' });

      // Wait a bit
      const stats = queue.getStats();
      expect(stats.oldestTask.waitTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Invalid Strategy', () => {
    test('should handle invalid strategy gracefully', () => {
      const queue = new TaskQueue('invalid');
      queue.enqueue({ id: 'T1', priority: 'medium' });
      queue.enqueue({ id: 'T2', priority: 'medium' });

      // Should behave like FIFO when strategy is unknown
      expect(queue.dequeue().id).toBe('T1');
      expect(queue.dequeue().id).toBe('T2');
    });
  });
});
