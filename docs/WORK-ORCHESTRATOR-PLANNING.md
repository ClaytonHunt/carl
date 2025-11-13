# Work Orchestrator - Implementation Planning

## Overview

The Work Orchestrator is CARL's autonomous agent for executing planned work items with async orchestration. It complements the Planning Orchestrator by taking structured work items and executing them intelligently using IndyDevDan's agentic patterns.

## Design Philosophy

**Agent-First Execution**: Like the Planning Orchestrator, the Work Orchestrator follows the principle that code handles data operations while agents handle reasoning and decision-making.

**Async by Default**: "Do more when possible, wait when needed" - maximize parallel execution while respecting dependencies.

**Observable by Default**: Every execution step is logged, tracked, and observable through session state.

## Architecture

### Components

```
Commands:
└── carl-work.md              # HOP: Initializes session, delegates to agent

Agents:
├── work-orchestrator.md      # LOP: Orchestrates execution
└── work-executor.md          # Worker: Executes individual tasks

Libraries:
├── orchestration/
│   ├── work-helpers.js       # Data operations (load, analyze, execute)
│   ├── dependency-analyzer.js # Dependency graph and ordering
│   └── execution-tracker.js  # Progress tracking
└── workflow/
    └── session-state.js      # Session state management (shared)

Cascade:
└── cascade-manager.js        # Work item CRUD (144 tests passing)
```

## Epic Breakdown

### Epic: Work Orchestrator Implementation

**ID**: E0001 (to be assigned)
**Title**: Work Orchestrator - Autonomous Execution Agent
**Status**: Planned
**Priority**: High
**Complexity**: Very Complex

**Description**: Implement the Work Orchestrator agent that executes planned work items with async orchestration, dependency management, and HOP/LOP worker patterns.

**Acceptance Criteria**:
- [ ] Can load and execute work items from Cascade format
- [ ] Analyzes and respects dependencies between work items
- [ ] Executes independent work items in parallel
- [ ] Executes dependent work items sequentially
- [ ] Uses HOP/LOP pattern with worker agents
- [ ] Tracks progress and updates Cascade state.json files
- [ ] Handles errors with retry logic
- [ ] Provides complete event logging
- [ ] Integrates seamlessly with Planning Orchestrator
- [ ] 150+ passing tests covering all functionality

---

## Feature Breakdown

### Feature 1: Core Execution Engine

**ID**: F0001
**Parent**: E0001
**Title**: Core Execution Engine
**Status**: Planned
**Priority**: Critical
**Complexity**: Complex

**Description**: Foundation for loading work items, managing execution lifecycle, and coordinating with CascadeManager.

**Stories**:

#### S0001: Work Item Loading and Validation
- Load work item by ID from Cascade format
- Validate work item structure and required fields
- Load related work items (parent, children, siblings)
- Handle missing or invalid work items gracefully
- Integration with CascadeManager

**Tasks**:
- T0001: Implement loadWorkItem() helper function
- T0002: Implement validateWorkItem() validation logic
- T0003: Implement loadExecutionContext() to gather all related items
- T0004: Add error handling for missing/invalid items
- T0005: Write unit tests for work item loading (15+ tests)

#### S0002: Execution State Management
- Initialize execution state for work item
- Track execution status (pending, in_progress, completed, failed, blocked)
- Update Cascade state.json as execution progresses
- Maintain execution history and audit trail
- Support resuming interrupted executions

**Tasks**:
- T0006: Implement initializeExecution() to set up state
- T0007: Implement updateExecutionStatus() for state transitions
- T0008: Implement syncToCascade() to update state.json files
- T0009: Add execution history tracking
- T0010: Implement resumeExecution() for recovery
- T0011: Write unit tests for state management (20+ tests)

#### S0003: Work Item Execution Lifecycle
- Define execution phases (analyze, prepare, execute, verify, complete)
- Implement lifecycle hooks for each phase
- Support pre-execution and post-execution actions
- Handle lifecycle errors and rollback
- Provide lifecycle observability

**Tasks**:
- T0012: Define execution lifecycle phases enum
- T0013: Implement executePhase() lifecycle orchestration
- T0014: Add pre-execution validation hooks
- T0015: Add post-execution verification hooks
- T0016: Implement rollback mechanism for failed phases
- T0017: Add lifecycle event logging
- T0018: Write unit tests for lifecycle (18+ tests)

---

### Feature 2: Dependency Analysis

**ID**: F0002
**Parent**: E0001
**Title**: Dependency Analysis and Execution Ordering
**Status**: Planned
**Priority**: High
**Complexity**: Complex

**Description**: Analyze dependencies between work items and determine optimal execution order for parallel and sequential execution.

**Stories**:

#### S0004: Dependency Graph Construction
- Parse work item hierarchy to build dependency graph
- Identify explicit dependencies (blocks, depends_on)
- Identify implicit dependencies (parent-child, sequential phases)
- Detect circular dependencies
- Visualize dependency graph for debugging

**Tasks**:
- T0019: Implement buildDependencyGraph() graph constructor
- T0020: Implement parseExplicitDependencies() parser
- T0021: Implement parseImplicitDependencies() from hierarchy
- T0022: Implement detectCircularDependencies() validator
- T0023: Add dependency graph visualization helper
- T0024: Write unit tests for graph construction (25+ tests)

#### S0005: Execution Order Determination
- Topological sort for dependency ordering
- Identify independent work items for parallel execution
- Group dependent items into sequential chains
- Calculate critical path
- Optimize execution order for efficiency

**Tasks**:
- T0025: Implement topologicalSort() algorithm
- T0026: Implement findIndependentItems() for parallel execution
- T0027: Implement groupSequentialChains() for dependent items
- T0028: Implement calculateCriticalPath() for planning
- T0029: Add execution order optimization logic
- T0030: Write unit tests for ordering (20+ tests)

#### S0006: Dynamic Dependency Resolution
- Handle dependencies that change during execution
- Re-evaluate execution order when items complete
- Unblock dependent items when prerequisites finish
- Support conditional dependencies
- Provide real-time dependency status

**Tasks**:
- T0031: Implement updateDependencyGraph() for dynamic updates
- T0032: Implement unblockDependents() trigger logic
- T0033: Add conditional dependency evaluation
- T0034: Implement getDependencyStatus() status tracker
- T0035: Add dependency change event logging
- T0036: Write unit tests for dynamic resolution (15+ tests)

---

### Feature 3: Async Orchestration Patterns

**ID**: F0003
**Parent**: E0001
**Title**: Async Orchestration Patterns
**Status**: Planned
**Priority**: High
**Complexity**: Very Complex

**Description**: Implement parallel execution, sequential chains, and async coordination patterns following IndyDevDan's "do more when possible, wait when needed" principle.

**Stories**:

#### S0007: Parallel Execution Pattern
- Execute independent work items simultaneously
- Coordinate multiple agent instances
- Collect results from parallel executions
- Handle partial failures in parallel execution
- Provide parallel execution progress tracking

**Tasks**:
- T0037: Implement executeParallel() orchestration
- T0038: Implement spawnWorkerAgent() for parallel instances
- T0039: Implement collectParallelResults() aggregator
- T0040: Add partial failure handling and recovery
- T0041: Implement parallel execution progress tracker
- T0042: Write unit tests for parallel execution (20+ tests)

#### S0008: Sequential Chain Pattern
- Execute dependent work items in order
- Pass context from one item to the next
- Stop chain on first failure (fail-fast)
- Support chain rollback on failure
- Track chain progress and state

**Tasks**:
- T0043: Implement executeSequentialChain() orchestration
- T0044: Implement passContextBetweenItems() context manager
- T0045: Add fail-fast error handling
- T0046: Implement rollbackChain() for failures
- T0047: Add chain progress tracking
- T0048: Write unit tests for sequential chains (18+ tests)

#### S0009: Hybrid Execution Strategy
- Combine parallel and sequential patterns
- Execute parallel groups within sequential phases
- Support nested execution patterns
- Optimize resource utilization
- Provide hybrid execution visualization

**Tasks**:
- T0049: Implement executeHybrid() hybrid orchestration
- T0050: Add parallel group execution within phases
- T0051: Support nested execution patterns
- T0052: Implement resource utilization optimizer
- T0053: Add hybrid execution visualization
- T0054: Write unit tests for hybrid execution (22+ tests)

---

### Feature 4: HOP/LOP Worker Integration

**ID**: F0004
**Parent**: E0001
**Title**: HOP/LOP Worker Agent Pattern
**Status**: Planned
**Priority**: High
**Complexity**: Complex

**Description**: Implement the Higher Order Prompt (HOP) / Lower Order Prompt (LOP) pattern where the orchestrator coordinates and worker agents execute.

**Stories**:

#### S0010: Work Orchestrator Agent (LOP)
- Implement orchestrator agent prompt
- Handle work item selection and prioritization
- Delegate to worker agents for execution
- Coordinate worker agent results
- Provide orchestration reasoning and decisions

**Tasks**:
- T0055: Create work-orchestrator.md agent file
- T0056: Implement work item selection logic in agent
- T0057: Add delegation instructions for worker agents
- T0058: Implement result coordination in agent
- T0059: Add orchestration reasoning documentation
- T0060: Write integration tests for orchestrator agent (15+ tests)

#### S0011: Work Executor Agent (Worker)
- Implement worker agent prompt for execution
- Handle single work item execution
- Report execution results back to orchestrator
- Provide detailed execution logs
- Support specialized worker types (coder, tester, reviewer)

**Tasks**:
- T0061: Create work-executor.md agent file
- T0062: Implement single item execution logic
- T0063: Add result reporting format
- T0064: Implement detailed execution logging
- T0065: Create specialized worker agent variants
- T0066: Write integration tests for worker agents (18+ tests)

#### S0012: Agent Communication Protocol
- Define message format between orchestrator and workers
- Implement task assignment protocol
- Implement result reporting protocol
- Handle agent failures and timeouts
- Support agent-to-agent coordination via session state

**Tasks**:
- T0067: Define message format specification
- T0068: Implement assignTask() task assignment
- T0069: Implement reportResult() result reporting
- T0070: Add agent timeout and failure handling
- T0071: Implement session-based agent coordination
- T0072: Write unit tests for communication protocol (20+ tests)

---

### Feature 5: State Management and Observability

**ID**: F0005
**Parent**: E0001
**Title**: State Management and Observability
**Status**: Planned
**Priority**: High
**Complexity**: Medium

**Description**: Comprehensive state tracking, event logging, and observability using session state and Cascade state.json files.

**Stories**:

#### S0013: Session State Integration
- Integrate with existing SessionState class
- Track execution progress in session state
- Log all execution events to events.log
- Support session resumption after interruption
- Provide session state queries for monitoring

**Tasks**:
- T0073: Integrate SessionState into work helpers
- T0074: Implement updateExecutionProgress() tracker
- T0075: Add comprehensive event logging for all actions
- T0076: Implement session resumption logic
- T0077: Add state query helpers for monitoring
- T0078: Write unit tests for session integration (18+ tests)

#### S0014: Cascade State Synchronization
- Update work item state.json during execution
- Track completion percentage for work items
- Update parent state automatically via VSCode extension
- Handle state conflicts and race conditions
- Provide state consistency validation

**Tasks**:
- T0079: Implement syncWorkItemState() synchronization
- T0080: Add completion percentage calculation
- T0081: Document parent state update flow (VSCode extension)
- T0082: Add state conflict detection and resolution
- T0083: Implement validateStateConsistency() validator
- T0084: Write unit tests for state sync (20+ tests)

#### S0015: Execution Monitoring and Reporting
- Real-time execution progress reporting
- Generate execution summary reports
- Track execution metrics (time, success rate, blockers)
- Provide execution timeline visualization
- Support external monitoring integrations

**Tasks**:
- T0085: Implement real-time progress reporting
- T0086: Implement generateExecutionSummary() report generator
- T0087: Add execution metrics tracking and calculation
- T0088: Create execution timeline visualization
- T0089: Add hooks for external monitoring systems
- T0090: Write unit tests for monitoring (15+ tests)

---

### Feature 6: Error Handling and Recovery

**ID**: F0006
**Parent**: E0001
**Title**: Error Handling and Recovery
**Status**: Planned
**Priority**: High
**Complexity**: Medium

**Description**: Robust error handling, retry logic, rollback mechanisms, and recovery patterns for failed executions.

**Stories**:

#### S0016: Error Detection and Classification
- Detect different types of execution errors
- Classify errors by severity and recoverability
- Track error context and stack traces
- Provide detailed error reporting
- Support custom error types for work items

**Tasks**:
- T0091: Implement error detection in execution lifecycle
- T0092: Define error classification taxonomy
- T0093: Add error context capture and tracking
- T0094: Implement formatErrorReport() formatter
- T0095: Add custom error type support
- T0096: Write unit tests for error detection (18+ tests)

#### S0017: Retry Logic and Policies
- Implement configurable retry policies
- Support exponential backoff for retries
- Track retry attempts and history
- Handle transient vs permanent failures
- Provide retry exhaustion handling

**Tasks**:
- T0097: Implement configurable retry policy system
- T0098: Add exponential backoff algorithm
- T0099: Implement trackRetryAttempts() tracker
- T0100: Add transient failure detection
- T0101: Implement retry exhaustion handling
- T0102: Write unit tests for retry logic (20+ tests)

#### S0018: Rollback and Recovery
- Implement rollback for failed work items
- Support partial rollback for multi-phase execution
- Track rollback actions for audit
- Provide recovery suggestions to user
- Support manual intervention for blocked items

**Tasks**:
- T0103: Implement rollbackExecution() mechanism
- T0104: Add partial rollback for individual phases
- T0105: Implement trackRollbackActions() audit trail
- T0106: Create generateRecoverySuggestions() helper
- T0107: Add manual intervention support and prompts
- T0108: Write unit tests for rollback (18+ tests)

---

### Feature 7: Planning Orchestrator Integration

**ID**: F0007
**Parent**: E0001
**Title**: Planning Orchestrator Integration
**Status**: Planned
**Priority**: Medium
**Complexity**: Simple

**Description**: Seamless integration with the Planning Orchestrator for a complete plan-and-execute workflow.

**Stories**:

#### S0019: Workflow Continuity
- Execute work items created by Planning Orchestrator
- Share session state between planning and execution
- Support plan-then-execute workflow pattern
- Enable iterative planning and execution
- Provide unified workflow reporting

**Tasks**:
- T0109: Implement plan-to-work transition logic
- T0110: Add session state sharing between orchestrators
- T0111: Create plan-and-execute workflow example
- T0112: Support iterative re-planning during execution
- T0113: Implement unified workflow reporting
- T0114: Write integration tests (15+ tests)

#### S0020: Feedback Loop to Planning
- Report execution results back to planning
- Update complexity estimates based on actuals
- Identify missing or unclear work items
- Suggest work item refinements
- Support dynamic replanning during execution

**Tasks**:
- T0115: Implement reportExecutionFeedback() reporter
- T0116: Add complexity estimate updates from actuals
- T0117: Implement identifyPlanningGaps() analyzer
- T0118: Create suggestWorkItemRefinements() helper
- T0119: Add dynamic replanning trigger logic
- T0120: Write unit tests for feedback loop (12+ tests)

---

## Resource Estimation

### Total Work Items
- **Epic**: 1
- **Features**: 7
- **Stories**: 20
- **Tasks**: 120

### Complexity Distribution
- **Very Complex**: 1 Epic, 1 Feature (Async Orchestration)
- **Complex**: 4 Features (Core Engine, Dependencies, HOP/LOP, Error Handling)
- **Medium**: 2 Features (State Management, Integration)
- **Simple**: 0 Features

### Estimated Timeline
- **Setup and Infrastructure**: 3-5 days
- **Core Features (F0001-F0004)**: 15-20 days
- **Supporting Features (F0005-F0007)**: 8-10 days
- **Testing and Integration**: 5-7 days
- **Documentation**: 2-3 days

**Total Estimate**: 33-45 days (with testing)

### Test Coverage Target
- **Unit Tests**: 150+ tests
- **Integration Tests**: 40+ tests
- **End-to-End Tests**: 10+ tests
- **Total**: 200+ tests

---

## Execution Strategy

### Phase 1: Foundation (F0001, F0002)
Execute in parallel where possible:
- Core Execution Engine (F0001) - Critical path
- Dependency Analysis (F0002) - Parallel track

### Phase 2: Orchestration (F0003, F0004)
Sequential after Phase 1:
- Async Orchestration Patterns (F0003) - Depends on F0001, F0002
- HOP/LOP Worker Integration (F0004) - Depends on F0001

### Phase 3: Supporting Features (F0005, F0006)
Parallel after Phase 2:
- State Management (F0005) - Can start after F0001
- Error Handling (F0006) - Can start after F0001

### Phase 4: Integration (F0007)
Final phase after all core features:
- Planning Orchestrator Integration (F0007) - Depends on all features

---

## IndyDevDan Alignment

### ✅ HOP/LOP Pattern
- Command (HOP) delegates to Work Orchestrator (LOP)
- Work Orchestrator (LOP) delegates to Work Executor (Worker)
- Clean separation: orchestrator coordinates, workers execute

### ✅ Session-Based Correlation
- Shared session ID coordinates entire workflow
- State persisted and shared across all agents
- Observable execution at every step

### ✅ Event-Sourced Coordination
- Complete event log for all execution actions
- Enables reactive patterns and monitoring
- Real-time observability

### ✅ Async-First Mindset
- "Do more when possible, wait when needed"
- Parallel execution by default
- Sequential only when dependencies require

### ✅ Planning Over Prompting
- Work items are detailed, actionable specifications
- Clear acceptance criteria and task boundaries
- Ready for autonomous execution

### ✅ Composability First
- Work items are independent, reusable units
- Clear input/output for each work item
- Support combination and sequencing patterns

### ✅ Observable by Default
- Real-time monitoring of all executions
- Complete state tracking and event logging
- External systems can observe and coordinate

---

## Dependencies

### Internal Dependencies
- **CascadeManager**: Already implemented (144 tests passing)
- **SessionState**: Already implemented (35 tests passing)
- **Planning Helpers**: Already implemented (19 tests passing)

### External Dependencies
- Node.js fs/promises (built-in)
- Claude Code SubAgent system (available)
- Claude Code Task tool (available)

### No New External Packages Required ✅

---

## Testing Strategy

### Unit Tests
- Test each helper function independently
- Mock CascadeManager and SessionState interactions
- Test error conditions and edge cases
- Target: 150+ unit tests

### Integration Tests
- Test agent-to-agent communication
- Test workflow continuity (planning → execution)
- Test state synchronization across components
- Target: 40+ integration tests

### End-to-End Tests
- Test complete execution workflows
- Test parallel and sequential patterns
- Test error recovery scenarios
- Target: 10+ E2E tests

### Performance Tests
- Test parallel execution scalability
- Test large dependency graph handling
- Test session state performance
- Target: 5+ performance benchmarks

---

## Success Criteria

The Work Orchestrator implementation is complete when:

1. ✅ Can execute any work item from Cascade format
2. ✅ Respects all dependencies between work items
3. ✅ Executes independent items in parallel
4. ✅ Executes dependent items sequentially
5. ✅ Updates Cascade state.json files during execution
6. ✅ Handles errors with retry and rollback
7. ✅ Provides complete event logging and observability
8. ✅ Integrates seamlessly with Planning Orchestrator
9. ✅ Has 200+ passing tests across all levels
10. ✅ Documentation is complete and clear
11. ✅ Follows all IndyDevDan patterns exactly
12. ✅ Zero new external dependencies

---

## Next Steps

Once this planning is approved:

1. Create Epic E0001 in Cascade format
2. Create all Features (F0001-F0007)
3. Create all Stories (S0001-S0020)
4. Create all Tasks (T0001-T0120)
5. Begin execution with `/carl:work E0001`

The Work Orchestrator will be able to execute its own implementation! 🔄

---

## Related Documentation

- **Planning Orchestrator**: `docs/PLANNING-ORCHESTRATOR.md`
- **IndyDevDan Patterns**: `docs/indydevdan/agentic-orchestration-patterns.md`
- **Cascade Manager**: `plugins/carl/lib/cascade/cascade-manager.js`
- **Session State**: `plugins/carl/lib/workflow/session-state.js`
- **Planning Helpers**: `plugins/carl/lib/planning/planning-helpers.js`

---

## Summary

The Work Orchestrator completes CARL's autonomous agent system:
- **Planning Orchestrator**: Breaks down work into structured items
- **Work Orchestrator**: Executes work items with intelligent coordination
- **Together**: Provide a complete plan-and-execute workflow

**Key Metrics**:
- 7 Features, 20 Stories, 120 Tasks
- 200+ comprehensive tests
- Zero new dependencies
- Complete IndyDevDan alignment
- Observable by default
- Async-first execution

**Status**: 📋 Planned, ready for approval and execution
