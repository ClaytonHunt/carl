# Technical Work Execution Process

Execute technical work items with dependency validation.

## Technical Execution Checklist

- [ ] **Dependency Validation** (BLOCKING - must pass to proceed)
  - [ ] Read technical file and extract dependencies list
  - [ ] For each dependency:
    - [ ] Check dependency status  
    - [ ] If dependency status not "completed" or "available":
      - [ ] Show error: "❌ DEPENDENCY VIOLATION: Technical dependency not ready: $dependency_id"
      - [ ] Show remediation: "💡 Complete dependency first: /carl:task $dependency_file"
      - [ ] **STOP EXECUTION** (exit with error)
  - [ ] If all dependencies ready, continue

- [ ] **Technical Implementation**
  - [ ] Update technical work status to "in_progress"
  - [ ] Set actual_start timestamp
  - [ ] Load technical requirements and specifications
  - [ ] Implement technical work according to requirements
  - [ ] Run validation and testing as appropriate
  - [ ] Update technical work status to "completed"
  - [ ] Set completion_percentage to 100
  - [ ] Set completion_date timestamp

- [ ] **Completion Validation**
  - [ ] Verify technical requirements are met
  - [ ] Confirm implementation is working
  - [ ] Trigger completion hooks (automatic file movement to completed/)

## Technical Work Types

Technical work includes:
- Infrastructure setup
- Tooling improvements  
- Process automation
- System maintenance
- Performance optimizations
- Security updates

Technical work items are typically independent but may have dependencies on other technical work or system components.