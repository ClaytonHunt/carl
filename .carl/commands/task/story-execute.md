# Story Execution Process

Execute a story with proper dependency validation and implementation.

## Story Execution Checklist

- [ ] **Dependency Validation** (BLOCKING - must pass to proceed)
  - [ ] Read story file and extract parent_feature_id
  - [ ] If parent_feature_id specified:
    - [ ] Verify parent feature file exists: `.carl/project/features/$parent_feature_id.feature.carl`
    - [ ] If parent feature missing:
      - [ ] Show error: "❌ DEPENDENCY VIOLATION: Parent feature not found: $parent_feature_id"
      - [ ] Show remediation: "💡 Create parent feature file or fix parent_feature_id"
      - [ ] **STOP EXECUTION** (exit with error)
  - [ ] Check story dependencies list (if any)
  - [ ] For each dependency:
    - [ ] Verify dependency status is "completed" or "available"
    - [ ] If dependency not ready:
      - [ ] Show error: "❌ DEPENDENCY VIOLATION: Dependency not ready: $dependency_id"  
      - [ ] Show remediation: "💡 Complete dependency first: /carl:task $dependency_file"
      - [ ] **STOP EXECUTION** (exit with error)

- [ ] **Story Implementation**
  - [ ] Update story status to "in_progress"
  - [ ] Set actual_start timestamp
  - [ ] Load story requirements and acceptance criteria
  - [ ] Implement story according to user story and acceptance criteria
  - [ ] Run tests and validation
  - [ ] Update story status to "completed"
  - [ ] Set completion_percentage to 100
  - [ ] Set completion_date timestamp

- [ ] **Completion Validation**
  - [ ] Verify all acceptance criteria are met
  - [ ] Confirm implementation is working
  - [ ] Trigger completion hooks (automatic file movement to completed/)

## Implementation Focus

Stories are the actual implementation work - they contain:
- Specific user story requirements
- Detailed acceptance criteria  
- Technical implementation tasks
- Test requirements

This is where the real coding/building work happens.