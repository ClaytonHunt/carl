# Epic Execution Process

Execute an epic with proper dependency validation and child feature coordination.

## Epic Execution Checklist

- [ ] **Dependency Validation** (BLOCKING - must pass to proceed)
  - [ ] Read epic file and extract epic ID
  - [ ] Find child features: `find .carl/project/features -name "*.feature.carl" -exec grep -l "parent_epic_id: $epic_id" {} \;`
  - [ ] If NO child features found:
    - [ ] Show error: "❌ HIERARCHY VIOLATION: Epic has no child features"
    - [ ] Show remediation: "💡 Run: /carl:plan --from $epic_file to create feature breakdown"
    - [ ] **STOP EXECUTION** (exit with error)
  - [ ] If child features found, continue

- [ ] **Epic Implementation**
  - [ ] Update epic status to "in_progress"
  - [ ] Set actual_start timestamp
  - [ ] For each child feature:
    - [ ] Execute feature using: `/carl:task $feature_file`
    - [ ] Wait for feature completion before proceeding to next
    - [ ] If any feature fails, mark epic as blocked and stop
  - [ ] After all features complete:
    - [ ] Update epic status to "completed"
    - [ ] Set completion_percentage to 100
    - [ ] Set completion_date timestamp

- [ ] **Completion Validation**
  - [ ] Verify all child features are marked "completed"
  - [ ] Verify epic acceptance criteria are met
  - [ ] Trigger completion hooks (automatic file movement to completed/)

## Loop Execution Pattern

Epic execution follows the recursive pattern:
1. Epic executes child features
2. Each feature executes its child stories  
3. Each story executes its implementation tasks
4. Completion bubbles up: stories → features → epic

This ensures proper hierarchical execution with full dependency validation at each level.