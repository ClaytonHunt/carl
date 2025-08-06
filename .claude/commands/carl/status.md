---
description: AI-powered project health dashboard with session analysis and actionable insights
argument-hint: [--yesterday|--week|--month|--quarter|--year] or [work-item.carl]
allowed-tools: Task, Read, Glob, Grep, Bash, LS
---

# CARL Status Dashboard

You are implementing intelligent project health monitoring with checklist-driven analysis.

## Execution Checklist

- [ ] **Load Shared Validation Framework**
  - [ ] Source foundation validation: `.carl/commands/shared/foundation-validation.md`
  - [ ] Source work item validation: `.carl/commands/shared/work-item-validation.md`
  - [ ] Source error handling: `.carl/commands/shared/error-handling.md`
  - [ ] Source progress tracking: `.carl/commands/shared/progress-tracking.md`

- [ ] **Validate Prerequisites**
  - [ ] Validate CARL foundation exists and is accessible
  - [ ] Validate session directory exists with readable files
  - [ ] Handle validation failures with standardized error messages

- [ ] **Determine Status Mode**
  - [ ] Check for work item argument → Route to **Work Item Focus Mode**
  - [ ] Check for time-based argument → Route to **Historical Analysis Mode**
  - [ ] Check for standup argument → Route to **Standup Mode**
  - [ ] Default (no arguments) → Route to **Default Dashboard Mode**

- [ ] **Execute Status Mode**
  - [ ] Default Dashboard: `.carl/commands/status/default.md`
  - [ ] Historical Analysis: `.carl/commands/status/historical.md`
  - [ ] Work Item Focus: `.carl/commands/status/work-item.md`
  - [ ] Standup Format: `.carl/commands/status/standup.md`

- [ ] **Validate and Present Results**
  - [ ] Ensure consistent dashboard formatting across all modes
  - [ ] Provide actionable recommendations and next steps
  - [ ] Update session tracking with status analysis activity

## Mode Detection Process

### Argument Analysis
- [ ] **Work Item Mode Detection**:
  - [ ] Argument ends with `.carl` extension
  - [ ] File exists and is a valid work item
  - [ ] **Decision**: Route to Work Item Focus Mode

- [ ] **Historical Mode Detection**:  
  - [ ] Time-based flags: `--yesterday`, `--week`, `--month`, `--quarter`, `--year`
  - [ ] **Decision**: Route to Historical Analysis Mode

- [ ] **Standup Mode Detection**:
  - [ ] `--standup` or `--yesterday` arguments
  - [ ] **Decision**: Route to Standup Format Mode

- [ ] **Default Mode**:
  - [ ] No arguments or unrecognized arguments
  - [ ] **Decision**: Route to Default Dashboard Mode

## Mode-Specific Processing

Each status mode follows detailed checklists in carl commands:

### Default Dashboard Mode
**Reference**: `.carl/commands/status/default.md`
- Comprehensive project health overview
- Current activity and in-progress work
- Health indicators and recommendations
- Session analysis and productivity metrics

### Historical Analysis Mode
**Reference**: `.carl/commands/status/historical.md`
- Trend analysis across specified time periods
- Velocity patterns and improvement areas
- Success and challenge pattern recognition
- Long-term quality and debt evolution

### Work Item Focus Mode  
**Reference**: `.carl/commands/status/work-item.md`
- Deep analysis of specific work items
- Dependency tracking and relationship mapping
- Progress context and timeline analysis
- Actionable next steps and blockers

### Standup Format Mode
**Reference**: `.carl/commands/status/standup.md`
- Concise daily standup format
- Yesterday's accomplishments and today's plan
- Current blockers and support needs
- Sprint/milestone progress context

## Session Analysis Integration

Session analysis uses the carl-session-analyst agent:
- **Performance Optimization**: Session-first data loading approach
- **Data Sources**: Current session, recent sessions, historical archives  
- **Metrics Extraction**: Planning vs work time, productivity patterns
- **Format Support**: Compact and verbose session file formats

## Error Handling

Error handling uses shared standardized framework:
- **Missing Data**: Graceful fallback with data gap indicators
- **Performance Issues**: Optimized file reading and timeout handling
- **Data Validation**: Cross-validation between session files and work items
- **Recovery Guidance**: Clear suggestions for improving data quality

## Quality Standards

All status operations use shared validation framework:
- **Analysis Accuracy**: Cross-validated metrics with confidence indicators
- **Performance Targets**: Default analysis <30 seconds, efficient I/O
- **Actionable Output**: Specific recommendations with timelines
- **User Experience**: Clear, scannable dashboard format

## Execution Standards

### Validation Requirements
- [ ] **MANDATORY**: Use shared validation framework for all prerequisite checks
- [ ] **MANDATORY**: Route to appropriate mode based on argument analysis
- [ ] **MANDATORY**: Use commandlib references for mode-specific processing
- [ ] **MANDATORY**: Use carl-session-analyst for comprehensive session analysis
- [ ] **MANDATORY**: Provide standardized dashboard formatting and error handling
- [ ] **MANDATORY**: Update session tracking with status analysis results

### Success Criteria
- ✅ Smart mode detection eliminates user decision-making
- ✅ Checklist execution ensures comprehensive analysis
- ✅ Session integration provides accurate productivity insights
- ✅ Standardized formatting ensures consistent user experience

## Usage Examples

```bash
# Project health dashboard
/carl:status

# Historical analysis modes
/carl:status --yesterday  # Daily standup format
/carl:status --week       # Weekly trends
/carl:status --month      # Monthly progress

# Work item focus
/carl:status user-authentication.feature.carl
/carl:status user-login.story.carl
```

Remember: Status analysis provides actionable project intelligence. Focus on insights that help developers understand progress and optimize workflow for better outcomes.