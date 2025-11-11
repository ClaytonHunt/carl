# Workflow Complexity Guidelines

Assess task complexity to determine if a workflow is needed and which pattern to use.

## Complexity Assessment Framework

### Scoring System

Evaluate your task across these dimensions:

| Dimension | Score 1 | Score 3 | Score 5 | Score 7 | Score 10 |
|-----------|---------|---------|---------|---------|----------|
| **Agents Needed** | 1 agent | 2 agents | 3-4 agents | 5-7 agents | 8+ agents |
| **Dependencies** | None | 1-2 | 3-5 | 6-10 | 10+ |
| **Parallelization** | None | 2 parallel | 3-4 parallel | 5-7 parallel | 8+ parallel |
| **Duration** | <1 min | 1-3 min | 3-5 min | 5-10 min | 10+ min |
| **External Integration** | None | Logging | Webhooks | External API | Full orchestration |
| **Phases** | 1 phase | 2 phases | 3-4 phases | 5-6 phases | 7+ phases |
| **Error Handling** | Simple | Basic retry | Multiple strategies | Complex recovery | Self-healing |
| **Context Size** | Small | Medium | Large | Very large | Multiple contexts |

### Total Score Interpretation

| Total Score | Recommendation | Pattern |
|-------------|----------------|---------|
| **1-10** | Don't use workflow | Single agent or command |
| **11-20** | Simple workflow | HOP/LOP or Sequential |
| **21-35** | Moderate workflow | Parallel or Hierarchical |
| **36-50** | Complex workflow | Event-Driven with observability |
| **51+** | Split into multiple workflows | Combination of patterns |

## Detailed Complexity Factors

### 1. Agent Count

**1 Agent (1 point)**:
- Single specialized task
- No delegation needed
- Example: Format code files

**2 Agents (3 points)**:
- Simple orchestrator + worker
- Basic HOP/LOP
- Example: Analyze and report

**3-4 Agents (5 points)**:
- Orchestrator + multiple specialists
- Some parallelization
- Example: Code review with quality/security/performance checks

**5-7 Agents (7 points)**:
- Multi-level orchestration
- Significant parallelization
- Example: Feature implementation with frontend/backend/tests

**8+ Agents (10 points)**:
- Complex orchestration
- Hierarchical delegation
- Example: Full project generation

### 2. Dependencies

**None (1 point)**:
- All tasks independent
- Full parallelization possible
- Example: Generate multiple documentation pages

**1-2 Dependencies (3 points)**:
- Simple ordering requirements
- Mostly parallel with sync points
- Example: Analyze then report

**3-5 Dependencies (5 points)**:
- Clear dependency chain
- Mix of parallel and sequential
- Example: Test → Build → Deploy

**6-10 Dependencies (7 points)**:
- Complex dependency graph
- Multiple phases with internal dependencies
- Example: Multi-stage build pipeline

**10+ Dependencies (10 points)**:
- Highly interdependent
- Careful ordering critical
- Example: Distributed system deployment

### 3. Parallelization Potential

**None (1 point)**:
- Strictly sequential
- Each step depends on previous
- Example: Migration script

**2 Parallel Tasks (3 points)**:
- Few independent tasks
- Limited speedup
- Example: Frontend + Backend generation

**3-4 Parallel Tasks (5 points)**:
- Moderate parallelization
- Significant speedup possible
- Example: Multiple analyzers

**5-7 Parallel Tasks (7 points)**:
- High parallelization
- Major speedup benefit
- Example: Comprehensive test suite

**8+ Parallel Tasks (10 points)**:
- Massive parallelization
- Critical for performance
- Example: Large codebase transformation

### 4. Estimated Duration

**<1 Minute (1 point)**:
- Quick operation
- Simple coordination
- Example: File formatting

**1-3 Minutes (3 points)**:
- Short workflow
- Basic coordination sufficient
- Example: Code analysis

**3-5 Minutes (5 points)**:
- Medium workflow
- Progress tracking helpful
- Example: Test suite execution

**5-10 Minutes (7 points)**:
- Long workflow
- Observability important
- Example: Build and deploy

**10+ Minutes (10 points)**:
- Very long workflow
- Async coordination critical
- Example: Full system migration

### 5. External Integration

**None (1 point)**:
- Self-contained
- No external dependencies
- Example: Local code transformation

**Logging (3 points)**:
- Basic event logging
- File-based tracking
- Example: Execution log

**Webhooks (5 points)**:
- Event publishing
- External notification
- Example: Slack/Discord notifications

**External API (7 points)**:
- API integration
- Data exchange
- Example: Issue tracker updates

**Full Orchestration (10 points)**:
- External orchestrator
- Event-driven coordination
- Example: IndyDevDan's webhook architecture

### 6. Number of Phases

**1 Phase (1 point)**:
- Single execution phase
- No phases to coordinate
- Example: Direct code generation

**2 Phases (3 points)**:
- Simple two-phase workflow
- Basic coordination
- Example: Plan then execute

**3-4 Phases (5 points)**:
- Multi-phase workflow
- Phase transitions needed
- Example: Analyze → Plan → Execute → Verify

**5-6 Phases (7 points)**:
- Complex multi-phase
- Careful phase management
- Example: Full SDLC workflow

**7+ Phases (10 points)**:
- Very complex pipeline
- Advanced orchestration
- Example: Enterprise deployment pipeline

### 7. Error Handling Complexity

**Simple (1 point)**:
- Fail and report
- No retry logic
- Example: Read-only analysis

**Basic Retry (3 points)**:
- Simple retry on failure
- Fixed retry count
- Example: API call with retry

**Multiple Strategies (5 points)**:
- Different handling per failure type
- Exponential backoff
- Example: Network operations with fallback

**Complex Recovery (7 points)**:
- Rollback capabilities
- State recovery
- Example: Database migration

**Self-Healing (10 points)**:
- Automatic detection and correction
- Adaptive strategies
- Example: Distributed system coordination

### 8. Context Size

**Small (1 point)**:
- Single file or feature
- Minimal context needed
- Example: Single function refactor

**Medium (3 points)**:
- Multiple files
- Module-level context
- Example: Component refactor

**Large (5 points)**:
- Full subsystem
- Cross-module context
- Example: Feature implementation

**Very Large (7 points)**:
- Entire codebase
- Complex dependencies
- Example: Architectural refactor

**Multiple Contexts (10 points)**:
- Multiple projects/repos
- Separate context windows critical
- Example: Microservices coordination

## Decision Trees

### Should I Use a Workflow?

```
Is the task multi-step?
  ├─ No → Use single agent or command
  └─ Yes → Can steps run in parallel?
       ├─ No → Is it >3 steps?
       │    ├─ No → Use single agent
       │    └─ Yes → Use Sequential workflow
       └─ Yes → Do you need coordination?
            ├─ No → Use Parallel workflow
            └─ Yes → Use Event-Driven workflow
```

### Which Pattern Should I Use?

```
Number of agents needed?
  ├─ 1 → No workflow
  ├─ 2 → HOP/LOP
  ├─ 3-5 → Has clear dependencies?
  │    ├─ Yes → Sequential or HOP/LOP
  │    └─ No → Parallel
  └─ 6+ → Multiple orchestration levels?
       ├─ Yes → Hierarchical
       └─ No → Need external coordination?
            ├─ Yes → Event-Driven
            └─ No → Parallel or Hierarchical
```

## Complexity Examples

### Example 1: Simple Code Formatting
- **Agents**: 1
- **Dependencies**: 0
- **Parallelization**: 0
- **Duration**: <1 min
- **External**: None
- **Phases**: 1
- **Error Handling**: Simple
- **Context**: Small

**Total Score**: 8 points
**Recommendation**: Single command, no workflow needed

### Example 2: Code Review
- **Agents**: 4 (orchestrator + 3 analyzers)
- **Dependencies**: 1 (analyze then aggregate)
- **Parallelization**: 3 (analyzers run parallel)
- **Duration**: 2 min
- **External**: Logging
- **Phases**: 2 (analyze, aggregate)
- **Error Handling**: Basic
- **Context**: Medium

**Total Score**: 21 points
**Recommendation**: Parallel workflow with HOP/LOP

### Example 3: Feature Implementation
- **Agents**: 6 (orchestrator + 5 workers)
- **Dependencies**: 4 (plan → implement → test → review)
- **Parallelization**: 4 (frontend/backend/tests/docs)
- **Duration**: 5 min
- **External**: Webhooks
- **Phases**: 4 (plan, implement, test, review)
- **Error Handling**: Multiple strategies
- **Context**: Large

**Total Score**: 37 points
**Recommendation**: Event-Driven workflow with observability

### Example 4: Full Project Generation
- **Agents**: 12 (multi-level orchestration)
- **Dependencies**: 8 (complex dependency graph)
- **Parallelization**: 8 (many parallel tasks)
- **Duration**: 8 min
- **External**: Full orchestration
- **Phases**: 5 (analyze, plan, scaffold, implement, test)
- **Error Handling**: Complex recovery
- **Context**: Very large

**Total Score**: 54 points
**Recommendation**: Split into multiple Event-Driven workflows

## Refactoring Guidelines

### When to Split a Workflow

Split if:
- **Total score >50**: Too complex for single workflow
- **10+ agents**: Hard to manage and debug
- **Multiple unrelated phases**: Can be separate workflows
- **Reusable phases**: Useful independently
- **Hard to understand**: Team members confused
- **Frequent failures**: Too many failure points
- **Slow execution**: Better parallelization needed

### How to Split

**Strategy 1: By Phase**
```
Before: mega-workflow (50 points)
After:
  - phase1-workflow (15 points)
  - phase2-workflow (18 points)
  - phase3-workflow (17 points)
```

**Strategy 2: By Domain**
```
Before: full-stack-workflow (55 points)
After:
  - frontend-workflow (20 points)
  - backend-workflow (20 points)
  - infra-workflow (15 points)
```

**Strategy 3: By Responsibility**
```
Before: deploy-everything (48 points)
After:
  - pre-deploy-workflow (12 points)
  - deploy-workflow (18 points)
  - post-deploy-workflow (18 points)
```

### Refactoring Process

1. **Measure current complexity** using scoring system
2. **Identify natural split points** (phases, domains, responsibilities)
3. **Create sub-workflows** for each section
4. **Define interfaces** between workflows
5. **Implement coordination** (sequential trigger or event-driven)
6. **Test each workflow** independently
7. **Test integration** of full system
8. **Document architecture** and flow

## Optimization Strategies

### For High Agent Count
- Split by domain
- Create sub-orchestrators
- Use hierarchical pattern
- Consider multiple workflows

### For Many Dependencies
- Identify parallelization opportunities
- Reduce unnecessary dependencies
- Use event-driven coordination
- Optimize critical path

### For Long Duration
- Maximize parallelization
- Use async patterns
- Add progress reporting
- Consider breaking into phases

### For Complex Context
- Use separate agents (separate contexts)
- Share minimal information
- Use event-driven coordination
- Consider workflow splitting

## Best Practices

### ✅ Do
- Measure complexity before designing
- Choose simplest pattern that works
- Start simple, add complexity as needed
- Split workflows when score >50
- Document complexity rationale
- Reassess when requirements change
- Test at each complexity level

### ❌ Don't
- Over-engineer simple tasks
- Ignore complexity metrics
- Create monolithic workflows
- Skip splitting when needed
- Add complexity without benefit
- Ignore performance implications
- Forget to document reasoning

## Complexity Audit Checklist

Use this checklist to audit existing workflows:

- [ ] Calculated total complexity score
- [ ] Identified bottlenecks
- [ ] Evaluated parallelization opportunities
- [ ] Checked for unnecessary dependencies
- [ ] Assessed error handling adequacy
- [ ] Reviewed context management
- [ ] Considered splitting if score >50
- [ ] Documented complexity rationale
- [ ] Identified optimization opportunities
- [ ] Validated pattern choice

## Additional Resources

- **Pattern Details**: See `patterns/` directory
- **IndyDevDan Principles**: `@docs/indydevdan/agentic-orchestration-patterns.md`
- **Workflow Examples**: `@.claude/.carl/templates/workflows/README.md`
