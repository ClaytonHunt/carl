# /carl:status - Project Health Dashboard

**Purpose**: AI-powered progress monitoring with actionable insights

## Performance-Optimized Approach

1. **Session-First Data**: Read compacted session files instead of scanning all CARL files
2. **Cached Summaries**: Use weekly/monthly/quarterly summaries for trend analysis
3. **Selective Deep Dive**: Only read specific CARL files when detail requested
4. **Pre-Computed Metrics**: Session files contain pre-aggregated progress data

## Provides

- Implementation progress (from session summaries)
- Velocity tracking (from session time data)
- Recent activity (from daily sessions)
- Technical debt tracking (from dedicated tech-debt.carl file)
- Next priorities (from active.work.carl only)

## Technical Debt Optimization

- Separate `tech-debt.carl` file updated by PostToolUse hook
- Hook detects TODO/FIXME/HACK comments during edits
- Automatic debt tracking without full codebase scans
- Debt items linked to specific files and line numbers

## Review Capabilities

- **Yesterday**: `/carl:status --yesterday` - Reads specific daily session file
- **Last Week**: `/carl:status --week` - Reads current/previous week summary
- **Last Month**: `/carl:status --month` - Reads current/previous month summary
- **Last Quarter**: `/carl:status --quarter` - Reads current/previous quarter summary
- **Last Year**: `/carl:status --year` - Reads current/previous year archive

**Date Handling**: The UserPromptSubmit hook injects current date information with every CARL command, ensuring Claude Code always knows the correct date for session file lookups. This prevents date hallucination issues.