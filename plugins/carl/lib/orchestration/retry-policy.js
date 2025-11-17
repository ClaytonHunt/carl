/**
 * Retry Policy
 *
 * Configurable retry strategies with support for:
 * - Multiple retry algorithms (exponential, linear, constant)
 * - Jitter to prevent thundering herd
 * - Custom retry conditions
 * - Error classification (transient vs permanent)
 * - Timeout enforcement
 * - Retry attempt tracking
 *
 * Based on industry best practices:
 * - AWS retry strategies
 * - Microsoft Azure retry patterns
 * - Google Cloud retry guidelines
 */

// Retry policy types
const RetryType = {
  EXPONENTIAL: 'exponential',
  LINEAR: 'linear',
  CONSTANT: 'constant',
  NONE: 'none',
};

// Failure types
const FailureType = {
  TRANSIENT: 'transient',
  PERMANENT: 'permanent',
  PARTIAL: 'partial',
  UNKNOWN: 'unknown',
};

class RetryPolicy {
  /**
   * Create a retry policy
   * @param {Object} options - Configuration options
   * @param {string} [options.type='exponential'] - Retry type (exponential, linear, constant, none)
   * @param {number} [options.maxRetries=3] - Maximum number of retry attempts
   * @param {number} [options.initialDelay=100] - Initial delay in milliseconds
   * @param {number} [options.maxDelay=30000] - Maximum delay in milliseconds
   * @param {number} [options.multiplier=2.0] - Backoff multiplier (for exponential/linear)
   * @param {number} [options.jitterVariance=0.1] - Jitter variance (0.1 = 10%)
   * @param {Array<string|RegExp>} [options.retryableErrors=[]] - Patterns for retryable errors
   * @param {Array<string|RegExp>} [options.nonRetryableErrors=[]] - Patterns for non-retryable errors
   * @param {Function} [options.shouldRetry] - Custom retry condition (error, attempt) => boolean
   * @param {Function} [options.errorClassifier] - Custom error classifier (error) => 'transient'|'permanent'
   * @param {number} [options.timeout] - Overall timeout for all retries in milliseconds
   */
  constructor(options = {}) {
    this.type = options.type || RetryType.EXPONENTIAL;
    this.maxRetries = options.maxRetries !== undefined ? options.maxRetries : 3;
    this.initialDelay = options.initialDelay || 100;
    this.maxDelay = options.maxDelay || 30000;
    this.multiplier = options.multiplier || 2.0;
    this.jitterVariance = options.jitterVariance !== undefined ? options.jitterVariance : 0.1;
    this.retryableErrors = options.retryableErrors || [];
    this.nonRetryableErrors = options.nonRetryableErrors || [];
    this.customShouldRetry = options.shouldRetry;
    this.errorClassifier = options.errorClassifier || this._defaultErrorClassifier.bind(this);
    this.timeout = options.timeout;

    // Retry history tracking
    this.attempts = [];
    this.totalDelay = 0;
    this.startTime = null;

    // Validate configuration
    this._validateConfig();
  }

  /**
   * Validate configuration
   * @private
   */
  _validateConfig() {
    if (this.maxRetries < 0) {
      throw new Error('maxRetries must be non-negative');
    }

    if (this.initialDelay < 0) {
      throw new Error('initialDelay must be non-negative');
    }

    if (this.maxDelay < this.initialDelay) {
      throw new Error('maxDelay must be >= initialDelay');
    }

    if (this.multiplier < 1) {
      throw new Error('multiplier must be >= 1.0');
    }

    if (this.jitterVariance < 0 || this.jitterVariance > 1) {
      throw new Error('jitterVariance must be between 0 and 1');
    }

    if (![RetryType.EXPONENTIAL, RetryType.LINEAR, RetryType.CONSTANT, RetryType.NONE].includes(this.type)) {
      throw new Error(`Invalid retry type: ${this.type}`);
    }
  }

  /**
   * Determine if retry should be attempted
   * @param {Error} error - The error that occurred
   * @param {number} attempt - Current attempt number (0-indexed)
   * @returns {boolean} True if should retry
   */
  shouldRetry(error, attempt) {
    // Check if custom retry condition provided
    if (this.customShouldRetry) {
      return this.customShouldRetry(error, attempt);
    }

    // No retries for 'none' type
    if (this.type === RetryType.NONE) {
      return false;
    }

    // Check retry limit
    if (attempt >= this.maxRetries) {
      return false;
    }

    // Check timeout
    if (this.timeout && this.startTime) {
      const elapsed = Date.now() - this.startTime;
      if (elapsed >= this.timeout) {
        return false;
      }
    }

    // Check if error is retryable
    return this.isRetryable(error);
  }

  /**
   * Check if error is retryable based on classification
   * @param {Error} error - The error to check
   * @returns {boolean} True if retryable
   */
  isRetryable(error) {
    // Check explicit non-retryable patterns first
    if (this._matchesPatterns(error, this.nonRetryableErrors)) {
      return false;
    }

    // Check explicit retryable patterns
    if (this._matchesPatterns(error, this.retryableErrors)) {
      return true;
    }

    // Use error classifier
    const failureType = this.errorClassifier(error);
    return failureType === FailureType.TRANSIENT || failureType === FailureType.PARTIAL;
  }

  /**
   * Check if error matches any of the patterns
   * @param {Error} error - The error to check
   * @param {Array<string|RegExp>} patterns - Patterns to match against
   * @returns {boolean} True if matches any pattern
   * @private
   */
  _matchesPatterns(error, patterns) {
    const errorMessage = error.message || String(error);

    for (const pattern of patterns) {
      if (pattern instanceof RegExp) {
        if (pattern.test(errorMessage)) {
          return true;
        }
      } else if (typeof pattern === 'string') {
        if (errorMessage.includes(pattern)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Default error classifier
   * @param {Error} error - The error to classify
   * @returns {string} Failure type
   * @private
   */
  _defaultErrorClassifier(error) {
    // HTTP status codes
    if (error.statusCode) {
      // Transient errors
      if ([408, 429, 503, 504, 502].includes(error.statusCode)) {
        return FailureType.TRANSIENT;
      }

      // Permanent errors
      if ([400, 401, 403, 404, 405, 409, 410, 422].includes(error.statusCode)) {
        return FailureType.PERMANENT;
      }
    }

    // Network errors (typically transient)
    if (error.code) {
      const transientCodes = [
        'ETIMEDOUT',
        'ECONNREFUSED',
        'ECONNRESET',
        'ENOTFOUND',
        'EHOSTUNREACH',
        'ENETUNREACH',
        'EAI_AGAIN',
      ];

      if (transientCodes.includes(error.code)) {
        return FailureType.TRANSIENT;
      }
    }

    // Error message patterns
    const message = (error.message || '').toLowerCase();

    // Transient patterns
    const transientPatterns = [
      'timeout',
      'timed out',
      'rate limit',
      'too many requests',
      'temporarily unavailable',
      'service unavailable',
      'try again',
      'connection refused',
      'connection reset',
    ];

    if (transientPatterns.some(pattern => message.includes(pattern))) {
      return FailureType.TRANSIENT;
    }

    // Permanent patterns
    const permanentPatterns = [
      'invalid',
      'forbidden',
      'unauthorized',
      'not found',
      'bad request',
      'validation',
      'syntax error',
      'parse error',
    ];

    if (permanentPatterns.some(pattern => message.includes(pattern))) {
      return FailureType.PERMANENT;
    }

    // Default: treat as transient (conservative approach)
    return FailureType.TRANSIENT;
  }

  /**
   * Calculate delay for given attempt
   * @param {number} attempt - Attempt number (0-indexed)
   * @returns {number} Delay in milliseconds
   */
  getDelay(attempt) {
    if (this.type === RetryType.NONE) {
      return 0;
    }

    let delay;

    switch (this.type) {
      case RetryType.EXPONENTIAL:
        delay = this.initialDelay * Math.pow(this.multiplier, attempt);
        break;

      case RetryType.LINEAR:
        delay = this.initialDelay + this.multiplier * attempt * this.initialDelay;
        break;

      case RetryType.CONSTANT:
        delay = this.initialDelay;
        break;

      default:
        delay = this.initialDelay;
    }

    // Apply max delay cap
    delay = Math.min(delay, this.maxDelay);

    // Apply jitter
    if (this.jitterVariance > 0) {
      const jitterAmount = delay * this.jitterVariance;
      const jitter = (Math.random() * 2 - 1) * jitterAmount; // Random value between -jitterAmount and +jitterAmount
      delay = Math.max(0, delay + jitter);
    }

    return Math.round(delay);
  }

  /**
   * Record a retry attempt
   * @param {number} attempt - Attempt number
   * @param {Error} error - The error that occurred
   * @param {number} delay - Delay before this attempt
   */
  recordAttempt(attempt, error, delay) {
    if (!this.startTime) {
      this.startTime = Date.now();
    }

    this.attempts.push({
      attempt,
      timestamp: Date.now(),
      error: error.message || String(error),
      errorType: this.errorClassifier(error),
      delay,
    });

    this.totalDelay += delay;
  }

  /**
   * Get retry history
   * @returns {Object} History object
   */
  getHistory() {
    return {
      startTime: this.startTime,
      attempts: [...this.attempts],
      totalAttempts: this.attempts.length,
      totalDelay: this.totalDelay,
      duration: this.startTime ? Date.now() - this.startTime : 0,
    };
  }

  /**
   * Reset retry history
   */
  reset() {
    this.attempts = [];
    this.totalDelay = 0;
    this.startTime = null;
  }

  /**
   * Create a clone of this policy
   * @returns {RetryPolicy} Cloned policy
   */
  clone() {
    return new RetryPolicy({
      type: this.type,
      maxRetries: this.maxRetries,
      initialDelay: this.initialDelay,
      maxDelay: this.maxDelay,
      multiplier: this.multiplier,
      jitterVariance: this.jitterVariance,
      retryableErrors: [...this.retryableErrors],
      nonRetryableErrors: [...this.nonRetryableErrors],
      shouldRetry: this.customShouldRetry,
      errorClassifier: this.errorClassifier,
      timeout: this.timeout,
    });
  }

  /**
   * Create a preset retry policy for common scenarios
   * @param {string} preset - Preset name
   * @returns {RetryPolicy} Configured policy
   */
  static preset(preset) {
    const presets = {
      // Default exponential backoff for most transient failures
      default: {
        type: RetryType.EXPONENTIAL,
        maxRetries: 3,
        initialDelay: 100,
        maxDelay: 30000,
        multiplier: 2.0,
        jitterVariance: 0.1,
      },

      // Aggressive retry for critical operations
      aggressive: {
        type: RetryType.EXPONENTIAL,
        maxRetries: 5,
        initialDelay: 50,
        maxDelay: 60000,
        multiplier: 2.0,
        jitterVariance: 0.15,
      },

      // Conservative retry for non-critical operations
      conservative: {
        type: RetryType.LINEAR,
        maxRetries: 2,
        initialDelay: 500,
        maxDelay: 5000,
        multiplier: 1.5,
        jitterVariance: 0.1,
      },

      // Quick retry for transient glitches
      quick: {
        type: RetryType.CONSTANT,
        maxRetries: 3,
        initialDelay: 100,
        maxDelay: 100,
        jitterVariance: 0.05,
      },

      // No retry for permanent failures
      none: {
        type: RetryType.NONE,
        maxRetries: 0,
      },

      // Network-specific retry
      network: {
        type: RetryType.EXPONENTIAL,
        maxRetries: 4,
        initialDelay: 200,
        maxDelay: 15000,
        multiplier: 2.0,
        jitterVariance: 0.2,
        retryableErrors: ['ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET'],
      },

      // API rate limiting
      rateLimit: {
        type: RetryType.EXPONENTIAL,
        maxRetries: 5,
        initialDelay: 1000,
        maxDelay: 120000,
        multiplier: 2.5,
        jitterVariance: 0.3,
        retryableErrors: ['429', 'rate limit'],
      },
    };

    if (!presets[preset]) {
      throw new Error(`Unknown preset: ${preset}. Available: ${Object.keys(presets).join(', ')}`);
    }

    return new RetryPolicy(presets[preset]);
  }

  /**
   * Execute a function with retry logic
   * @param {Function} fn - Async function to execute
   * @param {*} context - Context for function execution
   * @returns {Promise<*>} Result of function
   */
  async execute(fn, context = null) {
    this.reset();

    let lastError;
    let attempt = 0;

    while (true) {
      try {
        const result = await fn.call(context);
        return result;
      } catch (error) {
        lastError = error;

        // Check if should retry
        if (!this.shouldRetry(error, attempt)) {
          // Record final attempt
          this.recordAttempt(attempt, error, 0);
          throw error;
        }

        // Calculate delay
        const delay = this.getDelay(attempt);

        // Record attempt
        this.recordAttempt(attempt, error, delay);

        // Wait before retry
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        attempt++;
      }
    }
  }
}

// Export class and enums
module.exports = RetryPolicy;
module.exports.RetryType = RetryType;
module.exports.FailureType = FailureType;
