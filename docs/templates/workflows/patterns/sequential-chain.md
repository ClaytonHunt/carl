# Sequential Chain Pattern

Execute agents in a specific order where each step depends on the previous step's completion.

## Overview

**Sequential Chain** is the pattern of running agents one after another in a specific order, where later agents depend on earlier agents' results. This is the most straightforward orchestration pattern when dependencies exist.

Think of it as a **pipeline** where each stage processes the output of the previous stage.

## Pattern Architecture

```
Agent A
   ↓ completes, output feeds to
Agent B
   ↓ completes, output feeds to
Agent C
   ↓ completes, output feeds to
Agent D
   ↓ completes
Final Result
```

## Key Characteristics

- **Ordered Execution**: Strict sequence, no parallelization
- **Dependencies**: Each step needs previous step's output
- **Progressive Refinement**: Each step builds on previous
- **Predictable Flow**: Easy to understand and debug
- **State Accumulation**: Results accumulate through chain

## When to Use Sequential Chain

### ✅ Use When:
- Clear dependencies between steps
- Each step needs previous results
- Order matters for correctness
- Progressive refinement needed
- Building up complex output
- Validation gates between steps
- Linear workflow with checkpoints

### ❌ Don't Use When:
- Steps are independent (use Parallel)
- Can execute simultaneously
- No dependencies between steps
- Speed is critical and parallelization possible
- Simple single-step task

## Implementation Patterns

### Pattern 1: Fixed Linear Chain

Predefined sequence of agents:

```markdown
---
description: Implement feature from concept to deployment
allowed-tools: Task, Read, Write, Grep
---

# Feature Implementation Chain

## Step 1: Requirements Analysis

Task(
  subagent_type: "requirements-analyst",
  description: "Analyze feature requirements",
  prompt: "Analyze the feature request: ${FEATURE_DESCRIPTION}.
          Generate detailed requirements document with:
          - User stories
          - Acceptance criteria
          - Technical requirements
          - Dependencies"
)

Wait for completion. Review requirements document.

## Step 2: Technical Design

Task(
  subagent_type: "technical-architect",
  description: "Design technical architecture",
  prompt: "Based on requirements from Step 1, design technical architecture:
          - System components
          - Data models
          - API contracts
          - Integration points

          Requirements: [paste from Step 1]"
)

Wait for completion. Review technical design.

## Step 3: Implementation

Task(
  subagent_type: "code-generator",
  description: "Implement feature based on design",
  prompt: "Implement the feature based on:
          Requirements: [from Step 1]
          Architecture: [from Step 2]

          Generate complete implementation with proper error handling."
)

Wait for completion. Review code implementation.

## Step 4: Test Generation

Task(
  subagent_type: "test-generator",
  description: "Generate comprehensive tests",
  prompt: "Generate tests for the implemented feature:
          Requirements: [from Step 1]
          Implementation: [from Step 3]

          Include unit tests, integration tests, and edge cases."
)

Wait for completion. Review tests.

## Step 5: Documentation

Task(
  subagent_type: "documentation-writer",
  description: "Document the feature",
  prompt: "Document the completed feature:
          Requirements: [from Step 1]
          Architecture: [from Step 2]
          Implementation: [from Step 3]

          Create user documentation and developer guide."
)

Wait for completion.

## Step 6: Final Validation

Review all artifacts:
- Requirements complete? ✓
- Architecture sound? ✓
- Implementation correct? ✓
- Tests comprehensive? ✓
- Documentation clear? ✓

Generate completion report.
```

### Pattern 2: Conditional Chain

Chain with branching logic:

```markdown
# Adaptive Implementation Chain

## Step 1: Analysis

Analyze the task and determine complexity.

## Step 2: Branch Based on Complexity

If complexity is HIGH:
  → Detailed planning agent
  → Architecture review agent
  → Implementation agent
  → Comprehensive test agent

If complexity is MEDIUM:
  → Basic planning agent
  → Implementation agent
  → Standard test agent

If complexity is LOW:
  → Direct implementation agent
  → Quick test agent

## Step 3: Continue Chain

All paths converge to:
  → Documentation agent
  → Validation agent
```

### Pattern 3: Iterative Refinement Chain

Chain with feedback loops:

```markdown
# Iterative Quality Chain

## Step 1: Initial Implementation

Generate initial code.

## Step 2: Review

Code review agent analyzes implementation.

## Step 3: Decision

If review finds issues:
  → Refactor agent fixes issues
  → Go back to Step 2 (max 3 iterations)

If review passes:
  → Continue to Step 4

## Step 4: Optimization

Performance optimization agent enhances code.

## Step 5: Final Validation

Validate optimized code meets requirements.
```

## Complete Example: Deployment Pipeline

### Orchestrator Command

**File**: `.claude/commands/deploy-feature.md`

```markdown
---
description: Deploy feature through complete pipeline
allowed-tools: Task, Read, Write, Bash, Grep
argument-hint: [feature-name]
---

# Feature Deployment Pipeline

Execute complete deployment pipeline with quality gates.

## Variables

- `${FEATURE_NAME}` - Name of feature to deploy

## Pipeline Stages

### Stage 1: Pre-Deployment Validation

Task(
  subagent_type: "pre-deployment-validator",
  description: "Validate feature ready for deployment",
  prompt: `
    Validate feature ${FEATURE_NAME} is ready:
    - All tests passing
    - Code reviewed
    - Documentation complete
    - No blocking issues

    If validation fails, STOP pipeline with reason.
    If validation passes, proceed with green light.
  `
)

**Quality Gate**: Must pass to continue.

### Stage 2: Test Execution

Task(
  subagent_type: "test-runner",
  description: "Execute full test suite",
  prompt: `
    Run complete test suite for ${FEATURE_NAME}:
    - Unit tests
    - Integration tests
    - E2E tests
    - Security tests

    Report: Total tests, passed, failed, duration.

    If >5% fail rate: STOP with failure report.
    If ≤5% fail rate: Proceed with test report.
  `
)

**Quality Gate**: <5% failure rate to continue.

### Stage 3: Build

Task(
  subagent_type: "build-agent",
  description: "Build production artifacts",
  prompt: `
    Build production version of ${FEATURE_NAME}:
    - Compile/transpile code
    - Optimize assets
    - Generate bundles
    - Create deployment package

    Report: Build status, bundle sizes, warnings.

    If build fails: STOP with build errors.
    If build succeeds: Proceed with artifacts.
  `
)

**Quality Gate**: Successful build required.

### Stage 4: Deploy to Staging

Task(
  subagent_type: "deployment-agent",
  description: "Deploy to staging environment",
  prompt: `
    Deploy ${FEATURE_NAME} to staging:
    - Upload artifacts
    - Run migrations
    - Update configuration
    - Restart services

    Report: Deployment status, service health.

    If deployment fails: STOP and rollback.
    If deployment succeeds: Proceed to smoke tests.
  `
)

**Quality Gate**: Successful deployment required.

### Stage 5: Smoke Tests

Task(
  subagent_type: "smoke-test-agent",
  description: "Run smoke tests on staging",
  prompt: `
    Execute smoke tests for ${FEATURE_NAME} on staging:
    - Core functionality tests
    - Health checks
    - Critical path validation
    - Integration point tests

    Report: Test results, response times, errors.

    If critical tests fail: STOP and rollback.
    If tests pass: Proceed to production.
  `
)

**Quality Gate**: All critical tests must pass.

### Stage 6: Deploy to Production

Task(
  subagent_type: "deployment-agent",
  description: "Deploy to production environment",
  prompt: `
    Deploy ${FEATURE_NAME} to production:
    - Blue-green deployment
    - Gradual rollout (10% → 50% → 100%)
    - Monitor error rates
    - Auto-rollback if errors spike

    Report: Deployment progress, metrics, health.
  `
)

**Quality Gate**: No error spikes during rollout.

### Stage 7: Post-Deployment Verification

Task(
  subagent_type: "verification-agent",
  description: "Verify production deployment",
  prompt: `
    Verify ${FEATURE_NAME} in production:
    - Functionality working
    - Performance metrics normal
    - No error spikes
    - User traffic healthy

    Report: Final verification status.
  `
)

**Final Gate**: Complete verification required.

### Stage 8: Completion Report

Generate deployment report:
- Feature name
- Deployment timestamp
- All stage results
- Quality gate outcomes
- Final production metrics
- Next steps (if any)

Mark deployment as COMPLETE.
```

### Specialist Agents

**Pre-Deployment Validator**:
```markdown
---
name: pre-deployment-validator
description: Validate feature readiness before deployment
tools: Read, Grep, Bash
---

Check all pre-deployment criteria:
- Git branch status
- CI/CD status
- Code review approvals
- Test results
- Documentation presence
```

**Test Runner**:
```markdown
---
name: test-runner
description: Execute test suites with reporting
tools: Bash, Read
---

Run all test suites and aggregate results.
Fail if failure rate exceeds threshold.
```

**Build Agent**:
```markdown
---
name: build-agent
description: Build production artifacts
tools: Bash, Read, Write
---

Execute build process, optimize output, package artifacts.
```

**Deployment Agent**:
```markdown
---
name: deployment-agent
description: Deploy to target environment
tools: Bash, Read
---

Handle deployment to staging or production with health checks.
```

**Smoke Test Agent**:
```markdown
---
name: smoke-test-agent
description: Quick validation tests post-deployment
tools: Bash, Read
---

Run critical path tests to verify deployment health.
```

**Verification Agent**:
```markdown
---
name: verification-agent
description: Post-deployment verification and monitoring
tools: Bash, Read
---

Comprehensive verification of production deployment.
```

## Benefits of Sequential Chain

### Clear Dependencies
Each step explicitly depends on previous, easy to understand.

### Quality Gates
Built-in checkpoints prevent bad deployments.

### Progressive Refinement
Each step adds value, building on previous work.

### Easy Debugging
Linear flow makes it easy to identify failure point.

### Predictable Timing
Can estimate duration based on stage timings.

### State Accumulation
Results accumulate, final step has complete context.

## Drawbacks and Mitigations

### Drawback 1: Slower Than Parallel
**Problem**: Sequential inherently slower.
**Mitigation**: Use parallel within stages when possible.

### Drawback 2: Single Point of Failure
**Problem**: One stage failure blocks entire chain.
**Mitigation**: Add retry logic, skip optional stages.

### Drawback 3: Context Growth
**Problem**: Later stages may have huge context.
**Mitigation**: Pass only necessary information forward.

## Advanced Patterns

### Pattern A: Parallel Within Sequential

```
Stage 1 (Sequential)
    ↓
Stage 2 (Parallel)
├─ Task A ─┐
├─ Task B ─┤
└─ Task C ─┘
    ↓
Stage 3 (Sequential)
    ↓
Stage 4 (Parallel)
├─ Task D ─┐
└─ Task E ─┘
    ↓
Stage 5 (Sequential)
```

### Pattern B: Fork-Join Chain

```
Stage 1
    ↓
  Fork
    ├─ Chain A1 → A2 → A3 ─┐
    └─ Chain B1 → B2 → B3 ─┘
                ↓ Join
             Stage 2
```

### Pattern C: Checkpoint Chain

```
Stage 1 → Checkpoint → Stage 2 → Checkpoint → Stage 3
          (Save state)            (Save state)

If failure: Resume from last checkpoint
```

## Error Handling Strategies

### Strategy 1: Fail Fast
```markdown
On any stage failure:
1. Stop immediately
2. Report failure details
3. Provide remediation steps
```

### Strategy 2: Retry with Backoff
```markdown
On transient failure:
1. Retry stage (max 3 attempts)
2. Exponential backoff
3. If still fails, stop chain
```

### Strategy 3: Rollback Chain
```markdown
On critical failure:
1. Stop forward progress
2. Execute rollback chain
3. Restore previous state
```

### Strategy 4: Skip Optional
```markdown
On non-critical failure:
1. Log failure
2. Skip stage
3. Continue chain with warning
```

## Timing Considerations

### Example Pipeline Timing

```
Stage 1: Pre-validation    1 minute
Stage 2: Test execution    5 minutes
Stage 3: Build             3 minutes
Stage 4: Deploy staging    2 minutes
Stage 5: Smoke tests       2 minutes
Stage 6: Deploy prod       5 minutes
Stage 7: Verification      2 minutes
Stage 8: Report           1 minute
-------------------------------------------
Total Pipeline Time:      21 minutes
```

### Optimization Opportunities

Within each stage, parallelize when possible:
```
Stage 2: Test execution (parallel suites)     5 min → 2 min
Stage 5: Smoke tests (parallel test groups)   2 min → 1 min
-------------------------------------------
Optimized Pipeline Time:                     21 min → 18 min
```

## Best Practices

### ✅ Do
- Define clear stages with single responsibility
- Add quality gates between stages
- Pass minimal context forward
- Handle errors at each stage
- Log progress clearly
- Test individual stages
- Document dependencies
- Provide progress updates

### ❌ Don't
- Make stages too large or complex
- Skip error handling
- Pass entire context to every stage
- Ignore stage timing
- Skip quality gates
- Make chains too long (>10 stages)
- Forget to validate outputs
- Block when parallelization possible within stages

## Testing Sequential Chains

### Test Cases

1. **Happy Path**: All stages succeed
2. **Early Failure**: Stage 2 fails
3. **Late Failure**: Stage 8 fails
4. **Retry Success**: Transient failure, retry succeeds
5. **Retry Failure**: Retry exhausted, chain stops
6. **Quality Gate Failure**: Gate blocks progress

### Testing Strategy

```markdown
1. Test each stage individually
2. Test stage transitions
3. Test full chain end-to-end
4. Test failure scenarios
5. Test retry logic
6. Test rollback procedures
7. Measure timing
```

## Common Use Cases

### Use Case 1: CI/CD Pipeline
```
Code Commit → Test → Build → Deploy Staging → Test → Deploy Prod → Verify
```

### Use Case 2: Data Pipeline
```
Extract → Transform → Validate → Load → Index → Verify
```

### Use Case 3: Content Pipeline
```
Draft → Review → Edit → Format → Publish → Notify
```

### Use Case 4: Feature Development
```
Requirements → Design → Implement → Test → Document → Deploy
```

### Use Case 5: Migration
```
Analyze → Plan → Backup → Migrate → Validate → Cleanup
```

## Integration with Other Patterns

### Sequential + HOP/LOP
HOP orchestrates sequential LOPs.

### Sequential + Parallel
Sequential stages, each with parallel execution.

### Sequential + Event-Driven
Stages publish events for external coordination.

## Additional Resources

- **Parallel Pattern**: `@.claude/.carl/templates/workflows/patterns/parallel-execution.md`
- **HOP/LOP Pattern**: `@.claude/.carl/templates/workflows/patterns/hop-lop.md`
- **Event-Driven Pattern**: `@.claude/.carl/templates/workflows/patterns/event-driven.md`
- **Agent Templates**: `@.claude/.carl/templates/agents/`
