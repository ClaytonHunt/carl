/**
 * Resource Manager Tests
 *
 * Tests for resource tracking, throttling, and allocation management
 */

const ResourceManager = require('../../plugins/carl/lib/orchestration/resource-manager');
const { ThrottleLevel } = require('../../plugins/carl/lib/orchestration/resource-manager');

describe('ResourceManager', () => {
  let manager;

  beforeEach(() => {
    manager = new ResourceManager({
      sampleInterval: 100,
      sampleSize: 5,
    });
  });

  afterEach(() => {
    manager.stop();
    manager.removeAllListeners();
  });

  describe('Lifecycle', () => {
    test('should start monitoring', () => {
      const started = jest.fn();
      manager.on('monitoring:started', started);

      manager.start();

      expect(manager.monitoringActive).toBe(true);
      expect(started).toHaveBeenCalled();
    });

    test('should stop monitoring', () => {
      const stopped = jest.fn();
      manager.on('monitoring:stopped', stopped);

      manager.start();
      manager.stop();

      expect(manager.monitoringActive).toBe(false);
      expect(stopped).toHaveBeenCalled();
    });

    test('should not start if already monitoring', () => {
      manager.start();
      const interval1 = manager.monitoringInterval;

      manager.start();
      const interval2 = manager.monitoringInterval;

      expect(interval1).toBe(interval2);
    });

    test('should not stop if not monitoring', () => {
      manager.stop();
      expect(manager.monitoringActive).toBe(false);
    });
  });

  describe('Resource Usage Tracking', () => {
    test('should get current usage', () => {
      const usage = manager.getCurrentUsage();

      expect(usage).toHaveProperty('cpu');
      expect(usage).toHaveProperty('memory');
      expect(usage).toHaveProperty('io');
      expect(usage).toHaveProperty('timestamp');
    });

    test('should sample resources periodically', async () => {
      const updated = jest.fn();
      manager.on('usage:update', updated);

      manager.start();

      // Wait for a few samples
      await new Promise(resolve => setTimeout(resolve, 350));

      expect(updated).toHaveBeenCalled();
      expect(manager.usageHistory.length).toBeGreaterThan(0);
    });

    test('should calculate average usage', async () => {
      manager.start();

      // Wait for samples
      await new Promise(resolve => setTimeout(resolve, 350));

      const avgUsage = manager.getAverageUsage();

      expect(avgUsage).toHaveProperty('cpu');
      expect(avgUsage).toHaveProperty('memory');
      expect(avgUsage).toHaveProperty('io');
    });

    test('should limit history size', async () => {
      manager.start();

      // Wait for more samples than sampleSize
      await new Promise(resolve => setTimeout(resolve, 700));

      expect(manager.usageHistory.length).toBeLessThanOrEqual(manager.config.sampleSize);
    });

    test('should return zero average for empty history', () => {
      const avgUsage = manager.getAverageUsage();

      expect(avgUsage.cpu).toBe(0);
      expect(avgUsage.memory).toBe(0);
      expect(avgUsage.io).toBe(0);
    });
  });

  describe('Throttle Level Management', () => {
    test('should start with no throttle', () => {
      expect(manager.getThrottleLevel()).toBe(ThrottleLevel.NONE);
    });

    test('should update throttle level based on usage', async () => {
      const changed = jest.fn();
      manager.on('throttle:changed', changed);

      // Mock high CPU usage
      manager._getCpuUsage = () => 95;

      manager.start();

      // Wait for sampling
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(manager.getThrottleLevel()).not.toBe(ThrottleLevel.NONE);
      expect(changed).toHaveBeenCalled();
    });

    test('should activate backpressure at high usage', async () => {
      const changed = jest.fn();
      manager.on('backpressure:changed', changed);

      // Mock critical usage
      manager._getCpuUsage = () => 96;

      manager.start();

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(manager.isUnderBackpressure()).toBe(true);
      expect(changed).toHaveBeenCalled();
    });

    test('should deactivate backpressure when usage drops', async () => {
      let cpuUsage = 96;
      manager._getCpuUsage = () => cpuUsage;

      manager.start();

      // Wait for high usage
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(manager.isUnderBackpressure()).toBe(true);

      // Drop usage
      cpuUsage = 50;

      // Wait for sampling
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(manager.isUnderBackpressure()).toBe(false);
    });
  });

  describe('Resource Allocation', () => {
    test('should allocate resources to worker', () => {
      const granted = jest.fn();
      manager.on('allocation:granted', granted);

      const success = manager.allocate('worker-1', {
        cpu: 25,
        memory: 1024,
        io: 100,
      });

      expect(success).toBe(true);
      expect(granted).toHaveBeenCalledWith(
        expect.objectContaining({
          workerId: 'worker-1',
        })
      );
    });

    test('should deny allocation exceeding quota', () => {
      const denied = jest.fn();
      manager.on('allocation:denied', denied);

      // Try to allocate more than available
      const success = manager.allocate('worker-1', {
        cpu: 150, // exceeds total
        memory: 1024,
        io: 100,
      });

      expect(success).toBe(false);
      expect(denied).toHaveBeenCalled();
    });

    test('should use default allocation if not specified', () => {
      const success = manager.allocate('worker-1');
      expect(success).toBe(true);
    });

    test('should track multiple allocations', () => {
      manager.allocate('worker-1', { cpu: 25, memory: 1024, io: 100 });
      manager.allocate('worker-2', { cpu: 25, memory: 1024, io: 100 });

      const availability = manager.getAvailability();

      expect(availability.cpu.allocated).toBe(50);
      expect(availability.memory.allocated).toBe(2048);
      expect(availability.io.allocated).toBe(200);
    });

    test('should release worker allocation', () => {
      const released = jest.fn();
      manager.on('allocation:released', released);

      manager.allocate('worker-1', { cpu: 25, memory: 1024, io: 100 });
      manager.release('worker-1');

      const availability = manager.getAvailability();
      expect(availability.cpu.allocated).toBe(0);
      expect(released).toHaveBeenCalled();
    });

    test('should handle releasing non-existent allocation', () => {
      manager.release('worker-999');
      // Should not throw
    });

    test('should prevent over-allocation', () => {
      // Allocate to near capacity
      manager.allocate('worker-1', { cpu: 50, memory: 4096, io: 500 });
      manager.allocate('worker-2', { cpu: 20, memory: 2048, io: 300 });

      // Try to allocate more
      const success = manager.allocate('worker-3', { cpu: 50, memory: 2048, io: 200 });

      expect(success).toBe(false);
    });
  });

  describe('Resource Availability', () => {
    test('should get resource availability', () => {
      const availability = manager.getAvailability();

      expect(availability.cpu).toHaveProperty('total');
      expect(availability.cpu).toHaveProperty('reserved');
      expect(availability.cpu).toHaveProperty('allocated');
      expect(availability.cpu).toHaveProperty('available');

      expect(availability.memory).toHaveProperty('total');
      expect(availability.io).toHaveProperty('total');
    });

    test('should calculate available resources correctly', () => {
      manager.allocate('worker-1', { cpu: 25, memory: 1024, io: 100 });

      const availability = manager.getAvailability();

      expect(availability.cpu.available).toBe(
        availability.cpu.total - availability.cpu.reserved - availability.cpu.allocated
      );
    });
  });

  describe('Recommended Concurrency', () => {
    test('should recommend concurrency based on availability', () => {
      const recommended = manager.getRecommendedConcurrency();
      expect(recommended).toBeGreaterThan(0);
    });

    test('should reduce recommendation under high load', async () => {
      // Mock high CPU usage
      manager._getCpuUsage = () => 90;

      manager.start();
      await new Promise(resolve => setTimeout(resolve, 200));

      const recommendedHigh = manager.getRecommendedConcurrency();

      // Mock low CPU usage
      manager._getCpuUsage = () => 30;
      await new Promise(resolve => setTimeout(resolve, 200));

      const recommendedLow = manager.getRecommendedConcurrency();

      expect(recommendedLow).toBeGreaterThanOrEqual(recommendedHigh);
    });

    test('should never recommend less than 1', () => {
      // Allocate almost everything
      const config = manager.config;
      const nearMaxCpu = config.cpuQuota.total - config.cpuQuota.reserved - 1;

      manager.allocate('worker-1', {
        cpu: nearMaxCpu,
        memory: config.memoryQuota.total - config.memoryQuota.reserved - 1,
        io: config.ioQuota.total - config.ioQuota.reserved - 1,
      });

      const recommended = manager.getRecommendedConcurrency();
      expect(recommended).toBeGreaterThanOrEqual(1);
    });

    test('should consider bottleneck resource', () => {
      // Consume most of one resource type
      const config = manager.config;

      manager.allocate('worker-1', {
        cpu: 10,
        memory: config.memoryQuota.total - config.memoryQuota.reserved - 100,
        io: 10,
      });

      const recommended = manager.getRecommendedConcurrency();

      // Should be limited by memory
      expect(recommended).toBeLessThanOrEqual(2);
    });
  });

  describe('Statistics', () => {
    test('should get comprehensive stats', async () => {
      manager.start();
      await new Promise(resolve => setTimeout(resolve, 200));

      manager.allocate('worker-1', { cpu: 25, memory: 1024, io: 100 });

      const stats = manager.getStats();

      expect(stats).toHaveProperty('current');
      expect(stats).toHaveProperty('average');
      expect(stats).toHaveProperty('availability');
      expect(stats).toHaveProperty('throttleLevel');
      expect(stats).toHaveProperty('backpressureActive');
      expect(stats).toHaveProperty('allocations');
      expect(stats).toHaveProperty('recommendedConcurrency');

      expect(stats.allocations.count).toBe(1);
    });
  });

  describe('Configuration', () => {
    test('should use custom thresholds', () => {
      const customManager = new ResourceManager({
        cpuThreshold: 90,
        memoryThreshold: 85,
        ioThreshold: 75,
      });

      expect(customManager.config.cpuThreshold).toBe(90);
      expect(customManager.config.memoryThreshold).toBe(85);
      expect(customManager.config.ioThreshold).toBe(75);
    });

    test('should use custom quotas', () => {
      const customManager = new ResourceManager({
        cpuQuota: {
          total: 100,
          perWorker: 20,
          reserved: 10,
        },
      });

      expect(customManager.config.cpuQuota.perWorker).toBe(20);
    });

    test('should disable adaptive throttling if configured', () => {
      const customManager = new ResourceManager({
        enableAdaptiveThrottling: false,
      });

      expect(customManager.config.enableAdaptiveThrottling).toBe(false);
    });
  });
});
