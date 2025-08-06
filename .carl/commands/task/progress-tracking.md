# Progress Tracking Integration

Real-time progress tracking during task execution using Edit/MultiEdit tools.

## Progress Tracking Checklist

- [ ] **Start Execution Updates**
  - [ ] Update status to "in_progress"
  - [ ] Set current_phase to appropriate phase
  - [ ] Add start timestamp
  - [ ] Set completion_percentage to 0

- [ ] **Major Milestone Updates (25%, 50%, 75%)**
  - [ ] Update progress_percentage
  - [ ] Add implementation_notes describing progress
  - [ ] Update last_updated timestamp
  - [ ] Document any issues or blockers

- [ ] **Phase Transition Updates**
  - [ ] Update current_phase field
  - [ ] Add phase completion notes
  - [ ] Update progress_percentage
  - [ ] Record next phase objectives

- [ ] **Completion Updates**
  - [ ] Update status to "completed"
  - [ ] Set completion_percentage to 100
  - [ ] Add completion timestamp
  - [ ] Add completion_notes summarizing work done

## Example Progress Updates

**Start Execution**:
```yaml
status: in_progress
completion_percentage: 0
current_phase: "analysis"
last_updated: "2025-08-06T15:30:00Z"
actual_start: "2025-08-06T15:30:00Z"
```

**Major Milestone (50%)**:
```yaml
completion_percentage: 50
current_phase: "implementation"
last_updated: "2025-08-06T16:15:00Z"
implementation_notes:
  - "API endpoints created and tested"
  - "Database schema updated"
  - "Next: Add validation and error handling"
```

**Completion**:
```yaml
status: completed
completion_percentage: 100
current_phase: "completed"
last_updated: "2025-08-06T17:00:00Z"
completion_date: "2025-08-06T17:00:00Z"
completion_notes: "All acceptance criteria met, tests passing"
```

## Tool Usage

- **Edit tool**: Single field updates during execution
- **MultiEdit tool**: Multiple field updates at major milestones
- **Always update**: last_updated timestamp with each change

This ensures real-time visibility into execution progress and provides audit trail for completed work.