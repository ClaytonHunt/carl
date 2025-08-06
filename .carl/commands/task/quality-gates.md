# Quality Gates and Validation

Automated validation and quality assurance during task execution.

## Quality Gates Checklist

### Standard Mode Gates
- [ ] **Syntax Validation**
  - [ ] Code compiles/parses correctly
  - [ ] No syntax errors or warnings
  - [ ] Proper formatting and style compliance

- [ ] **Test Validation**
  - [ ] All existing tests pass
  - [ ] New functionality has test coverage
  - [ ] Test coverage meets minimum requirements
  - [ ] Integration tests pass

- [ ] **Standards Compliance**
  - [ ] Code follows project coding standards
  - [ ] Documentation is updated
  - [ ] Security best practices followed
  - [ ] Performance considerations addressed

- [ ] **Integration Validation**
  - [ ] Works with existing system components
  - [ ] No breaking changes to APIs
  - [ ] Dependencies are properly managed
  - [ ] Backward compatibility maintained

### YOLO Mode Gates (Relaxed)
- [ ] **Basic Validation Only**
  - [ ] ✅ Code compiles/parses correctly
  - [ ] ⚠️ Run tests if exist, but don't block
  - [ ] ❌ Coverage requirements not enforced
  - [ ] ⚠️ Standards compliance - best effort
  - [ ] ✅ Basic integration compatibility check

## TDD Enforcement

When TDD enabled in process.carl (skipped in YOLO mode):

### Red-Green-Refactor Cycle
- [ ] **Red Phase**: Write failing tests first
- [ ] **Green Phase**: Implement minimal code to pass tests
- [ ] **Refactor Phase**: Improve code quality while maintaining tests
- [ ] **Validation**: Ensure full test coverage and quality standards

### TDD Quality Checkpoints
- [ ] Tests written before implementation
- [ ] Tests fail initially (Red)
- [ ] Minimal implementation makes tests pass (Green)
- [ ] Code refactored for quality (Refactor)
- [ ] Final validation of test coverage and quality

## Error Handling

### Standard Mode Failures
- **Test Failures**: Stop execution, provide clear failure details
- **Quality Gate Failures**: Block completion, provide improvement guidance
- **Integration Failures**: Roll back changes, report integration issues

### YOLO Mode Failures
- **Test Failures**: Log but continue execution ⚠️
- **Quality Gate Failures**: Log as technical debt, continue
- **Integration Failures**: Still block (must maintain system stability)

## Completion Validation

### Acceptance Criteria Verification
- [ ] All acceptance criteria from work item are met
- [ ] Implementation matches requirements
- [ ] Edge cases and error conditions handled
- [ ] User experience meets expectations

### Integration Testing
- [ ] End-to-end functionality works
- [ ] No regressions in existing features
- [ ] Performance within acceptable limits
- [ ] Security vulnerabilities addressed