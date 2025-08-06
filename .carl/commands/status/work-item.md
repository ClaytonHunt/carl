# Status Command - Work Item Focus Mode

Detailed status analysis for specific work items with dependency tracking and progress details.

## Prerequisites Check

- [ ] Target work item specified and exists
- [ ] Work item is readable and schema-compliant
- [ ] Related work items are accessible for dependency analysis

## Work Item Analysis Process Checklist

### Target Work Item Deep Analysis
- [ ] Load and parse target work item file
- [ ] Extract current status, progress, and phase information
- [ ] Analyze completion history and timeline
- [ ] Identify blockers, issues, and risks

### Dependency Analysis
- [ ] **Parent-Child Relationships**:
  - [ ] Identify parent work item (if applicable)
  - [ ] List all child work items
  - [ ] Calculate child completion status
  - [ ] Check parent-child consistency

- [ ] **Dependency Chain Analysis**:
  - [ ] Map all dependencies (direct and transitive)
  - [ ] Check dependency completion status
  - [ ] Identify dependency blockers
  - [ ] Calculate critical path impact

### Progress Context
- [ ] Recent activity and updates
- [ ] Time elapsed vs. estimates
- [ ] Quality metrics and test status
- [ ] Implementation notes and decisions

## Output Format

```
🎯 Work Item Status: user-authentication-system.feature.carl

📋 Current State
Status: in_progress (65% complete)
Phase: api_implementation  
Started: 2025-07-28 (9 days ago)
Estimate: 3 weeks (on track)
Last Updated: 2025-08-05 16:30:00Z

👥 Child Stories Progress
✅ oauth-provider-setup.story.carl (completed)
✅ user-database-schema.story.carl (completed)  
🔄 jwt-token-handling.story.carl (75% - testing phase)
🔄 api-middleware-auth.story.carl (45% - implementation)
⏳ mobile-auth-flow.story.carl (pending - waiting for API completion)

🔗 Dependencies
✅ database-infrastructure.tech.carl (completed)
✅ api-framework-setup.tech.carl (completed)
🚫 No blockers identified

📈 Progress Timeline
2025-07-28: Started feature development
2025-07-30: OAuth provider integration completed
2025-08-02: Database schema implemented and tested  
2025-08-05: JWT handling 75% complete
2025-08-06: API middleware in progress

⚠️  Attention Areas
• jwt-token-handling.story.carl: Minor test failures in edge cases
• api-middleware-auth.story.carl: Slightly behind schedule
  
🎯 Next Actions
1. Complete JWT token testing and resolve edge case failures
2. Focus on API middleware completion to unblock mobile flow
3. Ready to start mobile-auth-flow.story.carl once API is stable
```

## Success Criteria

✅ **Complete Picture**: All aspects of work item status covered  
✅ **Context Awareness**: Dependencies and relationships clear  
✅ **Actionable Detail**: Specific next steps identified  
✅ **Risk Visibility**: Issues and blockers highlighted