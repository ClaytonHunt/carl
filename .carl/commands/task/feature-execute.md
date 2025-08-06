# Feature Execution Process

Execute a feature with proper dependency validation and child story coordination.

## Feature Execution Checklist

- [ ] **Dependency Validation** (BLOCKING - must pass to proceed)
  - [ ] Read feature file and extract feature ID
  - [ ] Find child stories: `find .carl/project/stories -name "*.story.carl" -exec grep -l "parent_feature_id: $feature_id" {} \;`
  - [ ] If NO child stories found:
    - [ ] Show error: "❌ HIERARCHY VIOLATION: Feature has no child stories"
    - [ ] Show remediation: "💡 Run: /carl:plan --from $feature_file to create story breakdown"
    - [ ] **STOP EXECUTION** (exit with error)
  - [ ] If child stories found, continue

- [ ] **Feature Implementation**
  - [ ] Update feature status to "in_progress"
  - [ ] Set actual_start timestamp
  - [ ] For each child story:
    - [ ] Execute story using: `/carl:task $story_file`
    - [ ] Wait for story completion before proceeding to next
    - [ ] If any story fails, mark feature as blocked and stop
  - [ ] After all stories complete:
    - [ ] Update feature status to "completed"
    - [ ] Set completion_percentage to 100
    - [ ] Set completion_date timestamp

- [ ] **Completion Validation**
  - [ ] Verify all child stories are marked "completed"
  - [ ] Verify feature acceptance criteria are met
  - [ ] Trigger completion hooks (automatic file movement to completed/)

## Error Handling

If dependency validation fails:
- Display clear error message with specific issue
- Provide remediation steps (usually /carl:plan --from)
- Do NOT proceed with execution
- Exit cleanly with error status

This prevents the exact workflow bypass issue identified in the enhanced-session-analytics feature execution.