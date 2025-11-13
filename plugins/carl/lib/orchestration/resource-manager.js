/**
 * Resource Manager - Monitors system resources and enforces throttling
 *
 * Tracks CPU, memory, and I/O usage to prevent system overload during
 * parallel execution with adaptive throttling and backpressure handling.
 */

const EventEmitter = require('events');
const os = require('os');

// Throttle levels
const ThrottleLevel = {
  NONE: 'none', // No throttling, full speed
  LIGHT: 'light', // Slight slowdown
  MODERATE: 'moderate', // Moderate slowdown
  HEAVY: 'heavy', // Significant slowdown
  CRITICAL: 'critical', // Near shutdown, emergency braking
};

class ResourceManager extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      // Resource thresholds (percentage)
      cpuThreshold: config.cpuThreshold || 80,
      memoryThreshold: config.memoryThreshold || 75,
      ioThreshold: config.ioThreshold || 70,

      // Sampling configuration
      sampleInterval: config.sampleInterval || 1000, // 1 second
      sampleSize: config.sampleSize || 10, // number of samples to average

      // Adaptive throttling
      enableAdaptiveThrottling: config.enableAdaptiveThrottling !== false,
      scaleUpThreshold: config.scaleUpThreshold || 50, // % usage to scale up
      scaleDownThreshold: config.scaleDownThreshold || 85, // % usage to scale down

      // Resource quotas (for allocation tracking)
      cpuQuota: config.cpuQuota || {
        total: 100, // percentage
        perWorker: 25, // max per worker
        reserved: 20, // reserved for system
      },
      memoryQuota: config.memoryQuota || {
        total: 8192, // MB
        perWorker: 1024, // max per worker
        reserved: 2048, // reserved for system
      },
      ioQuota: config.ioQuota || {
        total: 1000, // ops/sec
        perWorker: 250, // max per worker
        reserved: 100, // reserved for system
      },

      ...config,
    };

    // Resource tracking
    this.currentUsage = {
      cpu: 0,
      memory: 0,
      io: 0,
      timestamp: Date.now(),
    };

    this.usageHistory = [];
    this.throttleLevel = ThrottleLevel.NONE;
    this.isBackpressureActive = false;

    // Allocation tracking
    this.allocations = new Map(); // workerId -> { cpu, memory, io }

    // Monitoring
    this.monitoringActive = false;
    this.monitoringInterval = null;
  }

  /**
   * Start resource monitoring
   */
  start() {
    if (this.monitoringActive) {
      return;
    }

    this.monitoringActive = true;
    this.monitoringInterval = setInterval(() => {
      this._sampleResources();
    }, this.config.sampleInterval);

    this.emit('monitoring:started', { timestamp: Date.now() });
  }

  /**
   * Stop resource monitoring
   */
  stop() {
    if (!this.monitoringActive) {
      return;
    }

    this.monitoringActive = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.emit('monitoring:stopped', { timestamp: Date.now() });
  }

  /**
   * Get current resource usage
   * @returns {Object} Current usage stats
   */
  getCurrentUsage() {
    return { ...this.currentUsage };
  }

  /**
   * Get average resource usage over recent samples
   * @returns {Object} Average usage stats
   */
  getAverageUsage() {
    if (this.usageHistory.length === 0) {
      return { cpu: 0, memory: 0, io: 0 };
    }

    const sum = this.usageHistory.reduce(
      (acc, sample) => ({
        cpu: acc.cpu + sample.cpu,
        memory: acc.memory + sample.memory,
        io: acc.io + sample.io,
      }),
      { cpu: 0, memory: 0, io: 0 }
    );

    const count = this.usageHistory.length;
    return {
      cpu: sum.cpu / count,
      memory: sum.memory / count,
      io: sum.io / count,
    };
  }

  /**
   * Get current throttle level
   * @returns {string} Throttle level
   */
  getThrottleLevel() {
    return this.throttleLevel;
  }

  /**
   * Check if backpressure is active
   * @returns {boolean} True if backpressure active
   */
  isUnderBackpressure() {
    return this.isBackpressureActive;
  }

  /**
   * Allocate resources to a worker
   * @param {string} workerId - Worker ID
   * @param {Object} request - Resource request { cpu, memory, io }
   * @returns {boolean} True if allocated, false if denied
   */
  allocate(workerId, request = {}) {
    const allocation = {
      cpu: request.cpu || this.config.cpuQuota.perWorker,
      memory: request.memory || this.config.memoryQuota.perWorker,
      io: request.io || this.config.ioQuota.perWorker,
    };

    // Check if allocation would exceed quotas
    const totalAllocated = this._getTotalAllocated();
    const availableCpu =
      this.config.cpuQuota.total - this.config.cpuQuota.reserved - totalAllocated.cpu;
    const availableMemory =
      this.config.memoryQuota.total -
      this.config.memoryQuota.reserved -
      totalAllocated.memory;
    const availableIo =
      this.config.ioQuota.total - this.config.ioQuota.reserved - totalAllocated.io;

    if (
      allocation.cpu > availableCpu ||
      allocation.memory > availableMemory ||
      allocation.io > availableIo
    ) {
      this.emit('allocation:denied', {
        workerId,
        request: allocation,
        available: { cpu: availableCpu, memory: availableMemory, io: availableIo },
        timestamp: Date.now(),
      });
      return false;
    }

    // Allocate resources
    this.allocations.set(workerId, allocation);

    this.emit('allocation:granted', {
      workerId,
      allocation,
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Release resources from a worker
   * @param {string} workerId - Worker ID
   */
  release(workerId) {
    const allocation = this.allocations.get(workerId);
    if (!allocation) {
      return;
    }

    this.allocations.delete(workerId);

    this.emit('allocation:released', {
      workerId,
      allocation,
      timestamp: Date.now(),
    });
  }

  /**
   * Get resource availability
   * @returns {Object} Available resources
   */
  getAvailability() {
    const totalAllocated = this._getTotalAllocated();

    return {
      cpu: {
        total: this.config.cpuQuota.total,
        reserved: this.config.cpuQuota.reserved,
        allocated: totalAllocated.cpu,
        available:
          this.config.cpuQuota.total - this.config.cpuQuota.reserved - totalAllocated.cpu,
      },
      memory: {
        total: this.config.memoryQuota.total,
        reserved: this.config.memoryQuota.reserved,
        allocated: totalAllocated.memory,
        available:
          this.config.memoryQuota.total -
          this.config.memoryQuota.reserved -
          totalAllocated.memory,
      },
      io: {
        total: this.config.ioQuota.total,
        reserved: this.config.ioQuota.reserved,
        allocated: totalAllocated.io,
        available:
          this.config.ioQuota.total - this.config.ioQuota.reserved - totalAllocated.io,
      },
    };
  }

  /**
   * Get recommended concurrency based on resource availability
   * @returns {number} Recommended worker count
   */
  getRecommendedConcurrency() {
    const availability = this.getAvailability();
    const avgUsage = this.getAverageUsage();

    // Calculate how many workers we could support based on each resource
    const cpuCapacity = Math.floor(availability.cpu.available / this.config.cpuQuota.perWorker);
    const memoryCapacity = Math.floor(
      availability.memory.available / this.config.memoryQuota.perWorker
    );
    const ioCapacity = Math.floor(availability.io.available / this.config.ioQuota.perWorker);

    // Take the minimum (bottleneck resource)
    let recommended = Math.min(cpuCapacity, memoryCapacity, ioCapacity);

    // Apply throttling if current usage is high
    if (avgUsage.cpu > this.config.scaleDownThreshold) {
      recommended = Math.floor(recommended * 0.5);
    } else if (avgUsage.cpu < this.config.scaleUpThreshold) {
      recommended = Math.ceil(recommended * 1.5);
    }

    return Math.max(1, recommended);
  }

  /**
   * Sample current resource usage
   * @private
   */
  _sampleResources() {
    const usage = {
      cpu: this._getCpuUsage(),
      memory: this._getMemoryUsage(),
      io: this._getIoUsage(),
      timestamp: Date.now(),
    };

    this.currentUsage = usage;

    // Add to history
    this.usageHistory.push(usage);
    if (this.usageHistory.length > this.config.sampleSize) {
      this.usageHistory.shift();
    }

    // Update throttle level
    this._updateThrottleLevel(usage);

    // Emit usage update
    this.emit('usage:update', usage);
  }

  /**
   * Get CPU usage percentage
   * @returns {number} CPU usage (0-100)
   * @private
   */
  _getCpuUsage() {
    const cpus = os.cpus();

    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~((100 * idle) / total);

    return Math.min(100, Math.max(0, usage));
  }

  /**
   * Get memory usage percentage
   * @returns {number} Memory usage (0-100)
   * @private
   */
  _getMemoryUsage() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const usage = (usedMem / totalMem) * 100;

    return Math.min(100, Math.max(0, usage));
  }

  /**
   * Get I/O usage percentage (simulated for now)
   * @returns {number} I/O usage (0-100)
   * @private
   */
  _getIoUsage() {
    // Real implementation would monitor disk I/O
    // For now, return a simulated value based on worker count
    const workerCount = this.allocations.size;
    const maxWorkers = 10; // arbitrary max
    const usage = (workerCount / maxWorkers) * 100;

    return Math.min(100, Math.max(0, usage));
  }

  /**
   * Update throttle level based on usage
   * @param {Object} usage - Current usage stats
   * @private
   */
  _updateThrottleLevel(usage) {
    const maxUsage = Math.max(usage.cpu, usage.memory, usage.io);
    let newLevel = ThrottleLevel.NONE;
    let backpressure = false;

    if (maxUsage >= 95) {
      newLevel = ThrottleLevel.CRITICAL;
      backpressure = true;
    } else if (maxUsage >= 90) {
      newLevel = ThrottleLevel.HEAVY;
      backpressure = true;
    } else if (maxUsage >= 80) {
      newLevel = ThrottleLevel.MODERATE;
    } else if (maxUsage >= 70) {
      newLevel = ThrottleLevel.LIGHT;
    } else {
      newLevel = ThrottleLevel.NONE;
    }

    // Emit events if levels changed
    if (newLevel !== this.throttleLevel) {
      const oldLevel = this.throttleLevel;
      this.throttleLevel = newLevel;

      this.emit('throttle:changed', {
        oldLevel,
        newLevel,
        usage: maxUsage,
        timestamp: Date.now(),
      });
    }

    if (backpressure !== this.isBackpressureActive) {
      this.isBackpressureActive = backpressure;

      this.emit('backpressure:changed', {
        active: backpressure,
        level: newLevel,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Get total allocated resources
   * @returns {Object} Total allocations
   * @private
   */
  _getTotalAllocated() {
    let totalCpu = 0;
    let totalMemory = 0;
    let totalIo = 0;

    for (const allocation of this.allocations.values()) {
      totalCpu += allocation.cpu;
      totalMemory += allocation.memory;
      totalIo += allocation.io;
    }

    return {
      cpu: totalCpu,
      memory: totalMemory,
      io: totalIo,
    };
  }

  /**
   * Get resource statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const avgUsage = this.getAverageUsage();
    const availability = this.getAvailability();

    return {
      current: this.currentUsage,
      average: avgUsage,
      availability,
      throttleLevel: this.throttleLevel,
      backpressureActive: this.isBackpressureActive,
      allocations: {
        count: this.allocations.size,
        total: this._getTotalAllocated(),
      },
      recommendedConcurrency: this.getRecommendedConcurrency(),
    };
  }
}

// Export ResourceManager and constants
module.exports = ResourceManager;
module.exports.ThrottleLevel = ThrottleLevel;
