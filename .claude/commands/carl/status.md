---
allowed-tools: Read, Glob, Bash(git log:*), Bash(git status:*)
description: Generate comprehensive project status dashboard from CARL files
argument-hint: --summary | --detailed | --features | --technical-debt | --team
---

# CARL Status Dashboard Instructions

Generate comprehensive project status dashboard by analyzing CARL (Context-Aware Requirements Language) files:

## 1. Read CARL System Files
Priority order for comprehensive status analysis, following master process definition:
1. Read `.carl/system/master.process.carl` for authoritative status workflow reference
2. Read `.carl/index.carl` for project overview and current state
3. Read `.carl/sessions/active/*.session.carl` for current progress
4. Read all `.state.carl` files for implementation status
5. Read all `.context.carl` files for dependency health
6. Read `.carl/roadmap.carl` and `.carl/mission.carl` for strategic context
7. Follow `carl_status` workflow sequence from master process definition

## 2. Analyze Status Components
Based on `$ARGUMENTS`, focus analysis on:
- **No arguments**: Complete project health dashboard
- **--summary**: Executive summary with key metrics
- **--features**: Feature-level progress and completion status
- **--technical-debt**: Code quality and refactoring opportunities
- **--team**: Team performance and velocity metrics
- **--dependencies**: External dependency health and blockers

## 3. Extract Status Intelligence
Analyze CARL files to extract:
- **Feature Status**: Completion percentages, phases, and progress from `.state.carl` files
- **Technical Health**: Quality metrics, test coverage, and performance from implementation tracking
- **Dependency Status**: Integration health and external service status from `.context.carl` files
- **Team Velocity**: Progress trends and milestone achievement from session data
- **Strategic Alignment**: Progress toward roadmap goals and business objectives

## 4. Generate Status Dashboard
Create comprehensive status report with:

**Executive Summary Format:**
- Overall project health score with traffic light indicators
- Active features status (on track, at risk, blocked)
- Current sprint/iteration progress with completion forecast
- Technical debt level and trending direction
- Critical issues requiring immediate attention

**Business Value Metrics:**
- Value delivered vs. planned for current period
- High-priority feature completion rate
- User impact and satisfaction scores
- Feature delivery velocity and trends

**Feature Progress Detail:**
- Production features with health scores and performance metrics
- Development features with completion percentages and ETA
- Blocked features with blocker analysis and mitigation options
- Risk assessment for features behind schedule
- Resource allocation and team assignments

**Technical Health Assessment:**
- System architecture evaluation with improvement recommendations
- Code quality metrics table comparing current vs. target values
- Performance metrics with threshold monitoring
- Dependency health categorized by severity
- Security vulnerabilities and compliance status
- Infrastructure health and capacity utilization

**Team Performance Analysis:**
- Sprint velocity trends with completion rates
- Team health indicators (commitment reliability, review turnaround)
- Resource utilization by team/discipline
- Capacity analysis and bottleneck identification

## 5. Generate AI-Powered Recommendations
Based on CARL analysis, provide:
- **Predictive Analysis**: Sprint completion forecasts and risk factors
- **Priority Recommendations**: Immediate, short-term, and strategic actions
- **Impact Assessment**: Business value and effort estimates for recommendations
- **Risk Mitigation**: Strategies for identified blockers and dependencies

## Example Usage
- `/carl:status` → Complete project health dashboard
- `/carl:status --summary` → Executive summary with key metrics
- `/carl:status --features` → Feature-level progress focus
- `/carl:status --technical-debt` → Code quality and refactoring focus

Generate comprehensive project status insights primarily from CARL files, ensuring fast and accurate reporting of project health, progress, and recommendations.