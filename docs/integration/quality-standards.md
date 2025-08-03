# Quality Standards

## Universal Completion Criteria

### Story Completion (Always Required)
- All acceptance criteria met in scope file
- Scope file updated with 100% completion
- Integration points documented
- Work moved to `completed/` subdirectory

### Feature Completion (Always Required)
- All child stories completed
- Feature objectives achieved
- Documentation updated
- Stakeholder acceptance confirmed

### Epic Completion (Always Required)
- All child features completed
- Strategic objectives achieved
- Epic goals validated
- Architecture documented

## Project-Specific Quality Gates

Quality gates are determined by `.carl/project/process.carl` file:

### TDD Projects (When `process.carl` includes TDD)
- **Test-First Enforcement**: PostToolUse hook blocks completion until tests pass
- **Business Rule Coverage**: 100% of acceptance criteria must have passing tests (current work only)
- **Code Coverage Goal**: Team-defined target (e.g., 80%) for overall codebase metrics
- **Red-Green-Refactor**: Hook enforces failing test → implementation → passing test
- **Minimal Code Principle**: Only code needed to pass business rule tests

### Coverage Distinction
- **Business Rule Coverage (100% Required)**: All acceptance criteria in current scope file must have tests
- **Code Coverage (Team Goal)**: Overall project metric tracked in status reports, not enforced per work item

### Non-TDD Projects
- Manual testing acceptable
- Documentation of testing approach
- Completion based on acceptance criteria

## Implementation Notes
- **TDD Gate**: PostToolUse hook conditionally blocks completion when tests fail (TDD projects only)
- **Monorepo Support**: Detects app-specific methodology based on edited file path
- **Graceful Fallback**: Works with or without `yq` dependency for YAML parsing
- **Full Implementation**: `.carl/hooks/progress-track.sh`