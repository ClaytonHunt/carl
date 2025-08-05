---
description: AI-powered project health dashboard with session analysis and actionable insights
argument-hint: [--yesterday|--week|--month|--quarter|--year] or [work-item.carl]
allowed-tools: Task, Read, Glob, Grep, Bash, LS
---

# CARL Status Dashboard

You are implementing intelligent project health monitoring with performance-optimized session analysis.

## Current Context
- **Session Files**: @.carl/sessions/ directory structure
- **Active Work**: @.carl/project/active.work.carl (if exists)
- **Arguments**: $ARGUMENTS

## Command Modes

### Default Status (Project Health Dashboard)
**No arguments provided** - Current project status with actionable insights:
1. **Load Today's Session**: Read current session file for today's activity
2. **Analyze Recent Trends**: Review last 7 days of session data
3. **Check Active Work**: Load active.work.carl for current priorities
4. **Invoke Session Analyst**: Use carl-session-analyst for comprehensive analysis
5. **Present Dashboard**: Health score, velocity, blockers, and recommendations

### Historical Analysis
**Time-based arguments** - Retrospective analysis with trend insights:
- `--yesterday`: Previous day's session analysis and activity summary
- `--week`: Last 7 days trend analysis with velocity patterns
- `--month`: Monthly progress review with milestone tracking
- `--quarter`: Quarterly assessment with strategic insights
- `--year`: Annual overview with long-term trend analysis

### Work Item Deep Dive
**Work item argument** - Detailed analysis of specific work:
1. **Load Work Item**: Read specified CARL file
2. **Find Related Sessions**: Search sessions for work item activity
3. **Trace Progress History**: Analyze progress events and changes
4. **Assess Current Status**: Evaluate completion status and blockers
5. **Provide Specific Insights**: Targeted recommendations for the work item

## Session Analysis Integration

### Performance-Optimized Data Loading
Use session-first approach for efficiency:
```bash
# Current session (today's activity)
session_file=".carl/sessions/session-$(date +%Y-%m-%d)-$(git config user.name | tr ' ' '_').carl"

# Recent sessions (trend analysis)
recent_sessions=$(find .carl/sessions -name "session-*.carl" -mtime -7 | sort)

# Archived summaries (historical analysis)
weekly_summaries=$(find .carl/sessions/archive -name "weekly-summary-*.carl" 2>/dev/null)
monthly_summaries=$(find .carl/sessions/archive -name "monthly-summary-*.carl" 2>/dev/null)
```

### Session Data Extraction
Extract key metrics from session files (supports both verbose and compact formats):

#### Format Detection and Parsing
```bash
# Detect session file format and parse accordingly
if grep -q "^compact_work_periods:" "$session_file"; then
    # Compact format: Parse pipe-delimited entries (work_id|start|end)
    grep -A 1000 "^compact_work_periods:" "$session_file" | \
    grep "^  - " | sed 's/^  - "//' | sed 's/"$//' | \
    while IFS='|' read -r work_id start_time end_time; do
        # Calculate duration if end_time exists
        if [[ -n "$end_time" && "$end_time" != "" ]]; then
            duration=$(calculate_duration "$start_time" "$end_time")
            echo "Work: $work_id, Duration: $duration, Period: $start_time to $end_time"
        else
            echo "Work: $work_id, Status: Active since $start_time"
        fi
    done
else
    # Verbose YAML format: Parse work_periods array
    # Extract progress events, activity patterns as before
fi
```

#### Key Metrics Extraction
- **Progress Events**: Work item progress increments and completions
- **Activity Patterns**: Work periods, context switching, session duration
- **Quality Metrics**: Validation events, auto-fixes applied, error rates  
- **Completion Events**: Items completed, moved to completed/, timestamps

#### Compact Format Work Period Processing
For sessions using compact format:
- **Parse Pipe Format**: Split `work_id|start_timestamp|end_timestamp` entries
- **Duration Calculation**: Compute work duration from start/end timestamps
- **Active Work Detection**: Identify incomplete entries (missing end timestamp)
- **Time Aggregation**: Sum total time per work item across sessions

### Agent Integration
Invoke carl-session-analyst with comprehensive context:
```
Use Task tool with subagent_type: carl-session-analyst

Provide analysis context:
- Current session data and recent activity (both compact and verbose formats)
- Historical session data for requested timeframe
- Active work items and their current status
- Quality metrics and validation patterns
- Session format information (for appropriate parsing strategy)
- Specific analysis request (health dashboard vs historical vs work item)

Session format context for agent:
"Session files may use either verbose YAML or compact pipe-delimited format.
Compact format uses: compact_work_periods with entries like 'work_id|start|end'.
Parse accordingly and maintain identical analysis quality regardless of format."
```

## Dashboard Components

### Health Score Calculation
Based on session analysis metrics:
- **Green (85-100%)**: Consistent progress, low errors, regular completions
- **Yellow (60-84%)**: Some stalling, moderate errors, irregular activity
- **Red (0-59%)**: Stalled work, high errors, no recent progress

### Velocity Tracking
Calculate and display development velocity:
- **Current Velocity**: Items completed per week (from completion events)
- **Trend Analysis**: Velocity changes over time (↑ increasing, ↓ decreasing, → stable)
- **Projected Completion**: Estimated completion dates for active items
- **Milestone Progress**: Progress toward epic/feature goals

### Activity Analysis
Session pattern insights:
- **Daily Activity**: Session frequency and duration patterns
- **Work Distribution**: Time spent across different work items
- **Context Switching**: Number of active items and focus patterns
- **Productivity Hours**: Peak productivity time identification

### Quality Assessment
Development quality indicators:
- **Validation Success Rate**: Percentage of clean validations
- **Auto-Fix Frequency**: How often schema issues require fixing
- **Test Coverage**: Testing activity from session events
- **Technical Debt**: Accumulation and resolution patterns

## Output Format

### Project Health Dashboard
```
🎯 CARL PROJECT STATUS - [Date]
=====================================

📊 HEALTH SCORE: [Green|Yellow|Red] ([Score]%)
📈 VELOCITY: [X] items/week (trend: [↑↓→])
⚡ ACTIVE ITEMS: [X] (optimal: 1-3)
✅ COMPLETION RATE: [X]% this week
🔧 QUALITY SCORE: [X]% (auto-fixes: [X])

🚀 RECENT ACHIEVEMENTS
- [Achievement 1 with timestamp]
- [Achievement 2 with timestamp]

⚠️  CURRENT BLOCKERS
- [Blocker 1 with specific details]
- [Blocker 2 with actionable steps]

💡 RECOMMENDATIONS
1. [Specific action with timeline]
2. [Process improvement suggestion]
3. [Strategic guidance for next steps]

📅 UPCOMING MILESTONES
- [Milestone 1]: [Progress %] - [Est. completion]
- [Milestone 2]: [Progress %] - [Est. completion]
```

### Historical Reports
For time-based analysis, include:
- Period comparison (vs previous period)
- Trend visualization (ASCII charts when helpful)
- Pattern identification and insights
- Performance variance analysis

### Work Item Analysis
For specific work item deep dive:
- Complete progress history with timestamps
- Session activity related to the item
- Dependency status and blocking issues
- Completion likelihood and timeline estimate
- Specific recommendations for advancement

## Argument Processing

### Time Period Resolution
Handle flexible time arguments:
```bash
# Direct time flags
--yesterday, --week, --month, --quarter, --year

# Automatic detection
"yesterday" → --yesterday
"last week" → --week
"this month" → --month
```

### Work Item Resolution
Handle work item specifications:
```bash
# Direct file path
.carl/project/stories/user-login.story.carl

# Work item name search
user-login.story → find matching .story.carl file
user-login → search all scopes for matching file
```

### Smart Defaults
- **No arguments**: Default project health dashboard
- **Invalid arguments**: Suggest valid options and show help
- **Missing data**: Graceful fallback with data gap indicators

## Error Handling

### Missing Session Files
- Check for session files in expected locations
- Provide data gap indicators in output
- Suggest actions to improve session tracking
- Fall back to CARL file scanning when necessary

### Data Inconsistencies
- Cross-validate session data with CARL files
- Highlight discrepancies and recommend investigation
- Provide confidence indicators for analysis
- Include data source references

### Performance Issues
- Limit session file reading to necessary timeframes
- Use efficient text processing for large session files
- Provide progress indicators for long-running analysis
- Implement timeout handling for slow operations

## Integration Points

### Hook System Integration
Leverage data from existing hooks:
- **Progress Tracking**: Automatic progress increments and work periods
- **Completion Handling**: Automatic completion events and file moves
- **Schema Validation**: Quality metrics and auto-fix statistics
- **Session Management**: Accurate session timing and user tracking

### Agent Coordination
Work with other CARL agents:
- **carl-requirements-analyst**: For work breakdown recommendations
- **carl-agent-builder**: When specialized analysis agents needed
- **Project-specific agents**: For domain-specific insights

### Command Integration
Provide actionable command suggestions:
- `/carl:plan [requirement]`: When new work needed
- `/carl:task [work-item]`: When items ready for execution
- `/carl:analyze`: When project foundation needs review

## Quality Standards

### Analysis Accuracy
- ✅ Cross-validate metrics across multiple data sources
- ✅ Provide confidence levels for trend predictions
- ✅ Include data freshness and completeness indicators
- ✅ Reference specific session files and timestamps

### Performance Requirements
- ✅ Complete default status analysis within 30 seconds
- ✅ Use session-first approach to minimize file I/O
- ✅ Provide incremental output for long-running analysis
- ✅ Cache frequently accessed session summaries

### Actionable Output
- ✅ Specific, implementable recommendations with timelines
- ✅ Clear priority ordering of suggested actions
- ✅ Measurable success criteria for improvements
- ✅ Direct links to relevant CARL files and commands

### User Experience
- ✅ Clear, scannable dashboard format
- ✅ Meaningful icons and status indicators
- ✅ Concise but comprehensive information
- ✅ Appropriate level of detail for context

## Usage Examples

```bash
# Current project health
/carl:status

# Historical analysis
/carl:status --week
/carl:status --month

# Work item deep dive
/carl:status user-authentication.feature.carl
/carl:status user-login
```

## Error Prevention

- ❌ Never scan all CARL files without specific need
- ❌ Never provide generic advice without data backing
- ❌ Never ignore missing session data without noting gaps
- ❌ Never overwhelm with too much historical detail
- ✅ Always prioritize recent, actionable data
- ✅ Always provide specific next steps and timelines
- ✅ Always validate analysis with session file references
- ✅ Always optimize for developer productivity insights

Remember: The goal is actionable project intelligence, not exhaustive reporting. Focus on insights that help developers understand their progress and optimize their workflow for better outcomes.