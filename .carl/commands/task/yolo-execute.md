# YOLO Execution Process

Execute work items in rapid prototyping mode with relaxed validation and automatic debt tracking.

## YOLO Execution Checklist

- [ ] **YOLO Mode Setup**
  - [ ] Display YOLO warning:
    ```
    🚀 YOLO MODE ACTIVATED
    ⚠️  Rapid prototyping - will skip breakdown requirements
    📝 Technical debt will be tracked automatically
    ```
  - [ ] Ask for user confirmation: "Proceed with YOLO execution? (y/N)"
  - [ ] If user declines, exit cleanly

- [ ] **Relaxed Dependency Analysis**
  - [ ] Determine work item scope (epic/feature/story/technical)
  - [ ] Check for existing breakdown:
    - [ ] Epic: Check if child features exist
    - [ ] Feature: Check if child stories exist
    - [ ] Story/Technical: Check basic dependencies
  - [ ] Document gaps but don't block execution

- [ ] **Gap Documentation** 
  - [ ] For each missing breakdown or dependency:
    - [ ] Create technical debt item in `.carl/project/technical/`
    - [ ] Tag with "yolo-debt" for later cleanup
    - [ ] Record what was skipped and why

- [ ] **YOLO Implementation**
  - [ ] Update work item status to "in_progress"  
  - [ ] Set yolo_mode flag in work item
  - [ ] Implement with best effort approach:
    - [ ] Epic: Implement major components directly
    - [ ] Feature: Build feature without detailed stories
    - [ ] Story: Standard implementation
    - [ ] Technical: Standard implementation
  - [ ] Track implementation notes and shortcuts taken

- [ ] **YOLO Completion**
  - [ ] Update work item status to "completed"
  - [ ] Add yolo completion notes
  - [ ] Create summary of technical debt created
  - [ ] Suggest follow-up planning: "Consider running /carl:plan --from $work_item to formalize breakdown"

## YOLO Philosophy

YOLO mode is for:
- Rapid prototyping and experimentation
- Time-boxed demos or proofs of concept  
- Solo development where planning overhead isn't justified
- Exploratory work where requirements are unclear

YOLO mode automatically creates technical debt items for later formalization, allowing rapid progress while maintaining long-term project health.