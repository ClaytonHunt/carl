# Status Command - Standup Mode

Concise daily standup format with yesterday's work, today's plan, and blockers.

## Prerequisites Check

- [ ] Recent session data available (yesterday and today)
- [ ] Active work items identified
- [ ] Progress updates accessible

## Standup Report Process Checklist

### Yesterday's Accomplishments
- [ ] **Completed Work**:
  - [ ] Stories/tasks completed yesterday
  - [ ] Milestones achieved
  - [ ] Progress made on in-progress items
  - [ ] Issues resolved

### Today's Plan  
- [ ] **Planned Work**:
  - [ ] Priority items to focus on today
  - [ ] Continuation of in-progress work
  - [ ] New items ready to start
  - [ ] Time allocation by work item

### Blockers and Challenges
- [ ] **Current Blockers**:
  - [ ] Dependencies waiting on others
  - [ ] Technical issues needing resolution
  - [ ] External dependencies or approvals needed
  - [ ] Resource or knowledge gaps

## Output Format

```
═══════════════════════════════════════════
🗣️  DAILY STANDUP - Clayton Hunt - 2025-08-06
═══════════════════════════════════════════

✅ YESTERDAY (2025-08-05)  
🎉 Completed: oauth-provider-integration.story.carl ✓
🔨 Progress: jwt-token-handling.story.carl (60% → 75%) 
🐛 Fixed: Authentication middleware test failures
⏱️  Session: 2.5h active (85% productivity), 3 commits

🎯 TODAY'S PLAN
🏁 Priority 1: Complete jwt-token-handling.story.carl (testing phase)
🚀 Priority 2: Start api-middleware-auth.story.carl implementation  
📋 Planning: Review mobile-auth-flow requirements for next sprint
📊 Target: 6h active, 2 story completions

🚫 BLOCKERS & NEEDS
✅ None identified - clear path forward
⚠️  Future: May need UX review for mobile auth flow (planning ahead)

📈 QUICK WINS: JWT testing completion (30min), middleware docs update
📊 Sprint: 3/5 stories complete (60%, on track) | Velocity: 1.2/day ↑
═══════════════════════════════════════════
```

## Success Criteria

✅ **Concise Format**: Essential information only, <2 minutes to read  
✅ **Clear Priorities**: Today's focus items clearly identified  
✅ **Blocker Visibility**: Issues requiring help are highlighted  
✅ **Progress Context**: Sprint/milestone progress included