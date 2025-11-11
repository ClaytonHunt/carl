# Parallel Execution Pattern

Execute multiple independent tasks simultaneously for maximum efficiency and throughput.

## Overview

**Parallel Execution** is the pattern of running multiple agents or tasks concurrently when they have no dependencies on each other. This is one of the most powerful patterns for improving workflow performance.

IndyDevDan's insight: *"The shift to parallel agents resembles the transition from a synchronous for-loop to an asynchronous, event-driven architecture."*

## Pattern Architecture

```
Orchestrator
    ↓ spawns all at once
    ├─ Agent A ─┐
    ├─ Agent B ─┤ All execute
    ├─ Agent C ─┤ simultaneously
    └─ Agent D ─┘
         ↓ all complete
    Aggregator
         ↓
    Final Result
```

## Key Characteristics

- **Concurrent Execution**: Multiple agents run at same time
- **Independence**: Agents don't depend on each other's results
- **Fan-Out/Fan-In**: Spawn many, collect results
- **Performance**: Dramatically faster than sequential
- **Scalability**: Add more parallel tasks easily

## When to Use Parallel Execution

### ✅ Use When:
- Tasks are independent (no dependencies)
- Speed is important
- Multiple domains to analyze simultaneously
- Generating multiple artifacts
- Running multiple tests/validations
- Processing multiple files/directories
- Scaling to handle more work

### ❌ Don't Use When:
- Tasks have dependencies (use Sequential)
- Order matters for correctness
- Resource constraints (too many parallel tasks)
- Results need to build on each other
- Only one task to execute

## Implementation Patterns

### Pattern 1: Multiple Task Calls

Use Task tool multiple times in parallel:

```markdown
---
description: Analyze codebase comprehensively
allowed-tools: Task, Read, Grep
---

# Comprehensive Analysis

## Step 1: Spawn All Analyzers (Parallel)

Use the Task tool to spawn all analyzers at once:

Task(
  subagent_type: "security-analyzer",
  description: "Security analysis of codebase",
  prompt: "Analyze security vulnerabilities..."
)

Task(
  subagent_type: "performance-analyzer",
  description: "Performance analysis of codebase",
  prompt: "Identify performance bottlenecks..."
)

Task(
  subagent_type: "quality-analyzer",
  description: "Code quality analysis of codebase",
  prompt: "Review code quality and maintainability..."
)

Task(
  subagent_type: "dependency-analyzer",
  description: "Dependency analysis of codebase",
  prompt: "Analyze dependencies and licenses..."
)

## Step 2: Collect Results

Wait for all agents to complete, then aggregate their findings.

## Step 3: Synthesize Report

Combine all analyses into unified report with prioritized findings.
```

### Pattern 2: Dynamic Parallelization

Determine what to parallelize based on analysis:

```markdown
# Dynamic Parallel Testing

## Step 1: Discover Test Files

Find all test files in project.

## Step 2: Spawn Test Runners (Parallel)

For each test suite discovered:

Task(
  subagent_type: "test-runner",
  description: "Run test suite: {suite-name}",
  prompt: "Execute tests in {suite-path}..."
)

## Step 3: Aggregate Results

Collect pass/fail status from all runners.
Generate consolidated test report.
```

### Pattern 3: Batch Processing

Process multiple items in parallel:

```markdown
# Parallel Component Generation

## Step 1: Parse Component List

Components to generate: ${COMPONENT_LIST}

## Step 2: Generate All Components (Parallel)

For each component:

Task(
  subagent_type: "component-generator",
  description: "Generate component: {name}",
  prompt: "Create React component {name} with props: {props}..."
)

## Step 3: Generate Index File

After all components generated, create index exports.
```

## Complete Example: Multi-Domain Analysis

### Orchestrator Command

**File**: `.claude/commands/analyze-project.md`

```markdown
---
description: Comprehensive project analysis across all domains
allowed-tools: Task, Read, Grep, Glob
argument-hint: [project-path]
---

# Comprehensive Project Analysis

Analyze project across security, performance, quality, dependencies, and documentation.

## Variables

- `${PROJECT_PATH}` - Path to project for analysis

## Workflow

### Step 1: Validate Target

Verify project path exists and is valid.

### Step 2: Spawn Parallel Analyzers

Launch all analyzers simultaneously:

```typescript
// Security Analysis
Task(
  subagent_type: "security-analyzer",
  description: "Security vulnerability analysis of ${PROJECT_PATH}",
  prompt: `
    Analyze ${PROJECT_PATH} for security vulnerabilities:
    - SQL injection risks
    - XSS vulnerabilities
    - Authentication issues
    - Sensitive data exposure
    - Dependency vulnerabilities

    Provide structured findings with severity levels.
  `
)

// Performance Analysis
Task(
  subagent_type: "performance-analyzer",
  description: "Performance analysis of ${PROJECT_PATH}",
  prompt: `
    Analyze ${PROJECT_PATH} for performance issues:
    - Algorithm complexity
    - N+1 queries
    - Memory leaks
    - Bundle size
    - Caching opportunities

    Provide findings with optimization recommendations.
  `
)

// Code Quality Analysis
Task(
  subagent_type: "quality-analyzer",
  description: "Code quality analysis of ${PROJECT_PATH}",
  prompt: `
    Analyze ${PROJECT_PATH} for code quality:
    - Cyclomatic complexity
    - Code duplication
    - Naming conventions
    - Documentation coverage
    - Test coverage

    Provide actionable improvement suggestions.
  `
)

// Dependency Analysis
Task(
  subagent_type: "dependency-analyzer",
  description: "Dependency analysis of ${PROJECT_PATH}",
  prompt: `
    Analyze ${PROJECT_PATH} dependencies:
    - Outdated packages
    - Security vulnerabilities
    - License compliance
    - Unused dependencies
    - Dependency tree bloat

    Provide update and cleanup recommendations.
  `
)

// Documentation Analysis
Task(
  subagent_type: "documentation-analyzer",
  description: "Documentation analysis of ${PROJECT_PATH}",
  prompt: `
    Analyze ${PROJECT_PATH} documentation:
    - README completeness
    - API documentation
    - Code comments
    - Setup instructions
    - Examples and guides

    Identify documentation gaps.
  `
)
```

### Step 3: Aggregate Results

Collect findings from all analyzers.

### Step 4: Prioritize & Synthesize

- Categorize findings by severity and impact
- Identify cross-cutting concerns
- Create prioritized action plan
- Generate executive summary

### Step 5: Generate Report

Present comprehensive analysis with:

1. **Executive Summary**
   - Overall health score
   - Top priority items
   - Quick wins

2. **Detailed Findings by Domain**
   - Security findings
   - Performance bottlenecks
   - Quality issues
   - Dependency concerns
   - Documentation gaps

3. **Prioritized Action Plan**
   - Critical items (fix immediately)
   - High priority (fix this sprint)
   - Medium priority (backlog)
   - Low priority (nice to have)

4. **Metrics Dashboard**
   - Security score
   - Performance score
   - Quality score
   - Documentation score
   - Overall health score

## Expected Output

Comprehensive analysis report with findings from all domains,
prioritized by impact and effort.
```

### Specialist Agents

Each analyzer is an independent specialist agent (see HOP/LOP pattern for examples).

Key: All analyzers run **simultaneously**, not sequentially.

## Timing Comparison

### Sequential Execution
```
Security Analysis:    3 minutes
Performance Analysis: 2 minutes
Quality Analysis:     2 minutes
Dependency Analysis:  1 minute
Documentation:        1 minute
-----------------------------------
Total Time:           9 minutes
```

### Parallel Execution
```
All analyses run simultaneously
Longest running task: 3 minutes
-----------------------------------
Total Time:           3 minutes
```

**Speedup: 3x faster** (and scales with more parallel tasks)

## Advanced Patterns

### Pattern A: Two-Phase Parallel

Parallel execution in multiple phases:

```
Phase 1 (Parallel):
├─ Agent A1 ─┐
├─ Agent A2 ─┤
└─ Agent A3 ─┘
      ↓ all complete
Phase 2 (Parallel):
├─ Agent B1 ─┐
├─ Agent B2 ─┤
└─ Agent B3 ─┘
      ↓ all complete
Final Aggregation
```

### Pattern B: Parallel with Dependencies

Some parallel, some sequential:

```
Agent A (sequential, required first)
      ↓
   ┌─────┬─────┐
   │     │     │
Agent B Agent C Agent D (parallel)
   │     │     │
   └─────┴─────┘
      ↓
Agent E (sequential, requires B,C,D)
```

### Pattern C: Map-Reduce Style

Process many items in parallel, then reduce:

```
Input: [Item1, Item2, ..., ItemN]
      ↓
Map Phase (Parallel):
├─ Process Item1 ─┐
├─ Process Item2 ─┤
├─ Process Item3 ─┤
└─ Process ItemN ─┘
      ↓ all complete
Reduce Phase:
Aggregate all results
      ↓
Final Output
```

## Practical Examples

### Example 1: Multi-File Processing

```markdown
# Parallel File Refactoring

## Task
Refactor 20 files to use new API.

## Approach
Spawn 20 parallel agents, each handling one file.

## Benefits
- 20x faster than sequential
- Isolated failures (one file fails, others continue)
- Clean context per file
```

### Example 2: Test Suite Execution

```markdown
# Parallel Test Execution

## Task
Run 5 test suites (unit, integration, e2e, performance, security)

## Approach
Spawn 5 test-runner agents in parallel.

## Benefits
- 5x faster test execution
- Parallel CI/CD pipeline
- Faster feedback loop
```

### Example 3: Multi-Platform Generation

```markdown
# Parallel Platform Builds

## Task
Generate builds for Web, iOS, Android, Desktop

## Approach
Spawn 4 build agents in parallel.

## Benefits
- 4x faster build time
- Parallel deployment pipeline
- Efficient CI resources
```

### Example 4: Documentation Generation

```markdown
# Parallel Documentation

## Task
Generate docs for 50 API endpoints

## Approach
Spawn endpoint-documenter agents in parallel (batch of 10).

## Benefits
- Much faster than sequential
- Consistent format across all endpoints
- Easy to scale
```

## Error Handling in Parallel Execution

### Strategy 1: Fail Fast
```markdown
If any parallel agent fails critically:
1. Cancel remaining agents
2. Report error immediately
3. Stop workflow
```

### Strategy 2: Collect All Results
```markdown
If agents can fail independently:
1. Let all agents complete
2. Collect successes and failures
3. Report combined results
4. User decides next steps
```

### Strategy 3: Partial Success
```markdown
If some failures acceptable:
1. Let all agents complete
2. Report successes
3. Log failures for retry
4. Continue with available results
```

## Performance Optimization

### Batching
Don't spawn 1000 agents at once:
```markdown
Bad:  Spawn 1000 agents simultaneously (resource exhaustion)
Good: Spawn 10 at a time, batch process (controlled parallelism)
```

### Resource Management
Consider system limits:
```markdown
- CPU cores available
- Memory constraints
- API rate limits
- Network bandwidth
```

### Optimal Parallelism
Find the sweet spot:
```markdown
Too few parallel: Underutilized (2 parallel on 8-core system)
Optimal: Match resources (8 parallel on 8-core system)
Too many: Contention (100 parallel on 8-core system)
```

## Monitoring Parallel Execution

### Progress Tracking
```markdown
Use SubagentStop hooks to track completion:

Hook publishes event: "Agent X completed (3 of 5)"
Dashboard shows: [===>--] 60% complete
```

### Real-Time Observability (IndyDevDan Pattern)
```markdown
SubagentStop hook → Webhook → WebSocket → Dashboard

Shows:
- Which agents running
- Which completed
- Intermediate results
- Estimated time remaining
```

## Best Practices

### ✅ Do
- Use parallel execution for independent tasks
- Spawn all parallel tasks at once (not sequentially)
- Handle partial failures gracefully
- Monitor progress and completion
- Batch large workloads
- Consider resource constraints
- Test with realistic scale
- Measure actual speedup

### ❌ Don't
- Parallelize dependent tasks
- Spawn unlimited parallel agents
- Ignore resource constraints
- Assume perfect success rates
- Block waiting for individual agents
- Share state between parallel agents
- Forget error handling
- Skip testing parallel execution

## Testing Parallel Workflows

### Test Cases
1. **All Succeed**: Verify proper aggregation
2. **One Fails**: Verify error handling
3. **All Fail**: Verify graceful degradation
4. **Timeout**: Verify timeout handling
5. **Partial Results**: Verify partial success handling

### Performance Testing
```markdown
1. Measure sequential time
2. Measure parallel time
3. Calculate speedup
4. Verify speedup matches expectations
5. Test with various workload sizes
```

## Common Pitfalls

### ❌ Hidden Dependencies
**Problem**: Tasks seem independent but have hidden dependencies

**Solution**: Analyze carefully, test independence

### ❌ Resource Exhaustion
**Problem**: Too many parallel agents overwhelm system

**Solution**: Batch execution, limit parallelism

### ❌ Context Pollution
**Problem**: Parallel agents share context inappropriately

**Solution**: Ensure clean context separation

### ❌ Aggregation Complexity
**Problem**: Combining results is complex and error-prone

**Solution**: Define clear result format, test aggregation

### ❌ No Progress Visibility
**Problem**: User doesn't know what's happening

**Solution**: Add progress tracking, use hooks for updates

## Integration with Other Patterns

### Parallel + HOP/LOP
```
HOP orchestrator spawns parallel LOPs
```

### Parallel + Sequential
```
Sequential phases, each with parallel execution:
Phase 1 (parallel) → Phase 2 (parallel) → Phase 3 (parallel)
```

### Parallel + Event-Driven
```
Parallel agents publish events for external coordination
```

## Additional Resources

- **HOP/LOP Pattern**: `@.claude/.carl/templates/workflows/patterns/hop-lop.md`
- **Sequential Pattern**: `@.claude/.carl/templates/workflows/patterns/sequential-chain.md`
- **IndyDevDan's Patterns**: `@docs/indydevdan/agentic-orchestration-patterns.md`
- **Agent Templates**: `@.claude/.carl/templates/agents/`
