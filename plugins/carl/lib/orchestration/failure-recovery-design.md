# Failure Recovery System Design

## Overview

This document defines the failure classification taxonomy and recovery strategies for the HybridCoordinator's partial failure recovery system.

## Failure Classification

### 1. Transient Failures
**Definition:** Temporary failures that are likely to succeed on retry.

**Characteristics:**
- Network timeouts
- Rate limiting (429 responses)
- Service temporarily unavailable (503)
- Database connection timeout
- Resource temporarily locked

**Recovery Strategy:** Retry with exponential backoff and jitter

**Default Policy:**
- Max retries: 5
- Initial delay: 100ms
- Backoff multiplier: 2.0
- Max delay: 30000ms (30s)
- Jitter: 10% random variance

### 2. Permanent Failures
**Definition:** Failures that will not succeed even on retry.

**Characteristics:**
- Invalid input/configuration (400, 422 errors)
- Authentication failures (401, 403)
- Resource not found (404)
- Method not allowed (405)
- Business logic validation errors
- Syntax errors in code execution

**Recovery Strategy:** Fail immediately, no retry

**Handling:**
1. Mark item as FAILED
2. Collect detailed error information
3. Mark dependent items as BLOCKED
4. Continue with independent items
5. Generate failure report

### 3. Partial Failures
**Definition:** Failures where some operations succeeded but others failed.

**Characteristics:**
- Batch processing where some items succeed
- Multi-step operations that fail midway
- Parallel sub-tasks where some fail

**Recovery Strategy:** Compensate or resume from last known good state

**Handling:**
1. Identify completed sub-operations
2. Store partial progress
3. Mark item as PARTIAL_FAILURE
4. Allow manual intervention or auto-retry remaining operations
5. Support compensation/rollback if needed

## Recovery Strategies

### Strategy 1: Exponential Backoff with Jitter

**Purpose:** Prevent thundering herd, reduce load on failing services

**Algorithm:**
```
delay = min(initialDelay * (multiplier ^ attempt) + jitter, maxDelay)
jitter = random(-variance * delay, +variance * delay)
```

**Configuration:**
- `initialDelay`: Starting delay (default: 100ms)
- `multiplier`: Exponential growth factor (default: 2.0)
- `maxDelay`: Maximum delay cap (default: 30s)
- `jitterVariance`: Random variance percentage (default: 0.1 = 10%)

### Strategy 2: Circuit Breaker Pattern

**Purpose:** Prevent cascading failures, fail fast when service is down

**States:**
- CLOSED: Normal operation, failures counted
- OPEN: Service considered down, requests fail immediately
- HALF_OPEN: Testing if service recovered

**Configuration:**
- `failureThreshold`: Failures before opening (default: 5)
- `resetTimeout`: Time before attempting recovery (default: 60s)
- `successThreshold`: Successes in HALF_OPEN to close (default: 2)

**Note:** Circuit breaker is per-executor, not per-item (future enhancement)

### Strategy 3: Dependency-Aware Isolation

**Purpose:** Prevent failures from cascading to dependent items

**Algorithm:**
1. When item fails after all retries:
   - Mark item as FAILED
   - Traverse dependency graph to find all dependent items
   - Mark dependent items as BLOCKED (not FAILED or SKIPPED)
   - Continue executing independent items in parallel
2. BLOCKED items:
   - Not executed
   - Not counted as failures
   - Can be unblocked if dependency is manually resolved
   - Included in failure report with reason

**Benefits:**
- Clear distinction between actual failures and blocked items
- Enables resume after fixing root cause
- Prevents wasted execution of doomed tasks

### Strategy 4: State Persistence and Resume

**Purpose:** Enable recovery after process restart or manual intervention

**Persisted State:**
```json
{
  "coordinatorId": "unique-id",
  "executionId": "unique-execution-id",
  "timestamp": "2025-11-13T...",
  "state": "executing",
  "completedItems": ["item1", "item2"],
  "failedItems": {
    "item3": {
      "error": "...",
      "failureType": "transient",
      "attempts": 3,
      "lastAttempt": "2025-11-13T..."
    }
  },
  "blockedItems": {
    "item4": {
      "reason": "depends on failed item3",
      "blockedBy": ["item3"]
    }
  },
  "pendingItems": ["item5", "item6"],
  "context": { ... }
}
```

**Resume Logic:**
1. Load persisted state
2. Verify work item definitions match
3. Skip completed items
4. Optionally retry failed items (with user confirmation)
5. Unblock items if dependencies resolved
6. Continue execution from current wave

**Storage:**
- File system: `.cascade/.execution-state/{executionId}.json`
- In-memory fallback if file system unavailable
- Automatic cleanup after successful completion
- Retention policy: 7 days for failed executions

## Retry Policies

### RetryPolicy Class

**Interface:**
```javascript
class RetryPolicy {
  constructor(options) {
    this.type = options.type; // 'exponential', 'linear', 'constant', 'none'
    this.maxRetries = options.maxRetries || 3;
    this.initialDelay = options.initialDelay || 100;
    this.maxDelay = options.maxDelay || 30000;
    this.multiplier = options.multiplier || 2.0;
    this.jitterVariance = options.jitterVariance || 0.1;
    this.retryableErrors = options.retryableErrors || [];
    this.timeout = options.timeout || null;
  }

  shouldRetry(error, attempt) { ... }
  getDelay(attempt) { ... }
  isRetryable(error) { ... }
}
```

**Policy Types:**

1. **Exponential** (default for transient failures)
   - Delay increases exponentially: 100ms, 200ms, 400ms, 800ms...
   - Best for network issues, rate limits

2. **Linear** (for predictable recovery)
   - Delay increases linearly: 100ms, 200ms, 300ms, 400ms...
   - Best for queue-based systems

3. **Constant** (for quick retry)
   - Fixed delay between retries
   - Best for rare transient glitches

4. **None** (for permanent failures)
   - No retries, fail immediately
   - Best for validation errors, auth failures

### Custom Retry Conditions

**Error Classification:**
```javascript
// Automatically classify errors by type
function classifyError(error) {
  // HTTP status codes
  if (error.statusCode) {
    if ([408, 429, 503, 504].includes(error.statusCode)) {
      return 'transient';
    }
    if ([400, 401, 403, 404, 405, 422].includes(error.statusCode)) {
      return 'permanent';
    }
  }

  // Network errors
  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
    return 'transient';
  }

  // Default: transient (conservative approach)
  return 'transient';
}
```

**User-Defined Conditions:**
```javascript
// Allow users to define custom retry conditions
coordinator.addItem({
  id: 'item1',
  execute: async () => { ... },
  retryPolicy: new RetryPolicy({
    shouldRetry: (error, attempt) => {
      // Custom logic
      return error.isRetryable && attempt < 5;
    }
  })
});
```

## Failure Reports

### Report Structure

```javascript
{
  executionId: "exec-12345",
  timestamp: "2025-11-13T...",
  summary: {
    totalItems: 10,
    completed: 7,
    failed: 2,
    blocked: 1,
    successRate: 70%
  },
  failures: [
    {
      itemId: "item3",
      name: "Process Payment",
      failureType: "permanent",
      error: "Invalid credit card number",
      attempts: 1,
      firstFailure: "2025-11-13T...",
      lastAttempt: "2025-11-13T...",
      stackTrace: "...",
      context: { ... }
    }
  ],
  blockedItems: [
    {
      itemId: "item4",
      name: "Send Receipt",
      blockedBy: ["item3"],
      reason: "Depends on failed payment processing"
    }
  ],
  recommendations: [
    "Fix validation error in item3 and retry",
    "Consider implementing payment retry with exponential backoff",
    "Review input validation for payment processing"
  ]
}
```

### Actionable Recommendations

**Auto-Generated Based on Failure Patterns:**

1. **Repeated Transient Failures**
   - "Consider increasing max retries or backoff delay"
   - "Check if external service is experiencing outages"

2. **Permanent Validation Errors**
   - "Review input data for item {id}"
   - "Check configuration: {specific field}"

3. **Timeout Issues**
   - "Consider increasing timeout from {current} to {suggested}"
   - "Break down long-running task into smaller chunks"

4. **Multiple Blocked Items**
   - "Fixing item {id} will unblock {count} dependent items"
   - "Consider prioritizing fix for critical path item {id}"

## Implementation Notes

### Integration with HybridCoordinator

1. **Enhanced Configuration:**
```javascript
new HybridCoordinator({
  // Existing options
  maxConcurrency: 4,
  enableFailureRecovery: true,
  continueOnFailure: true,

  // New options
  defaultRetryPolicy: new RetryPolicy({ type: 'exponential' }),
  enableStatePersistence: true,
  stateDirectory: '.cascade/.execution-state',
  enableCircuitBreaker: false, // Future enhancement
  failureReportPath: '.cascade/.failure-reports'
});
```

2. **Item-Level Override:**
```javascript
coordinator.addItem({
  id: 'item1',
  execute: async () => { ... },
  retryPolicy: new RetryPolicy({ maxRetries: 5 }), // Override default
  failureClassifier: (error) => 'permanent' // Custom classification
});
```

3. **Event-Driven Notifications:**
```javascript
coordinator.on('item:failed:permanent', (data) => {
  // Notify user, log to monitoring system
});

coordinator.on('items:blocked', (data) => {
  // Alert about blocked items
});

coordinator.on('execution:recovered', (data) => {
  // Log successful recovery after retry
});
```

### Backward Compatibility

- All new features are opt-in via configuration
- Existing code continues to work without changes
- Default behavior matches current implementation
- New features can be enabled incrementally

## Testing Strategy

### Unit Tests (10+ tests required)

1. **Retry Policy Tests:**
   - Test exponential backoff calculation
   - Test jitter variance
   - Test max delay cap
   - Test retry limit enforcement
   - Test custom retry conditions

2. **Failure Classification Tests:**
   - Test transient error detection
   - Test permanent error detection
   - Test partial failure handling

3. **Dependency Blocking Tests:**
   - Test downstream items marked as blocked
   - Test independent items continue execution
   - Test unblocking when dependency fixed

4. **State Persistence Tests:**
   - Test state save during execution
   - Test state load and resume
   - Test resume with partial completion

5. **Failure Report Tests:**
   - Test report generation
   - Test actionable recommendations
   - Test report formatting

6. **Integration Tests:**
   - Test end-to-end recovery flow
   - Test with real HybridCoordinator
   - Test with complex dependency graphs

## Future Enhancements

1. **Circuit Breaker Pattern:** Prevent repeated calls to failing services
2. **Bulkhead Pattern:** Isolate failures to specific resource pools
3. **Fallback Strategies:** Alternate execution paths when primary fails
4. **Adaptive Retry:** Learn optimal retry parameters from history
5. **Distributed Coordination:** Share failure state across multiple coordinators
6. **Health Checks:** Proactive service health monitoring

## References

- IndyDevDan's Agentic Orchestration Patterns
- Microsoft Azure Architecture - Retry Pattern
- AWS Well-Architected Framework - Reliability Pillar
- Netflix Hystrix - Circuit Breaker Pattern
- Google SRE Book - Handling Overload
