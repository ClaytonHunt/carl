# HOP/LOP Pattern (Higher Order Prompt / Lower Order Prompt)

The foundational pattern for multi-agent orchestration - thin orchestrator delegates to specialized workers.

## Overview

**HOP/LOP** is IndyDevDan's core pattern for agent delegation:
- **HOP** (Higher Order Prompt): Thin orchestrator that analyzes and delegates
- **LOP** (Lower Order Prompt): Specialized workers that execute focused tasks

Think of it as **manager pattern** where the manager (HOP) doesn't do the work, but coordinates specialists (LOPs).

## Pattern Architecture

```
User Request
    ↓
HOP (Orchestrator)
    ├─ Analyzes request
    ├─ Breaks into subtasks
    ├─ Delegates to LOPs
    └─ Aggregates results
        ↓ spawns
    ├─ LOP 1 (Specialist A)
    ├─ LOP 2 (Specialist B)
    └─ LOP 3 (Specialist C)
        ↓ returns results
HOP validates and reports
    ↓
User receives final output
```

## Key Characteristics

### HOP (Orchestrator)
- **Thin**: Minimal logic, mostly coordination
- **Analytical**: Understands requirements
- **Delegating**: Spawns specialists
- **Validating**: Checks results
- **Aggregating**: Combines outputs

### LOP (Specialist)
- **Thick**: Detailed implementation logic
- **Focused**: Single domain expertise
- **Autonomous**: Executes independently
- **Reporting**: Returns structured results
- **Reusable**: Works across workflows

## When to Use HOP/LOP

### ✅ Use When:
- Task naturally decomposes into specialized subtasks
- Need clean separation of concerns
- Want reusable specialist agents
- Multiple agents with different expertise needed
- User triggers workflow explicitly
- Orchestration logic is straightforward

### ❌ Don't Use When:
- Single simple task (just use one agent)
- Need external event coordination (use Event-Driven)
- Workflow is purely sequential with no branching
- No clear specialist domains

## Implementation in Claude Code

### HOP: Slash Command (Thin Orchestrator)

**File**: `.claude/commands/review-code.md`

```markdown
---
description: Comprehensive code review workflow
allowed-tools: Task, Read, Grep
argument-hint: [file-or-directory]
---

# Code Review Workflow (HOP)

You are the orchestration coordinator for code reviews.

## Your Role

Analyze the target code and delegate to specialist reviewers:

1. **Analyze Target**: `${TARGET_PATH}`
2. **Determine Scope**: File, directory, or full codebase
3. **Delegate to Specialists**:
   - Security review → security-reviewer agent
   - Performance review → performance-reviewer agent
   - Quality review → quality-reviewer agent
   - Best practices → standards-reviewer agent

## Workflow

### Step 1: Analyze Target
```bash
# Identify what needs review
```

### Step 2: Spawn Specialist Reviewers (Parallel)
Use Task tool to spawn agents in parallel:

```
Task(
  subagent_type: "security-reviewer",
  description: "Security review of ${TARGET_PATH}",
  prompt: "Review security vulnerabilities, input validation, authentication issues..."
)

Task(
  subagent_type: "performance-reviewer",
  description: "Performance review of ${TARGET_PATH}",
  prompt: "Analyze performance bottlenecks, optimization opportunities..."
)

Task(
  subagent_type: "quality-reviewer",
  description: "Code quality review of ${TARGET_PATH}",
  prompt: "Review code quality, maintainability, documentation..."
)
```

### Step 3: Aggregate Results
Collect and synthesize findings from all reviewers.

### Step 4: Validate and Report
- Prioritize findings
- Identify patterns
- Generate actionable recommendations
- Present unified report to user

## Output Format

Present consolidated report with:
- Executive summary
- Findings by category
- Priority issues
- Recommendations
- Next steps
```

### LOPs: SubAgents (Specialized Workers)

**File 1**: `.claude/agents/security-reviewer.md`

```markdown
---
name: security-reviewer
description: Security vulnerability analysis. Invoke for security reviews, vulnerability scanning, threat analysis, authentication and authorization review.
tools: Read, Grep, Glob
model: sonnet
---

# Security Reviewer (LOP)

You are a security specialist focused on identifying vulnerabilities and security risks in code.

## Core Responsibilities

1. **Vulnerability Detection**: SQL injection, XSS, CSRF, etc.
2. **Authentication Review**: Proper auth implementation
3. **Authorization Review**: Access control correctness
4. **Data Protection**: Encryption, sensitive data handling
5. **Input Validation**: User input sanitization
6. **Dependency Security**: Known vulnerable packages

## Analysis Workflow

### Phase 1: Quick Scan
- Grep for known vulnerability patterns
- Check dependency versions
- Identify sensitive data exposure

### Phase 2: Deep Analysis
- Review authentication flows
- Analyze authorization logic
- Check input validation
- Review cryptographic usage
- Examine session management

### Phase 3: Risk Assessment
- Categorize findings (Critical/High/Medium/Low)
- Estimate exploitability
- Assess potential impact

## Output Format

Provide structured findings:

```json
{
  "summary": "Brief overview",
  "critical_issues": [
    {
      "title": "SQL Injection in login",
      "location": "auth.ts:45",
      "severity": "CRITICAL",
      "description": "...",
      "recommendation": "Use parameterized queries"
    }
  ],
  "high_issues": [...],
  "medium_issues": [...],
  "low_issues": [...],
  "metrics": {
    "files_reviewed": 10,
    "total_issues": 5
  }
}
```

## Security Patterns to Check

### Authentication
- Password storage (hashing, salting)
- Session management
- Token handling
- Multi-factor authentication

### Authorization
- Role-based access control
- Resource ownership checks
- Privilege escalation prevention

### Input Validation
- SQL injection prevention
- XSS prevention
- Command injection prevention
- Path traversal prevention

### Data Protection
- Encryption at rest
- Encryption in transit
- API key security
- PII handling
```

**File 2**: `.claude/agents/performance-reviewer.md`

```markdown
---
name: performance-reviewer
description: Performance bottleneck analysis and optimization opportunities. Invoke for performance reviews, optimization suggestions, scalability analysis.
tools: Read, Grep, Glob
model: sonnet
---

# Performance Reviewer (LOP)

You are a performance optimization specialist focused on identifying bottlenecks and scalability issues.

## Core Responsibilities

1. **Algorithm Analysis**: Big O complexity review
2. **Database Optimization**: Query efficiency, indexing
3. **Memory Management**: Leaks, inefficient allocations
4. **Caching Opportunities**: Identify cacheable operations
5. **Async Patterns**: Proper async/await usage
6. **Bundle Size**: Frontend optimization

## Analysis Workflow

### Phase 1: Hotspot Identification
- Find expensive operations
- Identify repeated computations
- Locate N+1 queries
- Check synchronous blocking

### Phase 2: Performance Profiling
- Analyze algorithm complexity
- Review database queries
- Check memory usage patterns
- Identify caching opportunities

### Phase 3: Optimization Recommendations
- Prioritize by impact
- Provide specific fixes
- Estimate improvement

## Output Format

```json
{
  "summary": "Performance analysis overview",
  "bottlenecks": [
    {
      "title": "N+1 Query in user list",
      "location": "users.ts:123",
      "severity": "HIGH",
      "current_complexity": "O(n²)",
      "description": "...",
      "recommendation": "Add eager loading",
      "estimated_improvement": "10x faster"
    }
  ],
  "optimizations": [...],
  "metrics": {
    "files_reviewed": 10,
    "issues_found": 8
  }
}
```

## Performance Checks

### Algorithmic Efficiency
- Loop complexity
- Nested iterations
- Recursive calls
- Data structure choices

### Database Performance
- Query optimization
- Index usage
- N+1 queries
- Connection pooling

### Memory Optimization
- Memory leaks
- Unnecessary allocations
- Large object retention
- Resource cleanup

### Caching Strategies
- Memoization opportunities
- HTTP caching
- Database caching
- CDN usage
```

**File 3**: `.claude/agents/quality-reviewer.md`

```markdown
---
name: quality-reviewer
description: Code quality, maintainability, and best practices review. Invoke for code quality analysis, refactoring suggestions, documentation review.
tools: Read, Grep, Glob
model: sonnet
---

# Quality Reviewer (LOP)

You are a code quality specialist focused on maintainability, readability, and best practices.

## Core Responsibilities

1. **Code Clarity**: Naming, structure, readability
2. **Maintainability**: Complexity, coupling, cohesion
3. **Documentation**: Comments, docs, examples
4. **Testing**: Coverage, quality, patterns
5. **Best Practices**: Language idioms, design patterns
6. **Technical Debt**: Identified and quantified

## Analysis Workflow

### Phase 1: Structure Review
- Module organization
- Function complexity
- Class design
- Dependency structure

### Phase 2: Quality Metrics
- Cyclomatic complexity
- Code duplication
- Naming consistency
- Documentation coverage

### Phase 3: Improvement Plan
- Prioritized refactoring
- Pattern application
- Debt reduction strategy

## Output Format

```json
{
  "summary": "Code quality overview",
  "issues": [
    {
      "title": "High cyclomatic complexity",
      "location": "validator.ts:50-120",
      "severity": "MEDIUM",
      "complexity": 15,
      "description": "Function too complex",
      "recommendation": "Extract methods, simplify logic"
    }
  ],
  "strengths": ["Good test coverage", "Clear naming"],
  "metrics": {
    "avg_complexity": 5.2,
    "duplication_percentage": 3.1,
    "documentation_coverage": 85
  }
}
```

## Quality Checks

### Code Structure
- Function length
- Class size
- Nesting depth
- Coupling/cohesion

### Naming & Clarity
- Variable naming
- Function naming
- Consistency
- Clarity

### Documentation
- Comment quality
- API documentation
- Examples
- README completeness

### Testing
- Test coverage
- Test quality
- Test patterns
- Edge cases
```

## Complete Example Usage

### User Invocation
```
/review-code src/auth
```

### HOP Execution (Orchestrator Command)
1. Analyzes `src/auth` directory
2. Spawns three agents in parallel using Task tool:
   - `security-reviewer`
   - `performance-reviewer`
   - `quality-reviewer`
3. Waits for all to complete
4. Aggregates results
5. Presents unified report

### LOP Execution (Specialist Agents)
Each agent independently:
1. Reads files in `src/auth`
2. Performs specialized analysis
3. Returns structured findings
4. Completes without knowing about other agents

### Final Output
HOP synthesizes all findings into coherent report:
```
# Code Review Report: src/auth

## Executive Summary
Reviewed 8 files in authentication module. Found 2 critical security issues,
3 performance optimizations, and 5 quality improvements.

## Critical Issues

### Security - SQL Injection (CRITICAL)
Location: auth.ts:45
...

### Security - Weak Password Hash (CRITICAL)
Location: users.ts:89
...

## High Priority

### Performance - N+1 Query (HIGH)
...

## Medium Priority

### Quality - High Complexity (MEDIUM)
...

## Recommendations
1. [Priority 1] Fix SQL injection immediately
2. [Priority 2] Update password hashing
3. [Priority 3] Optimize user loading query
...
```

## Benefits of HOP/LOP

### Clean Separation
- Orchestration logic separate from execution
- Easy to understand flow
- Clear responsibilities

### Reusability
- Specialist agents work across workflows
- Orchestrators can be templatized
- Components compose easily

### Efficiency
- Parallel specialist execution
- Separate context windows
- Optimal resource usage

### Maintainability
- Easy to add new specialists
- Simple to modify orchestration
- Clear debugging path

### Scalability
- Add more specialists as needed
- Multiple orchestrators can use same specialists
- Hierarchical orchestration possible

## Advanced Patterns

### Hierarchical HOP/LOP
Orchestrators can delegate to other orchestrators:

```
Top HOP (full-stack-review)
    ├─ Mid HOP (frontend-review)
    │   ├─ LOP (react-reviewer)
    │   ├─ LOP (style-reviewer)
    │   └─ LOP (accessibility-reviewer)
    ├─ Mid HOP (backend-review)
    │   ├─ LOP (api-reviewer)
    │   ├─ LOP (database-reviewer)
    │   └─ LOP (security-reviewer)
    └─ Mid HOP (infra-review)
        ├─ LOP (docker-reviewer)
        └─ LOP (deployment-reviewer)
```

### Conditional Delegation
HOP decides which LOPs to invoke based on analysis:

```markdown
## Step 2: Conditional Delegation

If target contains database code:
  - Spawn database-reviewer

If target contains React components:
  - Spawn react-reviewer
  - Spawn accessibility-reviewer

If target is API:
  - Spawn api-reviewer
  - Spawn security-reviewer
```

### Sequential HOP/LOP
Some tasks require sequential specialist work:

```
HOP (feature-implementation)
    ↓ sequential
LOP 1 (requirements-analyst)
    ↓ completes
LOP 2 (technical-architect)
    ↓ completes
LOP 3 (code-generator)
    ↓ completes
LOP 4 (test-generator)
    ↓ all complete
HOP aggregates and validates
```

## Common Pitfalls

### ❌ Fat HOP
**Problem**: Orchestrator does too much work itself

**Solution**: Delegate more to specialists

### ❌ Thin LOP
**Problem**: Specialists too generic, not enough expertise

**Solution**: Add domain knowledge to specialist prompts

### ❌ No Aggregation
**Problem**: HOP just passes through specialist results

**Solution**: Add synthesis, prioritization, validation

### ❌ Context Pollution
**Problem**: Sharing too much context between agents

**Solution**: Clean separation, minimal information sharing

### ❌ Serial When Parallel Possible
**Problem**: Running specialists sequentially when independent

**Solution**: Use parallel Task calls for independent work

## Testing HOP/LOP

### Test Specialists Individually
```
Use specialist-agent directly to verify it works
```

### Test Orchestrator Logic
```
/orchestrator-command test-input
Verify: correct specialists invoked, proper aggregation
```

### Test Full Workflow
```
/orchestrator-command real-target
Verify: complete end-to-end functionality
```

## Best Practices

### ✅ Do
- Keep HOP thin (coordination only)
- Make LOPs thick (detailed expertise)
- Use parallel execution when possible
- Validate specialist results in HOP
- Document specialist interfaces
- Test specialists independently
- Make specialists reusable

### ❌ Don't
- Put business logic in HOP
- Make LOPs too generic
- Block when you could parallelize
- Skip result validation
- Share too much context
- Create specialists for every tiny task
- Forget error handling

## Additional Resources

- **IndyDevDan's Patterns**: `@docs/indydevdan/agentic-orchestration-patterns.md`
- **Command Templates**: `@.claude/.carl/templates/commands/`
- **Agent Templates**: `@.claude/.carl/templates/agents/`
- **Parallel Pattern**: `@.claude/.carl/templates/workflows/patterns/parallel-execution.md`
