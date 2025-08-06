# Status Command - Default Mode

Comprehensive project health dashboard with current work status and progress analytics.

## Prerequisites Check

- [ ] Foundation exists and is accessible
- [ ] Session directory exists and contains session files
- [ ] Work items directory structure is valid

## Default Status Process Checklist

### Session Analysis
- [ ] **Identify Current Session**:
  - [ ] Determine current date and git user
  - [ ] Locate today's session file: `session-YYYY-MM-DD-{git-user}.carl`
  - [ ] Fall back to most recent session if today's doesn't exist
  - [ ] Handle missing session gracefully

- [ ] **Load Session Data**:
  - [ ] Parse session file YAML structure
  - [ ] Extract commands executed today
  - [ ] Load progress events and work item activities
  - [ ] Calculate session duration and activity metrics

### Work Item Inventory
- [ ] **Scan All Work Items**:
  - [ ] Epics: `.carl/project/epics/*.carl` (active and completed)
  - [ ] Features: `.carl/project/features/*.carl` (active and completed)
  - [ ] Stories: `.carl/project/stories/*.carl` (active and completed)
  - [ ] Technical: `.carl/project/technical/*.carl` (active and completed)

- [ ] **Categorize by Status**:
  - [ ] **In Progress**: Currently active work items
  - [ ] **Pending**: Ready to start, dependencies met
  - [ ] **Blocked**: Dependencies unmet or blocked by external factors
  - [ ] **Completed**: Recently completed items (last 7 days)

### Progress Calculation
- [ ] **Individual Work Item Progress**:
  - [ ] Extract completion_percentage for each item
  - [ ] Identify current_phase for in-progress items
  - [ ] Calculate time elapsed since execution_started
  - [ ] Determine if items are on track based on estimates

- [ ] **Aggregate Progress**:
  - [ ] **Epic Progress**: Calculate from child feature completion
  - [ ] **Feature Progress**: Calculate from child story completion  
  - [ ] **Overall Project**: Weight progress by scope and priority
  - [ ] **Velocity Metrics**: Stories completed per week/sprint

### Health Assessment
- [ ] **Identify Issues**:
  - [ ] Work items stalled for >3 days without progress updates
  - [ ] Dependencies blocking multiple work items
  - [ ] Work items exceeding estimated time significantly
  - [ ] Quality gate failures or test failures

- [ ] **Risk Analysis**:
  - [ ] Critical path items at risk
  - [ ] Resource bottlenecks or overallocation
  - [ ] Technical debt accumulation
  - [ ] Timeline slippage risks

### Dashboard Generation
- [ ] **Current Activity Section**:
  - [ ] Today's command executions
  - [ ] In-progress work items with current phase
  - [ ] Recent progress updates and milestones
  - [ ] Active session duration and productivity

- [ ] **Project Overview Section**:
  - [ ] Total work items by scope and status
  - [ ] Overall project progress percentage
  - [ ] Completed work this week/month
  - [ ] Upcoming deadlines and milestones

- [ ] **Health Indicators Section**:
  - [ ] Items needing attention (stalled, blocked, overdue)
  - [ ] Quality metrics (test coverage, error rates)
  - [ ] Velocity trends and productivity metrics
  - [ ] Technical debt and maintenance items

## Success Criteria

✅ **Comprehensive Overview**: All project aspects covered clearly  
✅ **Current Focus**: Today's activity and immediate priorities visible  
✅ **Health Assessment**: Issues and risks clearly identified  
✅ **Actionable Insights**: Clear next steps and recommendations

## Output Format

```
📊 CARL Project Status - 2025-08-06

⚡ Current Activity
🔄 In Progress: 3 stories, 1 feature
👨‍💻 Active Session: 2h 15m (clayton_hunt)
📈 Today's Progress: 
   • user-authentication-system.feature.carl → 65% (API endpoints complete)
   • oauth-integration.story.carl → 80% (testing phase)
   • jwt-middleware.story.carl → 30% (implementation started)

📋 Project Overview
🏗️  Total Work Items: 15 epics, 23 features, 67 stories, 12 technical
✅ Completed This Week: 4 stories, 1 feature
🎯 Overall Progress: 34% (22 of 65 active items completed)
📅 Next Milestone: MVP Demo (in 2 weeks, 83% complete)

⚠️  Health Check
🚨 Needs Attention:
   • database-schema.tech.carl - Stalled 4 days (blocking 3 stories)
   • user-profile.story.carl - Exceeds estimate by 2 days
   
✅ Going Well:
   • Authentication flow ahead of schedule
   • Test coverage at 87% (above 85% target)
   • No critical bugs in last 7 days

💡 Actionable Recommendations:
📍 Immediate Actions (next session):
   • Focus on database-schema.tech.carl to unblock dependent stories  
   • Complete user-profile.story.carl testing (3 days overdue)
   
🔧 Process Optimizations (this week):
   • Reduce active work items from 4 to 3 for better focus efficiency
   • Planning velocity is 20% above optimal - consider larger work items
   
🎯 Strategic Adjustments (this month):  
   • Deep work periods averaging only 65% - minimize context switching
   • Consider time-boxing sessions to improve session productivity trend

📊 Enhanced Analytics:
🎯 Project Health: Green - On track with minor attention items
📈 Work Velocity: 6 stories/week (trend: ↑) [vs target: +20%]
🧠 Planning Velocity: 8 items/session (efficiency: 2.4 items/hour) [optimal: 2.0]  
⚡ Active Work: 4 items (focus: multi-task) [recommended: ≤3]
📊 Planning vs Work: 25% planning, 75% execution [optimal ratio: 20/80]
✅ Session Productivity: 6.2h active (82% of session time) [trend: ↑]
🎲 Completion Rate: 78% (started→finished) [industry avg: 75%] 
🎯 Planning Accuracy: 85% needed/created [waste factor: 15%]
⏱️ Focus Efficiency: 65% deep work [context switches: 8/day]
```

## Health Indicator Categories

### Green (Healthy) 🟢
- Work items progressing on schedule
- Dependencies met and clear
- Quality metrics above targets
- No blockers or significant risks

### Yellow (Attention Needed) 🟡  
- Work items slightly behind schedule
- Minor dependencies or blockers
- Quality metrics at minimum thresholds
- Manageable risks with mitigation plans

### Red (Action Required) 🔴
- Work items significantly stalled or blocked
- Critical dependencies unmet
- Quality metrics below acceptable levels
- High-risk items threatening project success

## Data Sources

### Session Files
- Command execution history
- Progress event tracking
- Developer activity patterns
- Error and recovery information

### Work Item Files
- Current status and completion percentages
- Timeline information and estimates
- Dependency relationships
- Implementation notes and blockers

### Git Repository
- Commit activity and code changes
- Branch status and merge activity
- Code quality metrics if available
- Repository health indicators

## Performance Requirements

- [ ] Status generation completes within 3 seconds for projects <100 work items
- [ ] Memory usage remains reasonable for large project histories
- [ ] Output is consistently formatted and readable
- [ ] Data accuracy is maintained across all calculations