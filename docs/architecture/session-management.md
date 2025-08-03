# Session Management System

## Daily Session Files
**Structure**: `session-YYYY-MM-DD-{git-user}.carl`
- **One file per day per developer** - prevents file explosion
- **Git user identification** - automatic developer attribution
- **Automatic cleanup** - removes old sessions on first daily update

## Session File Format
```yaml
# session-2025-08-01-clayton.carl
developer: "clayton"  # From git config user.name
date: "2025-08-01"
session_summary:
  start_time: "08:30:00Z"
  end_time: "17:45:00Z"
  total_active_time: "7.5 hours"
  
work_periods:
  - start: "08:30:00Z"
    end: "12:00:00Z"
    focus: "user-authentication.feature.carl"
    context: "Implementing JWT validation"
    commits: ["abc123f", "def456g"]
    
  - start: "13:00:00Z"
    end: "17:45:00Z"
    focus: "password-reset.story.carl"
    context: "Email template integration"
    commits: ["ghi789h"]

agent_performance:
  - agent: "carl-requirements-analyst"
    invocation_time: "08:32:15Z"
    duration: "2.3s"
    task: "scope classification for user-auth feature"
    success: true
    context_tokens: 1200
    
  - agent: "project-nodejs"
    invocation_time: "14:15:30Z"
    duration: "5.1s"
    task: "JWT implementation guidance"
    success: true
    context_tokens: 800

command_metrics:
  - command: "/carl:plan user-authentication"
    execution_time: "14.2s"
    success: true
    agents_used: ["carl-requirements-analyst", "project-nodejs"]
    
  - command: "/carl:task jwt-validation.story.carl"
    execution_time: "145.8s"
    success: true
    agents_used: ["project-nodejs", "project-security"]

active_context_carryover:
  # Context preserved for next day's session
  
cleanup_log:
  - cleaned_date: "2025-07-01"
    retention_period: "90_days"
```

## Session Compaction & Retention
- **Daily Sessions**: Individual files for 7 days
- **Weekly Summaries**: Compact 7+ day old sessions into `week-YYYY-WW-{git-user}.carl`
- **Monthly Summaries**: Compact 4+ week old weeklies into `month-YYYY-MM-{git-user}.carl`
- **Quarterly Summaries**: Compact 3+ month old monthlies into `quarter-YYYY-Q#-{git-user}.carl`
- **Yearly Archives**: Compact 4+ quarter old quarterlies into `year-YYYY-{git-user}.carl`
- **Never Delete**: Year files are kept permanently (small and valuable)

## Compaction Strategy
- **Trigger**: First session update of each day (SessionStart hook)
- **Process**: Progressive compaction using simple bash aggregation
- **Content Preserved**: Work summaries, time tracking, key accomplishments
- **File Structure**: Organized by time period in `.carl/sessions/archive/`
- **Minimal Code**: ~40 lines of bash can handle all compaction

## Example Compaction (in hook)
```bash
# Compact daily sessions older than 7 days into weekly
find .carl/sessions -name "session-*-${user}.carl" -mtime +7 | while read daily; do
  week=$(date -d "@$(stat -c %Y "$daily")" +%Y-%V)
  cat "$daily" >> ".carl/sessions/archive/week-${week}-${user}.carl"
  rm "$daily"
done
```

## Review Capabilities
- **Yesterday**: `/carl:status --yesterday` - Reads specific daily session file
- **Last Week**: `/carl:status --week` - Reads current/previous week summary
- **Last Month**: `/carl:status --month` - Reads current/previous month summary
- **Last Quarter**: `/carl:status --quarter` - Reads current/previous quarter summary
- **Last Year**: `/carl:status --year` - Reads current/previous year archive

**Date Handling**: The UserPromptSubmit hook injects current date information with every CARL command, ensuring Claude Code always knows the correct date for session file lookups. This prevents date hallucination issues.

**Session files are organized under `.carl/sessions/` as shown in the main Directory Structure above.**