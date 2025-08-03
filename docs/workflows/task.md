# /carl:task - Context-Aware Execution

**Purpose**: Execute development work with full CARL context integration

## Intelligent Scope Handling

- **Story/Technical Items**: Direct implementation (planning assumed complete)
- **Feature with Stories**: Analyze dependencies, execute in optimal order (parallel when possible)
- **Feature without Stories**: Invoke planning to break down into stories first
- **Epic with Features**: Check feature completeness, handle mixed planning/execution
- **Epic without Features**: Invoke planning to break down into features first

## Implementation Workflow (for Story/Technical items)

1. **Context Validation**: Verify scope files exist and dependencies are satisfied
2. **TDD Enforcement**: Red-Green-Refactor cycle required when TDD enabled in process.carl
3. **Progress Tracking**: Real-time progress updates within scope files
4. **Quality Gates**: Automated validation at each phase
5. **Completion Verification**: Comprehensive testing and documentation

## Feature Execution Workflow (when stories exist)

1. **Child Story Discovery**: Identify all stories belonging to the feature
2. **Dependency Analysis**: Analyze story dependencies and blocking relationships
3. **Execution Planning**: Determine optimal execution order (sequential vs parallel)
4. **Parallel Implementation**: Execute independent stories simultaneously when possible
5. **Sequential Dependencies**: Complete blocking stories before dependent ones
6. **Feature Completion**: Verify all stories complete and feature objectives met

## Epic Execution Workflow (when features exist)

1. **Feature Inventory**: Identify all features belonging to the epic
2. **Completeness Check**: Verify each feature has necessary stories
3. **Mixed Mode Handling**: 
   - **Complete Features**: Execute using Feature Execution Workflow
   - **Incomplete Features**: Invoke `/carl:plan --from [feature]` to create missing stories
4. **Epic Orchestration**: Coordinate feature completion toward epic objectives
5. **Epic Completion**: Verify all features complete and epic goals achieved

## Auto-Planning Invocation

When `/carl:task` detects missing breakdown, automatically invoke `/carl:plan --from [work-item]` to create missing child items, then switch to execution workflow