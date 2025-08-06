# Status Command - Historical Analysis Mode

Historical project analysis with trends, patterns, and long-term insights.

## Prerequisites Check

- [ ] Multiple session files exist for historical analysis
- [ ] Date range parameters are valid (if provided)
- [ ] Sufficient historical data available for meaningful analysis

## Historical Analysis Process Checklist

### Data Collection
- [ ] **Session History Loading**:
  - [ ] Scan all session files in `.carl/sessions/`
  - [ ] Parse date ranges and developer activity
  - [ ] Extract historical command patterns
  - [ ] Load progress events and completion data

- [ ] **Work Item History**:
  - [ ] Track work item lifecycle changes
  - [ ] Identify completion patterns and timelines
  - [ ] Analyze scope accuracy (estimates vs. actual)
  - [ ] Extract dependency resolution patterns

### Trend Analysis
- [ ] **Velocity Trends**:
  - [ ] Stories completed per week/month
  - [ ] Feature delivery timelines
  - [ ] Epic completion rates
  - [ ] Seasonal patterns in productivity

- [ ] **Quality Trends**:
  - [ ] Error rates and bug introduction
  - [ ] Test coverage evolution
  - [ ] Technical debt accumulation
  - [ ] Refactoring frequency

### Pattern Recognition
- [ ] **Success Patterns**:
  - [ ] Work items that completed ahead of schedule
  - [ ] Effective breakdown strategies
  - [ ] Successful dependency management
  - [ ] High-quality delivery patterns

- [ ] **Challenge Patterns**:
  - [ ] Common bottlenecks and blockers
  - [ ] Scope creep indicators
  - [ ] Resource allocation issues
  - [ ] Recurring technical challenges

## Output Format

```
📈 CARL Historical Analysis - Last 90 Days

🎯 Delivery Metrics
✅ Completed: 45 stories, 12 features, 3 epics
⏱️  Average Cycle Time: 3.2 days/story, 2.8 weeks/feature
📊 Velocity Trend: 5.2 → 6.8 stories/week (+31% improvement)
🎪 Scope Accuracy: 87% of estimates within 20% of actual

📈 Quality Trends  
🧪 Test Coverage: 78% → 89% (steady improvement)
🐛 Bug Rate: 2.1 → 1.3 bugs/story (-38% improvement)
🔧 Technical Debt: Stable (3 items resolved, 2 added)

🏆 Success Patterns
• Authentication features: 15% faster than estimate
• Database work: High quality, low rework rate
• API development: Consistent 3-day story completion

⚠️  Challenge Patterns
• UI/UX stories: 25% longer than estimated
• Third-party integrations: Higher failure rate
• Complex business logic: Often requires breakdown

💡 Insights
1. Backend development velocity is strong and consistent
2. Frontend estimates need adjustment (+25% time buffer)
3. Breaking down complex stories early improves success rate
4. Dependency resolution getting faster with experience
```

## Success Criteria

✅ **Meaningful Trends**: Clear patterns visible in historical data  
✅ **Actionable Insights**: Recommendations for future planning  
✅ **Accuracy Metrics**: Estimation accuracy and improvement areas  
✅ **Quality Analysis**: Long-term quality and technical debt trends